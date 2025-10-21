/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { 
    runtime: 'edge' 
  },
  output: 'standalone',
  images: {
    remotePatterns: [{ 
      protocol: 'https', 
      hostname: '**' 
    }]
  },
  env: {
    SEARCHAD_BASE: process.env.SEARCHAD_BASE,
    SEARCHAD_API_KEY: process.env.SEARCHAD_API_KEY,
    SEARCHAD_SECRET: process.env.SEARCHAD_SECRET,
    SEARCHAD_CUSTOMER_ID: process.env.SEARCHAD_CUSTOMER_ID,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
