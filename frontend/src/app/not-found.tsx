import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <h1 className="text-5xl text-accent [-webkit-text-fill-color:currentColor]">404</h1>
      <p className="mt-4 text-xl">No encontramos la página que buscas.</p>
      <ButtonLink href="/motos" className="mt-8">Ver catálogo de motos</ButtonLink>
    </main>
  );
}
