import { getPendingUploads, removeUpload } from './uploadQueue';
import { getSettingsQueue, removeSettingFromQueue } from './settingsQueue';
import { createClient } from './supabase/client';

class SyncEngine {
  private isSyncing = false;
  private listeners: Set<(status: string) => void> = new Set();
  private supabase = createClient();

  subscribe(listener: (status: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(status: string) {
    this.listeners.forEach((l) => l(status));
  }

  async triggerSync() {
    if (this.isSyncing) return;
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      this.notify('offline');
      return;
    }
    
    this.isSyncing = true;
    this.notify('syncing');

    try {
      // 1. Upload new PDFs
      const uploads = await getPendingUploads();
      for (const upload of uploads) {
        const storagePath = `${upload.userId}/${upload.id}.pdf`;
        const blob = new Blob([upload.fileData], { type: 'application/pdf' });
        
        const { error: uploadError } = await this.supabase.storage
          .from("pdfs")
          .upload(storagePath, blob, { cacheControl: "3600", upsert: false });

        if (!uploadError || uploadError.message?.includes('already exists')) {
          await this.supabase.from("pdfs").upsert({
            id: upload.id,
            user_id: upload.userId,
            name: upload.bookName,
            file_name: upload.fileName,
            storage_path: storagePath,
            file_size_bytes: upload.fileSize,
            last_opened_at: upload.createdAt
          });

          await this.supabase.from("pdf_settings").insert({
            pdf_id: upload.id,
            user_id: upload.userId,
            theme: "paper",
            font_size: 17,
            font: "lora",
            line_spacing: "comfortable",
            last_page: 1,
            pages_read: 0,
            total_pages: 0,
            highlights: []
          });

          await removeUpload(upload.id);
        }
      }

      // 2. Sync settings & highlights
      const settingsTasks = await getSettingsQueue();
      for (const task of settingsTasks) {
        let updatePayload: any = {
           ...(task.payload.theme && { theme: task.payload.theme }),
           ...(task.payload.font_size && { font_size: task.payload.font_size }),
           ...(task.payload.font && { font: task.payload.font }),
           ...(task.payload.line_spacing && { line_spacing: task.payload.line_spacing }),
           ...(task.payload.last_page && { last_page: task.payload.last_page }),
           ...(task.payload.highlights && { highlights: task.payload.highlights }),
           ...(task.payload.pages_read && { pages_read: task.payload.pages_read }),
           ...(task.payload.total_pages && { total_pages: task.payload.total_pages })
        };

        const { error } = await this.supabase.from('pdf_settings')
          .update(updatePayload)
          .eq('pdf_id', task.pdfId);
          
        if (!error) {
           await removeSettingFromQueue(task.id);
        }
      }

      this.notify('synced');
    } catch (err) {
      console.error('Sync error:', err);
      this.notify('error');
    } finally {
      this.isSyncing = false;
      setTimeout(() => this.notify('idle'), 3000);
    }
  }
}

export const syncEngine = new SyncEngine();