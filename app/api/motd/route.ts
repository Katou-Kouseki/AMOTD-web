import { NextRequest, NextResponse } from 'next/server';
import { saveMOTD } from '@/services/motd';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { icon, content } = data;
    
    const id = await saveMOTD(icon, content);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    
    return NextResponse.json({ 
      success: true, 
      id,
      url: `/api/motd/${id}`
    });
  } catch (error) {
    console.error('保存MOTD错误:', error);
    return NextResponse.json({ error: '保存MOTD失败' }, { status: 500 });
  }
} 