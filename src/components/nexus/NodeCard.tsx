"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { motion } from "framer-motion";

interface ContentSection {
    heading: string;
    body: string;
}

interface NodeContent {
    introduction?: string;
    sections?: ContentSection[];
}

interface NodeCardData {
    title: string;
    summary: string;
    content?: NodeContent;
    status: "ghost" | "active" | "mastered";
    zoomLevel: number;
    onExpand: (question: string) => void;
    onOpen: () => void;
}

function NodeCard({ data }: NodeProps<NodeCardData>) {
    const [followUpInput, setFollowUpInput] = useState("");
    const { title, summary, content, status, zoomLevel, onExpand, onOpen } = data;

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && followUpInput.trim()) {
                onExpand(followUpInput.trim());
                setFollowUpInput("");
            }
        },
        [followUpInput, onExpand]
    );

    // Status-based styling
    const statusStyles = {
        ghost: "opacity-50 border-dashed border-gray-600 bg-gray-900/40",
        active: "opacity-100 border-solid border-teal-500/60 bg-gray-900/90",
        mastered: "opacity-100 border-solid border-yellow-500/60 bg-gray-900/90 shadow-[0_0_30px_rgba(250,204,21,0.15)]",
    };

    // Wider nodes at higher zoom
    const showFullContent = zoomLevel > 0.7;
    const showFollowUp = zoomLevel > 0.6 && status !== "ghost";

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
        group relative rounded-3xl border-2 backdrop-blur-lg transition-all duration-300 cursor-pointer
        hover:shadow-2xl hover:border-teal-400/70
        ${statusStyles[status]}
        ${showFullContent ? 'p-6 min-w-[340px] max-w-[400px]' : 'p-4 min-w-[260px] max-w-[320px]'}
      `}
            onClick={status !== "ghost" ? onOpen : undefined}
        >
            {/* Connection Handles */}
            <Handle type="target" position={Position.Top} className="!bg-teal-400 !w-4 !h-4 !border-2 !border-gray-900 !-top-2" />
            <Handle type="source" position={Position.Bottom} className="!bg-teal-400 !w-4 !h-4 !border-2 !border-gray-900 !-bottom-2" />

            {/* Status Badge */}
            <div className="absolute -top-3 -right-3">
                {status === "mastered" && (
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-full text-black text-sm font-bold">✓</span>
                )}
                {status === "ghost" && (
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full text-gray-400 text-xs">🔒</span>
                )}
            </div>

            {/* Title */}
            <h3 className={`font-bold text-base mb-2 leading-tight ${status === "mastered" ? "text-yellow-300" : "text-white"}`}>
                {title}
            </h3>

            {/* Summary */}
            <p className={`text-gray-300 mb-4 leading-relaxed ${showFullContent ? 'text-sm' : 'text-xs line-clamp-3'}`}>
                {summary}
            </p>

            {/* Content Sections (only at high zoom) */}
            {showFullContent && content?.sections && (
                <div className="space-y-4 mb-4">
                    {content.sections.slice(0, 3).map((section, idx) => (
                        <div key={idx} className="border-l-2 border-teal-500/40 pl-3">
                            <h4 className="text-sm font-semibold text-teal-300 mb-1">
                                {section.heading}
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                {section.body}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Ask Follow-Up Input */}
            {showFollowUp && (
                <div className="pt-4 border-t border-gray-700/50">
                    <input
                        type="text"
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Ask a question..."
                        className="w-full bg-gray-800/60 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:bg-gray-800/80 transition-all"
                    />
                </div>
            )}

            {/* Ghost Node CTA */}
            {status === "ghost" && (
                <div className="mt-3 text-center">
                    <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                        Click to explore
                    </span>
                </div>
            )}
        </motion.div>
    );
}

export default memo(NodeCard);
