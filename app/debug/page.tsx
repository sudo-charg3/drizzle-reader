"use client";

import { useEffect, useState } from "react";
import { getPendingUploads } from "@/utils/uploadQueue";
import { getSettingsQueue } from "@/utils/settingsQueue";
import { syncEngine } from "@/utils/syncEngine";

export default function DebugPanel() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);

  useEffect(() => {
    getPendingUploads().then(setUploads);
    getSettingsQueue().then(setSettings);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Sync Queue</h1>
      
      <button 
        onClick={() => syncEngine.triggerSync()}
        className="mb-8 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Force Sync Now
      </button>

      <h2 className="text-xl mb-2">Pending Uploads ({uploads.length})</h2>
      <pre className="p-4 bg-gray-100 rounded mb-8 overflow-auto">
        {JSON.stringify(uploads, null, 2)}
      </pre>

      <h2 className="text-xl mb-2">Pending Settings Syncs ({settings.length})</h2>
      <pre className="p-4 bg-gray-100 rounded overflow-auto">
        {JSON.stringify(settings, null, 2)}
      </pre>
    </div>
  );
}