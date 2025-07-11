'use client';
import Image from "next/image";
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Descendant } from 'slate';
import Link from 'next/link';
import { useParams } from 'next/navigation';


// 使用动态导入解决服务端渲染问题
const MOTDEditor = dynamic(
  () => import('../../src/components/MOTDEditor'),
  { 
    ssr: false,
    loading: () => null 
  }
);

// 添加MC颜色代码常量
export const MC_COLORS = [
  { code: '0', name: 'black', color: '#000000', hex: '#000000' },
  { code: '1', name: 'dark_blue', color: '#0000AA', hex: '#0000AA' },
  { code: '2', name: 'dark_green', color: '#00AA00', hex: '#00AA00' },
  { code: '3', name: 'dark_aqua', color: '#00AAAA', hex: '#00AAAA' },
  { code: '4', name: 'dark_red', color: '#AA0000', hex: '#AA0000' },
  { code: '5', name: 'dark_purple', color: '#AA00AA', hex: '#AA00AA' },
  { code: '6', name: 'gold', color: '#FFAA00', hex: '#FFAA00' },
  { code: '7', name: 'gray', color: '#AAAAAA', hex: '#AAAAAA' },
  { code: '8', name: 'dark_gray', color: '#555555', hex: '#555555' },
  { code: '9', name: 'blue', color: '#5555FF', hex: '#5555FF' },
  { code: 'a', name: 'green', color: '#55FF55', hex: '#55FF55' },
  { code: 'b', name: 'aqua', color: '#55FFFF', hex: '#55FFFF' },
  { code: 'c', name: 'red', color: '#FF5555', hex: '#FF5555' },
  { code: 'd', name: 'light_purple', color: '#FF55FF', hex: '#FF55FF' },
  { code: 'e', name: 'yellow', color: '#FFFF55', hex: '#FFFF55' },
  { code: 'f', name: 'white', color: '#FFFFFF', hex: '#FFFFFF' }
];

// 添加格式段落的接口
interface FormattedSegment {
  text: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export default function Home() {
  const t = useTranslations();
  const params = useParams();
  // 使用params，避免未使用变量警告
  const currentLocale = params.locale as string;
  
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [motdText, setMotdText] = useState<string>('');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconPath, setIconPath] = useState<string | null>(null);
  const [motdUrl, setMotdUrl] = useState<string | null>(null);
  const [isMinimessage, setIsMinimessage] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [editorMounted, setEditorMounted] = useState(false);
  const [editorLoading, setEditorLoading] = useState(true);
  
  // 使用于渲染预览的状态
  const [formattedSegments, setFormattedSegments] = useState<FormattedSegment[][]>([]);
  const [motdUrls, setMotdUrls] = useState<Array<{
    url: string,
    id: string,
    expiresAt: number,
    countdown: string
  }>>([]);
  // 添加motdLines状态用于存储MOTD文本的行 - 只使用setter
  const [, setMotdLines] = useState<{line1: string, line2: string}>({
    line1: '',
    line2: ''
  });

  // 添加弹窗状态
  const [showFetchModal, setShowFetchModal] = useState(false);
  
  // 这些状态变量会被实际使用
  const [motdContent, setMotdContent] = useState<Descendant[]>([{
    type: 'paragraph',
    children: [{ text: '' }]
  }]);
  const [serverIP, setServerIP] = useState('');
  const [fetchFormat, setFetchFormat] = useState('minecraft');
  const [fetchingMOTD, setFetchingMOTD] = useState(false);

  // 创建模态框的引用
  const modalRef = useRef<HTMLDivElement>(null);

  // 点击模态框外部时关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowFetchModal(false);
      }
    }
    
    // 添加事件监听器
    if (showFetchModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFetchModal]);

  // 使用Effect来设置编辑器加载状态
  useEffect(() => {
    // 组件已挂载，设置为已挂载状态
    setEditorMounted(true);
    
    // 使用setTimeout模拟编辑器加载完成
    const timer = setTimeout(() => {
      setEditorLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

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

  // 添加格式化倒计时的辅助函数
  const formatCountdown = (difference: number) => {
    if (difference <= 0) return t('home.expired');
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return `${hours}${t('home.hours')} ${minutes}${t('home.minutes')} ${seconds}${t('home.seconds')}`;
  };

  // 添加Minecraft格式代码解析函数
  const parseMinecraftColorCodes = (text: string): FormattedSegment[] => {
    if (!text) return [];
    
    const segments: FormattedSegment[] = [];
    const currentSegment: FormattedSegment = {
      text: '',
      color: '#FFFFFF',
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false
    };
    
    for (let i = 0; i < text.length; i++) {
      // 处理颜色和格式代码
      if ((text[i] === '§' || text[i] === '&') && i + 1 < text.length) {
        // 如果当前段有文本，添加到结果中
        if (currentSegment.text) {
          segments.push({...currentSegment});
          currentSegment.text = '';
        }
        
        const code = text[i + 1].toLowerCase();
        
        // 处理颜色代码
        const colorObj = MC_COLORS.find(c => c.code === code);
        if (colorObj) {
          currentSegment.color = colorObj.hex;
          // 颜色代码会重置所有格式
          currentSegment.bold = false;
          currentSegment.italic = false;
          currentSegment.underline = false;
          currentSegment.strikethrough = false;
        } 
        // 处理格式代码
        else if (code === 'l') {
          currentSegment.bold = true;
        } else if (code === 'o') {
          currentSegment.italic = true;
        } else if (code === 'n') {
          currentSegment.underline = true;
        } else if (code === 'm') {
          currentSegment.strikethrough = true;
        } else if (code === 'r') {
          // 重置所有格式
          currentSegment.color = '#FFFFFF';
          currentSegment.bold = false;
          currentSegment.italic = false;
          currentSegment.underline = false;
          currentSegment.strikethrough = false;
        }
        
        i++; // 跳过格式代码字符
      } else {
        currentSegment.text += text[i];
      }
    }
    
    // 添加最后一个段
    if (currentSegment.text) {
      segments.push({...currentSegment});
    }
    
    return segments;
  };

  // 解析MiniMessage格式
  const parseMiniMessageFormat = (text: string): FormattedSegment[] => {
    if (!text) return [];
    
    const segments: FormattedSegment[] = [];
    let currentSegment: FormattedSegment = {
      text: '',
      color: '#FFFFFF',
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false
    };
    
    // 临时变量追踪标签状态
    let inGradientTag = false;
    let gradientStart = '';
    let gradientEnd = '';
    let currentGradientText = '';
    
    // 预处理：替换HTML实体
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    for (let i = 0; i < text.length; i++) {
      // 标签开始
      if (text[i] === '<') {
        // 查找标签结束位置
        const tagEndPos = text.indexOf('>', i);
        if (tagEndPos === -1) {
          // 没有找到结束标签，直接添加文本
          currentSegment.text += text[i];
          continue;
        }
        
        const tag = text.substring(i, tagEndPos + 1);
        i = tagEndPos; // 调整索引到标签结束位置
        
        // 处理标签
        if (tag.startsWith('</')) {
          // 关闭标签
          if (tag === '</color>') {
            // 结束当前颜色区域
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.color = '#FFFFFF';
          } else if (tag === '</gradient>') {
            // 处理渐变文本
            if (inGradientTag && currentGradientText) {
              // 渐变文本处理 - 为每个字符分别创建带渐变颜色的片段
              if (currentSegment.text) {
                segments.push({...currentSegment});
                currentSegment.text = '';
              }
              
              // 创建渐变效果
              const gradientLength = currentGradientText.length;
              if (gradientLength > 0) {
                // 获取开始和结束颜色，确保它们是有效的十六进制颜色
                // 确保颜色值始终以#开头
                const startColor = gradientStart.startsWith('#') ? gradientStart : `#${gradientStart}`;
                const endColor = gradientEnd.startsWith('#') ? gradientEnd : `#${gradientEnd}`;
                
                try {
                  // 解析颜色
                  const startR = parseInt(startColor.slice(1, 3), 16) || 0;
                  const startG = parseInt(startColor.slice(3, 5), 16) || 0;
                  const startB = parseInt(startColor.slice(5, 7), 16) || 0;
                  
                  const endR = parseInt(endColor.slice(1, 3), 16) || 0;
                  const endG = parseInt(endColor.slice(3, 5), 16) || 0;
                  const endB = parseInt(endColor.slice(5, 7), 16) || 0;
                  
                  // 为每个字符创建渐变颜色
                  for (let j = 0; j < gradientLength; j++) {
                    // 计算字符在渐变中的位置比例 - 确保即使只有一个字符也能应用渐变
                    const ratio = gradientLength > 1 ? j / (gradientLength - 1) : 0.5;
                    
                    // 计算当前字符的颜色
                    const r = Math.round(startR + (endR - startR) * ratio);
                    const g = Math.round(startG + (endG - startG) * ratio);
                    const b = Math.round(startB + (endB - startB) * ratio);
                    
                    // 正确格式化十六进制颜色值，确保两位数
                    const rHex = r.toString(16).padStart(2, '0');
                    const gHex = g.toString(16).padStart(2, '0');
                    const bHex = b.toString(16).padStart(2, '0');
                    
                    // 转换为十六进制颜色
                    const color = `#${rHex}${gHex}${bHex}`;
                    
                    // 添加单个字符的片段，保留其他格式属性
                    segments.push({
                      text: currentGradientText[j],
                      color: color,
                      bold: currentSegment.bold,
                      italic: currentSegment.italic,
                      underline: currentSegment.underline,
                      strikethrough: currentSegment.strikethrough
                    });
                  }
                } catch {
                  // 错误处理：使用纯文本添加
                  segments.push({
                    text: currentGradientText,
                    color: '#FFFFFF',
                    bold: currentSegment.bold,
                    italic: currentSegment.italic,
                    underline: currentSegment.underline,
                    strikethrough: currentSegment.strikethrough
                  });
                }
              }
              
              // 重置渐变状态
              currentGradientText = '';
              inGradientTag = false;
            }
          } else if (tag === '</bold>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.bold = false;
          } else if (tag === '</italic>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.italic = false;
          } else if (tag === '</underlined>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.underline = false;
          } else if (tag === '</strikethrough>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.strikethrough = false;
          } else if (tag === '</reset>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
            }
            // 重置所有格式
            currentSegment = {
              text: '',
              color: '#FFFFFF',
              bold: false,
              italic: false,
              underline: false,
              strikethrough: false
            };
          }
        } else if (tag.includes(':')) {
          // 带参数的标签
          if (tag.startsWith('<color:')) {
            // 颜色标签
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            
            // 提取颜色值
            const colorMatch = tag.match(/<color:([^>]+)>/);
            if (colorMatch && colorMatch[1]) {
              const colorValue = colorMatch[1];
              // 确保颜色值总是以#开头
              currentSegment.color = colorValue.startsWith('#') 
                ? colorValue 
                : `#${colorValue}`;
            }
          } else if (tag.startsWith('<gradient:')) {
            // 渐变色标签
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            
            // 提取渐变色值
            const gradientMatch = tag.match(/<gradient:([^:]+):([^>]+)>/);
            if (gradientMatch && gradientMatch[1] && gradientMatch[2]) {
              // 确保颜色值始终以#开头
              gradientStart = gradientMatch[1].startsWith('#') 
                ? gradientMatch[1] 
                : `#${gradientMatch[1]}`;
                
              gradientEnd = gradientMatch[2].startsWith('#') 
                ? gradientMatch[2] 
                : `#${gradientMatch[2]}`;
              
              inGradientTag = true;
              currentGradientText = '';
            }
          }
        } else {
          // 简单标签
          if (tag === '<bold>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.bold = true;
          } else if (tag === '<italic>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.italic = true;
          } else if (tag === '<underlined>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.underline = true;
          } else if (tag === '<strikethrough>') {
            if (currentSegment.text) {
              segments.push({...currentSegment});
              currentSegment.text = '';
            }
            currentSegment.strikethrough = true;
          }
        }
      } else {
        // 普通文本
        if (inGradientTag) {
          currentGradientText += text[i];
        } else {
          currentSegment.text += text[i];
        }
      }
    }
    
    // 添加最后一个片段
    if (currentSegment.text) {
      segments.push({...currentSegment});
    }
    
    // 如果还有未处理的渐变文本
    if (inGradientTag && currentGradientText) {
      // 应用渐变效果
      const gradientLength = currentGradientText.length;
      if (gradientLength > 0) {
        // 获取开始和结束颜色
        const startColor = gradientStart || '#FFFFFF';
        const endColor = gradientEnd || '#FFFFFF';
        
        // 解析颜色
        const startR = parseInt(startColor.slice(1, 3), 16) || 0;
        const startG = parseInt(startColor.slice(3, 5), 16) || 0;
        const startB = parseInt(startColor.slice(5, 7), 16) || 0;
        
        const endR = parseInt(endColor.slice(1, 3), 16) || 0;
        const endG = parseInt(endColor.slice(3, 5), 16) || 0;
        const endB = parseInt(endColor.slice(5, 7), 16) || 0;
        
        // 为每个字符创建渐变颜色
        for (let j = 0; j < gradientLength; j++) {
          // 计算字符在渐变中的位置比例
          const ratio = gradientLength > 1 ? j / (gradientLength - 1) : 0;
          
          // 计算当前字符的颜色
          const r = Math.round(startR + (endR - startR) * ratio);
          const g = Math.round(startG + (endG - startG) * ratio);
          const b = Math.round(startB + (endB - startB) * ratio);
          
          // 十六进制颜色值需要保证两位数
          const rHex = r.toString(16).padStart(2, '0');
          const gHex = g.toString(16).padStart(2, '0');
          const bHex = b.toString(16).padStart(2, '0');
          
          // 转换为十六进制颜色
          const color = `#${rHex}${gHex}${bHex}`;
          
          // 添加单个字符的片段
          segments.push({
            text: currentGradientText[j],
            color: color,
            bold: currentSegment.bold,
            italic: currentSegment.italic,
            underline: currentSegment.underline,
            strikethrough: currentSegment.strikethrough
          });
        }
      }
    }
    
    return segments;
  };

  // 更新预览内容
  useEffect(() => {
    // 检查是否有文本并分割成行
    if (motdText) {
      const lines = motdText.split('\n').slice(0, 2);
      setMotdLines({
        line1: lines[0] || '',
        line2: lines.length > 1 ? lines[1] : ''
      });
      
      // 根据当前格式解析文本
      const parsedLines = lines.map(line => 
        isMinimessage ? parseMiniMessageFormat(line) : parseMinecraftColorCodes(line)
      );
      
      setFormattedSegments(parsedLines);
    } else {
      setFormattedSegments([]);
      setMotdLines({line1: '', line2: ''});
    }
  }, [motdText, isMinimessage]);

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
      
    } catch {
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
      
      setMotdLines({line1, line2});
      
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
        return;
      }
      
      const result = await response.json();
      
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
      
    } catch {
      // 处理错误
    }
  };

  const handleEditorChange = (value: Descendant[], plainText: string) => {
    setMotdContent(value);
    setMotdText(plainText);
  };

  // 添加复制URL功能
  const copyToClipboard = async (text: string) => {
    try {
      // 检查clipboard API是否可用
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // 使用传统方法作为备用方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';  // 避免滚动到底部
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (!success) {
          throw new Error('复制失败');
        }
      }
      alert(t('home.copySuccess'));
    } catch {
      alert(t('home.copyError'));
    }
  };

  // 获取服务器MOTD功能
  const fetchServerMOTD = async () => {
    if (!serverIP) return;
    
    try {
      setFetchingMOTD(true);
      // 使用currentLocale变量
      const response = await fetch(`/${currentLocale}/api/fetch-motd`, {
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
        setFetchingMOTD(false);
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.motd) {
        setMotdText(result.motd);
        
        // 如果有图标，也设置图标并上传处理
        if (result.icon) {
          // 先设置图标预览
          setServerIcon(result.icon);
          
          try {
            // 将Base64图标数据转换为Blob并上传
            const iconData = result.icon;
            
            // 解析Base64数据
            const base64Response = await fetch(iconData);
            const blob = await base64Response.blob();
            
            // 创建FormData
            const formData = new FormData();
            formData.append('file', blob, 'server_icon.png');
            
            // 上传图标
            const uploadResponse = await fetch('/api/upload-icon', {
              method: 'POST',
              body: formData
            });
            
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
              // 设置图标路径
              setIconPath(uploadResult.fileUrl);
            }
          } catch (error) {
            console.error('上传服务器图标失败:', error);
          }
        }
        
        // 如果服务器返回了格式类型，更新编辑器格式
        if (result.isMinimessage !== undefined) {
          setIsMinimessage(result.isMinimessage);
        }
      }
      
      setFetchingMOTD(false);
      setShowFetchModal(false); // 关闭弹窗
    } catch {
      setFetchingMOTD(false);
    }
  };

  // 渲染带格式的文本
  const renderFormattedText = (segments: FormattedSegment[]) => {
    return segments.map((segment, index) => {
      const style: React.CSSProperties = {
        color: segment.color,
        fontWeight: segment.bold ? 'bold' : 'normal',
        fontStyle: segment.italic ? 'italic' : 'normal',
        textDecoration: `${segment.underline ? 'underline' : ''} ${segment.strikethrough ? 'line-through' : ''}`.trim(),
        whiteSpace: 'pre'  // 保留空格和换行符
      };
      
      return (
        <span key={index} style={style}>
          {segment.text}
        </span>
      );
    });
  };

  // 添加语言下拉菜单状态
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  // 点击语言按钮外部时关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    }
    
    // 添加事件监听器
    if (languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageDropdownOpen]);

  return (
    <main className="max-w-screen-xl mx-auto py-8 px-4 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-minecraft dark:text-white">{t('title')}</h1>
        <div className="flex space-x-4 items-center">
          {/* GitHub链接 */}
          <Link href="https://github.com/x1aoren/AMOTD-web" target="_blank" aria-label="GitHub">
            <Image src="/github.svg" alt="GitHub" width={24} height={24} />
          </Link>
          
          {/* 哔哩哔哩链接 */}
          <Link href="https://space.bilibili.com/3493129963012937" target="_blank" aria-label="哔哩哔哩">
            <Image src="/bilibili.svg" alt="哔哩哔哩" width={24} height={24} />
          </Link>
          
          {/* 黑曜石论坛链接 */}
          <Link href="https://www.mcobs.cn" target="_blank" aria-label="黑曜石论坛">
            <Image src="/mcobs.png" alt="黑曜石论坛" width={24} height={24} />
          </Link>
          

          {/* 语言切换器 - 改进版本 */}
          <div className="relative" ref={languageDropdownRef}>
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full transition-all flex items-center"
              aria-label={t('common.language')}
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </button>
            {languageDropdownOpen && (
              <div className="absolute right-0 mt-2 py-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-xl z-10">
                <button 
                  onClick={() => {
                    // 获取当前路径和语言信息
                    const currentPath = window.location.pathname;
                    const newLocale = currentPath.includes('/zh/') || currentPath === '/zh' ? 'en' : 'zh';
                    
                    // 计算新路径：如果是根语言路径，则直接切换；否则保留路径的其余部分
                    let newPath = `/${newLocale}`;
                    
                    if (currentPath.length > 3) {
                      // 提取当前路径中除了语言部分的其余路径
                      const restPath = currentPath.replace(/^\/(zh|en)/, '');
                      newPath = `/${newLocale}${restPath}`;
                    }
                    
                    // 添加时间戳避免缓存问题
                    newPath += `?t=${Date.now()}`;
                    
                    // 应用新URL
                    window.location.href = newPath;
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {window.location.pathname.includes('/zh') ? 'English' : '中文'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧编辑区域 */}
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">{t('editor.formatToolbar')}</h2>
          
          {/* 使用MOTDEditor自带的格式工具栏 */}
          <div className="mb-4">
            {(!editorMounted || editorLoading) && (
              <div className="min-h-[200px] p-4 border rounded bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                {t('editor.loading')}
              </div>
            )}
            
            {editorMounted && !editorLoading && (
              <MOTDEditor
                initialValue={motdContent}
                onChange={handleEditorChange}
                isMinimessage={isMinimessage}
                onFormatChange={(value) => setIsMinimessage(value)}
                currentText={motdText}
              />
            )}
          </div>
          
          {/* 生成按钮 */}
          <button
            onClick={generateStyleCode}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            {t('home.generateStyleCode')}
          </button>
          
          {rateLimitError && (
            <div className="mt-2 text-red-500 text-sm">{rateLimitError}</div>
          )}
          
          {/* 隐藏调试信息，移除调试信息部分 */}
        </div>
        
        {/* 右侧预览区域 */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-white">{t('home.previewTitle')}</h2>
            {/* 将获取服务器MOTD按钮移至预览标题右侧 */}
            <button 
              onClick={() => setShowFetchModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
            >
              {t('home.fetchServerMotd')}
            </button>
          </div>
          
          {/* 应用背景图片 - 减少高度 */}
          <div className="bg-black text-white p-3 rounded mb-4 font-minecraft relative shadow-lg" 
            style={{ 
              backgroundImage: `url('/options_background.png')`, 
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
            
            <div className="flex items-center mb-2">
              {/* 服务器图标和上传按钮 */}
              <div className="w-12 h-12 mr-3 bg-gray-700 flex items-center justify-center overflow-hidden relative group border-2 border-yellow-500 shadow-inner">
                {serverIcon ? (
                  <Image 
                    src={serverIcon} 
                    alt={t('home.serverIcon')} 
                    width={48} 
                    height={48} 
                    className="object-contain" 
                  />
                ) : (
                  <Image 
                    src="/unknown_server.jpg" 
                    alt={t('home.serverIcon')} 
                    width={48} 
                    height={48} 
                    className="object-contain" 
                  />
                )}
                
                {/* 上传图标按钮 - 悬停时显示 */}
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="text-white text-xs text-center cursor-pointer p-1">
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
              
              {/* Minecraft服务器标题和玩家数量 */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-white font-bold text-sm">Minecraft Server</div>
                  <div className="text-green-400 text-sm">0/20</div>
                </div>
                
                {/* MOTD内容 */}
                <div className="text-white min-h-[1.8rem] text-sm overflow-x-auto" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {formattedSegments.length > 0 && formattedSegments[0].length > 0 ? (
                    <div className="mb-0.5">{renderFormattedText(formattedSegments[0])}</div>
                  ) : (
                    <div className="mb-0.5">{t('home.previewPlaceholder')}</div>
                  )}
                  {formattedSegments.length > 1 && formattedSegments[1].length > 0 && (
                    <div>{renderFormattedText(formattedSegments[1])}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 预览提示信息 */}
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-sm flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{t('home.previewDisclaimer')}</span>
          </div>
          
          {/* 样式码使用提示 */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{t('home.styleCodeNote')}</span>
          </div>
          
          {/* 样式码结果 - 显示在预览框下方 */}
          {motdUrl && (
            <div className="mt-3 mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="font-medium mb-2 flex justify-between items-center dark:text-white">
                  <span>{t('home.generatedUrl')}:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-mono">
                      {motdUrl.split('/').pop()}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(motdUrl)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title={t('home.copy')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  readOnly
                  value={motdUrl}
                  className="w-full p-2 bg-white dark:bg-gray-700 border rounded text-sm text-gray-700 dark:text-gray-200 dark:border-gray-600"
                  aria-label={t('home.generatedUrl')}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
            </div>
          )}
          
          {/* 样式码浏览框 - 调整样式 */}
          {motdUrls.length > 0 && (
            <div className="border rounded-lg divide-y bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm dark:divide-gray-700">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-200 rounded-t-lg">
                {t('home.savedStyleCodes')}: {motdUrls.length}
              </div>
              <div className="max-h-[200px] overflow-y-auto divide-y dark:divide-gray-700">
                {motdUrls.map((item) => (
                  <div key={item.id} className="px-3 py-2 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded text-sm">
                        {item.id}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.countdown}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.id)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      title={t('home.copy')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 获取服务器MOTD弹窗 - 添加毛玻璃效果 */}
          {showFetchModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-black/30">
              <div ref={modalRef} className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-lg shadow-lg max-w-md w-full backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-xl mb-4 dark:text-white">{t('home.fetchServerMotd')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 dark:text-gray-200">{t('home.serverIp')}:</label>
                    <input
                      type="text"
                      value={serverIP}
                      onChange={(e) => setServerIP(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      placeholder="play.example.com"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="mr-2 dark:text-gray-200">{t('home.formatType')}:</label>
                    <select
                      value={fetchFormat}
                      onChange={(e) => setFetchFormat(e.target.value)}
                      className="border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      aria-label={t('home.formatType')}
                    >
                      <option value="minecraft">Minecraft</option>
                      <option value="minimessage">MiniMessage</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowFetchModal(false)}
                      className="px-4 py-2 border rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      {t('home.cancel')}
                    </button>
                    <button
                      onClick={fetchServerMOTD}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                      disabled={fetchingMOTD}
                    >
                      {fetchingMOTD ? t('home.fetchingMotd') : t('home.fetch')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 页脚 */}
      <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400 text-sm">
        <p>Minecraft MOTD 生成器 v0.5.0</p>
        <div className="mt-2 flex justify-center items-center">
          <a href="http://www.beian.gov.cn/portal/registerSystemInfo" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center mx-2">
            <Image src="/beian.png" alt="备案" width={16} height={16} className="mr-1 dark:invert" />
            鄂公网安备42050302000448号
          </a>
          <span className="mx-2">•</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:underline">
          鄂ICP备2024086021号-1
          </a>
        </div>
      </footer>
    </main>
  );
} 