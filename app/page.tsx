'use client';
import Image from "next/image";
import { useState } from 'react';
import MOTDEditor, { CustomElement, MC_COLORS } from '@/components/MOTDEditor';
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
  const [motdUrl, setMotdUrl] = useState<string | null>(null);
  const [isMinimessage, setIsMinimessage] = useState(false);
  const [motdContent, setMotdContent] = useState<Descendant[]>([]);

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
            // 保存图片路径
            setIconPath(result.filepath);
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
      const response = await fetch('/api/motd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          icon: iconPath || '',
          content: motdText
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const baseUrl = window.location.origin;
        setMotdUrl(`${baseUrl}${result.url}`);
      }
    } catch (error) {
      console.error('生成样式码错误:', error);
    }
  };

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

  // 添加MiniMessage解析函数
  const parseMinimessageText = (text: string) => {
    if (!text) return [{ text: '', color: '#AAAAAA' }];
    
    const segments = [];
    let currentColor = '#AAAAAA';
    let currentText = '';
    let isBold = false;
    let isItalic = false;
    let isUnderlined = false;
    let isStrikethrough = false;
    let i = 0;
    
    while (i < text.length) {
      if (text[i] === '<') {
        // 寻找标签结束位置
        const tagEnd = text.indexOf('>', i);
        if (tagEnd === -1) {
          // 没找到结束标签，添加当前字符并继续
          currentText += text[i];
          i++;
          continue;
        }
        
        // 提取标签内容
        const tag = text.substring(i + 1, tagEnd);
        
        // 先添加当前累积的文本
        if (currentText) {
          segments.push({
            text: currentText,
            color: currentColor,
            isBold,
            isItalic,
            isUnderlined,
            isStrikethrough
          });
          currentText = '';
        }
        
        // 处理各种标签
        if (tag.startsWith('color:')) {
          // 处理颜色标签 <color:#FF0000>
          currentColor = tag.substring(6);
        } else if (tag === 'bold') {
          isBold = true;
        } else if (tag === '/bold') {
          isBold = false;
        } else if (tag === 'italic') {
          isItalic = true;
        } else if (tag === '/italic') {
          isItalic = false;
        } else if (tag === 'underlined') {
          isUnderlined = true;
        } else if (tag === '/underlined') {
          isUnderlined = false;
        } else if (tag === 'strikethrough') {
          isStrikethrough = true;
        } else if (tag === '/strikethrough') {
          isStrikethrough = false;
        } else if (tag === 'reset') {
          // 重置所有样式
          currentColor = '#AAAAAA';
          isBold = false;
          isItalic = false;
          isUnderlined = false;
          isStrikethrough = false;
        }
        
        // 跳过整个标签
        i = tagEnd + 1;
      } else {
        currentText += text[i];
        i++;
      }
    }
    
    // 添加最后一段文本
    if (currentText) {
      segments.push({
        text: currentText,
        color: currentColor,
        isBold,
        isItalic,
        isUnderlined,
        isStrikethrough
      });
    }
    
    console.log("解析结果:", segments);
    return segments;
  };

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
            initialValue={initialValue}
            isMinimessage={isMinimessage}
            onFormatChange={setIsMinimessage}
            onChange={(value: Descendant[], plainText: string) => {
              setMotdContent(value);
              setMotdText(plainText);
              console.log("编辑器内容更新:", plainText);
            }}
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
                <label 
                  htmlFor="icon-upload"
                  className="absolute inset-0 cursor-pointer group"
                >
                  {uploadingIcon ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                      上传中...
                    </div>
                  ) : serverIcon && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm">
                        上传
                      </span>
                    </div>
                  )}
                  <Image
                    src={serverIcon ? serverIcon : '/unknown_server.jpg'}
                    alt="Server Icon"
                    fill
                    className="rounded object-cover"
                  />
                </label>
              </div>
              <div style={{ width: 'calc(100% - 80px)' }}>
                <div className="text-white text-base font-normal mb-1">Minecraft Server</div>
                <div className="w-full bg-transparent border-transparent text-[#AAAAAA] font-minecraft focus:outline-none placeholder-gray-400 cursor-text select-text" style={{ minHeight: '2.2em', maxHeight: '2.2em' }}>
                  {motdText ? (
                    isMinimessage ? (
                      // MiniMessage格式渲染
                      parseMinimessageText(motdText).map((segment, index) => (
                        <span 
                          key={index} 
                          style={{ color: segment.color }}
                          className={`
                            ${segment.isBold ? 'font-bold' : ''}
                            ${segment.isItalic ? 'italic' : ''}
                            ${segment.isUnderlined ? 'underline' : ''}
                            ${segment.isStrikethrough ? 'line-through' : ''}
                          `}
                        >
                          {segment.text}
                        </span>
                      ))
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
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleIconUpload}
            className="hidden"
            id="icon-upload"
          />
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
            <div>调试信息:</div>
            <div>当前格式: {isMinimessage ? "MiniMessage" : "Minecraft"}</div>
            <div>文本内容: {motdText || "(空)"}</div>
            <div>内容长度: {motdText?.length || 0}</div>
          </div>
          {motdUrl && (
            <div className="mt-4 p-2 bg-gray-100 rounded-md break-all">
              <span className="text-gray-500">MOTD URL:</span>
              <a href={motdUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline">
                {motdUrl}
              </a>
            </div>
          )}
        </div>
      </div>
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        <div className="mb-2">
          Minecraft MOTD 生成器 v0.1.0
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
    </main>
  );
}