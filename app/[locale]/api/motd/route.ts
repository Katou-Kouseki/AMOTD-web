import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile, readdir, stat, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

// 存储用户IP和请求时间记录
interface RateLimitRecord {
  timestamps: number[];
  count: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_MAX = 4; // 最大请求次数
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟窗口期(毫秒)
const EXPIRY_TIME = 90 * 60 * 1000; // 1.5小时有效期(毫秒)

// 清理过期文件的函数
const cleanupExpiredFiles = async () => {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'motds');
    
    if (!existsSync(dataDir)) return;
    
    const files = await readdir(dataDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const stats = await stat(filePath);
        const fileAge = Date.now() - stats.mtimeMs;
        
        // 如果文件超过1.5小时，删除它
        if (fileAge > EXPIRY_TIME) {
          try {
            // 读取JSON以获取图标路径
            const content = await readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            // 如果有关联的图标文件，也删除它
            if (data.icon && data.icon.startsWith('/uploads/')) {
              const iconPath = path.join(process.cwd(), 'public', data.icon);
              if (existsSync(iconPath)) {
                await unlink(iconPath);
              }
            }
            // 删除JSON文件
            await unlink(filePath);
            console.log(`已清理过期文件: ${file}`);
          } catch (e) {
            console.error(`清理过期文件出错: ${file}`, e);
          }
        }
      }
    }
  } catch (error) {
    console.error('清理过期文件时出错:', error);
  }
};

// 定期运行清理任务
setInterval(cleanupExpiredFiles, 15 * 60 * 1000); // 每15分钟运行一次

export async function POST(
  request: NextRequest,
  { params }: { params: { locale: string } }
) {
  try {
    // 获取用户IP用于速率限制
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    
    // 获取当前语言
    const locale = params.locale || 'zh';
    
    // 检查速率限制
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { timestamps: [], count: 0 };
    
    // 清理旧的时间戳记录
    record.timestamps = record.timestamps.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    // 检查是否超过限制
    if (record.timestamps.length >= RATE_LIMIT_MAX) {
      const oldestTimestamp = Math.min(...record.timestamps);
      const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);
      
      const errorMessage = locale === 'en' 
        ? `Too many requests. Please try again in ${waitTime} seconds`
        : `请求过于频繁，请在${waitTime}秒后再试`;
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        waitTime
      }, { status: 429 });
    }
    
    // 更新速率限制记录
    record.timestamps.push(now);
    record.count++;
    rateLimitMap.set(ip, record);
    
    // 处理请求数据
    const data = await request.json();
    const { line1, line2, icon, type } = data;
    
    if (!line1 && !line2) {
      const errorMessage = locale === 'en' ? 'Content cannot be empty' : '内容不能为空';
      return NextResponse.json({
        error: errorMessage
      }, { status: 400 });
    }
    
    // 生成唯一ID
    const id = randomUUID().substring(0, 8);
    
    // 确保目录存在
    const dataDir = path.join(process.cwd(), 'public', 'motds');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
    
    // 存储数据 - 确保icon是完整URL
    const motdData = {
      icon: icon || "", // 已经是完整URL，如"https://example.com/uploads/12345.png"
      type: type || "minecraft",
      line1: line1 || '',
      line2: line2 || '',
      createdAt: Date.now(),
      expiresAt: Date.now() + (90 * 60 * 1000)
    };
    
    await writeFile(
      path.join(dataDir, `${id}.json`),
      JSON.stringify(motdData)
    );
    
    // 返回的JSON中添加type字段，放在icon后面
    return NextResponse.json({
      icon: motdData.icon,
      type: motdData.type,
      line1: motdData.line1,
      line2: motdData.line2,
      id,
      url: `/${locale}/api/motd/${id}`,
      expiresAt: motdData.expiresAt
    });
    
  } catch (error) {
    console.error('处理MOTD请求出错:', error);
    const locale = params.locale || 'zh';
    const errorMessage = locale === 'en' ? 'Server internal error' : '服务器内部错误';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 