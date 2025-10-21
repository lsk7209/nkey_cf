/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    SEARCHAD_ACCESS_LICENSE: process.env.SEARCHAD_ACCESS_LICENSE,
    SEARCHAD_SECRET_KEY: process.env.SEARCHAD_SECRET_KEY,
    SEARCHAD_CUSTOMER_ID: process.env.SEARCHAD_CUSTOMER_ID,
    NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
    NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
  }
}

module.exports = nextConfig
