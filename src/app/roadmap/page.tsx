"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion"; 
import Workspace from "@/components/Workspace"; 

function RoadmapContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [course, setCourse] = useState<any>(null);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeModule, setActiveModule] = useState<any>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. EXTRACT PASSPORT DATA
  const topic = searchParams.get("topic");
  const role = searchParams.get("role") || "Student";
  const experience = searchParams.get("experience") || "Deep Dive";

  useEffect(() => {
    const init = async () => {
      // A. Check for Uploaded Syllabus (High Priority)
      const savedCourse = localStorage.getItem("generatedCourse");
      if (savedCourse) {
        setCourse(JSON.parse(savedCourse));
        return;
      }

      // B. Generate from Topic (Live AI)
      if (topic) {
        try {
          const res = await fetch('/api/generate-roadmap', {
            method: 'POST',
            body: JSON.stringify({ 
                userGoal: topic, 
                userRole: role, 
                experienceLevel: experience 
            })
          });
          
          if (!res.ok) throw new Error("AI Assembly Failed");
          
          const data = await res.json();
          setCourse(data);
          localStorage.setItem("generatedCourse", JSON.stringify(data));
        } catch (e) {
          console.error(e);
          setError("Failed to generate roadmap. The AI is busy.");
        }
      } else {
        router.push("/dashboard");
      }
    };

    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, [topic, role, experience, router]);

  // --- RENDER STATES ---

  if (error) return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-red-500">
        <p className="mb-4 text-xl">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-gray-800 rounded hover:bg-gray-700 text-white">
            Return to Dashboard
        </button>
    </div>
  );

  if (!course) return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-teal-500 p-4 text-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Constructing Dojo</h2>
        <p className="text-gray-400 font-mono text-sm">
            Tailoring content for <span className="text-teal-400">{role}</span> ({experience})...
        </p>
    </div>
  );

  // VIEW 1: THE WORKSPACE (Video Player)
  // FIX: Added a wrapping div with a floating "Back" button
  if (activeModule) {
      return (
          <div className="relative w-full h-screen bg-black overflow-hidden">
              {/* FLOATING BACK BUTTON: Always visible on top of the workspace */}
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
                  module={activeModule} 
                  onBack={() => setActiveModule(null)} 
              />
          </div>
      );
  }

  // VIEW 2: THE ROADMAP OVERVIEW
  return (
      <div className="min-h-screen bg-black text-white p-8 overflow-y-auto">
          
          {/* NAVIGATION: Back to Dashboard */}
          <button 
              onClick={() => router.push("/dashboard")}
              className="fixed top-6 left-6 z-50 px-4 py-2 text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors bg-black/20 backdrop-blur-sm rounded-lg"
          >
              <span>←</span> Dashboard
          </button>

          {/* Persona Badge */}
          <div className="fixed top-6 right-6 z-50 px-4 py-1 bg-teal-900/30 border border-teal-500/30 rounded-full text-xs font-mono text-teal-400 pointer-events-none backdrop-blur-md">
            🎯 {role} Mode • {experience}
          </div>

          <div className="max-w-4xl mx-auto mt-16">
              <div className="mb-12 text-center">
                  <div className="text-teal-500 font-mono text-xs uppercase tracking-widest mb-4">Learning Path Generated</div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 leading-tight">
                      {course.courseTitle}
                  </h1>
                  <p className="text-gray-400 text-lg">Select a module to begin your deep work.</p>
              </div>

              <div className="space-y-4 pb-20">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {course.modules.map((mod: any, index: number) => (
                      <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => setActiveModule(mod)}
                          className="group cursor-pointer bg-gray-900/40 border border-gray-800 p-8 rounded-2xl flex items-center gap-6 hover:border-teal-500/50 hover:bg-gray-900/80 transition-all duration-300 shadow-lg hover:shadow-teal-900/20"
                      >
                          <div className="flex-shrink-0 w-16 h-10 bg-gray-800 rounded-md flex items-center justify-center font-mono text-sm text-teal-500 group-hover:bg-teal-900/30 group-hover:text-teal-300 transition-colors border border-gray-700 group-hover:border-teal-500/30">
                              MOD {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-200 group-hover:text-white mb-2 transition-colors">
                                  {mod.moduleTitle}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                  <span>{mod.chapters.length} Chapters</span>
                                  <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                  <span>~{mod.chapters.length * 15} mins</span>
                              </div>
                          </div>
                          <div className="text-gray-600 group-hover:text-teal-500 transform group-hover:translate-x-2 transition-transform text-2xl">
                              →
                          </div>
                      </motion.div>
                  ))}
              </div>
          </div>
      </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={<div className="bg-black h-screen" />}>
      <RoadmapContent />
    </Suspense>
  );
}