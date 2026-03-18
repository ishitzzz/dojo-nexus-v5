import { NextResponse } from "next/server";
import { buildPlaylistFromSyllabus } from "../../../../playlist-forge/engine/playlistBuilder";

interface BuildPlaylistRequest {
  topic?: string;
  tableOfContents?: string[];
  preferences?: {
    studentType?: "high_school" | "undergrad" | "post_grad";
    language?: "english" | "hindi";
    learningMode?: "from_scratch" | "revision" | "one_shot";
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BuildPlaylistRequest;
    const topic = (body.topic || "").trim();
    const tableOfContents = Array.isArray(body.tableOfContents)
      ? body.tableOfContents.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    if (!topic || tableOfContents.length === 0 || !body.preferences) {
      return NextResponse.json({ error: "playlist_unavailable", entries: [] }, { status: 200 });
    }

    const playlist = await buildPlaylistFromSyllabus({
      syllabus: {
        title: topic,
        description: "",
        tableOfContents,
        modules: [],
      },
      preferences: body.preferences,
    });

    return NextResponse.json(playlist);
  } catch (error) {
    console.warn("⚠️ build-playlist route failed:", error);
    return NextResponse.json({ error: "playlist_unavailable", entries: [] }, { status: 200 });
  }
}
