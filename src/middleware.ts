import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/admin",
  "/secretary",
  "/doctor",
  "/patient/dashboard",
  "/patient/appointments",
  "/patient/treatment-plan",
  "/patient/sessions",
  "/patient/orthodontics",
  "/patient/operations",
  "/patient/prescriptions",
  "/patient/payments",
  "/patient/files",
  "/patient/profile",
  "/patients",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("alwisam_session")?.value;
  if (!token) {
    const isPatientArea =
      pathname.startsWith("/patient/") && pathname !== "/patient/login";
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = isPatientArea ? "/patient/login" : "/staff/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/secretary/:path*",
    "/doctor/:path*",
    "/patient/:path*",
    "/patients/:path*",
  ],
};
