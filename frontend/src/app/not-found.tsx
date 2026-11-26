import Link from "next/link";
import { PublicChrome } from "@/components/PublicChrome";

export default function NotFound() {
  return (
    <PublicChrome>
      <main className="noche relative isolate flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-5 py-20 text-center">
        <div aria-hidden className="anillo girar-lento absolute top-1/2 left-1/2 -z-10 size-[min(80vw,520px)] -translate-x-1/2 -translate-y-1/2 opacity-30 [--grosor:2px]" />
        <p className="text-sm font-medium text-oro-claro">Error 404</p>
        <h1 className="display mt-4 text-[2.4rem] text-white md:text-[3.4rem]">No encontramos esta página</h1>
        <p className="mt-4 max-w-md text-white/65">Puede que el enlace haya cambiado. Revisa el catálogo o vuelve al inicio.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/motos" className="btn-oro">Ver motos</Link>
          <Link href="/celulares" className="btn-claro">Ver celulares</Link>
          <Link href="/" className="btn-claro">Ir al inicio</Link>
        </div>
      </main>
    </PublicChrome>
  );
}
