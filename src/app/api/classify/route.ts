import { NextResponse } from 'next/server'
import { classifyPriority } from '@/utils/classification'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')

  if (!title) {
    return NextResponse.json({ priority: 1, keyword: null })
  }

  const classification = classifyPriority(title)
  return NextResponse.json(classification)
}
