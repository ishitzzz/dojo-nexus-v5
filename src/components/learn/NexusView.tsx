"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Edge,
    NodeTypes,
    useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";

import NodeCard from "@/components/nexus/NodeCard";
import GhostNode from "@/components/nexus/GhostNode";
import WorkspaceOverlay from "@/components/nexus/WorkspaceOverlay";
import { KnowledgeNode } from "@/types/nexus";
import { calculateNewNodePosition } from "@/utils/nexusLayout";

interface NexusViewProps {
    initialTopic?: string;
    knownConcepts?: string;
    onActiveNodesChange?: (titles: string[]) => void;
}

const nodeTypes: NodeTypes = {
    nexusNode: NodeCard,
    ghostNode: GhostNode,
};

interface SuggestedPath {
    question: string;
    preview: string;
}

interface ChoiceChip {
    label: string;
    clarifiedGoal: string;
    preview: string;
}

function OnboardingInput({
    onSubmit,
    chips,
    originalGoal,
    onChipClick,
    onBackFromChips,
    isLoading,
}: {
    onSubmit: (goal: string) => void;
    chips: ChoiceChip[] | null;
    originalGoal: string;
    onChipClick: (chip: ChoiceChip) => void;
    onBackFromChips: () => void;
    isLoading: boolean;
}) {
    const [goal, setGoal] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal.trim()) return;
        onSubmit(goal.trim());
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl px-6">
                <h1 className="text-5xl font-bold text-white text-center mb-3">🥋 The Dojo</h1>
                <p className="text-gray-400 text-center text-lg mb-10">
                    {chips ? "What specifically do you mean?" : "What do you want to learn today?"}
                </p>

                {chips && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3 mb-6">
                        <p className="text-gray-500 text-center text-sm mb-4">
                            &ldquo;{originalGoal}&rdquo; could mean several things. Pick one:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {chips.map((chip, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.08 }}
                                    onClick={() => onChipClick(chip)}
                                    className="group p-4 bg-gray-900/80 border border-gray-700 rounded-2xl text-left hover:border-teal-500 hover:bg-gray-800/80 transition-all duration-200 cursor-pointer"
                                >
                                    <span className="block text-white font-semibold text-base group-hover:text-teal-300 transition-colors">{chip.label}</span>
                                    <span className="block text-gray-500 text-sm mt-1">{chip.preview}</span>
                                </motion.button>
                            ))}
                        </div>
                        <button onClick={onBackFromChips} className="w-full text-center text-gray-500 hover:text-gray-300 text-sm mt-3 transition-colors cursor-pointer">
                            ← Try a different query
                        </button>
                    </motion.div>
                )}

                {!chips && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="e.g., Learn web design, Understand machine learning..."
                            disabled={isLoading}
                            className="w-full px-6 py-5 bg-gray-900/80 border border-gray-700 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all disabled:opacity-50"
                        />

                        <button
                            type="submit"
                            disabled={!goal.trim() || isLoading}
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? <><span className="animate-spin">⏳</span> Building your learning path...</> : <>Start Learning →</>}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

function SuggestedPathsPanel({
    paths,
    onSelect,
    parentId,
}: {
    paths: SuggestedPath[];
    onSelect: (question: string) => void;
    parentId: string;
}) {
    if (!paths || paths.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-72 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Explore next →</p>
            {paths.map((path, idx) => (
                <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => onSelect(path.question)}
                    className="w-full text-left p-4 bg-gray-900/80 hover:bg-gray-800 border border-gray-700 hover:border-teal-500/50 rounded-xl transition-all group"
                >
                    <p className="text-sm text-white group-hover:text-teal-300 transition-colors">{path.question}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{path.preview}</p>
                </motion.button>
            ))}
        </motion.div>
    );
}

export default function NexusView({ initialTopic, knownConcepts, onActiveNodesChange }: NexusViewProps) {
    const searchParams = useSearchParams();
    const topicFromQuery = searchParams.get("topic") || "";
    const knownConceptsFromQuery = searchParams.get("knownConcepts") || "";
    const resolvedTopic = initialTopic ?? topicFromQuery;
    const resolvedKnownConcepts = knownConcepts ?? knownConceptsFromQuery;

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [activeNode, setActiveNode] = useState<KnowledgeNode | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isInitialized, setIsInitialized] = useState(false);
    const [originTopic, setOriginTopic] = useState("");
    const [suggestedPaths, setSuggestedPaths] = useState<SuggestedPath[]>([]);
    const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);
    const [isExpanding, setIsExpanding] = useState(false);
    const [choiceChips, setChoiceChips] = useState<ChoiceChip[] | null>(null);
    const [pendingGoal, setPendingGoal] = useState("");
    const [isLoadingGoal, setIsLoadingGoal] = useState(false);
    const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
    const [hotNodeTitle, setHotNodeTitle] = useState<string | null>(null);
    const [hotDismissed, setHotDismissed] = useState(false);

    const { fitView } = useReactFlow();
    const router = useRouter();

    const [seenVideoIds, setSeenVideoIds] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("nexus_heat");
        if (saved) setVisitCounts(JSON.parse(saved));
    }, []);

    useEffect(() => {
        if (onActiveNodesChange) {
            const activeTitles = nodes
                .filter(n => n.data.status !== "ghost")
                .map(n => n.data.title as string)
                .filter(Boolean);
            onActiveNodesChange(activeTitles);
        }
    }, [nodes, onActiveNodesChange]);

    const handleVideoSeen = useCallback((id: string) => {
        setSeenVideoIds((prev) => {
            if (prev.includes(id)) return prev;
            return [...prev, id];
        });
    }, []);

    const handleInitialize = useCallback(async (goal: string, clarified?: boolean) => {
        setOriginTopic(goal);
        setIsLoadingGoal(true);
        setChoiceChips(null);

        try {
            const response = await fetch("/api/generate-nexus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userGoal: goal,
                    clarified: clarified || false,
                    knownConcepts: resolvedKnownConcepts || undefined,
                }),
            });

            if (!response.ok) throw new Error("Failed to generate nexus");

            const data = await response.json();
            if (data.type === "ambiguous" && data.chips?.length > 0) {
                setChoiceChips(data.chips);
                setPendingGoal(goal);
                setIsLoadingGoal(false);
                return;
            }

            const originNode: Node = {
                id: data.origin.id,
                type: "nexusNode",
                position: data.origin.position,
                data: {
                    title: data.origin.title,
                    summary: data.origin.summary,
                    content: data.origin.content,
                    status: data.origin.status,
                },
            };

            const spawnedNodes: Node[] = (data.initialNodes || []).map((node: any) => ({
                id: node.id,
                type: "nexusNode",
                position: node.position,
                data: {
                    title: node.title,
                    summary: node.summary,
                    content: node.content,
                    status: node.status,
                    youtubeQuery: node.youtubeQuery,
                },
            }));

            const spawnedEdges: Edge[] = (data.initialNodes || []).map((node: any, i: number) => ({
                id: `edge-${data.origin.id}-${node.id}`,
                source: data.origin.id,
                target: node.id,
                animated: true,
                label: i === 0 ? "Start Here" : "Then This",
                style: { stroke: "rgba(45, 212, 191, 0.6)", strokeWidth: 2 },
                labelStyle: { fill: "#9ca3af", fontSize: 12 },
            }));

            setNodes([originNode, ...spawnedNodes]);
            setEdges(spawnedEdges);
            setSuggestedPaths(data.suggestedPaths || []);
            setLastExpandedId(data.origin.id);
            setIsInitialized(true);

            setTimeout(() => fitView({ padding: 0.3 }), 100);
        } catch (error) {
            console.error("Nexus initialization failed:", error);
            setNodes([
                {
                    id: "origin",
                    type: "nexusNode",
                    position: { x: 0, y: 0 },
                    data: { title: goal, summary: "Your learning journey begins here", status: "active" },
                },
            ]);
            setIsInitialized(true);
        }
    }, [setNodes, setEdges, fitView, resolvedKnownConcepts]);

    useEffect(() => {
        if (resolvedTopic && !isInitialized && !isLoadingGoal && !choiceChips) {
            handleInitialize(resolvedTopic);
        }
    }, [resolvedTopic, isInitialized, isLoadingGoal, choiceChips, handleInitialize]);

    const onMove = useCallback((_: unknown, viewport: { zoom: number }) => {
        setZoomLevel(viewport.zoom);
    }, []);

    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (node.data.status !== "ghost") {
            setActiveNode({
                id: node.id,
                title: node.data.title,
                summary: node.data.summary,
                status: node.data.status,
                position: node.position,
            });
        } else {
            setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, status: "active" } } : n)));
        }

        const title = node.data.title;
        setVisitCounts((prev) => {
            const updated = { ...prev, [title]: (prev[title] || 0) + 1 };
            localStorage.setItem("nexus_heat", JSON.stringify(updated));
            const hotEntry = (Object.entries(updated) as Array<[string, number]>).find(([_, c]) => c >= 3);
            if (hotEntry && !hotDismissed) setHotNodeTitle(hotEntry[0]);
            return updated;
        });
    }, [setNodes, hotDismissed]);

    const handleExpand = useCallback(
        async (parentId: string, question: string) => {
            if (isExpanding) return;
            setIsExpanding(true);

            const parentNode = nodes.find((n) => n.id === parentId);
            if (!parentNode) {
                setIsExpanding(false);
                return;
            }

            try {
                const response = await fetch("/api/expand-node", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        parentNodeId: parentId,
                        parentTitle: parentNode.data.title,
                        userQuestion: question,
                        originTopic,
                    }),
                });

                if (!response.ok) throw new Error("Failed to expand node");

                const data = await response.json();
                const siblingCount = edges.filter((e) => e.source === parentId).length;
                const newPosition = calculateNewNodePosition(parentNode.position, siblingCount);

                const newNode: Node = {
                    id: data.newNode.id,
                    type: "nexusNode",
                    position: newPosition,
                    data: {
                        title: data.newNode.title,
                        summary: data.newNode.summary,
                        content: data.newNode.content,
                        status: "ghost",
                        youtubeQuery: data.newNode.youtubeQuery,
                    },
                };

                const newEdge: Edge = {
                    id: data.edge.id,
                    source: parentId,
                    target: data.newNode.id,
                    animated: true,
                    label: data.edge.label,
                    style: { stroke: "rgba(45, 212, 191, 0.6)", strokeWidth: 2 },
                    labelStyle: { fill: "#9ca3af", fontSize: 12 },
                };

                setNodes((nds) => [...nds, newNode]);
                setEdges((eds) => [...eds, newEdge]);
                setSuggestedPaths(data.suggestedPaths || []);
                setLastExpandedId(data.newNode.id);
                setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 50);
            } catch (error) {
                console.error("Node expansion failed:", error);
            } finally {
                setIsExpanding(false);
            }
        },
        [nodes, edges, originTopic, isExpanding, setNodes, setEdges, fitView]
    );

    const handleCloseWorkspace = useCallback(() => {
        setActiveNode(null);
    }, []);

    const handleLaunchCourse = useCallback(
        (nodeTitle: string) => {
            const exploredConcepts = nodes
                .filter((n) => n.data.status !== "ghost")
                .map((n) => n.data.title as string)
                .filter(Boolean);

            const params = new URLSearchParams({
                topic: nodeTitle,
                role: "Self-Learner",
                experience: "Deep Dive",
                nexusOrigin: originTopic || "",
                nexusTrail: exploredConcepts.join(","),
            });
            router.push(`/roadmap?${params.toString()}`);
        },
        [nodes, originTopic, router]
    );

    const nodesWithHandlers = useMemo(() => {
        return nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                zoomLevel,
                onExpand: (question: string) => handleExpand(node.id, question),
                onOpen: () => onNodeClick({} as React.MouseEvent, node),
                onLaunchCourse: () => handleLaunchCourse(node.data.title as string),
                visitCount: visitCounts[node.data.title] || 0,
            },
        }));
    }, [nodes, zoomLevel, handleExpand, onNodeClick, handleLaunchCourse, visitCounts]);

    const handleChipClick = useCallback((chip: ChoiceChip) => {
        handleInitialize(chip.clarifiedGoal, true);
    }, [handleInitialize]);

    const handleBackFromChips = useCallback(() => {
        setChoiceChips(null);
        setPendingGoal("");
        setIsLoadingGoal(false);
    }, []);

    if (!isInitialized) {
        return (
            <OnboardingInput
                onSubmit={(goal) => handleInitialize(goal)}
                chips={choiceChips}
                originalGoal={pendingGoal}
                onChipClick={handleChipClick}
                onBackFromChips={handleBackFromChips}
                isLoading={isLoadingGoal}
            />
        );
    }

    return (
        <div className="w-full h-screen bg-black">
            <AnimatePresence>
                {isExpanding && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-teal-900/90 border border-teal-700 rounded-full flex items-center gap-3"
                    >
                        <span className="animate-spin">🐇</span>
                        <span className="text-sm text-teal-200">Following the rabbit hole...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {suggestedPaths.length > 0 && lastExpandedId && (
                <SuggestedPathsPanel
                    paths={suggestedPaths}
                    parentId={lastExpandedId}
                    onSelect={(question) => handleExpand(lastExpandedId, question)}
                />
            )}

            {hotNodeTitle && !hotDismissed && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 border-l-4 border-teal-500 rounded-xl shadow-2xl"
                >
                    <span className="text-sm text-gray-300">
                        You keep returning to <span className="text-teal-400 font-bold">&quot;{hotNodeTitle}&quot;</span>
                    </span>
                    <button
                        onClick={() => router.push(`/roadmap?topic=${encodeURIComponent(hotNodeTitle)}&role=Self-Learner&experience=Deep Dive&nexusOrigin=${originTopic}`)}
                        className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg"
                    >
                        Go Deep →
                    </button>
                    <button onClick={() => setHotDismissed(true)} className="text-gray-500 hover:text-white text-xs">
                        ✕
                    </button>
                </motion.div>
            )}

            <ReactFlow
                nodes={nodesWithHandlers}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onMove={onMove}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#1e293b" gap={40} size={1} />
                <Controls className="!bg-gray-900 !border-gray-700 !rounded-xl" showInteractive={false} />
                <MiniMap
                    className="!bg-gray-900 !border-gray-700 !rounded-xl"
                    nodeColor={(node) => {
                        if (node.data.status === "mastered") return "#facc15";
                        if (node.data.status === "active") return "#2dd4bf";
                        return "#475569";
                    }}
                    maskColor="rgba(0, 0, 0, 0.85)"
                />
            </ReactFlow>

            <WorkspaceOverlay node={activeNode} onClose={handleCloseWorkspace} originTopic={originTopic} seenVideoIds={seenVideoIds} onVideoSeen={handleVideoSeen} />
        </div>
    );
}
