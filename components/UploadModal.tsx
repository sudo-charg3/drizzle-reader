"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { addToUploadQueue } from "@/utils/uploadQueue";
import { saveToIndexedDB } from "@/utils/offlineDB";
import { syncEngine } from "@/utils/syncEngine";

interface UploadModalProps {
  userId: string;
  onClose: () => void;
}

export default function UploadModal({ userId, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bookName, setBookName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }
    setFile(f);
    setBookName(f.name.replace(/\.[^/.]+$/, ""));
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!file || !bookName.trim()) return;
    setIsUploading(true);
    setError(null);

    try {
      const pdfId = crypto.randomUUID();
      const storagePath = `${userId}/${pdfId}.pdf`;

      const arrayBuffer = await file.arrayBuffer();

      // 1. Save to local IDB cache
      await saveToIndexedDB(pdfId, arrayBuffer);

      // 2. Queue for upload
      await addToUploadQueue({
        id: pdfId,
        userId,
        bookName: bookName.trim(),
        fileName: file.name,
        fileData: arrayBuffer,
        fileSize: file.size,
        createdAt: new Date().toISOString()
      });

      // 3. Trigger background sync
      syncEngine.triggerSync();

      // 4. Navigate to reader immediately (offline-first)
      router.push(`/reader/${pdfId}`);
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm font-['DM_Sans']">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          disabled={isUploading}
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-['Lora'] mb-6">Add to Library</h2>

        {!file ? (
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragging ? "border-gray-500 bg-gray-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <UploadCloud size={48} strokeWidth={1} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-700 font-light">Drop your PDF here</p>
            <p className="text-sm text-gray-400 mt-2">or click to browse files</p>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
              <div className="w-10 h-12 bg-white border border-gray-200 shadow-sm rounded flex items-center justify-center">
                <span className="text-[10px] font-bold text-gray-400">PDF</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
              <input 
                type="text" 
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-600"
                disabled={isUploading}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button 
              onClick={handleSave}
              disabled={isUploading || !bookName.trim()}
              className="w-full mt-2 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Saving to library...
                </>
              ) : "Save to Library"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
