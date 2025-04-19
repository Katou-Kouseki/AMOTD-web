import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, locale: string } }
) {
  try {
    // 获取并验证参数
    const id = params?.id;
    const locale = params?.locale || 'zh';
    
    if (!id) {
      const errorMessage = locale === 'en' ? 'Missing MOTD ID parameter' : '缺少MOTD ID参数';
      return NextResponse.json({
        error: errorMessage
      }, { status: 400 });
    }
    
    console.log('获取到的ID:', id);
    
    if (id.length !== 8) {
      const errorMessage = locale === 'en' ? 'Invalid MOTD ID' : '无效的MOTD ID';
      return NextResponse.json({
        error: errorMessage
      }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), 'public', 'motds', `${id}.json`);
    if (!existsSync(filePath)) {
      const errorMessage = locale === 'en' ? 'MOTD data not found' : '未找到MOTD数据';
      return NextResponse.json({
        error: errorMessage
      }, { status: 404 });
    }
    
    const fileContent = await readFile(filePath, 'utf8');
    const motdData = JSON.parse(fileContent);
    
    // 检查是否过期
    if (motdData.expiresAt && motdData.expiresAt < Date.now()) {
      const errorMessage = locale === 'en' ? 'MOTD data has expired' : 'MOTD数据已过期';
      return NextResponse.json({
        error: errorMessage
      }, { status: 410 });
    }
    
    return NextResponse.json({
      icon: motdData.icon || "",
      type: motdData.type || "minecraft",
      line1: motdData.line1 || "",
      line2: motdData.line2 || ""
    });
    
  } catch (error) {
    console.error('获取MOTD数据出错:', error);
    const locale = params?.locale || 'zh';
    const errorMessage = locale === 'en' ? 'Server internal error' : '服务器内部错误';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 