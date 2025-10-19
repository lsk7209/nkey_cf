import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '네이버 키워드 파인더',
  description: '네이버 검색광고 API를 활용한 황금키워드 찾기 도구',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    네이버 키워드 파인더
                  </h1>
                </div>
                    <nav className="flex space-x-4">
                      <a href="/manual" className="text-gray-600 hover:text-gray-900">
                        수동수집
                      </a>
                      <a href="/auto-collect" className="text-gray-600 hover:text-gray-900">
                        자동수집
                      </a>
                      <a href="/auto-collect2" className="text-gray-600 hover:text-gray-900">
                        자동수집2
                      </a>
                      <a href="/auto-collect3" className="text-green-600 hover:text-green-900 font-medium">
                        자동수집3
                      </a>
                      <a href="/data" className="text-gray-600 hover:text-gray-900">
                        데이터
                      </a>
                      <a href="/settings" className="text-gray-600 hover:text-gray-900">
                        환경설정
                      </a>
                      <a href="/force-stop" className="text-red-600 hover:text-red-900 font-medium">
                        강제중단
                      </a>
                    </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
