import { useState, useCallback } from 'react';
import { getPdfSettingsLocal, savePdfSettingsLocal } from '@/utils/localStore';

export function usePdfSettings(pdfId: string, initialSettings: any) {
  const [settings, setSettings] = useState(initialSettings || {});

  const updateSetting = useCallback(async (key: string, value: any) => {
    setSettings((prev: any) => {
      const updated = { ...prev, [key]: value };
      // Persist async
      getPdfSettingsLocal(pdfId).then((existing) => {
        savePdfSettingsLocal({ ...(existing || { pdfId }), ...updated });
      });
      return updated;
    });
  }, [pdfId]);

  return { settings, updateSetting };
}