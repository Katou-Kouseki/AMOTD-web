import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 定义支持的语言列表
const LOCALES = ['en', 'zh'];
const DEFAULT_LOCALE = 'zh';

export async function GET(request: NextRequest) {
  try {
    // 从URL中提取ID和locale
    const url = request.url;
    const urlParts = url.split('/');
    
    // URL格式: /[locale]/api/motd/[id]
    // 从末尾获取ID
    const id = urlParts[urlParts.length - 1] || '';
    
    // 从路径中确定语言
    let locale = DEFAULT_LOCALE;
    for (const part of urlParts) {
      if (LOCALES.includes(part)) {
        locale = part;
        break;
      }
    }
    
    if (!id) {
      const errorMessage = locale === 'en' ? 'Missing MOTD ID parameter' : '缺少MOTD ID参数';
      return NextResponse.json({
        error: errorMessage
      }, { status: 400 });
    }
    
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
      content: motdData.content || {
        line1: motdData.line1 || '',
        line2: motdData.line2 || ''
      }
    });
    
  } catch {
    // 使用默认语言返回错误信息
    const errorMessage = '服务器内部错误'; // 默认使用中文
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 