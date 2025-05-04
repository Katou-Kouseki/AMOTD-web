import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 从URL中提取ID，避免使用params
    const url = request.url;
    const urlParts = url.split('/');
    const idFromUrl = urlParts[urlParts.length - 1];
    
    // 验证ID
    const id = idFromUrl && typeof idFromUrl === 'string' ? idFromUrl : '';
    
    if (!id) {
      return NextResponse.json({
        error: '缺少MOTD ID参数'
      }, { status: 400 });
    }
    
    if (id.length !== 8) {
      return NextResponse.json({
        error: '无效的MOTD ID'
      }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), 'public', 'motds', `${id}.json`);
    if (!existsSync(filePath)) {
      return NextResponse.json({
        error: '未找到MOTD数据'
      }, { status: 404 });
    }
    
    const fileContent = await readFile(filePath, 'utf8');
    const motdData = JSON.parse(fileContent);
    
    // 检查是否过期
    if (motdData.expiresAt && motdData.expiresAt < Date.now()) {
      return NextResponse.json({
        error: 'MOTD数据已过期'
      }, { status: 410 });
    }
    
    // 确保返回正确的数据结构
    return NextResponse.json({
      icon: motdData.icon || "",
      type: motdData.type || "minecraft",
      content: motdData.content || {
        line1: motdData.line1 || '',
        line2: motdData.line2 || ''
      }
    });
    
  } catch {
    return NextResponse.json({
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 