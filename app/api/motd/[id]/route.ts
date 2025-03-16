import { NextRequest, NextResponse } from 'next/server';
import { getMOTD } from '@/services/motd';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const motdData = await getMOTD(id);
    
    if (!motdData) {
      return NextResponse.json({ error: '找不到MOTD数据' }, { status: 404 });
    }
    
    return NextResponse.json(motdData);
  } catch (error) {
    console.error('获取MOTD错误:', error);
    return NextResponse.json({ error: '获取MOTD失败' }, { status: 500 });
  }
} 