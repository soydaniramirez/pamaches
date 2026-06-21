/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El proyecto solo usa imágenes locales (public/), así que no necesitamos
  // configurar dominios remotos. Mantener el config mínimo y seguro.
};

export default nextConfig;
