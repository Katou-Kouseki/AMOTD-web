'use client';
import Image from "next/image";
import { useState } from 'react';
import MOTDEditor from '@/components/MOTDEditor';
import base64 from 'base-64';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [motdContent, setMotdContent] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [serverIcon, setServerIcon] = useState<string | null>(null);

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
    const data = {
      content: motdContent,
      icon: serverIcon
    };
    const encoded = base64.encode(JSON.stringify(data));
    setStyleCode(`${window.location.origin}/motd/${encoded}`);
  };

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Minecraft MOTD 生成器</h1>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">编辑器</h2>
          <MOTDEditor
            onChange={(value) => {
              const content = value.flatMap(node => node.children.map(child => child.text)).join('\n');
              setMotdContent(content);
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
          <div className="border-2 border-gray-800 rounded p-4 bg-gray-900 text-white font-minecraft">
            <div className="flex items-center mb-4">
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
                  {serverIcon ? (
                    <img
                      src={serverIcon}
                      className="w-full h-full rounded"
                      alt="服务器图标"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 rounded" />
                  )}
                </label>
              </div>
              <div>
                <div className="text-yellow-400 text-xl mb-1">我的服务器</div>
                <div className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  0/20 玩家在线
                </div>
              </div>
            </div>
            <div className="text-gray-300 whitespace-pre-wrap">
              {motdContent}
            </div>
          </div>
          {styleCode && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <p className="font-semibold mb-2">你的样式码：</p>
              <code className="break-all bg-gray-200 p-2 rounded block">{styleCode}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(styleCode)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                点击复制
              </button>
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleIconUpload}
          className="hidden"
          id="icon-upload"
        />

      </div>
    </main>
  );
}
