/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Teacher sayfalarının statik olarak oluşturulmasını önle
  unstable_allowDynamic: [
    '**/teacher/issues/**',
    '**/teacher/login/**',
  ],
};

module.exports = nextConfig; 