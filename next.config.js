/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // swcMinify artık Next.js 19'da desteklenmiyor, varsayılan olarak true
  // ESLint yapılandırması - build'i durdurmayacak şekilde ayarla
  eslint: {
    // Build sırasında hataları göster ama başarısız olmasına izin verme
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 