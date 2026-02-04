"use client";
import { useRouter } from "next/navigation"; 
import Onboarding, { OnboardingData } from "@/components/Onboarding"; 

export default function Home() {
  const router = useRouter();

  const handleOnboardingComplete = (data: OnboardingData) => {
    // STRATEGY: Pass state via URL ("Passport Pattern")
    // This ensures the Dashboard ALWAYS has the context it needs
    const params = new URLSearchParams({
      role: data.role,
      experience: data.experience,
      topic: data.topic
    });

    // Navigate to Dashboard with the data
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black pointer-events-none"></div>

      {/* The Onboarding Module */}
      <Onboarding onComplete={handleOnboardingComplete} />
      
    </div>
  );
}