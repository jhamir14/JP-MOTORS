import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminForm, BotonEnviar } from "@/components/admin/AdminForm";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui";
import { obtenerSesion } from "@/lib/server/auth";
import { iniciarSesion } from "./actions";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await obtenerSesion()) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-ink px-4 py-10">
      <div className="w-full max-w-[400px] rounded-3xl bg-surface p-7 shadow-lift md:p-9">
        <Logo />
        <h1 className="mt-6 text-2xl">Panel administrativo</h1>
        <p className="mt-1 text-sm text-muted">Ingresa con tu cuenta del personal.</p>
        <AdminForm action={iniciarSesion} className="mt-6 grid gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Correo</label>
            <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Contraseña</label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <BotonEnviar block pendiente="Ingresando…">Ingresar</BotonEnviar>
        </AdminForm>
        <p className="mt-6 text-xs text-muted">
          ¿Olvidaste tu contraseña? Pide a un superadministrador que la restablezca desde Personal.
        </p>
      </div>
    </main>
  );
}
