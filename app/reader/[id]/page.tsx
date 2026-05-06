"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReaderView from "@/components/ReaderView";
import { getLocalPdf, getPdfSettingsLocal } from "@/utils/localStore";

export default function ReaderPage({ params }: { params: { id: string } }) {
  const [pdf, setPdf] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const localPdf = await getLocalPdf(params.id);
        const localSettings = await getPdfSettingsLocal(params.id);

        if (!localPdf) {
           setError("Book not found in local library.");
           return;
        }

        const blob = new Blob([localPdf.fileData], { type: 'application/pdf' });
        const finalFileUrl = URL.createObjectURL(blob);

        setPdf(localPdf);
        setSettings(localSettings || { pdfId: params.id });
        setFileUrl(finalFileUrl);

        // Update last opened
        localPdf.lastOpenedAt = new Date().toISOString();
        const { savePdfLocal } = await import("@/utils/localStore");
        await savePdfLocal(localPdf);

      } catch (err: any) {
        console.error(err);
        setError("Error loading reader.");
      }
    }
    loadData();
  }, [params.id, router]);

  if (error) {
    return <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f7f4ef]">
      <p className="text-xl mb-4 text-gray-800">{error}</p>
      <button onClick={() => router.push('/library')} className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">Back to Library</button>
    </div>;
  }

  if (!fileUrl || !pdf) {
    return <div className="h-screen flex items-center justify-center bg-[#f7f4ef] text-gray-600">Loading Book...</div>;
  }

  return (
    <ReaderView 
      pdf={pdf} 
      initialSettings={settings} 
      fileUrl={fileUrl} 
    />
  );
}
