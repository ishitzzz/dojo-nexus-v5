"use client";

import { Suspense } from "react";
import NexusView from "@/components/learn/NexusView";
import { ReactFlowProvider } from "reactflow";

export default function NexusPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<div className="h-screen bg-black" />}>
        <NexusView />
      </Suspense>
    </ReactFlowProvider>
  );
}
