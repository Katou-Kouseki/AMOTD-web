'use client';
import Image from "next/image";
import { useState, useEffect, useCallback } from 'react';
import MOTDEditor, { MC_COLORS } from '../src/components/MOTDEditor';
import { Descendant } from 'slate';

export default function Home() {
  const initialValue: CustomElement[] = [{
    type: 'paragraph' as const, 
    children: [{ text: '' }] 
  }];
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
  const [motdContent, setMotdContent] = useState<Descendant[]>([]);
  const [expireTime, setExpireTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

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

  // 更新parseFormattedText函数支持多种格式
  const parseFormattedText = (text: string) => {
    if (!text) return [[{ text: '', color: '#AAAAAA' }]];
    
    // 按行分割文本
    const lines = text.split('\n').slice(0, 2);
    const allLineSegments: Array<Array<{text: string, color: string}>> = [];
    
    for (const line of lines) {
      const segments: Array<{text: string, color: string}> = [];
      let currentColor = '#AAAAAA';
      let currentText = '';
      let i = 0;
      
      while (i < line.length) {
        if ((line[i] === '&' || line[i] === '§') && i + 1 < line.length) {
          // 如果有文本累积，先添加到段落中
          if (currentText) {
            segments.push({ text: currentText, color: currentColor });
            currentText = '';
          }
          
          // 获取颜色代码
          const colorCode = line[i + 1];
          const colorObj = MC_COLORS.find(c => c.code === colorCode);
          
          if (colorObj) {
            currentColor = colorObj.color;
          }
          
          // 跳过颜色代码字符
          i += 2;
        } else {
          currentText += line[i];
          i++;
        }
      }
      
      // 添加最后一段文本
      if (currentText) {
        segments.push({ text: currentText, color: currentColor });
      }
      
      allLineSegments.push(segments);
    }
    
    console.log("解析结果:", allLineSegments);
    return allLineSegments;
  };

  // 在组件顶部添加这个帮助函数
  const getColorClass = (color: string) => {
    // 设置一个自定义属性名
    const style = { '--mc-color': color } as React.CSSProperties;
    return style;
  };

  // 修改parseMinimessageText函数，删除换行符的处理部分
  const parseMinimessageText = (text: string) => {
    if (!text) return '';
    
    let formattedText = text;
    
    // 处理预设颜色，例如<color:red>
    formattedText = formattedText.replace(/<color:([a-z_]+)>(.*?)(<\/color>|<reset>|$)/g, (match, color, content) => {
      const colorMap: Record<string, string> = {
        'black': '#000000',
        'dark_blue': '#0000AA',
        'dark_green': '#00AA00',
        'dark_aqua': '#00AAAA',
        'dark_red': '#AA0000',
        'dark_purple': '#AA00AA',
        'gold': '#FFAA00',
        'gray': '#AAAAAA',
        'dark_gray': '#555555',
        'blue': '#5555FF',
        'green': '#55FF55',
        'aqua': '#55FFFF',
        'red': '#FF5555',
        'light_purple': '#FF55FF',
        'yellow': '#FFFF55',
        'white': '#FFFFFF'
      };
      
      const colorValue = colorMap[color] || '#FFFFFF';
      return `<span style="color:${colorValue}">${content}</span>`;
    });
    
    // 处理十六进制颜色，例如<color:#FF5555>
    formattedText = formattedText.replace(/<color:#([0-9A-Fa-f]{6})>(.*?)(<\/color>|<reset>|$)/g, 
      (match, hexColor, content) => {
        return `<span style="color:#${hexColor}">${content}</span>`;
      }
    );
    
    // 处理渐变色，例如<gradient:#FF5555:#5555FF>
    formattedText = formattedText.replace(/<gradient:#([0-9A-Fa-f]{6}):#([0-9A-Fa-f]{6})>(.*?)(<\/gradient>|<reset>|$)/g, 
      (match, startColor, endColor, content) => {
        // 简单的CSS模拟渐变效果
        return `<span style="background: linear-gradient(to right, #${startColor}, #${endColor}); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${content}</span>`;
      }
    );
    
    // 处理格式化标签
    formattedText = formattedText.replace(/<bold>(.*?)(<\/bold>|<reset>|$)/g, '<span style="font-weight:bold">$1</span>');
    formattedText = formattedText.replace(/<italic>(.*?)(<\/italic>|<reset>|$)/g, '<span style="font-style:italic">$1</span>');
    formattedText = formattedText.replace(/<underlined>(.*?)(<\/underlined>|<reset>|$)/g, '<span style="text-decoration:underline">$1</span>');
    formattedText = formattedText.replace(/<strikethrough>(.*?)(<\/strikethrough>|<reset>|$)/g, '<span style="text-decoration:line-through">$1</span>');
    
    // 处理重置标签
    formattedText = formattedText.replace(/<reset>/g, '</span>');
    
    return formattedText;
  };

  // 1. 使用useCallback包装onChange处理函数
  const handleEditorChange = useCallback((value: Descendant[], plainText: string) => {
    setMotdText(plainText);
    // 其他可能导致循环的逻辑...
  }, []); // 不要在依赖项中包含motdText等状态变量

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
          />
          <button 
            onClick={generateStyleCode}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
          >
            生成样式码
          </button>
        </div>
        <div>
          <h2 className="text-2xl mb-4">预览</h2>
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
                <div className="w-full bg-transparent border-transparent text-[#AAAAAA] font-minecraft focus:outline-none placeholder-gray-400 cursor-text select-text" style={{ minHeight: '2.2em', maxHeight: '2.2em' }}>
                  {motdText ? (
                    isMinimessage ? (
                      // MiniMessage格式渲染 - 分行处理
                      <div className="w-full">
                        {motdText.split('\n').map((line, lineIndex) => (
                          <div key={lineIndex} className="line-clamp-1 leading-tight">
                            <div dangerouslySetInnerHTML={{ __html: parseMinimessageText(line) }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Minecraft格式渲染
                      parseFormattedText(motdText).map((lineSegments, lineIndex) => (
                        <div key={lineIndex} className="line-clamp-1 leading-tight">
                          {lineSegments.map((segment, segmentIndex) => (
                            <span 
                              key={`${lineIndex}-${segmentIndex}`} 
                              style={{ color: segment.color }}
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
          </div>
          {/* 样式码显示区域 */}
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
          {/* 当没有样式码时显示提示 */}
          {motdUrls.length === 0 && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-center text-gray-500">
              点击"生成样式码"按钮创建MOTD样式码
          </div>
          )}
          {/* 显示速率限制错误 */}
          {rateLimitError && (
            <div className="mt-4 p-2 bg-red-100 rounded-md text-red-700 text-sm">
              {rateLimitError}
        </div>
          )}
        </div>
      </div>
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        <div className="mb-2">
          Minecraft MOTD 生成器 v0.2.1
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
      {/* 添加必要的内联样式 */}
      <style jsx>{`
        @keyframes pulseOpacity {
          0%, 100% { background-color: rgba(0,0,0,0.15); }
          50% { background-color: rgba(0,0,0,0.35); }
        }
      `}</style>
    </main>
  );
}