import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { profileFromUser, canAccess, sectionKeyForPath } from "@/lib/admin/sections";
import { ACTIVITY_COOKIE, isIdleExpired } from "@/lib/admin/session";

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 무활동 자동 로그아웃: 마지막 /admin 요청 후 IDLE_MS(기본 12시간) 지나면 로그인 해제
  let expired = false;
  if (user && isIdleExpired(request.cookies.get(ACTIVITY_COOKIE)?.value)) {
    expired = true;
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // 서버 세션 해제 실패해도 아래에서 쿠키를 지우므로 계속 진행
    }
    user = null;
  }

  // 모든 응답에 공통 적용: 만료 시 로그인 쿠키 삭제, 로그인 상태면 활동 시각 갱신
  const finalize = (res) => {
    if (expired) {
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith("sb-")) res.cookies.set(name, "", { path: "/", maxAge: 0 });
      });
    }
    if (user) {
      res.cookies.set(ACTIVITY_COOKIE, String(Date.now()), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      // 로그인 안 된 상태에서는 이전 활동 기록을 지워, 다음 로그인 때 옛 시각으로 만료되지 않게
      res.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return res;
  };

  // /admin 은 로그인 페이지 자체. /admin/* 하위는 인증 필요.
  const isAdminArea =
    pathname.startsWith("/admin/") && pathname !== "/admin";

  if (isAdminArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return finalize(NextResponse.redirect(url));
  }

  // 로그인 상태에서 권한 없는 메뉴 접근 시 대시보드로
  if (isAdminArea && user) {
    const sectionKey = sectionKeyForPath(pathname);
    if (sectionKey && !canAccess(profileFromUser(user), sectionKey)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return finalize(NextResponse.redirect(url));
    }
  }

  // 이미 로그인된 상태로 로그인 페이지 접근 시 대시보드로
  if (pathname === "/admin" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return finalize(NextResponse.redirect(url));
  }

  return finalize(response);
}

export const config = {
  matcher: ["/admin/:path*"],
};
