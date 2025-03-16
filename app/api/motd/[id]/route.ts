import { NextRequest, NextResponse } from 'next/server';
import { getMOTD } from '@/services/motd';

// 如果使用 Next.js 15.2.1，需要修改参数类型
type Params = { params: { id: string } };

// 修改函数签名，显式声明返回类型
export async function GET(
  request: NextRequest,
  context: Params
): Promise<NextResponse> {
  try {
    const id = context.params.id;
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