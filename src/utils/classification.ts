export function classifyPriority(title: string): { priority: number; keyword: string | null } {
  const t = title.toLowerCase()
  if (t.includes('exam') || t.includes('viva') || t.includes('test')) {
    return { priority: 4, keyword: t.match(/exam|viva|test/)?.[0] || null }
  }
  if (t.includes('assignment') || t.includes('deadline') || t.includes('submission')) {
    return { priority: 3, keyword: t.match(/assignment|deadline|submission/)?.[0] || null }
  }
  if (t.includes('meeting') || t.includes('lecture') || t.includes('seminar')) {
    return { priority: 2, keyword: t.match(/meeting|lecture|seminar/)?.[0] || null }
  }
  return { priority: 1, keyword: null }
}
