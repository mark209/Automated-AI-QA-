export function shouldRequireAuthentication(pathname: string) {
  return pathname !== "/login" && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/");
}
