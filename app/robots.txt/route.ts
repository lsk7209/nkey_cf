import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.SITE_URL || 'https://nkey-cf.pages.dev'
  
  const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# API routes are not indexed
Disallow: /api/
Disallow: /_next/
Disallow: /workers/`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400'
    }
  })
}
