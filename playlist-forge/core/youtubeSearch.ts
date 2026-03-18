const USE_YT_API = !!process.env.YOUTUBE_API_KEY;

type Query = string | { listId: string };

type VideoResult = {
    videoId: string;
    title: string;
    description?: string;
    url: string;
    duration?: {
        seconds: number;
        timestamp: string;
    };
    views?: number;
    author?: {
        name?: string;
        url?: string;
    };
    thumbnail?: string;
};

type PlaylistResult = {
    listId: string;
    title: string;
    url: string;
    author?: {
        name?: string;
        url?: string;
    };
    videoCount?: number;
};

type SearchResult = {
    videos: VideoResult[];
    playlists: PlaylistResult[];
};

type PlaylistDetailResult = {
    videos: VideoResult[];
};

function isoDurationToSeconds(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);

    return (hours * 3600) + (minutes * 60) + seconds;
}

function secondsToTimestamp(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function pickThumbnail(thumbnails?: {
    maxres?: { url?: string };
    standard?: { url?: string };
    high?: { url?: string };
    medium?: { url?: string };
    default?: { url?: string };
}): string {
    return thumbnails?.maxres?.url
        || thumbnails?.standard?.url
        || thumbnails?.high?.url
        || thumbnails?.medium?.url
        || thumbnails?.default?.url
        || "";
}

async function fallbackYtSearch(query: Query): Promise<SearchResult | PlaylistDetailResult> {
    const mod = await import("yt-search");
    const ytSearch = mod.default;
    return ytSearch(query);
}

async function fetchVideoDetails(videoIds: string[], apiKey: string): Promise<Map<string, {
    durationSeconds: number;
    views: number;
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
}>> {
    if (videoIds.length === 0) return new Map();

    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,contentDetails,statistics");
    videosUrl.searchParams.set("id", videoIds.join(","));
    videosUrl.searchParams.set("key", apiKey);

    const response = await fetch(videosUrl.toString());
    if (!response.ok) {
        throw new Error(`YouTube videos API error: ${response.status}`);
    }

    const data = await response.json() as { items?: unknown[] };
    const items = (Array.isArray(data.items) ? data.items : []) as any[];

    const map = new Map<string, {
        durationSeconds: number;
        views: number;
        title: string;
        description: string;
        channelTitle: string;
        channelId: string;
    }>();

    for (const item of items) {
        const id = item.id as string | undefined;
        if (!id) continue;

        map.set(id, {
            durationSeconds: isoDurationToSeconds(item.contentDetails?.duration || "PT0S"),
            views: Number(item.statistics?.viewCount || 0),
            title: item.snippet?.title || "",
            description: item.snippet?.description || "",
            channelTitle: item.snippet?.channelTitle || "Unknown",
            channelId: item.snippet?.channelId || "",
        });
    }

    return map;
}

async function searchWithApi(query: string, apiKey: string): Promise<SearchResult> {
    const videoSearchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    videoSearchUrl.searchParams.set("part", "snippet");
    videoSearchUrl.searchParams.set("type", "video");
    videoSearchUrl.searchParams.set("q", query);
    videoSearchUrl.searchParams.set("maxResults", "20");
    videoSearchUrl.searchParams.set("key", apiKey);

    const playlistSearchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    playlistSearchUrl.searchParams.set("part", "snippet");
    playlistSearchUrl.searchParams.set("type", "playlist");
    playlistSearchUrl.searchParams.set("q", query);
    playlistSearchUrl.searchParams.set("maxResults", "20");
    playlistSearchUrl.searchParams.set("key", apiKey);

    const [videoResponse, playlistResponse] = await Promise.all([
        fetch(videoSearchUrl.toString()),
        fetch(playlistSearchUrl.toString()),
    ]);

    if (!videoResponse.ok) {
        throw new Error(`YouTube search(video) API error: ${videoResponse.status}`);
    }

    if (!playlistResponse.ok) {
        throw new Error(`YouTube search(playlist) API error: ${playlistResponse.status}`);
    }

    const videoData = await videoResponse.json() as { items?: unknown[] };
    const playlistData = await playlistResponse.json() as { items?: unknown[] };

    const videoItems = (Array.isArray(videoData.items) ? videoData.items : []) as any[];
    const playlistItems = (Array.isArray(playlistData.items) ? playlistData.items : []) as any[];

    const videoIds = videoItems
        .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
        .filter((id: string | undefined): id is string => Boolean(id));

    const videoDetails = await fetchVideoDetails(videoIds, apiKey);

    const videos = videoItems
        .map((item: any) => {
            const videoId = item.id?.videoId;
            if (!videoId) return null;

            const details = videoDetails.get(videoId);
            const durationSeconds = details?.durationSeconds || 0;

            return {
                videoId,
                title: details?.title || item.snippet?.title || "",
                description: details?.description || item.snippet?.description || "",
                url: `https://www.youtube.com/watch?v=${videoId}`,
                duration: {
                    seconds: durationSeconds,
                    timestamp: secondsToTimestamp(durationSeconds),
                },
                views: details?.views || 0,
                author: {
                    name: details?.channelTitle || item.snippet?.channelTitle || "Unknown",
                    url: details?.channelId
                        ? `https://www.youtube.com/channel/${details.channelId}`
                        : undefined,
                },
                thumbnail: pickThumbnail(item.snippet?.thumbnails),
            };
        })
        .filter((video: VideoResult | null): video is VideoResult => video !== null) as VideoResult[];

    const playlists = playlistItems
        .map((item: any) => {
            const listId = item.id?.playlistId;
            if (!listId) return null;

            return {
                listId,
                title: item.snippet?.title || "",
                url: `https://www.youtube.com/playlist?list=${listId}`,
                author: {
                    name: item.snippet?.channelTitle || "Unknown",
                    url: item.snippet?.channelId
                        ? `https://www.youtube.com/channel/${item.snippet.channelId}`
                        : undefined,
                },
            };
        })
        .filter((playlist: PlaylistResult | null): playlist is PlaylistResult => playlist !== null) as PlaylistResult[];

    return { videos, playlists };
}

async function getPlaylistVideosWithApi(listId: string, apiKey: string): Promise<PlaylistDetailResult> {
    const playlistItemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    playlistItemsUrl.searchParams.set("part", "snippet,contentDetails");
    playlistItemsUrl.searchParams.set("playlistId", listId);
    playlistItemsUrl.searchParams.set("maxResults", "50");
    playlistItemsUrl.searchParams.set("key", apiKey);

    const response = await fetch(playlistItemsUrl.toString());
    if (!response.ok) {
        throw new Error(`YouTube playlistItems API error: ${response.status}`);
    }

    const data = await response.json() as { items?: unknown[] };
    const items = (Array.isArray(data.items) ? data.items : []) as any[];

    const videoIds = items
        .map((item: { contentDetails?: { videoId?: string } }) => item.contentDetails?.videoId)
        .filter((id: string | undefined): id is string => Boolean(id));

    const videoDetails = await fetchVideoDetails(videoIds, apiKey);

    const videos = items
        .map((item: any) => {
            const videoId = item.contentDetails?.videoId;
            if (!videoId) return null;

            const details = videoDetails.get(videoId);
            const durationSeconds = details?.durationSeconds || 0;

            return {
                videoId,
                title: details?.title || item.snippet?.title || "",
                description: details?.description || item.snippet?.description || "",
                url: `https://www.youtube.com/watch?v=${videoId}`,
                duration: {
                    seconds: durationSeconds,
                    timestamp: secondsToTimestamp(durationSeconds),
                },
                views: details?.views || 0,
                author: {
                    name: details?.channelTitle || item.snippet?.channelTitle || "Unknown",
                    url: details?.channelId
                        ? `https://www.youtube.com/channel/${details.channelId}`
                        : undefined,
                },
                thumbnail: pickThumbnail(item.snippet?.thumbnails),
            };
        })
        .filter((video: VideoResult | null): video is VideoResult => video !== null) as VideoResult[];

    return { videos };
}

async function youtubeSearch(query: string): Promise<SearchResult>;
async function youtubeSearch(query: { listId: string }): Promise<PlaylistDetailResult>;
async function youtubeSearch(query: Query): Promise<SearchResult | PlaylistDetailResult> {
    if (!USE_YT_API || !process.env.YOUTUBE_API_KEY) {
        return fallbackYtSearch(query);
    }

    try {
        if (typeof query === "string") {
            return await searchWithApi(query, process.env.YOUTUBE_API_KEY);
        }

        return await getPlaylistVideosWithApi(query.listId, process.env.YOUTUBE_API_KEY);
    } catch (error) {
        console.warn("⚠️ YouTube Data API failed, falling back to yt-search:", error);
        return fallbackYtSearch(query);
    }
}

export default youtubeSearch;
export { USE_YT_API };
