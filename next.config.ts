/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true, // Or false, depending on your needs
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
