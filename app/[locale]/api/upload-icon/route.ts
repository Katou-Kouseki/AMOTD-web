import { NextRequest, NextResponse } from 'next/server'
import { saveIcon } from '@/services/upload'

export async function POST(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  try {
    // 获取当前语言
    const locale = params.locale || 'zh';
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      const errorMessage = locale === 'en' ? 'No file uploaded' : '没有文件上传';
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filepath = await saveIcon(buffer)

    return NextResponse.json({
      success: true,
      filepath: `/uploads/${filepath.split('/').pop()}`,
      fileUrl: `${request.headers.get('origin') || request.nextUrl.origin}/uploads/${filepath.split('/').pop()}`
    })
  } catch (error) {
    console.error('上传错误:', error)
    const locale = params.locale || 'zh';
    const errorMessage = locale === 'en' ? 'Upload failed' : '上传失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 