"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. READ URL PASSPORT
  const role = searchParams.get("role") || "Learner";
  const experience = searchParams.get("experience") || "Deep Dive";
  const initialTopic = searchParams.get("topic");

  const [loading, setLoading] = useState(false);

  // 2. AUTO-FORWARDING (If coming from Onboarding)
  useEffect(() => {
    if (initialTopic) {
        setLoading(true);
        // Clear any old stale data from previous sessions
        localStorage.removeItem("generatedCourse");
        router.push(`/roadmap?topic=${encodeURIComponent(initialTopic)}&role=${role}&experience=${experience}`);
    }
  }, [initialTopic, role, experience, router]);

  // 3. SEARCH HANDLER
  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newTopic = e.currentTarget.value;
      if (!newTopic.trim()) return;
      
      setLoading(true);
      
      // CRITICAL FIX: NUKE THE OLD ROADMAP
      // This prevents the "Python" ghost from appearing when you search "Javascript"
      localStorage.removeItem("generatedCourse");
      
      // Construct URL
      const params = new URLSearchParams();
      params.set("topic", newTopic);
      params.set("role", role);
      params.set("experience", experience);
      
      router.push(`/roadmap?${params.toString()}`); 
    }
  };

  // 4. UPLOAD HANDLER
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: "syllabus" | "book") => {
    if (!e.target.files?.[0]) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      formData.append("mode", mode);

      const res = await fetch("/api/upload-syllabus", { method: "POST", body: formData });
      
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      const params = new URLSearchParams();
      params.set("role", role);
      params.set("experience", experience);

      if (mode === "syllabus") {
          localStorage.setItem("generatedCourse", JSON.stringify(data));
          // For uploads, we DO want to use storage, so we set a flag or dummy topic
          params.set("topic", data.courseTitle || "Uploaded Syllabus");
          router.push(`/roadmap?${params.toString()}`);
      } else {
          localStorage.setItem("bookText", data.fullText);
          router.push("/reader");
      }

    } catch (err) {
      console.error(err);
      alert("Processing failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-teal-900/20 via-black to-black pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-10">
        
        <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight">
              Welcome back, <span className="text-teal-500">{role}</span>.
            </h1>
            <p className="text-gray-400">Ready to build some intellectual assets today?</p>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <input 
              type="text" 
              placeholder={`What do you want to learn? (${experience} Mode)`} 
              onKeyDown={handleSearch}
              disabled={loading}
              className="relative w-full p-5 bg-gray-900 border border-gray-800 rounded-lg text-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-all shadow-2xl"
            />
        </div>

        <div className="flex items-center gap-4 opacity-50">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-xs uppercase tracking-widest">OR UPLOAD ASSETS</span>
            <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {/* UPLOAD CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`cursor-pointer p-6 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800 hover:border-teal-500/50 transition-all group text-left ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="text-2xl mb-3">📄</div>
                <h3 className="font-bold text-white mb-1">Sync Syllabus</h3>
                <p className="text-xs text-gray-400">Upload exam PDF. We&apos;ll build the roadmap.</p>
                <input type="file" onChange={(e) => handleUpload(e, "syllabus")} className="hidden" />
            </label>

            <label className={`cursor-pointer p-6 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800 hover:border-purple-500/50 transition-all group text-left ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="text-2xl mb-3">📚</div>
                <h3 className="font-bold text-white mb-1">Smart Reader</h3>
                <p className="text-xs text-gray-400">Upload book for AI margin notes.</p>
                <input type="file" onChange={(e) => handleUpload(e, "book")} className="hidden" />
            </label>
        </div>

        {loading && <div className="text-teal-400 animate-pulse mt-4">Constructing Dojo...</div>}

      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen"></div>}>
      <DashboardContent />
    </Suspense>
  );
}