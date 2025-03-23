'use client';
import Image from "next/image";
import { useState, useEffect, useCallback } from 'react';
import MOTDEditor, { MC_COLORS } from '../src/components/MOTDEditor';
import { Descendant } from 'slate';

// 添加格式段落的接口
interface FormattedSegment {
  text: string;
  color: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

export default function Home() {
  // const initialValue: CustomElement[] = [{
  //   type: 'paragraph' as const, 
  //   children: [{ text: '' }] 
  // }];
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [motdText, setMotdText] = useState<string>('');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconPath, setIconPath] = useState<string | null>(null);
  const [motdUrls, setMotdUrls] = useState<Array<{
    url: string,
    id: string,
    expiresAt: number,
    countdown: string
  }>>([]);
  const [motdUrl, setMotdUrl] = useState<string | null>(null);
  const [isMinimessage, setIsMinimessage] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  /* eslint-disable @typescript-eslint/no-unused-vars */
  // 这些状态变量目前未使用，但为将来功能预留
  const [motdContent, setMotdContent] = useState<Descendant[]>([]);
  const [expireTime, setExpireTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const [showFetchUI, setShowFetchUI] = useState(false);
  const [serverIP, setServerIP] = useState('');
  const [fetchFormat, setFetchFormat] = useState('minecraft');
  const [fetchingMOTD, setFetchingMOTD] = useState(false);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIcon(true);
      
      // 创建canvas进行裁剪
      const img = new window.Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 64;
        canvas.height = 64;
        const scale = Math.min(64 / img.width, 64 / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (64 - width) / 2;
        const y = (64 - height) / 2;

        ctx.drawImage(img, x, y, width, height);
        
        // 将canvas转换为Blob
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          // 创建FormData并上传
          const formData = new FormData();
          formData.append('file', blob, 'icon.png');
          
          const response = await fetch('/api/upload-icon', {
            method: 'POST',
            body: formData
          });
          
          const result = await response.json();
          
          if (result.success) {
            // 保存完整URL路径而不是相对路径
            setIconPath(result.fileUrl);
            // 设置预览
        setServerIcon(canvas.toDataURL('image/png'));
          }
          
          setUploadingIcon(false);
        }, 'image/png');
      };
      
      // 读取文件
      const reader = new FileReader();
      reader.onload = (e) => {
      if (e.target && e.target.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('处理图片错误:', error);
      setUploadingIcon(false);
    }
  };

  const generateStyleCode = async () => {
    try {
      setRateLimitError(null);
      
      // 将编辑器文本分割成最多两行
      const lines = motdText.split('\n').slice(0, 2);
      const line1 = lines[0] || '';
      const line2 = lines.length > 1 ? lines[1] : '';
      
      const response = await fetch('/api/motd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          icon: iconPath || '',
          line1,
          line2,
          type: isMinimessage ? "minimessage" : "minecraft"
        })
      });
      
      // 检查HTTP状态码
      if (response.status === 429) {
        const errorData = await response.json();
        setRateLimitError(errorData.error);
        return;
      }
      
      if (!response.ok) {
        console.error('生成样式码失败:', response.status);
        return;
      }
      
      const result = await response.json();
      console.log('API响应:', result);
      
      const baseUrl = window.location.origin;
      const newUrl = `${baseUrl}/api/motd/${result.id}`;
      setMotdUrl(newUrl);
      
      // 如果使用motdUrls数组存储多个样式码
      if (result.expiresAt) {
        const newStyleCode = {
          url: newUrl,
          id: result.id,
          expiresAt: result.expiresAt,
          countdown: formatCountdown(result.expiresAt - Date.now())
        };
        
        setMotdUrls(prev => [...prev, newStyleCode]);
      }
      
    } catch (error) {
      console.error('生成样式码错误:', error);
    }
  };

  // 添加格式化倒计时的辅助函数
  const formatCountdown = (difference: number) => {
    if (difference <= 0) return '已过期';
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
  };

  // 使用Effect来定期更新所有样式码的倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setMotdUrls(prevUrls => 
        prevUrls
          .map(item => ({
            ...item,
            countdown: formatCountdown(item.expiresAt - now)
          }))
          .filter(item => item.expiresAt > now) // 自动过滤掉过期的样式码
      );
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // 修改parseFormattedText函数，更精确地处理空格
  const parseFormattedText = (text: string) => {
    if (!text) return [[{ text: '', color: '#AAAAAA' }]];
    
    // 预处理：确保使用§作为格式代码标记（在预览时）
    text = text.replace(/&([0-9a-fk-or]|#[0-9A-Fa-f]{6})/g, '§$1');
    
    // 按换行符分割，但更精确地处理空格
    let lines = text.split('\n');
    
    // 对于第二行的开头，如果以空格开始且后面紧跟格式代码，则移除这些前导空格
    // 这样只处理明显是无意义的前导空格，而不会影响用户有意输入的空格
    if (lines.length > 1) {
      lines[1] = lines[1].replace(/^\s+(?=§)/, '');
    }
    
    // 确保最多只有两行
    if (lines.length === 0) lines = [''];
    if (lines.length > 2) lines = lines.slice(0, 2);
    
    const allLineSegments: Array<Array<FormattedSegment>> = [];
    
    // 处理每一行
    for (const line of lines) {
      const segments: Array<FormattedSegment> = [];
      
      // 如果是空行，直接添加空段落
      if (line.length === 0) {
        segments.push({ text: '', color: '#AAAAAA' });
        allLineSegments.push(segments);
        continue; // 跳到下一行
      }
      
      let currentColor = '#AAAAAA'; // 默认颜色
      let currentText = '';
      let i = 0;
      
      // 跟踪当前激活的格式
      const activeFormats = {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false
      };
      
      while (i < line.length) {
        // 处理格式代码
        if (line[i] === '§' && i + 1 < line.length) {
          // 如果有文本累积，先添加到段落中
          if (currentText) {
            segments.push({ 
              text: currentText, 
              color: currentColor,
              fontWeight: activeFormats.bold ? 'bold' : undefined,
              fontStyle: activeFormats.italic ? 'italic' : undefined,
              textDecoration: activeFormats.underline 
                ? 'underline' 
                : (activeFormats.strikethrough ? 'line-through' : undefined)
            });
            currentText = '';
          }
          
          // 获取格式代码
          const formatCode = line[i + 1].toLowerCase();
          
          // 处理标准颜色代码
          const colorObj = MC_COLORS.find(c => c.code.toLowerCase() === formatCode);
          if (colorObj) {
            currentColor = colorObj.color;
            // 颜色代码会重置所有格式
            activeFormats.bold = false;
            activeFormats.italic = false;
            activeFormats.underline = false;
            activeFormats.strikethrough = false;
          } 
          // 处理格式代码
          else if (formatCode === 'l') {
            activeFormats.bold = true;
          } else if (formatCode === 'o') {
            activeFormats.italic = true;
          } else if (formatCode === 'n') {
            activeFormats.underline = true;
          } else if (formatCode === 'm') {
            activeFormats.strikethrough = true;
          } else if (formatCode === 'r') {
            // 重置所有格式
            activeFormats.bold = false;
            activeFormats.italic = false;
            activeFormats.underline = false;
            activeFormats.strikethrough = false;
            currentColor = '#AAAAAA';
          }
          
          // 跳过格式代码字符
          i += 2;
        } else {
          currentText += line[i];
          i++;
        }
      }
      
      // 添加最后一段文本
      if (currentText) {
        segments.push({ 
          text: currentText, 
          color: currentColor,
          fontWeight: activeFormats.bold ? 'bold' : undefined,
          fontStyle: activeFormats.italic ? 'italic' : undefined,
          textDecoration: activeFormats.underline 
            ? 'underline' 
            : (activeFormats.strikethrough ? 'line-through' : undefined)
        });
      }
      
      // 只有当段落有内容时才添加
      if (segments.length > 0) {
        allLineSegments.push(segments);
      }
    }
    
    // 如果只有一行，添加一个空行
    if (allLineSegments.length === 1) {
      allLineSegments.push([{ text: '', color: '#AAAAAA' }]);
    }
    
    return allLineSegments;
  };

  // 同样修改parseMinimessageText函数
  const parseMinimessageText = (text: string) => {
    if (!text) return [[{ text: '', color: '#AAAAAA' }]];
    
    // 清理重复字符处理不变...
    
    // 简化的分行逻辑 - 只按显式换行符分割
    let lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // 确保最多只有两行
    if (lines.length === 0) lines = [''];
    if (lines.length > 2) lines = lines.slice(0, 2);
    
    const allLineSegments: Array<Array<FormattedSegment>> = [];
    
    // 处理每一行
    for (const line of lines) {
      const segments: Array<FormattedSegment> = [];
      let currentColor = '#AAAAAA'; // 默认颜色
      let currentText = '';
      let i = 0;
      
      // 跟踪当前激活的格式
      const activeFormats = {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false
      };
      
      while (i < line.length) {
        // 处理格式代码
        if (line[i] === '§' && i + 1 < line.length) {
          // 如果有文本累积，先添加到段落中
          if (currentText) {
            segments.push({ 
              text: currentText, 
              color: currentColor,
              fontWeight: activeFormats.bold ? 'bold' : undefined,
              fontStyle: activeFormats.italic ? 'italic' : undefined,
              textDecoration: activeFormats.underline 
                ? 'underline' 
                : (activeFormats.strikethrough ? 'line-through' : undefined)
            });
            currentText = '';
          }
          
          // 获取格式代码
          const formatCode = line[i + 1].toLowerCase();
          
          // 处理标准颜色代码
          const colorObj = MC_COLORS.find(c => c.code.toLowerCase() === formatCode);
          if (colorObj) {
            currentColor = colorObj.color;
            // 颜色代码会重置所有格式
            activeFormats.bold = false;
            activeFormats.italic = false;
            activeFormats.underline = false;
            activeFormats.strikethrough = false;
          } 
          // 处理格式代码
          else if (formatCode === 'l') {
            activeFormats.bold = true;
          } else if (formatCode === 'o') {
            activeFormats.italic = true;
          } else if (formatCode === 'n') {
            activeFormats.underline = true;
          } else if (formatCode === 'm') {
            activeFormats.strikethrough = true;
          } else if (formatCode === 'r') {
            // 重置所有格式
            activeFormats.bold = false;
            activeFormats.italic = false;
            activeFormats.underline = false;
            activeFormats.strikethrough = false;
            currentColor = '#AAAAAA';
          }
          
          // 跳过格式代码字符
          i += 2;
        } else {
          currentText += line[i];
          i++;
        }
      }
      
      // 添加最后一段文本
      if (currentText) {
        segments.push({ 
          text: currentText, 
          color: currentColor,
          fontWeight: activeFormats.bold ? 'bold' : undefined,
          fontStyle: activeFormats.italic ? 'italic' : undefined,
          textDecoration: activeFormats.underline 
            ? 'underline' 
            : (activeFormats.strikethrough ? 'line-through' : undefined)
        });
      }
      
      // 只有当段落有内容时才添加
      if (segments.length > 0) {
        allLineSegments.push(segments);
      }
    }
    
    // 如果只有一行，添加一个空行，保持Minecraft MOTD双行样式
    if (allLineSegments.length === 1) {
      allLineSegments.push([{ text: '', color: '#AAAAAA' }]);
    }
    
    return allLineSegments;
  };

  // 1. 使用useCallback包装onChange处理函数
  const handleEditorChange = useCallback((value: Descendant[], plainText: string) => {
    // 直接更新状态，无需依赖项
    setMotdText(plainText);
    // 可选：记录更新时间戳，帮助调试
    console.log('编辑器内容已更新:', new Date().getTime());
  }, []); // 空依赖数组，确保回调稳定

  const fetchServerMOTD = async () => {
    if (!serverIP) return;
    
    try {
      setFetchingMOTD(true);
      
      const response = await fetch('/api/fetch-motd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverIP,
          format: fetchFormat
        })
      });
      
      if (!response.ok) {
        throw new Error('服务器MOTD获取失败');
      }
      
      const data = await response.json();
      
      if (data.rawText) {
        // 处理文本，只清理必要的空格
        const rawTextLines = data.rawText.split('\n');
        
        // 如果有两行，对第二行的前导空格进行处理
        if (rawTextLines.length > 1) {
          rawTextLines[1] = rawTextLines[1].replace(/^\s+(?=§)/, '');
        }
        
        // 重新组合处理后的文本
        const processedText = rawTextLines
          .join('\n')
          .replace(/§/g, '&')  // 为编辑器转换§为&
          .replace(/\r\n/g, '\n'); // 规范化换行符
        
        // 设置格式模式
        setIsMinimessage(fetchFormat === 'minimessage');
        
        // 设置处理后的文本
        setMotdText(processedText);
        
        // 可选：设置服务器图标
        if (data.serverIcon) {
          setServerIcon(data.serverIcon);
        }
      }
    } catch (error) {
      console.error('获取服务器MOTD失败:', error);
      alert('获取MOTD失败，请检查服务器IP是否正确');
    } finally {
      setFetchingMOTD(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('format-menu');
      if (menu && !menu.contains(event.target as Node)) {
        menu.classList.add('hidden');
      }
      
      const fetchUI = document.getElementById('fetch-ui');
      if (
        fetchUI && 
        !fetchUI.contains(event.target as Node) &&
        !(event.target as Element).closest('#fetch-trigger')
      ) {
        setShowFetchUI(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <main className="container mx-auto p-8 relative">
      {/* 社交媒体图标 */}
      <div className="absolute right-8 top-4 flex items-center space-x-4">
        <a 
          href="https://github.com/x1aoren/amotd-web" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/github.svg" 
            alt="GitHub" 
            width={24} 
            height={24} 
          />
        </a>
        <a 
          href="https://mcobs.cn" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/mcobs.png" 
            alt="MCOBS" 
            width={24} 
            height={24} 
          />
        </a>
        <a 
          href="https://space.bilibili.com/3546635921524900" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/bilibili.svg" 
            alt="bilibili" 
            width={24} 
            height={24} 
          />
        </a>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Minecraft MOTD 生成器</h1>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">编辑器</h2>
          <MOTDEditor
            initialValue={[{ type: 'paragraph', children: [{ text: '' }] }]}
            onChange={handleEditorChange}
            isMinimessage={isMinimessage}
            onFormatChange={(value) => setIsMinimessage(value)}
            currentText={motdText}
          />
          <button 
            onClick={generateStyleCode}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
          >
            生成样式码
          </button>
        </div>
        <div>
          <h2 className="text-2xl mb-4 flex items-center justify-between relative">
            <span>预览</span>
            <div className="relative">
              <button
                id="fetch-trigger"
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                onClick={() => setShowFetchUI(!showFetchUI)}
              >
                获取服务器MOTD
              </button>
              
              {showFetchUI && (
                <div 
                  id="fetch-ui" 
                  className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 p-2 rounded-md shadow-lg z-50"
                  style={{ width: 'auto', whiteSpace: 'nowrap' }}
                >
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      className="w-28 px-1 py-0.5 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none"
                      placeholder="服务器IP"
                      value={serverIP}
                      onChange={(e) => setServerIP(e.target.value)}
                    />
                    
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white px-1.5 py-0.5 text-xs rounded border border-green-700"
                      onClick={fetchServerMOTD}
                      disabled={fetchingMOTD}
                    >
                      {fetchingMOTD ? '..' : '获取'}
                    </button>
                    
                    <div className="relative">
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-1 py-0.5 text-xs rounded border border-green-700 flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          const menu = document.getElementById('format-menu');
                          if (menu) menu.classList.toggle('hidden');
                        }}
                      >
                        {fetchFormat === 'minecraft' ? 'MC' : 'MM'} ▼
                      </button>
                      
                      <div id="format-menu" className="absolute left-0 top-full mt-1 bg-gray-800 rounded shadow-lg hidden border border-gray-700 z-30">
                        <div className="py-0.5">
                          <button
                            className={`block px-2 py-0.5 text-xs w-full text-left text-white ${fetchFormat === 'minecraft' ? 'bg-green-700' : 'hover:bg-gray-700'}`}
                            onClick={() => {
                              setFetchFormat('minecraft');
                              document.getElementById('format-menu')?.classList.add('hidden');
                            }}
                          >
                            Minecraft格式
                          </button>
                          <button
                            className={`block px-2 py-0.5 text-xs w-full text-left text-white ${fetchFormat === 'minimessage' ? 'bg-green-700' : 'hover:bg-gray-700'}`}
                            onClick={() => {
                              setFetchFormat('minimessage');
                              document.getElementById('format-menu')?.classList.add('hidden');
                            }}
                          >
                            MiniMessage格式
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
            </div>
          </h2>
          <div className="relative border-2 border-gray-800 rounded p-4 bg-[url('/options_background.png')] bg-repeat text-white font-minecraft" style={{ minHeight: '110px' }}>
            <div className="relative z-10 flex items-start mb-3 pointer-events-auto">
            
              <div className="relative w-16 h-16 mr-4">
                <input 
                  type="file" 
                  id="icon-upload" 
                  accept="image/png,image/jpeg,image/gif" 
                  className="hidden" 
                  onChange={handleIconUpload} 
                />
                
                {/* 基础图像 */}
                <Image
                  src={serverIcon ? serverIcon : '/unknown_server.jpg'}
                  alt="Server Icon"
                  fill
                  className="rounded object-cover"
                />
                
                {/* 上传中覆盖层 */}
                {uploadingIcon && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white rounded z-20">
                    上传中...
                  </div>
                )}
                
                {/* 未上传状态闪烁边框 - 独立分离 */}
                {!serverIcon && !uploadingIcon && (
                  <div className="absolute inset-0 border-2 border-yellow-400 rounded z-10 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                )}
                
                {/* 悬停效果和文字层 - 使用内联样式确保动画生效 */}
                <label 
                  htmlFor="icon-upload"
                  className="absolute inset-0 cursor-pointer flex items-center justify-center z-20"
                  style={{
                    backgroundColor: serverIcon ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.15)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.35)';
                    const textElement = e.currentTarget.querySelector('span');
                    if (textElement) textElement.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = serverIcon ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.15)';
                    const textElement = e.currentTarget.querySelector('span');
                    if (textElement && serverIcon) textElement.style.opacity = '0';
                  }}
                >
                  <span 
                    className="text-white font-bold text-sm rounded px-2 py-1"
                    style={{
                      opacity: serverIcon ? '0' : '1',
                      transition: 'opacity 0.3s ease',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    上传
                  </span>
              </label>
                
                {/* 未上传状态的额外闪烁层 */}
                {!serverIcon && !uploadingIcon && (
                  <div 
                    className="absolute inset-0 rounded z-10" 
                    style={{
                      animation: 'pulseOpacity 2s ease-in-out infinite',
                    }}
                  ></div>
                )}
              </div>
              <div style={{ width: 'calc(100% - 80px)' }}>
                <div className="text-white text-base font-normal mb-1">Minecraft Server</div>
                <div className="w-full bg-transparent border-transparent text-[#AAAAAA] font-minecraft focus:outline-none placeholder-gray-400 cursor-text select-text" style={{ minHeight: '2.2em' }}>
                  {motdText ? (
                    isMinimessage ? (
                      // MiniMessage格式渲染
                      parseMinimessageText(motdText).map((lineSegments, lineIndex) => (
                        <div key={lineIndex} className="leading-tight whitespace-pre-wrap">
                          {typeof lineSegments === 'string' ? (
                            <div dangerouslySetInnerHTML={{ __html: lineSegments }} />
                          ) : (
                            lineSegments.map((segment, segmentIndex) => (
                              <span 
                                key={`${lineIndex}-${segmentIndex}`} 
                                style={{ 
                                  color: segment.color,
                                  fontWeight: segment.fontWeight || 'normal',
                                  fontStyle: segment.fontStyle || 'normal',
                                  textDecoration: segment.textDecoration || 'none'
                                }}
                              >
                                {segment.text}
                              </span>
                            ))
                          )}
                        </div>
                      ))
                    ) : (
                      // Minecraft格式渲染
                      parseFormattedText(motdText).map((lineSegments, lineIndex) => (
                        <div key={lineIndex} className="leading-tight whitespace-pre-wrap">
                          {lineSegments.map((segment, segmentIndex) => (
                            <span 
                              key={`${lineIndex}-${segmentIndex}`} 
                              style={{ 
                                color: segment.color,
                                fontWeight: segment.fontWeight || 'normal',
                                fontStyle: segment.fontStyle || 'normal',
                                textDecoration: segment.textDecoration || 'none'
                              }}
                            >
                              {segment.text}
                            </span>
                          ))}
                        </div>
                      ))
                    )
                  ) : (
                    <span className="text-gray-400">请在编辑器中输入文本</span>
                  )}
            </div>
              <div className="absolute right-4 top-4 flex items-center text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                0/20 玩家在线
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <div>调试信息:</div>
          <div>当前格式: {isMinimessage ? "MiniMessage" : "Minecraft"}</div>
          <div>文本内容: {motdText || "(空)"}</div>
          <div>内容长度: {motdText?.length || 0}</div>
          <div>当前样式码URL: {motdUrl || "(未生成)"}</div>
        </div>
        {motdUrls.length > 0 && (
          <div className="mt-4 border rounded-md overflow-hidden">
            <div className="bg-gray-100 p-2 border-b font-medium text-sm flex justify-between items-center">
              <div>生成的样式码 ({motdUrls.length})</div>
              <button
                onClick={() => setMotdUrls([])}
                className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded transition-colors"
              >
                清空全部
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {motdUrls.map((item, index) => (
                <div key={item.id} className="p-2 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className="text-gray-500 text-sm">样式码:</span>
                      <span className="ml-2 font-mono text-sm">{item.id}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.id)
                            .then(() => {
                              const btn = document.getElementById(`copy-btn-${index}`);
                              if (btn) {
                                const originalText = btn.innerText;
                                btn.innerText = '已复制';
                                btn.classList.add('bg-green-500');
                                btn.classList.remove('bg-gray-200');
                                setTimeout(() => {
                                  btn.innerText = originalText;
                                  btn.classList.remove('bg-green-500');
                                  btn.classList.add('bg-gray-200');
                                }, 2000);
                              }
                            })
                            .catch(err => console.error('复制失败:', err));
                        }}
                        id={`copy-btn-${index}`}
                        className="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <span className={`text-xs ${item.countdown === '已过期' ? 'text-red-500' : 'text-orange-500'}`}>
                      {item.countdown}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {item.url}
                    </a>
                  </div>
                </div>
                ))}
              </div>
          </div>
        )}
        {motdUrls.length === 0 && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md text-center text-gray-500">
            点击&quot;生成样式码&quot;按钮创建MOTD样式码
        </div>
        )}
        {rateLimitError && (
          <div className="mt-4 p-2 bg-red-100 rounded-md text-red-700 text-sm">
            {rateLimitError}
      </div>
        )}
      </div>
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm w-screen fixed bottom-0 left-0 pb-4 bg-white">
        <div className="mb-2">
          Minecraft MOTD 生成器 v0.3.0
        </div>
        <div className="flex items-center justify-center space-x-4">
          <a 
            href="https://beian.miit.gov.cn/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            鄂ICP备2024086021号
          </a>
          <a 
            href="https://beian.mps.gov.cn/#/query/webSearch?code=42050302000448" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center hover:text-gray-700"
          >
            <Image 
              src="/beian.png" 
              alt="备案图标" 
              width={14} 
              height={14} 
              className="mr-1" 
            />
            <span>鄂公网安备42050302000448号</span>
          </a>
        </div>
      </footer>
      <div className="pb-20"></div>
      <style jsx>{`
        @keyframes pulseOpacity {
          0%, 100% { background-color: rgba(0,0,0,0.15); }
          50% { background-color: rgba(0,0,0,0.35); }
        }
      `}</style>
      </div>
    </main>
  );
}
