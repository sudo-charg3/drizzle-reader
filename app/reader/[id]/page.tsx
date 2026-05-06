"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReaderView from "@/components/ReaderView";
import { getFromIndexedDB } from "@/utils/offlineDB";

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [pdf, setPdf] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && navigator.onLine) {
          router.push("/login");
          return;
        }

        // 1. Try local cache first
        const cachedPdfData = await getFromIndexedDB(params.id);
        
        let fetchedPdf = null;
        let fetchedSettings = null;
        let finalFileUrl = null;

        if (navigator.onLine) {
          const { data: p } = await supabase.from("pdfs").select("*").eq("id", params.id).single();
          fetchedPdf = p;
          const { data: s } = await supabase.from("pdf_settings").select("*").eq("pdf_id", params.id).single();
          fetchedSettings = s;
          
          if (p) {
             const { data: signedData } = await supabase.storage.from("pdfs").createSignedUrl(p.storage_path, 3600);
             if (signedData) finalFileUrl = signedData.signedUrl;
          }
        }

        if (cachedPdfData) {
           const blob = new Blob([cachedPdfData], { type: 'application/pdf' });
           finalFileUrl = URL.createObjectURL(blob);
           
           // If offline, we might not have metadata. 
           // In a real app we'd cache metadata in IDB too, but for simplicity we rely on what we can.
           if (!fetchedPdf) fetchedPdf = { id: params.id, name: 'Offline Book' };
           if (!fetchedSettings) fetchedSettings = { pdf_id: params.id };
        } else if (!navigator.onLine) {
           setError("This book is not available offline.");
           return;
        }

        if (!finalFileUrl) {
           setError("Failed to load PDF.");
           return;
        }

        setPdf(fetchedPdf);
        setSettings(fetchedSettings);
        setFileUrl(finalFileUrl);

      } catch (err: any) {
        console.error(err);
        setError("Error loading reader.");
      }
    }
    loadData();
  }, [params.id, router, supabase]);

  if (error) {
    return <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f7f4ef]">
      <p className="text-xl mb-4">{error}</p>
      <button onClick={() => router.push('/library')} className="px-4 py-2 bg-gray-900 text-white rounded">Back to Library</button>
    </div>;
  }

  if (!fileUrl || !pdf) {
    return <div className="h-screen flex items-center justify-center bg-[#f7f4ef]">Loading Book...</div>;
  }

  return (
    <ReaderView 
      pdf={pdf} 
      initialSettings={settings} 
      fileUrl={fileUrl} 
    />
  );
}
