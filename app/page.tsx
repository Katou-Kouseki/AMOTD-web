'use client';
import Image from "next/image";
import { useState } from 'react';
import MOTDEditor, { CustomElement, CustomText, MC_COLORS } from '@/components/MOTDEditor';
import { Descendant, Element } from 'slate';

export default function Home() {
  const initialValue: CustomElement[] = [{ 
    type: 'paragraph' as const, 
    children: [{ text: '' }] 
  }];
  const [motdContent, setMotdContent] = useState<Descendant[]>(initialValue);
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [motdText, setMotdText] = useState<string>('');

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // 此处应使用 HTMLImageElement 来创建 img 元素
      const img = new window.Image();
      img.onload = () => {
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
        setServerIcon(canvas.toDataURL('image/png'));
      };
      if (e.target && e.target.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const generateStyleCode = () => {
    // 空函数
  };

  // 修改解析函数，确保返回一致的数组类型
  const parseFormattedText = (text: string): Array<Array<{text: string, color: string}>> => {
    if (!text) return [[{ text: '', color: '#FFFFFF' }]]; // 返回二维数组
    
    // 按行分割文本
    const lines = text.split('\n');
    // 限制最多显示2行
    const limitedLines = lines.slice(0, 2);
    
    // 存储所有行的分段
    const allLineSegments: Array<Array<{text: string, color: string}>> = [];
    
    // 处理每行文本
    for (const line of limitedLines) {
      const segments: Array<{text: string, color: string}> = [];
      let currentColor = '#FFFFFF';
      let currentText = '';
      let i = 0;
      let charCount = 0;
      const maxCharsPerLine = 46; // Minecraft每行限制为46个字符
      
      while (i < line.length && charCount < maxCharsPerLine) {
        if ((line[i] === '&' || line[i] === '§') && i + 1 < line.length) {
          // 处理格式代码
          if (currentText) {
            segments.push({ text: currentText, color: currentColor });
            currentText = '';
          }
          
          const colorCode = line[i + 1];
          const colorObj = MC_COLORS.find(c => c.code === colorCode);
          
          if (colorObj) {
            currentColor = colorObj.color;
          }
          
          i += 2;
        } else {
          currentText += line[i];
          i++;
          charCount++;
        }
      }
      
      if (currentText) {
        segments.push({ text: currentText, color: currentColor });
      }
      
      allLineSegments.push(segments);
    }
    
    return allLineSegments;
  };

  // 在组件顶部添加这个帮助函数
  const getColorClass = (color: string) => {
    // 设置一个自定义属性名
    const style = { '--mc-color': color } as React.CSSProperties;
    return style;
  };

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Minecraft MOTD 生成器</h1>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">编辑器</h2>
          <MOTDEditor
            initialValue={initialValue}
            onChange={(value: Descendant[], plainText: string) => {
              setMotdContent(value);
              setMotdText(plainText);
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
          <div className="relative border-2 border-gray-800 rounded p-4 bg-[url('/options_background.png')] bg-repeat text-white font-minecraft">
            <div className="relative z-10 flex items-center mb-4 pointer-events-auto">
              
              <div className="relative w-12 h-12 mr-4">
                <label 
                  htmlFor="icon-upload"
                  className="absolute inset-0 cursor-pointer group"
                >
                  {serverIcon && (
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
              <div>
                <div className="text-white text-base font-normal mb-1">Minecraft Server</div>
                <div className="w-full bg-transparent border-transparent text-white font-minecraft focus:outline-none placeholder-gray-400 cursor-text select-text flex flex-col">
                  {motdText ? 
                    parseFormattedText(motdText).map((lineSegments, lineIndex) => (
                      <div key={lineIndex} className="line-clamp-1 h-[1.2em]">
                        {lineSegments.map((segment, segmentIndex) => (
                          <span key={`${lineIndex}-${segmentIndex}`} style={getColorClass(segment.color)} className="text-[color:var(--mc-color)]">
                            {segment.text}
                          </span>
                        ))}
                      </div>
                    )) : 
                    <div className="text-gray-400">请在编辑器中输入文本</div>
                  }
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
        </div>
      </div>
    </main>
  );
}