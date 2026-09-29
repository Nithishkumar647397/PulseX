import { NextResponse } from 'next/server'
import { classifyPriority } from '@/utils/classification'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''
    
    const mimeType = file.type
    const fileName = file.name.toLowerCase()

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      text = data.text
    } else if (fileName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: buffer })
      text = result.value
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.csv') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      text = xlsx.utils.sheet_to_csv(worksheet, { FS: '\t' })
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, XLSX, or CSV.' }, { status: 400 })
    }

    // Extract events
    const lines = text.split('\n').filter(l => l.trim().length > 0)
    
    const dateRegexes = [
      // DD/MM/YYYY or DD-MM-YYYY
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/i,
      // DD Month YYYY
      /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
      // Month DD YYYY
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})\b/i
    ]

    const extractedEvents = []
    
    for (const line of lines) {
      let matchedDateStr = null
      let parsedDate = null
      
      for (const regex of dateRegexes) {
        const match = line.match(regex)
        if (match) {
          matchedDateStr = match[0]
          
          if (regex === dateRegexes[0]) {
             // Assume DD/MM/YYYY
             const day = parseInt(match[1])
             const month = parseInt(match[2]) - 1
             const year = parseInt(match[3])
             parsedDate = new Date(year, month, day)
          } else {
             parsedDate = new Date(matchedDateStr)
          }
          break
        }
      }

      if (matchedDateStr && parsedDate && !isNaN(parsedDate.getTime())) {
        let title = line.replace(matchedDateStr, '').trim()
        
        // Remove common separators
        title = title.replace(/^[\t,\-\:]+|[\t,\-\:]+$/g, '').trim()
        
        if (!title) title = 'Extracted Event'
        if (title.length > 80) title = title.substring(0, 80) + '...'

        const classification = classifyPriority(title)
        
        let category = 'general'
        if (classification.priority === 4) category = 'exam'
        else if (classification.priority === 3) category = 'assignment'
        else if (classification.priority === 2) category = 'meeting'

        extractedEvents.push({
          id: Math.random().toString(36).substring(7), // temporary ID for UI mapping
          title,
          event_date: parsedDate.toISOString(),
          category,
          priority: classification.priority,
          selected: true 
        })
      }
    }

    return NextResponse.json({ events: extractedEvents })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
