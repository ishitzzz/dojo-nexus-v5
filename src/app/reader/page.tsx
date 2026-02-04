"use client";
import { useEffect, useState } from "react";
import ReaderWorkspace from "@/components/ReaderWorkspace"; 

export default function ReaderPage() {
  const [text, setText] = useState("");

  useEffect(() => {
    // FIX: Timeout solves strict mode warnings for synchronous state updates
    const timer = setTimeout(() => {
        const bookText = localStorage.getItem("bookText");
        if (bookText) setText(bookText);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!text) return <div className="bg-black h-screen flex items-center justify-center text-gray-500">No book loaded. Upload one from Dashboard.</div>;

  return <ReaderWorkspace pdfText={text} />;
}