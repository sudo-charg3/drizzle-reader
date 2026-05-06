// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // If offline (no supabase connection), don't redirect — let client handle auth
  // Only redirect on protected routes if we can confirm no session exists
  const response = NextResponse.next();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    const isProtected = request.nextUrl.pathname.startsWith('/library') ||
                        request.nextUrl.pathname.startsWith('/reader');

    if (isProtected && !session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (err) {
    // Network error (offline) — allow through, client will handle
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/', '/library/:path*', '/reader/:path*'],
};
