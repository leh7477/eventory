/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 관리자 이미지 업로드(서버 액션)용 본문 크기 한도 (기본 1MB → 30MB)
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
