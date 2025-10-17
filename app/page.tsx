import Link from 'next/link'
import { Search, BarChart3, Database, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          네이버 키워드 파인더
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          네이버 검색광고 API를 활용해 황금키워드를 찾아보세요
        </p>
        <Link href="/collect" className="btn-primary text-lg px-8 py-3">
          키워드 수집 시작하기
        </Link>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 text-center">
          <Search className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">연관키워드 수집</h3>
          <p className="text-gray-600">
            시드키워드로부터 관련 키워드를 자동으로 수집합니다
          </p>
        </div>

        <div className="card p-6 text-center">
          <BarChart3 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">상세 지표 분석</h3>
          <p className="text-gray-600">
            검색량, 클릭수, CTR, 경쟁도 등 상세한 데이터를 제공합니다
          </p>
        </div>

        <div className="card p-6 text-center">
          <Database className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">데이터 저장</h3>
          <p className="text-gray-600">
            수집한 키워드 데이터를 안전하게 저장하고 관리합니다
          </p>
        </div>

        <div className="card p-6 text-center">
          <Zap className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">빠른 처리</h3>
          <p className="text-gray-600">
            배치 처리로 대량의 키워드를 효율적으로 수집합니다
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          사용 방법
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">시드키워드 입력</h3>
            <p className="text-gray-600">
              분석하고 싶은 기본 키워드를 입력하세요
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">자동 수집</h3>
            <p className="text-gray-600">
              네이버 API를 통해 연관키워드와 지표를 수집합니다
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-lg">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">결과 분석</h3>
            <p className="text-gray-600">
              수집된 데이터를 분석하여 황금키워드를 찾아보세요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
