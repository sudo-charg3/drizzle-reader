import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid using getSession() on the server as it can be spoofed.
    // Use getUser() for security.
    const { data: { user } } = await supabase.auth.getUser()

    const isProtected = request.nextUrl.pathname.startsWith('/library') ||
        request.nextUrl.pathname.startsWith('/reader');

    // 1. Redirect to login if accessing protected route without session
    if (!user && isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. Redirect to library if already logged in and hitting root or login
    if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/library'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}