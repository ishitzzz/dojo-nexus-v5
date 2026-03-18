"use client";

import { Suspense } from "react";
import DojoView from "@/components/learn/DojoView";

export default function RoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DojoView />
    </Suspense>
  );
}
