import { NextResponse } from "next/server";
import yts from "yt-search";

const VIDEO_CACHE = new Map<string, string>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const modifier = searchParams.get("modifier"); 

  if (!query) return NextResponse.json({ videoId: "jfKfPfyJRdk" });

  const cacheKey = `${query}-${modifier || "default"}`;
  if (VIDEO_CACHE.has(cacheKey)) {
    return NextResponse.json({ videoId: VIDEO_CACHE.get(cacheKey) });
  }

  try {
    let finalQuery = query;
    if (modifier === "detailed") finalQuery += " full course deep dive";
    if (modifier === "practical") finalQuery += " code example project build";
    if (modifier === "short") finalQuery += " crash course basics under 10 minutes";

    console.log(`🔎 Searching: "${finalQuery}"...`);
    const r = await yts(finalQuery);

    // FIX: Explicitly type 'v' as any to satisfy TypeScript
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validVideos = r.videos.filter((v: any) => {
        if (v.seconds < 120) return false;
        if (modifier !== "detailed" && v.seconds > 3600) return false;
        return true;
    });

    const bestVideo = validVideos.length > 0 ? validVideos[0] : r.videos[0];

    if (bestVideo) {
      VIDEO_CACHE.set(cacheKey, bestVideo.videoId);
      return NextResponse.json({ videoId: bestVideo.videoId });
    }

    return NextResponse.json({ videoId: "jfKfPfyJRdk" });

  } catch (error) {
    return NextResponse.json({ videoId: "jfKfPfyJRdk" });
  }
}