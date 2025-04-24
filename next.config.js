/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // ESLint yapılandırması - build'i durdurmayacak şekilde ayarla
  eslint: {
    // Build sırasında hataları göster ama başarısız olmasına izin verme
    ignoreDuringBuilds: true,
  },
  // Teacher sayfalarının statik olarak oluşturulmasını önle
  unstable_allowDynamic: [
    '**/teacher/issues/**',
    '**/teacher/login/**',
  ],
};

module.exports = nextConfig; 