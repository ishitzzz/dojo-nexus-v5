/**
 * 🔎 Anchor Hunter
 * 
 * Dual search strategy — finds existing YouTube playlists 
 * that cover the syllabus, then scores them by coverage.
 * 
 * PATH A: Playlist Discovery
 *   - Searches for existing playlists matching the subject
 *   - Scores each by % of TOC items covered
 *   - Returns the best one if coverage > 50%
 * 
 * PATH B: Channel Scanner (fallback)
 *   - If no good playlist found, identifies promising channels
 *   - Returns channel names for per-topic searching
 * 
 * API CALLS: 1-3 free yt-search calls. Zero quota cost.
 */

import ytSearch from "../core/youtubeSearch.js";
import Fuse from "fuse.js";
import type { AnchorPlaylist, AnchorVideo } from "../core/types.js";

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

/** Minimum coverage % to accept a playlist as an "anchor" */
const MIN_COVERAGE_THRESHOLD = 0.5; // 50%

/** Fuse.js config for fuzzy matching playlist titles against TOC */
const FUSE_OPTIONS = {
    threshold: 0.4,        // Lower = stricter matching
    distance: 100,
    includeScore: true,
    keys: ["title"],
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnchorHuntResult {
    found: boolean;
    anchor?: AnchorPlaylist;
    fallbackChannels?: string[];  // Promising channel names for per-topic search
    searchesPerformed: number;
}

interface PlaylistVideoItem {
    videoId: string;
    title: string;
    duration?: { seconds: number; timestamp: string };
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Hunt for an anchor playlist that covers the syllabus.
 * 
 * @param subject - Course title or main subject (e.g., "Data Structures and Algorithms")
 * @param tableOfContents - Flat list of TOC topics
 * @param language - Language suffix (e.g., "in Hindi")
 */
export async function huntForAnchor(
    subject: string,
    tableOfContents: string[],
    languageSuffix: string = ""
): Promise<AnchorHuntResult> {
    let searchesPerformed = 0;

    // ─────────────────────────────────────────────────────────
    // STEP 1: Search for playlists matching the subject
    // ─────────────────────────────────────────────────────────
    const playlistQuery = `${subject} full course playlist ${languageSuffix}`.trim();
    console.log(`🔎 Anchor Hunter: searching playlists for "${playlistQuery}"`);

    try {
        const searchResult = await ytSearch(playlistQuery);
        searchesPerformed++;

        const playlists = searchResult.playlists || [];

        if (playlists.length === 0) {
            console.log("📭 No playlists found. Trying channel search...");
            const fallbackChannels = await findPromisingChannels(subject, languageSuffix);
            searchesPerformed++;

            return {
                found: false,
                fallbackChannels,
                searchesPerformed,
            };
        }

        // ─────────────────────────────────────────────────────
        // STEP 2: Score each playlist against the TOC
        // ─────────────────────────────────────────────────────
        console.log(`📋 Found ${playlists.length} playlists. Scoring against ${tableOfContents.length} TOC items...`);

        let bestAnchor: AnchorPlaylist | null = null;
        let bestScore = 0;

        for (const playlist of playlists.slice(0, 5)) { // Check top 5 playlists
            // Get video list for this playlist
            const playlistVideos = await getPlaylistVideos(playlist.listId);
            searchesPerformed++;

            if (playlistVideos.length < 3) continue; // Too short to be useful

            // Score it
            const scored = scorePlaylistCoverage(
                playlistVideos,
                tableOfContents
            );

            console.log(
                `  📊 "${playlist.title}" — ${scored.coverageScore}% coverage ` +
                `(${scored.matchedTopics.length}/${tableOfContents.length} topics matched)`
            );

            if (scored.coverageScore > bestScore) {
                bestScore = scored.coverageScore;
                bestAnchor = {
                    playlistId: playlist.listId,
                    playlistTitle: playlist.title,
                    channelName: playlist.author?.name || "Unknown",
                    videoCount: playlistVideos.length,
                    videos: playlistVideos.map((v, i) => ({
                        videoId: v.videoId,
                        title: v.title,
                        durationSeconds: v.duration?.seconds || 0,
                        durationDisplay: v.duration?.timestamp || "0:00",
                        position: i,
                    })),
                    coverageScore: scored.coverageScore,
                    matchedTopics: scored.matchedTopics,
                    unmatchedTopics: scored.unmatchedTopics,
                };
            }

            // Short-circuit if we found a great match
            if (bestScore >= 80) break;
        }

        // ─────────────────────────────────────────────────────
        // STEP 3: Return result
        // ─────────────────────────────────────────────────────
        if (bestAnchor && bestScore >= MIN_COVERAGE_THRESHOLD * 100) {
            console.log(
                `✅ Anchor found: "${bestAnchor.playlistTitle}" ` +
                `(${bestScore}% coverage, ${bestAnchor.videoCount} videos)`
            );
            return {
                found: true,
                anchor: bestAnchor,
                searchesPerformed,
            };
        }

        // No good anchor — return channels as fallback
        console.log(`📭 No playlist reached ${MIN_COVERAGE_THRESHOLD * 100}% threshold (best: ${bestScore}%)`);
        const channelNames = playlists
            .slice(0, 3)
            .map(p => p.author?.name)
            .filter(Boolean) as string[];

        return {
            found: false,
            fallbackChannels: channelNames,
            searchesPerformed,
        };

    } catch (error) {
        console.error("❌ Anchor hunting failed:", error);
        return { found: false, searchesPerformed };
    }
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL: Playlist Scoring
// ═══════════════════════════════════════════════════════════════

interface CoverageScore {
    coverageScore: number;        // 0-100
    matchedTopics: string[];
    unmatchedTopics: string[];
}

function scorePlaylistCoverage(
    playlistVideos: PlaylistVideoItem[],
    tableOfContents: string[]
): CoverageScore {
    // Build a fuse index from playlist video titles
    const fuseItems = playlistVideos.map(v => ({ title: v.title }));
    const fuse = new Fuse(fuseItems, FUSE_OPTIONS);

    const matchedTopics: string[] = [];
    const unmatchedTopics: string[] = [];

    for (const topic of tableOfContents) {
        const results = fuse.search(topic);

        // Consider it a match if the best result has a score < 0.4 (lower = better in fuse)
        if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.4) {
            matchedTopics.push(topic);
        } else {
            unmatchedTopics.push(topic);
        }
    }

    const coverageScore = Math.round(
        (matchedTopics.length / tableOfContents.length) * 100
    );

    return { coverageScore, matchedTopics, unmatchedTopics };
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL: Playlist Video Fetching
// ═══════════════════════════════════════════════════════════════

async function getPlaylistVideos(playlistId: string): Promise<PlaylistVideoItem[]> {
    try {
        const result = await ytSearch({ listId: playlistId });
        if (!result || !result.videos) return [];

        return result.videos.map(v => ({
            videoId: v.videoId,
            title: v.title,
            duration: v.duration
                ? { seconds: v.duration.seconds, timestamp: v.duration.timestamp }
                : undefined,
        }));
    } catch (error) {
        console.warn(`⚠️ Failed to fetch playlist ${playlistId}:`, error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL: Channel Fallback
// ═══════════════════════════════════════════════════════════════

async function findPromisingChannels(
    subject: string,
    languageSuffix: string
): Promise<string[]> {
    try {
        const query = `${subject} tutorial ${languageSuffix}`.trim();
        const result = await ytSearch(query);

        // Extract unique channel names from top results
        const channels = new Set<string>();
        for (const video of (result.videos || []).slice(0, 10)) {
            if (video.author?.name) {
                channels.add(video.author.name);
            }
        }

        return Array.from(channels).slice(0, 5);
    } catch {
        return [];
    }
}
