import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';
import {
  isStepUpOtpEnabled,
  isStepUpProtectedPath,
  isStepUpValid,
  STEP_UP_COOKIE,
  VERIFY_STEP_PATH,
} from '@/lib/step-up';

/** Public marketing pages — logged-in users are redirected to /dashboard */
export function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  const prefixes = ['/features', '/pricing', '/about', '/blog'];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/workspace');

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return { response: NextResponse.redirect(url), user: null };
  }

  if (
    user &&
    (request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/register')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return { response: NextResponse.redirect(url), user };
  }

  if (user && isPublicMarketingPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirect.cookies.set(name, value);
    });
    return { response: redirect, user };
  }

  const pathname = request.nextUrl.pathname;
  const stepUpUntil = request.cookies.get(STEP_UP_COOKIE)?.value;

  if (
    user &&
    isStepUpOtpEnabled() &&
    isStepUpProtectedPath(pathname) &&
    !isStepUpValid(stepUpUntil)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = VERIFY_STEP_PATH;
    url.searchParams.set('redirect', pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirect.cookies.set(name, value);
    });
    return { response: redirect, user };
  }

  if (
    user &&
    pathname === VERIFY_STEP_PATH &&
    (!isStepUpOtpEnabled() || isStepUpValid(stepUpUntil))
  ) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
    url.search = '';
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirect.cookies.set(name, value);
    });
    return { response: redirect, user };
  }

  return { response: supabaseResponse, user };
}
