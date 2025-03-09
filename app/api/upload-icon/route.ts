import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const filename = `${timestamp}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
    const filepath = path.join(UPLOAD_DIR, filename)

    await writeFile(filepath, buffer)
    return NextResponse.json({ path: `/uploads/${filename}` })

  } catch (error) {
    console.error('上传错误:', error)
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    )
  }
}