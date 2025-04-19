import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 使用params.id前确保它是有效的
    const id = params?.id;
    if (!id) {
      return NextResponse.json({
        error: '缺少MOTD ID参数'
      }, { status: 400 });
    }
    
    console.log('获取到的ID:', id);
    
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
    
    return NextResponse.json({
      icon: motdData.icon || "",
      type: motdData.type || "minecraft",
      line1: motdData.line1 || "",
      line2: motdData.line2 || ""
    });
    
  } catch (error) {
    console.error('获取MOTD数据出错:', error);
    return NextResponse.json({
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 