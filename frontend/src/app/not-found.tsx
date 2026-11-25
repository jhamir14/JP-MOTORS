import { PublicChrome } from "@/components/PublicChrome";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <PublicChrome>
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <span className="eyebrow">Error 404</span>
      <h1 className="mt-3 text-[2.4rem]">No encontramos esta página</h1>
      <p className="mt-3 text-muted">Puede que el enlace haya cambiado. Te ayudamos a encontrar lo que buscas.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Ir al inicio</ButtonLink>
        <ButtonLink href="/financiamiento" variant="outline">Solicitar crédito</ButtonLink>
      </div>
    </main>
    </PublicChrome>
  );
}
