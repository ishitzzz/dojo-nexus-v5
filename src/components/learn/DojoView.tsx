"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Workspace from "@/components/Workspace";

interface Chapter {
  chapterTitle: string;
  youtubeQuery: string;
}

interface Module {
  moduleTitle: string;
  atomicTruth: string;
  narrativeBridge: string;
  estimatedDuration: string;
  chapters?: Chapter[];
  playlist?: PlaylistResult;
}

interface PlaylistResult {
  entries: Array<{
    videoId: string;
    topicMatched: string;
  }>;
}

interface Course {
  courseTitle: string;
  anchorChannel: string;
  modules: Module[];
  playlist?: PlaylistResult;
}

interface DojoViewProps {
  initialTopic?: string;
  initialRole?: string;
  initialExperience?: string;
  nexusTrail?: string;
  nexusOrigin?: string;
  onCompletedModulesChange?: (titles: string[]) => void;
}

export default function DojoView({
  initialTopic,
  initialRole,
  initialExperience,
  nexusTrail,
  nexusOrigin,
  onCompletedModulesChange,
}: DojoViewProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [loadingModuleIdx, setLoadingModuleIdx] = useState<number | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const topic = initialTopic ?? searchParams.get("topic");
  const role = initialRole ?? searchParams.get("role") ?? "Student";
  const experience = initialExperience ?? searchParams.get("experience") ?? "Deep Dive";
  const resolvedNexusTrail = nexusTrail ?? searchParams.get("nexusTrail") ?? "";
  const resolvedNexusOrigin = nexusOrigin ?? searchParams.get("nexusOrigin") ?? "";

  const [seenVideoIds, setSeenVideoIds] = useState<string[]>([]);

  useEffect(() => {
    if (course && onCompletedModulesChange) {
      const unlocked = course.modules
        .filter(m => m.chapters && m.chapters.length > 0)
        .map(m => m.moduleTitle);
      onCompletedModulesChange(unlocked);
    }
  }, [course, onCompletedModulesChange]);

  const handleVideoSeen = (videoId: string) => {
    setSeenVideoIds(prev => {
      if (prev.includes(videoId)) return prev;
      return [...prev, videoId];
    });
  };

  useEffect(() => {
    const init = async () => {
      const savedCourse = localStorage.getItem("generatedCourse");
      if (savedCourse) {
        setCourse(JSON.parse(savedCourse));
        return;
      }

      if (topic) {
        try {
          const res = await fetch("/api/generate-roadmap", {
            method: "POST",
            body: JSON.stringify({
              userGoal: topic,
              userRole: role,
              experienceLevel: experience,
              mode: "skeleton",
              nexusTrail: resolvedNexusTrail,
              nexusOrigin: resolvedNexusOrigin,
            }),
          });

          if (!res.ok) throw new Error("Architecture Design Failed");

          const data = await res.json();
          setCourse(data);
          localStorage.setItem("generatedCourse", JSON.stringify(data));
        } catch (e) {
          console.error(e);
          setError("Failed to design the course architecture. The Architect is busy.");
        }
      } else {
        router.push("/dashboard");
      }
    };

    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, [topic, role, experience, resolvedNexusTrail, resolvedNexusOrigin, router]);

  const handleModuleClick = async (mod: Module, index: number) => {
    if (mod.chapters && mod.chapters.length > 0) {
      setActiveModule({ ...mod, playlist: course?.playlist });
      return;
    }

    setLoadingModuleIdx(index);
    try {
      const previousModule = index > 0 && course ? course.modules[index - 1] : null;

      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        body: JSON.stringify({
          userGoal: topic,
          experienceLevel: experience,
          mode: "module_details",
          moduleContext: {
            moduleTitle: mod.moduleTitle,
            previousModuleTitle: previousModule?.moduleTitle,
          },
        }),
      });

      if (!res.ok) throw new Error("Module Expansion Failed");
      const details = await res.json();

      if (course) {
        const updatedModules = [...course.modules];
        updatedModules[index] = { ...mod, ...details };
        const updatedCourse = { ...course, modules: updatedModules };

        setCourse(updatedCourse);
        localStorage.setItem("generatedCourse", JSON.stringify(updatedCourse));
        setActiveModule({ ...updatedModules[index], playlist: updatedCourse.playlist });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to unlock module. Please try again.");
    } finally {
      setLoadingModuleIdx(null);
    }
  };

  if (error) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-red-500">
        <p className="mb-4 text-xl font-mono">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-gray-800 rounded hover:bg-gray-700 text-white">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-teal-500 p-4 text-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Designing Architecture...</h2>
        <p className="text-gray-400 font-mono text-sm">
          Drafting the First Principles path for <span className="text-teal-400">{role}</span>...
        </p>
      </div>
    );
  }

  if (activeModule) {
    return (
      <div className="relative w-full h-screen bg-black overflow-hidden">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => setActiveModule(null)}
            className="flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/90 text-white rounded-full border border-gray-700 backdrop-blur-md transition-all group shadow-2xl"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span className="text-sm font-medium">Back to Roadmap</span>
          </button>
        </div>

        <Workspace
          module={{ ...activeModule, chapters: activeModule.chapters || [] }}
          onBack={() => setActiveModule(null)}
          userContext={{ role, experience, topic: topic || "" }}
          anchorChannel={course.anchorChannel || null}
          seenVideoIds={seenVideoIds}
          onVideoSeen={handleVideoSeen}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 overflow-y-auto">
      <button
        onClick={() => router.push("/dashboard")}
        className="fixed top-6 left-6 z-50 px-4 py-2 text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors bg-black/20 backdrop-blur-sm rounded-lg"
      >
        <span>←</span> Dashboard
      </button>

      <div className="fixed top-6 right-6 z-50 px-4 py-1 bg-teal-900/30 border border-teal-500/30 rounded-full text-xs font-mono text-teal-400 pointer-events-none backdrop-blur-md">
        🎯 {role} Mode • {experience}
      </div>

      <div className="max-w-4xl mx-auto mt-16">
        <div className="mb-12 text-center">
          <div className="text-teal-500 font-mono text-xs uppercase tracking-widest mb-4">Evolutionary Chain Generated</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 leading-tight">
            {course.courseTitle}
          </h1>
          <p className="text-gray-400 text-lg">Select a module to <span className="text-teal-400 font-bold">Deep Dive</span>.</p>
        </div>

        <div className="space-y-4 pb-20">
          {course.modules.map((mod, index) => {
            const isUnlocked = mod.chapters && mod.chapters.length > 0;
            const isLoading = loadingModuleIdx === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => !isLoading && handleModuleClick(mod, index)}
                className={`group cursor-pointer border p-8 rounded-2xl flex items-center gap-6 transition-all duration-300 shadow-lg relative overflow-hidden
                    ${isUnlocked
                    ? "bg-gray-900/40 border-gray-800 hover:border-teal-500/50 hover:bg-gray-900/80 hover:shadow-teal-900/20"
                    : "bg-gray-950/40 border-gray-900 opacity-80 hover:opacity-100 hover:border-gray-700"
                  }
                `}
              >
                {isLoading && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-teal-500 font-mono text-xs animate-pulse">EXPANDING UNIVERSE...</span>
                    </div>
                  </div>
                )}

                <div className={`flex-shrink-0 w-16 h-10 rounded-md flex items-center justify-center font-mono text-sm border
                    ${isUnlocked
                    ? "bg-gray-800 text-teal-500 group-hover:bg-teal-900/30 group-hover:text-teal-300 border-gray-700 group-hover:border-teal-500/30"
                    : "bg-gray-900 text-gray-600 border-gray-800"
                  } transition-colors`}>
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${isUnlocked ? "text-gray-200 group-hover:text-white" : "text-gray-500 group-hover:text-gray-300"}`}>
                    {mod.moduleTitle}
                  </h3>
                  <p className="text-sm text-teal-400/80 font-mono mb-2">{mod.atomicTruth}</p>

                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className={isUnlocked ? "" : "italic"}>{isUnlocked ? `${mod.chapters!.length} Chapters` : "Tap to Expand"}</span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                    <span>~{mod.estimatedDuration || "45 mins"}</span>
                  </div>
                </div>

                <div className={`transform transition-transform text-2xl ${isUnlocked ? "text-gray-600 group-hover:text-teal-500 group-hover:translate-x-2" : "text-gray-800 group-hover:text-gray-600"}`}>
                  {isUnlocked ? "→" : "🔒"}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
