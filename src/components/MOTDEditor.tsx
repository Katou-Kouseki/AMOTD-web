import React, { useState } from 'react';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import { BaseEditor, createEditor, Transforms } from 'slate';
// 移除未使用的Material-UI组件导入

type CustomElement = { type: 'paragraph'; children: CustomText[] };
type CustomText = { text: string; color?: string };

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & { type: 'paragraph' };
    Element: CustomElement;
    Text: CustomText;
  }
}

const STYLE_BUTTONS = [
  { code: 'l', name: '粗体', color: '#555555' },
  { code: 'o', name: '斜体', color: '#555555' },
  { code: 'n', name: '下划线', color: '#555555' }
];

const MC_COLORS = [
  { code: '4', name: '大红', color: '#FF5555' },
  { code: 'c', name: '浅红', color: '#FF5555' },
  { code: '6', name: '土黄', color: '#FFAA00' },
  { code: 'e', name: '金黄', color: '#FFFF55' },
  { code: '2', name: '绿', color: '#55FF55' },
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
    Transforms.insertText(editor, `&${code}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 rounded border-2 border-gray-300"
      style={{ backgroundColor: color }}
      title={label}
    />
  );
};

const FormatToolbar = () => {
  const editor = useSlate();
  return (
    <div className="grid grid-rows-2 gap-4">
      <div className="grid grid-cols-3 gap-2">
        {STYLE_BUTTONS.map((style) => (
          <StyleButton
            key={style.code}
            code={style.code}
            color={style.color}
            label={style.name}
          />
        ))}
      </div>
      <div className="grid grid-cols-9 gap-2">
        {MC_COLORS.map((color) => (
          <StyleButton
          key={color.code}
          code={color.code}
          color={color.color}
          label={color.name}
        />
      ))}
      </div>
    </div>
  );
};

export default function MOTDEditor({
  initialValue = [{ type: 'paragraph', children: [{ text: '' }] }] as CustomElement[]
}) {
  const [editor] = useState(() => withReact(createEditor()));

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <FormatToolbar />
      <Editable
        className="min-h-[200px] p-4 border rounded bg-gray-100"
        placeholder="输入MOTD内容..."
      />
    </Slate>
  );
}