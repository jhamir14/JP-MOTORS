import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // La moto id 4 ("CB190R") era un duplicado de la id 1 ("CB190R 2024"); se conserva el enlace para campañas ya publicadas.
      { source: "/motos/4", destination: "/motos/1", permanent: true },
    ];
  },
};

export default nextConfig;
