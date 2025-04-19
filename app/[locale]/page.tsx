'use client';
import Image from "next/image";
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';
import { Descendant } from 'slate';

// 使用动态导入解决服务端渲染问题
const MOTDEditor = dynamic(() => import('../../src/components/MOTDEditor'), {
  ssr: false,
  loading: () => <div className="min-h-[200px] p-4 border rounded bg-gray-100">Loading editor...</div>
});

// 添加格式段落的接口
interface FormattedSegment {
  text: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

// 添加类型守卫函数
function isFormattedSegmentWithFormat(segment: FormattedSegment): segment is FormattedSegment & {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
} {
  return 'bold' in segment && 'italic' in segment && 'underline' in segment && 'strikethrough' in segment;
}

export default function Home() {
  const t = useTranslations();
  
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
    if (difference <= 0) return t('home.expired');
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return `${hours}${t('home.hours')} ${minutes}${t('home.minutes')} ${seconds}${t('home.seconds')}`;
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

  const handleEditorChange = (value: Descendant[], plainText: string) => {
    setMotdText(plainText);
    setMotdContent(value);
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">MOTD Generator</h1>
        <p className="text-gray-600">Minecraft服务器MOTD生成器</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧编辑区域 */}
        <div className="flex flex-col gap-6">
          {/* 服务器图标上传 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">{t('home.serverIcon')}</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 relative bg-gray-200 rounded flex items-center justify-center">
                {serverIcon ? (
                  <Image 
                    src={serverIcon} 
                    alt="Server Icon" 
                    width={64} 
                    height={64} 
                    className="object-contain" 
                  />
                ) : (
                  <div className="text-4xl text-gray-400">?</div>
                )}
              </div>
              <label className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded cursor-pointer transition-colors">
                {uploadingIcon ? t('home.uploadingIcon') : t('home.uploadIcon')}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleIconUpload} 
                  disabled={uploadingIcon}
                  className="hidden" 
                />
              </label>
            </div>
          </div>
          
          {/* MOTD编辑器 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">MOTD</h2>
            <div className="mb-4">
              <Suspense fallback={<div className="min-h-[200px] p-4 border rounded bg-gray-100">Loading editor...</div>}>
                <MOTDEditor 
                  initialValue={[{ type: 'paragraph', children: [{ text: '' }] }]}
                  onChange={handleEditorChange}
                  isMinimessage={isMinimessage}
                  onFormatChange={(value) => setIsMinimessage(value)}
                  currentText={motdText}
                />
              </Suspense>
            </div>
            
            <button 
              onClick={generateStyleCode}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-medium transition-colors"
            >
              {t('home.generateStyleCode')}
            </button>
            
            {rateLimitError && (
              <div className="mt-2 text-red-500 text-sm">{rateLimitError}</div>
            )}
          </div>
          
          {/* 服务器MOTD获取 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('home.fetchServerMotd')}</h2>
              <button 
                onClick={() => setShowFetchUI(!showFetchUI)}
                className="text-blue-500 text-sm"
              >
                {showFetchUI ? "隐藏" : "显示"}
              </button>
            </div>
            
            {showFetchUI && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="serverIP" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('home.serverIp')}
                    </label>
                    <input
                      type="text"
                      id="serverIP"
                      value={serverIP}
                      onChange={(e) => setServerIP(e.target.value)}
                      className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="mc.hypixel.net"
                    />
                  </div>
                  <div className="w-20">
                    <label htmlFor="serverPort" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('home.serverPort')}
                    </label>
                    <input
                      type="text"
                      id="serverPort"
                      defaultValue="25565"
                      className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={fetchFormat}
                    onChange={(e) => setFetchFormat(e.target.value)}
                    className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label={t('home.formatType')}
                  >
                    <option value="minecraft">Minecraft</option>
                    <option value="minimessage">MiniMessage</option>
                  </select>
                  
                  <button
                    onClick={() => {}} // Placeholder for fetch function
                    disabled={fetchingMOTD || !serverIP.trim()}
                    className="flex-1 bg-blue-500 text-white py-1 px-4 rounded disabled:bg-gray-400"
                  >
                    {fetchingMOTD ? t('home.fetchingMotd') : t('home.fetch')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧预览区域 */}
        <div className="flex flex-col gap-6">
          {/* MOTD预览 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">{t('home.previewTitle')}</h2>
            <div className="p-4 bg-gray-900 text-white rounded-lg font-mono text-sm mb-4 min-h-[5rem]">
              {/* 预览内容将来自API */}
              <div className="flex items-center gap-3 mb-2">
                {serverIcon && (
                  <Image 
                    src={serverIcon} 
                    alt="Server Icon Preview" 
                    width={32} 
                    height={32}
                    className="object-contain"
                  />
                )}
                <div dangerouslySetInnerHTML={{ __html: "Minecraft Server" }} />
              </div>
              <div dangerouslySetInnerHTML={{ __html: "Loading preview..." }} />
            </div>
          </div>
          
          {/* 生成的样式码 */}
          {motdUrl && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">样式码</h2>
              <div className="bg-gray-100 p-3 rounded mb-2 overflow-x-auto">
                <code className="text-sm break-all font-mono">{motdUrl}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(motdUrl)
                    .then(() => alert(t('home.copySuccess')))
                    .catch(() => alert(t('home.copyError')));
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                复制链接
              </button>
            </div>
          )}
          
          {/* 调试信息 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('home.debugInfo')}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-medium text-sm text-gray-500 mb-1">原始文本:</div>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {motdText || '(空)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 添加语言切换器 */}
      <LanguageSwitcher />
    </main>
  );
} 