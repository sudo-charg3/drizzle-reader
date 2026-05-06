"use client";

import { useState, useRef, useCallback } from "react";
import { UploadCloud, X, File, Loader2 } from "lucide-react";
import { savePdfLocal } from "@/utils/localStore";

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        alert("Please upload a valid PDF file.");
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const id = crypto.randomUUID();

      await savePdfLocal({
        id,
        name: file.name.replace(".pdf", ""),
        fileName: file.name,
        fileData: arrayBuffer,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      });

      onClose();
    } catch (error) {
      console.error("Failed to process PDF:", error);
      alert("Failed to save PDF locally.");
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[var(--card-bg)] rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
        style={{ border: "1px solid var(--card-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: "var(--card-border)" }}>
          <h2 className="text-xl font-['Lora']" style={{ color: "var(--text-color)" }}>Add to Library</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 transition-all"
            style={{ color: "var(--text-color)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging ? "border-indigo-500 bg-indigo-500/5" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: isDragging ? undefined : "var(--card-border)" }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDragging ? "bg-indigo-500 text-white" : "bg-black/5 dark:bg-white/10"}`} style={{ color: isDragging ? undefined : "var(--text-color)" }}>
                <UploadCloud size={24} />
              </div>
              <p className="font-medium mb-1" style={{ color: "var(--text-color)" }}>Click to browse or drag PDF</p>
              <p className="text-xs opacity-60" style={{ color: "var(--text-color)" }}>Maximum file size: unlimited (stored locally)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf"
                className="hidden"
              />
            </div>
          ) : (
            <div className="w-full h-48 border rounded-2xl flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" style={{ borderColor: "var(--card-border)", background: "var(--bg-color)" }}>
              <button 
                onClick={() => setFile(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-colors"
                title="Remove file"
              >
                <X size={14} />
              </button>
              
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-500 text-white shadow-lg shadow-red-500/20">
                <File size={32} />
              </div>
              <p className="font-semibold text-sm w-full truncate px-4" style={{ color: "var(--text-color)" }}>{file.name}</p>
              <p className="text-xs opacity-60 mt-1" style={{ color: "var(--text-color)" }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: "var(--text-color)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-6 py-2.5 rounded-xl font-medium text-sm bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading && <Loader2 size={16} className="animate-spin" />}
              {isUploading ? "Saving..." : "Add to Library"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
