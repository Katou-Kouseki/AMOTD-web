import { NextRequest, NextResponse } from 'next/server';
import * as net from 'net';

// Minecraft服务器ping基本实现
async function pingMinecraftServer(host: string, port: number = 25565): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('连接超时'));
    }, 5000);
    
    socket.connect(port, host, () => {
      // 发送服务器列表ping数据包
      const buffer = Buffer.alloc(10);
      buffer.writeUInt8(0x00, 0); // 握手包ID
      buffer.writeUInt8(0x47, 1); // 协议版本
      buffer.writeUInt8(host.length, 2); // 主机名长度
      buffer.write(host, 3); // 主机名
      buffer.writeUInt16BE(port, 3 + host.length); // 端口
      buffer.writeUInt8(0x01, 5 + host.length); // 下一个状态 (1 for status)
      
      const packet = Buffer.alloc(buffer.length + 4);
      packet.writeInt32BE(buffer.length, 0);
      buffer.copy(packet, 4);
      
      socket.write(packet);
      
      // 发送请求状态包
      const requestBuffer = Buffer.from([0x01, 0x00]);
      socket.write(requestBuffer);
    });
    
    let data = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      
      try {
        // 尝试解析JSON响应
        const responseLength = data.readInt32BE(0);
        const packetId = data.readUInt8(4);
        
        if (packetId === 0x00 && data.length >= responseLength + 4) {
          const jsonLength = data.readInt32BE(5);
          const jsonStr = data.toString('utf8', 9, 9 + jsonLength);
          const response = JSON.parse(jsonStr);
          
          clearTimeout(timeout);
          socket.destroy();
          resolve(response);
        }
      } catch (e) {
        // 继续收集数据...
      }
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      reject(err);
    });
    
    socket.on('end', () => {
      clearTimeout(timeout);
      reject(new Error('连接被关闭'));
    });
  });
}

// 将Minecraft格式转换为MiniMessage格式
function minecraftToMiniMessage(text: string): string {
  // 简单转换，实际可能需要更复杂的处理
  return text
    .replace(/§0/g, '<color:black>')
    .replace(/§1/g, '<color:dark_blue>')
    .replace(/§2/g, '<color:dark_green>')
    .replace(/§3/g, '<color:dark_aqua>')
    .replace(/§4/g, '<color:dark_red>')
    .replace(/§5/g, '<color:dark_purple>')
    .replace(/§6/g, '<color:gold>')
    .replace(/§7/g, '<color:gray>')
    .replace(/§8/g, '<color:dark_gray>')
    .replace(/§9/g, '<color:blue>')
    .replace(/§a/g, '<color:green>')
    .replace(/§b/g, '<color:aqua>')
    .replace(/§c/g, '<color:red>')
    .replace(/§d/g, '<color:light_purple>')
    .replace(/§e/g, '<color:yellow>')
    .replace(/§f/g, '<color:white>')
    .replace(/§l/g, '<bold>')
    .replace(/§o/g, '<italic>')
    .replace(/§n/g, '<underlined>')
    .replace(/§m/g, '<strikethrough>')
    .replace(/§r/g, '<reset>');
}

export async function POST(request: NextRequest) {
  try {
    const { serverIP, format } = await request.json();
    
    if (!serverIP) {
      return NextResponse.json({
        error: '服务器IP不能为空'
      }, { status: 400 });
    }
    
    // 解析服务器IP和端口
    let host = serverIP;
    let port = 25565;
    
    if (serverIP.includes(':')) {
      const parts = serverIP.split(':');
      host = parts[0];
      port = parseInt(parts[1], 10);
    }
    
    // 连接服务器并获取MOTD
    try {
      const serverData = await pingMinecraftServer(host, port);
      
      let motdText = '';
      let serverIcon = '';
      
      // 提取MOTD文本
      if (serverData.description) {
        if (typeof serverData.description === 'string') {
          motdText = serverData.description;
        } else if (serverData.description.text) {
          motdText = serverData.description.text;
          
          // 处理extra数组中的格式化内容
          if (serverData.description.extra) {
            motdText = serverData.description.extra.reduce((acc: string, part: any) => {
              let text = part.text || '';
              if (part.bold) text = `§l${text}`;
              if (part.italic) text = `§o${text}`;
              if (part.underlined) text = `§n${text}`;
              if (part.strikethrough) text = `§m${text}`;
              if (part.color) {
                const colorMap: {[key: string]: string} = {
                  'black': '§0',
                  'dark_blue': '§1',
                  'dark_green': '§2',
                  'dark_aqua': '§3',
                  'dark_red': '§4',
                  'dark_purple': '§5',
                  'gold': '§6',
                  'gray': '§7',
                  'dark_gray': '§8',
                  'blue': '§9',
                  'green': '§a',
                  'aqua': '§b',
                  'red': '§c',
                  'light_purple': '§d',
                  'yellow': '§e',
                  'white': '§f'
                };
                if (colorMap[part.color]) {
                  text = `${colorMap[part.color]}${text}`;
                }
              }
              return acc + text;
            }, '');
          }
        }
      }
      
      // 提取服务器图标
      if (serverData.favicon) {
        serverIcon = serverData.favicon;
      }
      
      // 根据格式转换
      let rawText = motdText.replace(/§/g, '&'); // 将§转换为&用于编辑
      
      if (format === 'minimessage') {
        rawText = minecraftToMiniMessage(motdText);
      }
      
      return NextResponse.json({
        rawText,
        serverIcon,
        original: motdText
      });
      
    } catch (error) {
      console.error('服务器连接失败:', error);
      return NextResponse.json({
        error: '无法连接到Minecraft服务器'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('处理请求出错:', error);
    return NextResponse.json({
      error: '服务器内部错误'
    }, { status: 500 });
  }
} 