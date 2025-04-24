/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint yapılandırması - build'i durdurmayacak şekilde ayarla
  eslint: {
    // Build sırasında hataları göster ama başarısız olmasına izin verme
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 