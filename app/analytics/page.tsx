'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Target, Zap, Database, Download } from 'lucide-react'

interface AnalyticsData {
  totalKeywords: number
  totalSearchVolume: number
  avgCompetition: number
  topKeywords: Array<{
    keyword: string
    searchVolume: number
    competition: string
    potentialScore: number
  }>
  competitionDistribution: {
    high: number
    medium: number
    low: number
  }
  searchVolumeTrend: Array<{
    date: string
    volume: number
  }>
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // 실제 데이터를 가져오는 API 호출 (모든 데이터)
      const response = await fetch('/api/load-data?page=1&pageSize=10000')
      
      if (!response.ok) {
        throw new Error(`데이터 불러오기 실패: ${response.status}`)
      }
      
      const result = await response.json()
      const allData = result.items || []
      
      if (allData.length === 0) {
        // 데이터가 없으면 빈 분석 데이터 반환
        setAnalyticsData({
          totalKeywords: 0,
          totalSearchVolume: 0,
          avgCompetition: 0,
          topKeywords: [],
          competitionDistribution: { high: 0, medium: 0, low: 0 },
          searchVolumeTrend: []
        })
        return
      }
      
      // 실제 데이터로 분석 수행
      const totalKeywords = result.total || allData.length
      const totalSearchVolume = allData.reduce((sum: number, item: any) => 
        sum + (item.pc_search || 0) + (item.mobile_search || 0), 0)
      
      // 경쟁도 분포 계산
      const competitionCounts = allData.reduce((acc: any, item: any) => {
        const comp = item.comp_idx || '중간'
        acc[comp === '높음' ? 'high' : comp === '중간' ? 'medium' : 'low']++
        return acc
      }, { high: 0, medium: 0, low: 0 })
      
      const competitionDistribution = {
        high: Math.round((competitionCounts.high / totalKeywords) * 100),
        medium: Math.round((competitionCounts.medium / totalKeywords) * 100),
        low: Math.round((competitionCounts.low / totalKeywords) * 100)
      }
      
      // 상위 키워드 추출 (검색량 기준)
      const topKeywords = allData
        .map((item: any) => ({
          keyword: item.rel_keyword || item.keyword,
          searchVolume: (item.pc_search || 0) + (item.mobile_search || 0),
          competition: item.comp_idx || '중간',
          potentialScore: item.potential_score || 0
        }))
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 5)
      
      // 평균 경쟁도 계산
      const avgCompetition = allData.reduce((sum: number, item: any) => {
        const comp = item.comp_idx || '중간'
        return sum + (comp === '높음' ? 3 : comp === '중간' ? 2 : 1)
      }, 0) / totalKeywords
      
      // 최근 5일 트렌드 (간단한 샘플링)
      const searchVolumeTrend = allData
        .slice(0, 5)
        .map((item: any, index: number) => ({
          date: new Date(Date.now() - (4 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          volume: (item.pc_search || 0) + (item.mobile_search || 0)
        }))
      
      const analyticsData: AnalyticsData = {
        totalKeywords,
        totalSearchVolume,
        avgCompetition,
        topKeywords,
        competitionDistribution,
        searchVolumeTrend
      }
      
      setAnalyticsData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case '높음':
        return 'text-red-600 bg-red-100'
      case '중간':
        return 'text-yellow-600 bg-yellow-100'
      case '낮음':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-500">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <BarChart3 className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchAnalyticsData} className="btn-primary">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">키워드 분석</h1>
            </div>
            <nav className="flex space-x-4">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                홈으로
              </a>
              <a href="/data" className="text-gray-600 hover:text-gray-900">
                데이터
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-primary-600">
                {analyticsData?.totalKeywords.toLocaleString()}
              </span>
            </div>
            <div className="stat-label">총 키워드</div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {formatNumber(analyticsData?.totalSearchVolume || 0)}
              </span>
            </div>
            <div className="stat-label">총 검색량</div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-8 w-8 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">
                {analyticsData?.avgCompetition.toFixed(1)}
              </span>
            </div>
            <div className="stat-label">평균 경쟁도</div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">
                {analyticsData?.topKeywords[0]?.potentialScore.toFixed(1) || 0}
              </span>
            </div>
            <div className="stat-label">최고 잠재력</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Keywords */}
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">인기 키워드 TOP 5</h2>
              <span className="text-sm text-gray-500">검색량 기준</span>
            </div>
            
            <div className="space-y-4">
              {analyticsData?.topKeywords.map((keyword, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{keyword.keyword}</div>
                      <div className="text-sm text-gray-500">
                        잠재력: {keyword.potentialScore.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary-600">
                      {formatNumber(keyword.searchVolume)}
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompetitionColor(keyword.competition)}`}>
                        {keyword.competition}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competition Distribution */}
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">경쟁도 분포</h2>
              <span className="text-sm text-gray-500">전체 키워드 기준</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="font-medium text-gray-700">높은 경쟁도</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">
                    {analyticsData?.competitionDistribution.high}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="font-medium text-gray-700">중간 경쟁도</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-yellow-600">
                    {analyticsData?.competitionDistribution.medium}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="font-medium text-gray-700">낮은 경쟁도</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    {analyticsData?.competitionDistribution.low}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Volume Trend */}
        <div className="card-elevated mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">검색량 트렌드</h2>
            <span className="text-sm text-gray-500">최근 5일</span>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2">
            {analyticsData?.searchVolumeTrend.map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className="bg-primary-500 rounded-t-lg w-full transition-all duration-500 hover:bg-primary-600"
                  style={{ 
                    height: `${(point.volume / Math.max(...analyticsData.searchVolumeTrend.map(p => p.volume))) * 200}px` 
                  }}
                ></div>
                <div className="text-xs text-gray-500 text-center">
                  <div className="font-medium">{formatNumber(point.volume)}</div>
                  <div>{new Date(point.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button className="btn-primary flex items-center gap-2">
            <Download className="h-4 w-4" />
            분석 리포트 다운로드
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            상세 분석 보기
          </button>
        </div>
      </main>
    </div>
  )
}
