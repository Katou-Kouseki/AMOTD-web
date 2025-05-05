import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  try {
    // 从请求体中获取数据
    const data = await request.json();
    const { serverIP, format = 'minecraft' } = data;
    
    // 检查必要的参数
    if (!serverIP) {
      const errorMessage = params.locale === 'en' 
        ? 'Server IP cannot be empty' 
        : '服务器IP不能为空';
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    // 转发请求到全局API
    const apiUrl = `${request.nextUrl.origin}/api/fetch-motd`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serverIP,
        format
      })
    });
    
    // 获取API响应
    const result = await response.json();
    
    // 根据结果类型返回不同语言的成功提示
    if (result.error) {
      const errorMessage = params.locale === 'en'
        ? `Failed to fetch MOTD: ${result.error}`
        : `获取MOTD失败: ${result.error}`;
      
      return NextResponse.json({
        error: errorMessage
      }, { status: response.status });
    }
    
    // 重新构建成功响应
    return NextResponse.json({
      success: true,
      motd: result.rawText || '',
      icon: result.serverIcon || null,
      isMinimessage: result.isMinimessage || false
    });
    
  } catch (error) {
    console.error('处理MOTD请求出错:', error);
    
    const errorMessage = params.locale === 'en'
      ? 'Server internal error'
      : '服务器内部错误';
    
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 