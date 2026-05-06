import { useState, useCallback } from 'react';
import { addSettingsToQueue } from '@/utils/settingsQueue';
import { syncEngine } from '@/utils/syncEngine';

export function usePdfSettings(pdfId: string, initialSettings: any) {
  const [settings, setSettings] = useState(initialSettings || {});

  const updateSetting = useCallback(async (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    await addSettingsToQueue(pdfId, { [key]: value });
    syncEngine.triggerSync();
  }, [pdfId]);

  return { settings, updateSetting };
}