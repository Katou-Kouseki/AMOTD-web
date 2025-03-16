import { NextRequest, NextResponse } from 'next/server';
import { getMOTD } from '@/services/motd';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const motdData = await getMOTD(id);
    
    if (!motdData) {
      return NextResponse.json({ error: '找不到MOTD数据' }, { status: 404 });
    }
    
    // 获取当前请求的主机和协议信息
    const host = request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    // 确保icon路径是完整的绝对路径
    if (motdData.icon && !motdData.icon.startsWith('http')) {
      motdData.icon = motdData.icon.startsWith('/') 
        ? `${baseUrl}${motdData.icon}` 
        : `${baseUrl}/${motdData.icon}`;
    }
    
    return NextResponse.json(motdData);
  } catch (error) {
    console.error('获取MOTD错误:', error);
    return NextResponse.json({ error: '获取MOTD失败' }, { status: 500 });
  }
} 