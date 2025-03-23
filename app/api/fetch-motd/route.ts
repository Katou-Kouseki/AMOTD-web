import { NextRequest, NextResponse } from 'next/server';
import { Socket } from 'net';

// 增加接口定义
interface ResourceItem {
  socket: Socket;
  timeout: NodeJS.Timeout;
}

// 增加类型定义
interface MCTextComponent {
  text?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  extra?: MCTextComponent[];
  [key: string]: unknown; // 将any改为unknown更安全
}

// 在文件顶部添加或使用已有的结果类型定义
interface MotdResult {
  rawText: string;
  serverIcon: string | null;
}

// 更新支持的协议版本
const PROTOCOLS = {
  '1.21.4': 769,
  '1.21.3': 768,
  '1.21.2': 768,
  '1.21.1': 767,
  '1.21.0': 767,
  '1.20.6': 766,
  '1.20.5': 766,
  '1.20.4': 765,
  '1.20.3': 765,
  '1.20.2': 764,
  '1.20.1': 763,
  '1.20.0': 763,
  '1.19.4': 762,
  '1.19.3': 761,
  '1.19.2': 760,
  '1.18.2': 758,
  '1.17.1': 756,
  '1.16.5': 754,
  '1.12.2': 340,
  '1.8.9': 47
};

// VarInt 编码函数
function writeVarInt(value: number): Buffer {
  const parts = [];
  while (true) {
    if ((value & ~0x7F) === 0) {
      parts.push(value);
      break;
    }
    parts.push(((value & 0x7F) | 0x80));
    value >>>= 7;
  }
  return Buffer.from(parts);
}

// 读取 VarInt
function readVarInt(buffer: Buffer, offset: number): [number, number] {
  let result = 0;
  let numRead = 0;
  let read;
  let shift = 0;
  
  do {
    read = buffer[offset + numRead];
    result |= ((read & 0x7F) << shift);
    shift += 7;
    numRead++;
    if (numRead > 5) {
      throw new Error("VarInt 太大");
    }
  } while ((read & 0x80) !== 0);
  
  return [result, numRead];
}

// 写入字符串
function writeString(value: string): Buffer {
  const strBuf = Buffer.from(value, 'utf8');
  return Buffer.concat([writeVarInt(strBuf.length), strBuf]);
}

// 写入 16 位无符号整数
function writeUInt16BE(value: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(value, 0);
  return buf;
}

// Minecraft 颜色代码映射
function getMinecraftColorCode(color: string): string | null {
  const colorMap: Record<string, string> = {
    'black': '0',
    'dark_blue': '1',
    'dark_green': '2',
    'dark_aqua': '3',
    'dark_red': '4',
    'dark_purple': '5',
    'gold': '6',
    'gray': '7',
    'dark_gray': '8',
    'blue': '9',
    'green': 'a',
    'aqua': 'b',
    'red': 'c',
    'light_purple': 'd',
    'yellow': 'e',
    'white': 'f'
  };
  
  return colorMap[color] || null;
}

// 添加一个RGB到Minecraft颜色码的转换函数 - 添加在第85行附近
function convertRGBToMinecraftColor(hexColor: string): string {
  // 移除前缀#号
  const hex = hexColor.replace('#', '');
  
  // 解析RGB值
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  
  // 定义Minecraft的颜色和它们的RGB值
  const minecraftColors = [
    { code: '0', name: 'black', rgb: [0, 0, 0] },
    { code: '1', name: 'dark_blue', rgb: [0, 0, 170] },
    { code: '2', name: 'dark_green', rgb: [0, 170, 0] },
    { code: '3', name: 'dark_aqua', rgb: [0, 170, 170] },
    { code: '4', name: 'dark_red', rgb: [170, 0, 0] },
    { code: '5', name: 'dark_purple', rgb: [170, 0, 170] },
    { code: '6', name: 'gold', rgb: [255, 170, 0] },
    { code: '7', name: 'gray', rgb: [170, 170, 170] },
    { code: '8', name: 'dark_gray', rgb: [85, 85, 85] },
    { code: '9', name: 'blue', rgb: [85, 85, 255] },
    { code: 'a', name: 'green', rgb: [85, 255, 85] },
    { code: 'b', name: 'aqua', rgb: [85, 255, 255] },
    { code: 'c', name: 'red', rgb: [255, 85, 85] },
    { code: 'd', name: 'light_purple', rgb: [255, 85, 255] },
    { code: 'e', name: 'yellow', rgb: [255, 255, 85] },
    { code: 'f', name: 'white', rgb: [255, 255, 255] }
  ];
  
  // 计算与每个颜色的距离
  let closestColor = minecraftColors[0];
  let minDistance = Number.MAX_VALUE;
  
  for (const color of minecraftColors) {
    const [cr, cg, cb] = color.rgb;
    const distance = Math.sqrt(
      Math.pow(r - cr, 2) + 
      Math.pow(g - cg, 2) + 
      Math.pow(b - cb, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }
  
  return closestColor.code;
}

// 修改cleanupMotdText函数，解决"isMinimessage"参数未使用的警告
function cleanupMotdText(text: string): string {
  // 先保存所有换行符为特殊标记
  let cleaned = text.replace(/\n/g, '##NEWLINE##');
  
  // 临时替换格式代码
  cleaned = cleaned.replace(/§([0-9a-fklmnor]|#[0-9A-Fa-f]{6})/g, '##FORMAT##$1');
  
  // 处理重复字符
  cleaned = cleaned
    .replace(/([^\s#])\1+/g, '$1')
    .replace(/(\S+)(\S)\s+\2+/g, '$1$2')
    .replace(/(\S{2,})\s+\1/g, '$1')
    .replace(/(\S)(\s+\1)+/g, '$1$2')
    .replace(/\s{2,}/g, ' ');
  
  // 恢复格式代码
  cleaned = cleaned.replace(/##FORMAT##([0-9a-fklmnor]|#[0-9A-Fa-f]{6})/g, '§$1');
  
  // 恢复换行符
  cleaned = cleaned.replace(/##NEWLINE##/g, '\n');
  
  return cleaned;
}

// 修改extractMinecraftFormat函数，确保正确提取换行
function extractMinecraftFormat(description: MCTextComponent, convertRGB: boolean = false): string {
  // 如果是纯文本，直接返回
  if (typeof description === 'string') {
    return description;
  }
  
  // 获取基础文本
  let result = description.text || '';
  
  // 如果没有extra属性，直接返回文本
  if (!description.extra || !Array.isArray(description.extra)) {
    return result;
  }
  
  // 遍历所有组件，正确处理换行
  for (const component of description.extra) {
    // 为每个组件创建格式前缀
    let prefix = '';
    
    // 处理颜色
    if (component.color) {
      if (typeof component.color === 'string') {
        if (component.color.startsWith('#')) {
          const colorCode = convertRGB ? convertRGBToMinecraftColor(component.color) : component.color;
          prefix += '§' + colorCode;
        } else {
          const mcColorCode = getMinecraftColorCode(component.color);
          if (mcColorCode) {
            prefix += '§' + mcColorCode;
          }
        }
      }
    }
    
    // 处理格式
    if (component.bold) prefix += '§l';
    if (component.italic) prefix += '§o';
    if (component.underlined) prefix += '§n';
    if (component.strikethrough) prefix += '§m';
    if (component.obfuscated) prefix += '§k';
    
    // 获取组件文本
    let componentText = '';
    
    // 如果组件有自己的嵌套组件，递归处理
    if (component.extra && Array.isArray(component.extra)) {
      componentText = extractMinecraftFormat(component, convertRGB);
    } else {
      componentText = component.text || '';
    }
    
    // 将前缀与文本合并
    result += prefix + componentText;
  }
  
  return result;
}

// 提取 MiniMessage 格式文本
function extractMiniMessageFormat(description: MCTextComponent): string {
  let result = description.text || '';
  
  if (description.extra && Array.isArray(description.extra)) {
    for (const component of description.extra) {
      let formattedText = '';
      
      if (component.color) {
        if (component.color.startsWith('#')) {
          formattedText += `<color:${component.color}>`;
        } else {
          formattedText += `<color:${component.color}>`;
        }
      }
      
      if (component.bold) formattedText += '<bold>';
      if (component.italic) formattedText += '<italic>';
      if (component.underlined) formattedText += '<underlined>';
      if (component.strikethrough) formattedText += '<strikethrough>';
      
      if (typeof component.text === 'string') {
        formattedText += component.text;
      } else if (component.text !== undefined) {
        formattedText += String(component.text);
      }
      
      if (component.extra && Array.isArray(component.extra)) {
        const nestedText = extractMiniMessageFormat(component);
        if (nestedText) {
          formattedText += nestedText;
        }
      }
      
      if (component.strikethrough) formattedText += '</strikethrough>';
      if (component.underlined) formattedText += '</underlined>';
      if (component.italic) formattedText += '</italic>';
      if (component.bold) formattedText += '</bold>';
      if (component.color) formattedText += '</color>';
      
      result += formattedText;
    }
  }
  
  return result;
}

// 修改fetchMOTD函数定义
async function fetchMOTD(
  host: string, 
  port: number, 
  protocol: number, 
  format: string = 'minecraft', 
  resources: ResourceItem[]
): Promise<{
  rawText: string;
  serverIcon: string | null;
}> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    
    // 超时处理 - 减少到3秒
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`协议 ${protocol} 连接超时`));
    }, 3000);
    
    // 添加到resources列表
    resources.push({ socket, timeout });
    
    let responseData = Buffer.alloc(0);
    
    socket.on('connect', () => {
      // 正确构造握手包 - 使用VarInt编码
      const handshakePacket = Buffer.concat([
        writeVarInt(0x00),      // 包ID (握手)
        writeVarInt(protocol),  // 协议版本
        writeString(host),      // 主机名
        writeUInt16BE(port),    // 端口
        writeVarInt(0x01)       // 下一步状态 (1 = Status)
      ]);
      
      // 发送握手包，前缀是包长度
      socket.write(Buffer.concat([
        writeVarInt(handshakePacket.length),
        handshakePacket
      ]));
      
      // 发送状态请求包 (0x00 空负载)
      socket.write(Buffer.concat([
        writeVarInt(1),  // 包长度为1
        writeVarInt(0x00) // 包ID为0x00
      ]));
    });
    
    socket.on('data', (data) => {
      responseData = Buffer.concat([responseData, data]);
      
      try {
        // 尝试解析响应
        let offset = 0;
        
        // 读取数据包长度
        const [packetLength, lenBytes] = readVarInt(responseData, offset);
        offset += lenBytes;
        
        // 检查是否接收到完整数据包
        if (responseData.length < offset + packetLength) {
          return; // 数据不完整，等待更多数据
        }
        
        // 读取包ID
        const [packetId, idBytes] = readVarInt(responseData, offset);
        offset += idBytes;
        
        if (packetId === 0x00) { // 状态响应包
          // 读取JSON字符串长度
          const [jsonLength, jsonLenBytes] = readVarInt(responseData, offset);
          offset += jsonLenBytes;
          
          // 读取JSON字符串
          const jsonStr = responseData.slice(offset, offset + jsonLength).toString('utf8');
          
          try {
            const response = JSON.parse(jsonStr);
            
            // 处理服务器响应
            const result = { 
              rawText: '', 
              serverIcon: null
            };
            
            // 增强的MOTD文本提取逻辑
            if (response.description) {
              // 处理各种描述格式
              if (typeof response.description === 'string') {
                result.rawText = response.description;
              } else if (typeof response.description === 'object') {
                // 处理复杂对象格式
                if (response.description.text !== undefined) {
                  // 基本文本
                  result.rawText = response.description.text || '';
                }
                
                // 处理extra字段
                if (response.description.extra && Array.isArray(response.description.extra)) {
                  // 提取原始格式文本
                  const formattedText = extractMinecraftFormat(response.description, true);
                  console.log('原始提取的文本:', formattedText);
                  
                  // 根据请求的格式进行适当转换
                  if (format === 'minecraft') {
                    // 对于Minecraft格式，转换RGB为标准Minecraft颜色
                    result.rawText = cleanupMotdText(formattedText || result.rawText);
                  } else {
                    // 对于MiniMessage格式，保留RGB颜色
                    const miniMessageText = extractMiniMessageFormat(response.description);
                    result.rawText = miniMessageText || formattedText || result.rawText;
                  }
                  
                  console.log('清理后的文本:', result.rawText);
                }
              }
              
              // 如果还是空，尝试原始JSON字符串化
              if (!result.rawText && response.description) {
                try {
                  // 最后尝试将整个description转为字符串
                  result.rawText = JSON.stringify(response.description);
                  result.rawText = result.rawText.replace(/[{}"\[\]]/g, '');
                } catch (e) {
                  console.error('字符串化描述失败:', e);
                }
              }
            } else {
              console.log('服务器响应中没有description字段');
            }
            
            // 处理服务器图标
            if (response.favicon) {
              result.serverIcon = response.favicon; // 已经是 base64 格式
            }
            
            // 清除超时并关闭连接
            clearTimeout(timeout);
            socket.end();
            resolve(result);
            
          } catch (jsonError) {
            reject(new Error('解析服务器响应失败: ' + jsonError));
          }
        }
      } catch (parseError) {
        reject(new Error('解析响应数据包失败: ' + parseError));
      }
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    socket.on('end', () => {
      clearTimeout(timeout);
      reject(new Error('服务器关闭了连接'));
    });
    
    socket.connect(port, host);
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { serverIP, format = 'minecraft' } = data;
    
    if (!serverIP) {
      return NextResponse.json({ error: '服务器IP不能为空' }, { status: 400 });
    }
    
    // 解析IP和端口
    let host = serverIP;
    let port = 25565; // 默认端口
    
    if (serverIP.includes(':')) {
      const parts = serverIP.split(':');
      host = parts[0];
      port = parseInt(parts[1], 10) || 25565;
    }
    
    // 修改尝试的协议版本顺序
    const protocolsToTry = [
      PROTOCOLS['1.21.4'], // 最新版本
      PROTOCOLS['1.20.5'], // 较新版本
      PROTOCOLS['1.16.5'], // 中间版本
      PROTOCOLS['1.8.9']   // 旧版本
    ];
    
    // 修复：指定resources的类型
    const resources: ResourceItem[] = [];
    
    // 修复：给protocol参数添加类型并修复cancel变量问题
    const createCancellableMotdRequest = (protocol: number) => {
      // 初始化cancel函数
      let cancel = () => {};
      
      // 使用明确的MotdResult类型替代Record<string, any>
      const promise = new Promise<MotdResult>((resolve, reject) => {
        cancel = () => {
          reject(new Error('请求已取消'));
        };
        
        fetchMOTD(host, port, protocol, format, resources)
          .then(resolve)
          .catch(reject);
      });
      
      return { promise, cancel };
    };
    
    // 创建所有协议版本的请求
    const requests = protocolsToTry.map(protocol => {
      const request = createCancellableMotdRequest(protocol);
      return {
        protocol,
        ...request
      };
    });
    
    // 使用Promise.race并行处理所有请求
    try {
      // 设置全局超时 - 5秒
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('所有协议尝试超时'));
        }, 5000);
      });
      
      // 等待第一个成功的请求或超时
      const result = await Promise.race([
        ...requests.map(req => req.promise),
        timeoutPromise
      ]);
      
      // 修复：确保cancel方法存在
      requests.forEach(req => {
        if (req && typeof req.cancel === 'function') {
          req.cancel();
        }
      });
      
      // 清理所有资源
      resources.forEach(res => {
        if (res.socket && !res.socket.destroyed) {
          res.socket.destroy();
        }
        if (res.timeout) {
          clearTimeout(res.timeout);
        }
      });
      
      return NextResponse.json(result);
    } catch (error) {
      // 清理所有资源
      resources.forEach(res => {
        if (res.socket && !res.socket.destroyed) {
          res.socket.destroy();
        }
        if (res.timeout) {
          clearTimeout(res.timeout);
        }
      });
      
      throw error;
    }
    
  } catch (error) {
    console.error('获取MOTD错误:', error);
    return NextResponse.json({ 
      error: '获取MOTD失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
} 