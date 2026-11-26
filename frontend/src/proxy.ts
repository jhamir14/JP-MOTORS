import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_PUERTA, huellaPuerta as huella, rutaSecreta } from "@/lib/rutaPanel";

/**
 * Protección del panel antes de renderizar.
 *
 * Ruta secreta (variable de entorno PANEL_RUTA_SECRETA, p. ej. «acceso-7k2q9x4m», solo servidor):
 *   · /<ruta secreta> muestra el login del panel (internamente es /admin/login) y deja en el navegador
 *     una cookie «puerta» que recuerda que ese navegador conoce la ruta.
 *   · Cualquier /admin… sin sesión responde 404 (como si el panel no existiera), incluido /admin/login.
 *     Si el navegador ya conoce la ruta (cookie puerta), se le lleva al login secreto en vez del 404.
 *   · Con sesión, /admin… funciona como siempre (todos los enlaces internos siguen siendo /admin/…).
 * Sin PANEL_RUTA_SECRETA el panel se comporta como antes (login en /admin/login).
 *
 * La validación real de la sesión (token en la BD, usuario activo, rol) la hace cada página/acción con requerirSesion().
 */
const COOKIE_SESION = "jp_sesion";

const sinIndexar = (res: NextResponse) => {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
};

/** 404 real: se reescribe a una ruta inexistente para que Next muestre su página «no encontrada». */
const noExiste = (request: NextRequest) => sinIndexar(NextResponse.rewrite(new URL("/_no-existe", request.url)));

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secreta = rutaSecreta();
  const esPanel = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!secreta) {
    if (!esPanel) return NextResponse.next();
    return sinIndexar(
      pathname === "/admin/login" || request.cookies.has(COOKIE_SESION)
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/admin/login", request.url)),
    );
  }

  // Puerta: /<ruta secreta> → login del panel.
  if (pathname === `/${secreta}`) {
    const res = sinIndexar(NextResponse.rewrite(new URL("/admin/login", request.url)));
    res.cookies.set(COOKIE_PUERTA, await huella(secreta), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }
  if (!esPanel) return NextResponse.next();

  const conoceLaPuerta = request.cookies.get(COOKIE_PUERTA)?.value === (await huella(secreta));
  // El login solo se abre por la ruta secreta.
  if (pathname === "/admin/login") {
    return conoceLaPuerta ? sinIndexar(NextResponse.redirect(new URL(`/${secreta}`, request.url))) : noExiste(request);
  }
  if (request.cookies.has(COOKIE_SESION)) return sinIndexar(NextResponse.next());
  return conoceLaPuerta ? sinIndexar(NextResponse.redirect(new URL(`/${secreta}`, request.url))) : noExiste(request);
}

export const config = {
  // Todo menos archivos estáticos: la ruta secreta no se puede escribir aquí (es una variable de entorno).
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\.(?:png|jpe?g|webp|avif|svg|ico|gif|js|css|txt|xml|webmanifest|woff2?)$).*)"],
};
