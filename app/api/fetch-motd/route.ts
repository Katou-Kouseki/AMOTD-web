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
  isMinimessage?: boolean;
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

// 修改extractMinecraftFormat函数，确保包含颜色和格式代码
function extractMinecraftFormat(description: MCTextComponent, convertRGB: boolean = false): string {
  // 处理字符串类型描述
  if (typeof description === 'string') {
    return description;
  }
  
  // 处理数组类型描述（每个元素一行）
  if (Array.isArray(description)) {
    return description.map(line => extractMinecraftFormat(line, convertRGB)).join('\n');
  }
  
  // 获取基础文本和应用基础组件的格式
  let result = '';
  const baseText = description.text || '';
  
  // 应用当前组件的颜色
  if (description.color) {
    if (typeof description.color === 'string') {
      if (description.color.startsWith('#')) {
        // 处理十六进制颜色
        if (convertRGB) {
          const colorCode = convertRGBToMinecraftColor(description.color);
          result += `§${colorCode}`;
        } else {
          // 保留十六进制格式
          result += `§#${description.color.substring(1)}`;
        }
      } else {
        // 处理命名颜色
        const mcColorCode = getMinecraftColorCode(description.color);
        if (mcColorCode) {
          result += `§${mcColorCode}`;
        }
      }
    }
  }
  
  // 应用格式代码
  if (description.bold) result += '§l';
  if (description.italic) result += '§o';
  if (description.underlined) result += '§n';
  if (description.strikethrough) result += '§m';
  if (description.obfuscated) result += '§k';
  
  // 添加当前文本
  result += baseText;
  
  // 处理换行标记
  if (result.includes('\\n')) {
    result = result.replace(/\\n/g, '\n');
  }
  
  // 处理extra属性中的组件
  if (description.extra && Array.isArray(description.extra)) {
    for (const component of description.extra) {
      // 检测是否为换行组件
      if (component.text === '\n' || component.text === '\\n') {
        result += '\n';
      } else {
        // 递归处理子组件，并传递convertRGB参数
        result += extractMinecraftFormat(component, convertRGB);
      }
    }
  }
  
  return result;
}

// 提取 MiniMessage 格式文本
function extractMiniMessageFormat(description: MCTextComponent): string {
  if (typeof description === 'string') {
    return description;
  }
  
  // 初始化结果
  let result = '';
  
  // 处理基本文本及其格式
  const baseText = description.text || '';
  
  // 添加格式标签
  if (description.color) {
    if (description.color.startsWith('#')) {
      result += `<color:${description.color}>`;
    } else {
      result += `<color:${description.color}>`;
    }
  }
  
  if (description.bold) {
    result += '<bold>';
  }
  
  if (description.italic) {
    result += '<italic>';
  }
  
  if (description.underlined) {
    result += '<underline>';
  }
  
  if (description.strikethrough) {
    result += '<strikethrough>';
  }
  
  if (description.obfuscated) {
    result += '<obfuscated>';
  }
  
  // 添加文本内容
  result += baseText;
  
  // 处理换行
  if (result.includes('\\n')) {
    result = result.replace(/\\n/g, '<newline>\n');
  }
  
  // 处理extra组件
  if (description.extra && Array.isArray(description.extra)) {
    for (const component of description.extra) {
      result += extractMiniMessageFormat(component);
    }
  }
  
  // 关闭标签（顺序相反）
  if (description.obfuscated) result += '</obfuscated>';
  if (description.strikethrough) result += '</strikethrough>';
  if (description.underlined) result += '</underline>';
  if (description.italic) result += '</italic>';
  if (description.bold) result += '</bold>';
  if (description.color) result += '</color>';
  
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
            const result: MotdResult = { 
              rawText: '', 
              serverIcon: null,
              isMinimessage: false  // 明确添加这个属性
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
                  if (format === 'minecraft') {
                    // 对于Minecraft格式，使用正确的参数调用
                    const formattedText = extractMinecraftFormat(response.description, true);
                    console.log('原始提取的文本:', formattedText);
                    
                    // 清理重复文本但保留颜色代码
                    result.rawText = cleanupMotdText(formattedText || result.rawText);
                  } else {
                    // 对于MiniMessage格式
                    const miniMessageText = extractMiniMessageFormat(response.description);
                    result.rawText = miniMessageText || result.rawText;
                    // 明确标记为MiniMessage格式
                    result.isMinimessage = true;
                  }
                  
                  console.log('最终文本:', result.rawText);
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

// 改进后的渐变色检测函数
function detectGradient(text: string): boolean {
  if (!text) return false;
  
  // 检查是否已经包含MiniMessage格式的渐变标签
  if (text.includes('<gradient:')) {
    return true;
  }
  
  // 提取所有颜色代码及其位置
  const colorMatches = [];
  const regex = /§([0-9a-f]|#[0-9A-Fa-f]{6})/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    colorMatches.push({
      code: match[1], // 只保存颜色代码部分，不包括§符号
      position: match.index,
      fullCode: match[0]
    });
  }
  
  // 如果颜色代码少于3个，不可能是渐变色
  if (colorMatches.length < 3) return false;
  
  // 检查是否存在连续的不同颜色代码
  let consecutiveCount = 1;
  let prevCode = colorMatches[0].code;
  
  for (let i = 1; i < colorMatches.length; i++) {
    // 计算颜色代码之间的文本长度
    const textBetween = text.substring(
      colorMatches[i-1].position + colorMatches[i-1].fullCode.length,
      colorMatches[i].position
    );
    
    // 如果文本长度小于等于2个字符，且颜色代码不同
    if (textBetween.length <= 2 && colorMatches[i].code !== prevCode) {
      consecutiveCount++;
      
      // 连续3个不同颜色，很可能是渐变
      if (consecutiveCount >= 3) {
        return true;
      }
    } else {
      // 重置计数
      consecutiveCount = 1;
    }
    
    prevCode = colorMatches[i].code;
  }
  
  // 检查十六进制颜色代码（新版Minecraft支持）
  const hexMatches = text.match(/§#[0-9A-Fa-f]{6}/g) || [];
  if (hexMatches.length >= 2) {
    return true;
  }
  
  return false;
}

// 新增：将Minecraft渐变色转换为MiniMessage渐变标签
function convertMinecraftGradientToMiniMessage(text: string): string {
  if (!text) return text;
  
  // 提取所有颜色代码及其位置
  const colorMatches = [];
  const regex = /§([0-9a-f]|#[0-9A-Fa-f]{6})/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    let colorValue: string;
    if (match[1].startsWith('#')) {
      // 已经是十六进制颜色
      colorValue = '#' + match[1].substring(1);
    } else {
      // 将Minecraft颜色代码转换为十六进制值
      const mcColors: Record<string, string> = {
        '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
        '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
        '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
        'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
      };
      colorValue = mcColors[match[1]] || '#FFFFFF';
    }
    
    colorMatches.push({
      position: match.index,
      length: match[0].length,
      color: colorValue
    });
  }
  
  // 如果找到的颜色少于2个，无法形成渐变
  if (colorMatches.length < 2) return text;
  
  // 按位置排序
  colorMatches.sort((a, b) => a.position - b.position);
  
  // 识别潜在的渐变段落
  const gradientSegments = [];
  let currentSegment = null;
  
  for (let i = 0; i < colorMatches.length - 1; i++) {
    const current = colorMatches[i];
    const next = colorMatches[i + 1];
    
    // 获取两个颜色代码之间的文本
    const segmentStart = current.position + current.length;
    const segmentEnd = next.position;
    const segmentText = text.substring(segmentStart, segmentEnd);
    
    // 如果文本很短（小于等于2个字符），可能是渐变的一部分
    if (segmentText.length <= 2 && segmentText.length > 0) {
      if (!currentSegment) {
        currentSegment = {
          start: i,
          end: i + 1,
          colors: [current.color, next.color],
          text: segmentText
        };
      } else {
        // 延伸当前段落
        currentSegment.end = i + 1;
        currentSegment.colors.push(next.color);
        currentSegment.text += segmentText;
      }
    } else {
      // 完成当前段落
      if (currentSegment && currentSegment.colors.length >= 2) {
        gradientSegments.push(currentSegment);
      }
      currentSegment = null;
    }
  }
  
  // 完成最后一个段落
  if (currentSegment && currentSegment.colors.length >= 2) {
    gradientSegments.push(currentSegment);
  }
  
  // 如果没有找到渐变段落，返回原文本
  if (gradientSegments.length === 0) return text;
  
  // 将原文本转换为MiniMessage格式，替换渐变段落
  let result = text;
  
  // 从后向前替换，避免位置偏移
  for (let i = gradientSegments.length - 1; i >= 0; i--) {
    const segment = gradientSegments[i];
    const startMatch = colorMatches[segment.start];
    const endMatch = colorMatches[segment.end];
    
    // 渐变段落的起始和结束位置
    const startPos = startMatch.position;
    const endPos = endMatch.position + endMatch.length + segment.text.length;
    
    // 渐变标签
    const gradientTag = `<gradient:${segment.colors[0]}:${segment.colors[segment.colors.length - 1]}>${segment.text}</gradient>`;
    
    // 替换文本
    result = result.substring(0, startPos) + 
             gradientTag + 
             result.substring(endPos);
  }
  
  // 清理剩余的Minecraft格式代码
  result = result.replace(/§[0-9a-fklmnor]/g, '');
  
  return result;
}

// 添加一个新函数，将所有Minecraft格式代码转换为MiniMessage格式
function convertMinecraftToMiniMessage(text: string): string {
  if (!text) return text;
  
  // 先检查是否包含Minecraft格式代码
  if (!text.includes('§')) return text;
  
  // 先尝试使用渐变转换函数处理渐变色
  const hasGradient = detectGradient(text);
  if (hasGradient) {
    text = convertMinecraftGradientToMiniMessage(text);
  }
  
  // 处理普通颜色代码
  let result = text;
  
  // 1. 处理格式代码
  const formatMap: Record<string, string> = {
    'k': '<obfuscated>$1</obfuscated>',
    'l': '<bold>$1</bold>',
    'o': '<italic>$1</italic>',
    'n': '<underlined>$1</underlined>',
    'm': '<strikethrough>$1</strikethrough>',
    'r': '<reset>$1</reset>'
  };
  
  // 查找所有格式代码和它们后面的文本，直到下一个§
  for (const [code, tag] of Object.entries(formatMap)) {
    const regex = new RegExp(`§${code}([^§]*)`, 'g');
    result = result.replace(regex, tag);
  }
  
  // 2. 处理颜色代码
  const colorMap: Record<string, string> = {
    '0': '#000000', // black
    '1': '#0000AA', // dark_blue
    '2': '#00AA00', // dark_green
    '3': '#00AAAA', // dark_aqua
    '4': '#AA0000', // dark_red
    '5': '#AA00AA', // dark_purple
    '6': '#FFAA00', // gold
    '7': '#AAAAAA', // gray
    '8': '#555555', // dark_gray
    '9': '#5555FF', // blue
    'a': '#55FF55', // green
    'b': '#55FFFF', // aqua
    'c': '#FF5555', // red
    'd': '#FF55FF', // light_purple
    'e': '#FFFF55', // yellow
    'f': '#FFFFFF'  // white
  };
  
  // 使用正则表达式匹配颜色代码和之后的内容
  for (const [code, hex] of Object.entries(colorMap)) {
    const regex = new RegExp(`§${code}([^§]*)`, 'g');
    result = result.replace(regex, `<color:${hex}>$1</color>`);
  }
  
  // 3. 处理十六进制颜色代码
  result = result.replace(/§#([0-9A-Fa-f]{6})([^§]*)/g, '<color:#$1>$2</color>');
  
  // 4. 清理结果，去除任何残留的Minecraft格式代码
  result = result.replace(/§[0-9a-fklmnor]/g, '');
  
  return result;
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
      
      // 在POST处理中增强格式转换
      if (result && result.rawText) {
        // 检测是否包含渐变色 - 增加对多种格式的支持
        const hasGradient = detectGradient(result.rawText) ||
                            (result.rawText.match(/§[0-9a-f]/) || []).length >= 3;
        
        // 如果检测到渐变色或者请求格式是minimessage，转换为MiniMessage格式
        if (hasGradient || format === 'minimessage') {
          console.log('转换为MiniMessage格式:', format === 'minimessage' ? '根据请求格式' : '检测到渐变色');
          
          // 使用新的转换函数进行完整转换，而不仅仅是渐变色
          if (result.rawText.includes('§')) {
            if (hasGradient) {
              result.rawText = convertMinecraftGradientToMiniMessage(result.rawText);
            } else if (format === 'minimessage') {
              result.rawText = convertMinecraftToMiniMessage(result.rawText);
            }
          }
          
          // 标记为MiniMessage格式
          result.isMinimessage = true;
        }
      }
      
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