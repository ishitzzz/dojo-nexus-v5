import { NextResponse } from "next/server";
import yts from "yt-search";
import {
  VideoCandidate,
  rankByDensity,
  prepareForLLMRerank,
  filterByDuration,
} from "@/utils/searchScraper";
import { vibeCheckRerank } from "@/utils/geminiReranker";
import { fetchTranscript } from "@/utils/transcriptFetcher";
import {
  checkVideoVault,
  storeInVideoVault,
  VideoVaultEntry,
} from "@/utils/videoVault";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  INITIAL_FETCH_COUNT: 10,      // Fetch top 10 from YouTube
  RERANK_CANDIDATE_COUNT: 5,    // Send top 5 to Gemini for reranking
  MIN_VIDEO_DURATION: 120,      // 2 minutes minimum
  MAX_VIDEO_DURATION: 7200,     // 2 hours max (unless modifier = detailed)
  FALLBACK_VIDEO_ID: "",  // Empty - prefer no video over unrelated content
  ENABLE_TRANSCRIPT_ANALYSIS: false, // Toggle transcript fetching (can be slow)
};

// Lightweight in-memory cache for immediate repeated requests
const QUICK_CACHE = new Map<string, { videoId: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const modifier = searchParams.get("modifier") || "default";
  const userRole = searchParams.get("role") || "Student";
  const experience = searchParams.get("experience") || "Deep Dive";
  const preferredChannel = searchParams.get("preferredChannel"); // Anchor Channel
  const previousTopic = searchParams.get("previousTopic"); // NEW: Context Awareness

  // Early return for missing query
  if (!query) {
    return NextResponse.json({
      videoId: CONFIG.FALLBACK_VIDEO_ID,
      source: "fallback",
      reason: "No query provided"
    });
  }

  const cacheKey = `${query}|${modifier}|${userRole}|${experience}|${preferredChannel || "none"}|${previousTopic || "none"}`;

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Check Quick Cache (in-memory)
  // ═══════════════════════════════════════════════════════════════
  const cached = QUICK_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`⚡ Quick cache hit for: "${query.slice(0, 30)}..."`);
    return NextResponse.json({
      videoId: cached.videoId,
      source: "quick_cache"
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Check Video Vault (Supabase/Local)
  // ═══════════════════════════════════════════════════════════════
  try {
    const vaultResult = await checkVideoVault(query, userRole, experience);
    if (vaultResult.found && vaultResult.entry) {
      console.log(`💾 Vault hit for: "${query.slice(0, 30)}..." -> ${vaultResult.entry.video_id}`);
      QUICK_CACHE.set(cacheKey, {
        videoId: vaultResult.entry.video_id,
        timestamp: Date.now()
      });
      return NextResponse.json({
        videoId: vaultResult.entry.video_id,
        source: "video_vault",
        densityScore: vaultResult.entry.density_score,
        densityFlags: vaultResult.entry.density_flags,
      });
    }
  } catch (error) {
    console.warn("⚠️ Vault check error:", error);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Build Enhanced Query with Modifiers
  // ═══════════════════════════════════════════════════════════════
  let enhancedQuery = query;

  // Add runtime modifiers based on user selection
  if (modifier === "detailed") {
    enhancedQuery += " full course comprehensive deep dive documentation";
  } else if (modifier === "practical") {
    enhancedQuery += " code example project build hands-on tutorial";
  } else if (modifier === "short") {
    enhancedQuery += " crash course explained quickly basics";
  }

  console.log(`🔎 Hidden Gem Search: "${enhancedQuery.slice(0, 60)}..."`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Fetch from YouTube (via yt-search)
  // ═══════════════════════════════════════════════════════════════
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let searchResult: any = { videos: [] };
    let searchTierUsed = "regular";

    // -------------------------------------------------------------
    // TIER 0: ANCHOR CHANNEL (Preference)
    // -------------------------------------------------------------
    if (preferredChannel) {
      console.log(`⚓ Attempting Anchor Channel search for: ${preferredChannel}`);
      const anchorQuery = `"${preferredChannel}" ${query}`;
      const anchorResult = await yts(anchorQuery);

      if (anchorResult.videos && anchorResult.videos.length > 0) {
        const anchorVideos = anchorResult.videos.filter((v: any) =>
          v.author.name.toLowerCase().includes(preferredChannel.toLowerCase()) ||
          v.title.toLowerCase().includes(preferredChannel.toLowerCase())
        );

        if (anchorVideos.length > 0) {
          console.log(`✅ Anchor Channel found ${anchorVideos.length} videos.`);
          searchResult.videos = anchorVideos;
          searchTierUsed = "anchor_channel";
        }
      }
    }

    // -------------------------------------------------------------
    // TIER 0.5: CONCEPT FIRST (New for Beginners)
    // -------------------------------------------------------------
    if (searchResult.videos.length === 0 && (userRole === "Student" || experience === "Beginner") && modifier === "default") {
      console.log("🎓 Using Concept-First Search for Student/Beginner...");
      const conceptQuery = `${query} explained concept visual mental model -tutorial`; // Negate generic tutorials to find explanations
      const conceptResult = await yts(conceptQuery);

      if (conceptResult.videos && conceptResult.videos.length > 0) {
        console.log("✅ Concept-First Search successful");
        searchResult.videos = conceptResult.videos;
        searchTierUsed = "concept_first";
      }
    }

    // -------------------------------------------------------------
    // REGULAR TIERS (Fallback)
    // -------------------------------------------------------------
    if (searchResult.videos.length === 0) {

      // Tier 1 (Strict)
      searchResult = await yts(enhancedQuery);

      if (!searchResult.videos || searchResult.videos.length === 0) {
        console.warn("⚠️ Tier 1 (Strict) search returned 0 results. Trying Tier 2 (Moderate)...");

        // Tier 2: Moderate "Middle Way"
        const moderateQuery = `${query} advanced implementation deep dive detailed`;
        const tier2Result = await yts(moderateQuery);

        if (tier2Result.videos && tier2Result.videos.length > 0) {
          console.log("✅ Tier 2 (Moderate) search successful");
          searchResult.videos = tier2Result.videos;
        } else {
          console.warn("⚠️ Tier 2 (Moderate) search returned 0 results. Trying Tier 3 (Basic)...");

          // Tier 3: Basic Safety Net
          const basicQuery = `${query} tutorial`;
          const tier3Result = await yts(basicQuery);

          if (tier3Result.videos && tier3Result.videos.length > 0) {
            console.log("✅ Tier 3 (Basic) search successful");
            searchResult.videos = tier3Result.videos;
          } else {
            return NextResponse.json({
              videoId: CONFIG.FALLBACK_VIDEO_ID,
              source: "fallback",
              reason: "No results from YouTube (after all retries)"
            });
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Convert to VideoCandidate format and apply heuristics
    // ═══════════════════════════════════════════════════════════════
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates: VideoCandidate[] = searchResult.videos
      .slice(0, CONFIG.INITIAL_FETCH_COUNT)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any) => ({
        videoId: v.videoId,
        title: v.title || "",
        description: v.description || "",
        duration: {
          seconds: v.seconds || 0, // yt-search uses 'seconds'
          timestamp: v.timestamp || "0:00",
        },
        views: v.views || 0,
        author: {
          name: v.author?.name || "Unknown",
          url: v.author?.url,
        },
      }));

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Apply Metadata Heuristic Filter (Density Scoring)
    // ═══════════════════════════════════════════════════════════════
    let filteredCandidates = candidates;

    // SKIP duration filtering if we found an Anchor Channel video
    if (searchTierUsed !== "anchor_channel") {
      filteredCandidates = filterByDuration(candidates, CONFIG.MIN_VIDEO_DURATION);
      if (modifier !== "detailed") {
        filteredCandidates = filteredCandidates.filter(
          (v) => v.duration.seconds <= CONFIG.MAX_VIDEO_DURATION
        );
      }
    }

    if (filteredCandidates.length === 0) {
      filteredCandidates = candidates;
    }

    const rankedCandidates = rankByDensity(filteredCandidates);

    console.log(`📊 Top ${Math.min(5, rankedCandidates.length)} by Density Score:`);
    rankedCandidates.slice(0, 5).forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.densityScore}] ${v.title.slice(0, 50)}... (${v.densityFlags?.join(", ")})`);
    });

    // ═══════════════════════════════════════════════════════════════
    // RELEVANCE ESCAPE HATCH
    // ═══════════════════════════════════════════════════════════════
    const RELEVANCE_THRESHOLD = 15;

    if (searchTierUsed === "anchor_channel" && rankedCandidates.length > 0) {
      const topAnchorVideo = rankedCandidates[0];
      if ((topAnchorVideo.densityScore || 0) < RELEVANCE_THRESHOLD) {
        console.warn(`⚠️ Anchor Channel video has low relevance (score: ${topAnchorVideo.densityScore}). Falling back...`);
        searchTierUsed = "anchor_abandoned";

        const fallbackResult = await yts(enhancedQuery);
        if (fallbackResult.videos && fallbackResult.videos.length > 0) {
          // Reuse candidate mapping logic (simplified for brevity here, should ideally be a function)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fallbackCandidates: VideoCandidate[] = fallbackResult.videos.slice(0, CONFIG.INITIAL_FETCH_COUNT).map((v: any) => ({
            videoId: v.videoId, title: v.title || "", description: v.description || "",
            duration: { seconds: v.seconds || 0, timestamp: v.timestamp || "0:00" },
            views: v.views || 0, author: { name: v.author?.name || "Unknown", url: v.author?.url }
          }));

          let fallbackFiltered = filterByDuration(fallbackCandidates, CONFIG.MIN_VIDEO_DURATION);
          if (fallbackFiltered.length === 0) fallbackFiltered = fallbackCandidates;
          const fallbackRanked = rankByDensity(fallbackFiltered);

          rankedCandidates.length = 0;
          rankedCandidates.push(...fallbackRanked);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Gemini "Vibe-Check" Reranker 
    // ═══════════════════════════════════════════════════════════════
    let selectedVideo: VideoCandidate | undefined;
    let selectionSource = searchTierUsed === "anchor_channel" ? "anchor_preference" : "density_heuristic";

    if (searchTierUsed === "anchor_channel" && rankedCandidates.length > 0) {
      selectedVideo = rankedCandidates[0];
      console.log(`⚓ Selected Anchor Video: ${selectedVideo?.title}`);
    } else {
      const topCandidates = rankedCandidates.slice(0, CONFIG.RERANK_CANDIDATE_COUNT);
      const candidatesForLLM = prepareForLLMRerank(topCandidates);

      // Context-aware topic
      const contextAwareTopic = previousTopic
        ? `${query} (User previously learned: ${previousTopic})`
        : query;

      const rerankerResult = await vibeCheckRerank({
        candidates: candidatesForLLM,
        userRole,
        topic: contextAwareTopic,
        experienceLevel: experience,
      });

      if (!rerankerResult.fallbackUsed && rerankerResult.winnerId) {
        selectedVideo = topCandidates.find((v) => v.videoId === rerankerResult.winnerId);
        if (selectedVideo) {
          selectionSource = "gemini_rerank";
          console.log(`🧠 Gemini selected: ${selectedVideo.title.slice(0, 50)}...`);
        }
      }

      if (!selectedVideo) {
        selectedVideo = topCandidates.find((v) =>
          v.description.toLowerCase().includes("github.com")
        );
        if (selectedVideo) selectionSource = "github_fallback";
        else {
          selectedVideo = topCandidates[0];
          selectionSource = "density_fallback";
        }
      }
    }

    if (!selectedVideo) {
      if (candidates.length > 0) {
        selectedVideo = candidates[0];
        selectionSource = "first_result_fallback";
      } else {
        return NextResponse.json({
          videoId: "",
          source: "no_results",
          reason: "No videos found for this topic"
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 9: Store in Video Vault (Skip transcript for now)
    // ═══════════════════════════════════════════════════════════════
    const vaultEntry: VideoVaultEntry = {
      video_id: selectedVideo.videoId,
      title: selectedVideo.title,
      description: selectedVideo.description,
      transcript_snippet: "",
      density_score: selectedVideo.densityScore || 0,
      density_flags: selectedVideo.densityFlags || [],
      metadata: {
        duration_seconds: selectedVideo.duration.seconds,
        author: selectedVideo.author.name,
        views: selectedVideo.views,
        fetched_at: new Date().toISOString(),
        query_used: query,
        user_role: userRole,
        experience_level: experience,
      },
    };

    await storeInVideoVault(vaultEntry, query, userRole, experience);

    QUICK_CACHE.set(cacheKey, {
      videoId: selectedVideo.videoId,
      timestamp: Date.now()
    });

    return NextResponse.json({
      videoId: selectedVideo.videoId,
      source: selectionSource,
      title: selectedVideo.title,
      densityScore: selectedVideo.densityScore,
      densityFlags: selectedVideo.densityFlags,
      duration: selectedVideo.duration.timestamp,
      isLowDensity: false,
      debug: {
        candidatesAnalyzed: rankedCandidates.length,
        usedAnchorChannel: searchTierUsed === "anchor_channel",
      },
    });

  } catch (error) {
    console.error("❌ Video search pipeline error:", error);
    return NextResponse.json({
      videoId: CONFIG.FALLBACK_VIDEO_ID,
      source: "error_fallback",
      reason: String(error),
    });
  }
}