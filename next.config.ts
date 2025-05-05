/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverActions: true,
  },
  async redirects() {
    return [];
  },
  // This ensures middleware is applied only to protected pages
  matcher: ["/((?!_next|favicon.ico|login|signup|onboarding|unauthorized).*)"],
};

export default nextConfig;
