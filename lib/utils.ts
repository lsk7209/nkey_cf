// 유틸리티 함수들

export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}천`
  }
  return num.toLocaleString()
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR')
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('ko-KR')
}

export function getCompetitionColor(comp: string): string {
  switch (comp) {
    case '높음':
      return 'bg-red-100 text-red-800'
    case '중간':
      return 'bg-yellow-100 text-yellow-800'
    case '낮음':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getSourceBadgeClass(source: string): string {
  switch (source) {
    case 'fresh':
      return 'bg-green-100 text-green-800'
    case 'cache':
      return 'bg-blue-100 text-blue-800'
    case 'cooldown':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function calculatePotentialScore(
  pcSearch: number,
  mobileSearch: number,
  totalDocs: number
): number {
  return ((pcSearch + mobileSearch) / Math.max(totalDocs, 1)) * 100
}

export function normalizeSearchCount(count: number | string): number {
  const num = typeof count === 'string' ? parseInt(count) : count
  return Math.max(num || 0, 10) // 최소 10으로 정규화
}

export function normalizeCTR(ctr: number | string): number {
  const num = typeof ctr === 'string' ? parseFloat(ctr.toString()) : ctr
  return Math.max(num || 0, 0)
}

export function getDateBucket(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit integer로 변환
  }
  return Math.abs(hash).toString(36)
}

export function generateCacheKey(keyword: string, dateBucket: string): string {
  return `kw:${hashString(keyword + dateBucket)}`
}

export function generateCooldownKey(customerId: string): string {
  return `cooldown:${customerId}`
}
