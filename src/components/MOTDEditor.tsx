import React, { useState } from 'react';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import { BaseEditor, createEditor, Transforms } from 'slate';


type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { text: string; color?: string };

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & { type: 'paragraph' };
    Element: CustomElement;
    Text: CustomText;
  }
}

const MC_COLORS = [
  { code: '4', name: '大红', color: '#FF5555' },
  { code: 'c', name: '浅红', color: '#FFAAAA' },
  { code: '6', name: '土黄', color: '#FFAA00' },
  { code: 'e', name: '金黄', color: '#FFAA00' },
  { code: '2', name: '绿', color: '#00AA00' },
  { code: 'a', name: '浅绿', color: '#55FF55' },
  { code: 'b', name: '蓝绿', color: '#55FFFF' },
  { code: '3', name: '天蓝', color: '#00AAAA' },
  { code: '1', name: '深蓝', color: '#0000AA' },
  { code: '9', name: '蓝紫', color: '#AA00AA' },
  { code: 'd', name: '粉红', color: '#FF55FF' },
  { code: '5', name: '品红', color: '#AA00AA' },
  { code: 'f', name: '白', color: '#FFFFFF' },
  { code: '7', name: '灰', color: '#AAAAAA' },
  { code: '8', name: '深灰', color: '#555555' },
  { code: '0', name: '黑', color: '#000000' }
];

// 为组件的props添加类型定义
interface StyleButtonProps {
  code: string;
  color: string;
  label: string;
}

const StyleButton = ({ code, color, label }: StyleButtonProps) => {
  const editor = useSlate();
  
  const handleClick = () => {
    Transforms.insertText(editor, `§${code}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 rounded border-2 border-gray-300 flex flex-col items-center justify-center gap-1"
      style={{ backgroundColor: ['l', 'o', 'n'].includes(code) ? '#555555' : color }}
    >
      {code === 'l' && (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#fff" d="M5 3h6v3H5V3zm0 5h8v3H5V8zm0 5h10v3H5v-3z"/>
        </svg>
      )}
      {code === 'o' && (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#fff" d="M5 3h10v3H8v9H5V3zm3 5h7v3h-4l-3 4V8z" transform="rotate(-10 9 9)"/>
        </svg>
      )}
      {code === 'n' && (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#fff" d="M5 3h12v3H5v12h3V6h9v3H8v9H5V3zm9 6h3v6h-3V9z"/>
        </svg>
      )}
      <span className={`text-[9px] font-bold ${['f'].includes(code) ? 'text-black' : 'text-white'}`}>
        {label}
      </span>
    </button>
  );
};

const FormatToolbar = () => {
  const editor = useSlate();
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex gap-2">
        <StyleButton code="l" color="#cccccc" label="粗体" />
        <StyleButton code="o" color="#cccccc" label="斜体" />
        <StyleButton code="n" color="#cccccc" label="下划线" />
      </div>
      <div className="grid grid-cols-8 gap-2">
        {MC_COLORS.map(({ code, color, name }) => (
          <StyleButton
            key={code}
            code={code}
            color={color}
            label={name}
          />
        ))}
      </div>
    </div>
  );
};

export default function MOTDEditor({
  initialValue = [{ type: 'paragraph', children: [{ text: '' }] }]
}) {
  const [editor] = useState(() => withReact(createEditor()));

  return (
    <Slate editor={editor} initialValue={[{ type: 'paragraph', children: [{ text: '' }] }]}>
      <FormatToolbar />
      <Editable
        className="min-h-[200px] p-4 border rounded bg-gray-100"
        placeholder="输入MOTD内容..."
      />
    </Slate>
  );
}