"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Workspace from "@/components/Workspace";
import ResourceHub from "@/components/nexus/ResourceHub";
import { KnowledgeNode } from "@/types/nexus";

interface WorkspaceOverlayProps {
    node: KnowledgeNode | null;
    onClose: () => void;
    originTopic: string;
}

export default function WorkspaceOverlay({ node, onClose, originTopic }: WorkspaceOverlayProps) {
    // Convert KnowledgeNode to Workspace module format
    const module = node
        ? {
            moduleTitle: node.title,
            chapters: [
                {
                    chapterTitle: node.title,
                    youtubeQuery: node.youtubeQuery || node.title,
                    quizQuestion: `Explain the core concept of ${node.title}`,
                },
            ],
        }
        : null;

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    return (
        <AnimatePresence>
            {node && module && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={handleBackdropClick}
                >
                    {/* Backdrop with heavy blur */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />

                    {/* Full-Screen Workspace Panel */}
                    <motion.div
                        initial={{ scale: 0.98, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-[95vw] h-[95vh] bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-red-600 border border-gray-600 hover:border-red-500 text-gray-300 hover:text-white transition-all duration-200 group"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Minimal Header */}
                        <div className="px-8 py-5 bg-gradient-to-b from-gray-900 via-gray-900/90 to-transparent flex-shrink-0 pr-20">
                            <h2 className="text-xl font-bold text-white truncate">{node.title}</h2>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1">{node.summary}</p>
                        </div>

                        {/* Content Area — Video + Resource Hub side by side */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="flex flex-col lg:flex-row h-full">
                                {/* Left: Video Workspace (main content) */}
                                <div className="flex-1 min-h-[50vh] lg:min-h-0">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <Workspace
                                        module={module as any}
                                        onBack={onClose}
                                        userContext={{
                                            role: "Student",
                                            experience: "Beginner",
                                            topic: originTopic,
                                        }}
                                        anchorChannel={null}
                                    />
                                </div>

                                {/* Right: Resource Hub (supplementary) */}
                                <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-800 p-4 overflow-y-auto">
                                    <ResourceHub
                                        topic={originTopic}
                                        nodeTitle={node.title}
                                        isVisible={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
