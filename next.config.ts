/** @type {import('next').NextConfig} */
const nextConfig = {
  // If you need Server Actions config in Next.js 14+, use the top-level "serverActions" key.
  // serverActions: { /* allowedOrigins: [] */ },
  eslint: {
    // We have outstanding lint debt across legacy files; do not block production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporary: ignore type errors during build until legacy files are cleaned up
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
// async redirects() {
//   return [];
// },
// // This ensures middleware is applied only to protected pages
// matcher: ["/((?!_next|favicon.ico|login|signup|onboarding|unauthorized).*)"],

// module.exports = {
//   i18n: {
//     locales: ["en ", "es ", "fr "],
//     defaultLocale: "en ",
//   },
// };
