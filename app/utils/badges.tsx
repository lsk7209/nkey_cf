export const getSourceBadge = (source: string) => {
  switch (source) {
    case 'fresh':
      return <span className="badge badge-fresh">신규 수집</span>
    case 'cache':
      return <span className="badge badge-cache">캐시</span>
    case 'cooldown':
      return <span className="badge badge-cooldown">쿨다운</span>
    case 'error':
      return <span className="badge badge-error">오류</span>
    default:
      return <span className="badge badge-cache">캐시</span>
  }
}
