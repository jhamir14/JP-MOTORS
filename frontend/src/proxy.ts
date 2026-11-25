import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección rápida del panel: sin cookie de sesión se redirige al login antes de renderizar.
 * La validación real (token en la BD, usuario activo, rol) la hace cada página/acción con requerirSesion().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const res =
    pathname === "/admin/login" || request.cookies.has("jp_sesion")
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/admin/login", request.url));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
