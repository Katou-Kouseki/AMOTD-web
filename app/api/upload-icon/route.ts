import { NextRequest, NextResponse } from 'next/server'
import { saveIcon } from '@/services/upload'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '没有文件上传' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filepath = await saveIcon(buffer)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''

    return NextResponse.json({ 
      success: true, 
      filepath,
      absolutePath: `${baseUrl}${filepath}`
    })
  } catch (error) {
    console.error('上传错误:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}