import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">페이지를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-8">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              홈으로 돌아가기
            </Link>
            <div className="text-sm text-gray-500">
              <Link href="/manual" className="text-blue-600 hover:text-blue-500 mr-4">
                수동수집
              </Link>
              <Link href="/auto-collect3" className="text-green-600 hover:text-green-500 mr-4">
                자동수집3
              </Link>
              <Link href="/data" className="text-gray-600 hover:text-gray-500">
                데이터
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
