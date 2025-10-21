/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  experimental: {
    forceSwcTransforms: true
  },
  // 빌드 최적화
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'sharp', 'canvas'];
    }
    return config;
  },
  images: {
    remotePatterns: [{ 
      protocol: 'https', 
      hostname: '**' 
    }]
  }
}

module.exports = nextConfig
