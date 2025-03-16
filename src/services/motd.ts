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
  const absoluteIconPath = icon ? `${process.env.NEXT_PUBLIC_BASE_URL || ''}${icon}` : '';
  
  const motdData = { 
    icon: absoluteIconPath, 
    content 
  };
  
  // 写入文件
  const filePath = path.join(MOTD_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(motdData));
  
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