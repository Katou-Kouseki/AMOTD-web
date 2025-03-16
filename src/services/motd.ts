import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MOTD_DIR = path.join(process.cwd(), 'public', 'motds');

if (!fs.existsSync(MOTD_DIR)) {
  fs.mkdirSync(MOTD_DIR, { recursive: true });
}

export async function saveMOTD(icon: string, content: string) {
  // 生成唯一ID
  const id = uuidv4().substring(0, 8);
  
  // 使用绝对路径
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const absoluteIconPath = icon ? `${baseUrl}${icon}` : '';
  
  // 将文本拆分为最多两行
  const lines = content.split('\n').slice(0, 2);
  
  // 如果只有一行，确保第二行为空字符串
  if (lines.length === 1) {
    lines.push('');
  }
  
  // 创建包含两行的MOTD数据
  const motdData = { 
    icon: absoluteIconPath,
    content: {
      line1: lines[0],
      line2: lines[1]
    }
  };
  
  // 写入文件
  const filePath = path.join(MOTD_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(motdData, null, 2));
  
  return id;
}

export async function getMOTD(id: string) {
  const motdFilePath = path.join(MOTD_DIR, `${id}.json`);
  
  if (!fs.existsSync(motdFilePath)) {
    return null;
  }
  
  const data = fs.readFileSync(motdFilePath, 'utf-8');
  return JSON.parse(data);
} 