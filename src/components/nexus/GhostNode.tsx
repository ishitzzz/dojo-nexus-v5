"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

interface GhostNodeData {
    title: string;
    summary: string;
}

function GhostNode({ data }: NodeProps<GhostNodeData>) {
    const { title, summary } = data;

    return (
        <div className="relative rounded-2xl border-2 border-dashed border-gray-700 p-4 min-w-[200px] max-w-[250px] bg-gray-900/20 backdrop-blur-sm opacity-30 transition-opacity hover:opacity-50 cursor-pointer">
            {/* Connection Handles */}
            <Handle type="target" position={Position.Top} className="!bg-gray-600 !w-2 !h-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !w-2 !h-2" />

            {/* Lock Icon */}
            <div className="absolute -top-2 -right-2">
                <span className="text-gray-600 text-sm">🔒</span>
            </div>

            {/* Title */}
            <h3 className="font-medium text-sm text-gray-500 mb-1 line-clamp-2">{title}</h3>

            {/* Summary */}
            <p className="text-xs text-gray-600 line-clamp-2">{summary}</p>

            {/* CTA */}
            <div className="mt-2 text-center">
                <span className="text-xs text-gray-600 italic">Prerequisites required</span>
            </div>
        </div>
    );
}

export default memo(GhostNode);
