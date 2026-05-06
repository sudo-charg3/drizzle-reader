import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pdfId, lastPage, pagesRead, highlights, theme, font, fontSize, lineSpacing, totalPages } = body;

    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (lastPage !== undefined) updates.last_page = lastPage;
    if (pagesRead !== undefined) updates.pages_read = pagesRead;
    if (highlights !== undefined) updates.highlights = highlights;
    if (theme !== undefined) updates.theme = theme;
    if (font !== undefined) updates.font = font;
    if (fontSize !== undefined) updates.font_size = fontSize;
    if (lineSpacing !== undefined) updates.line_spacing = lineSpacing;
    if (totalPages !== undefined) updates.total_pages = totalPages;

    const { error } = await supabase
      .from('pdf_settings')
      .update(updates)
      .eq('pdf_id', pdfId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
