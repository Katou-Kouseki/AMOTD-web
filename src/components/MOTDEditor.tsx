import React, { useState } from 'react';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import { BaseEditor, createEditor, Transforms, Descendant, Node } from 'slate';

export type CustomElement = { type: 'paragraph'; children: CustomText[] };
export type CustomText = { text: string; color?: string };

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & { type: 'paragraph' };
    Element: CustomElement;
    Text: CustomText;
  }
}

export const MC_COLORS = [
  { code: '0', name: '黑', color: '#000000' },
  { code: '1', name: '深蓝', color: '#0000AA' },
  { code: '2', name: '绿', color: '#00AA00' },
  { code: '3', name: '天蓝', color: '#00AAAA' },
  { code: '4', name: '大红', color: '#AA0000' },
  { code: '5', name: '品红', color: '#AA00AA' },
  { code: '6', name: '土黄', color: '#FFAA00' },
  { code: '7', name: '灰', color: '#AAAAAA' },
  { code: '8', name: '深灰', color: '#555555' },
  { code: '9', name: '蓝紫', color: '#5555FF' },
  { code: 'a', name: '浅绿', color: '#55FF55' },
  { code: 'b', name: '蓝绿', color: '#55FFFF' },
  { code: 'c', name: '浅红', color: '#FF5555' },
  { code: 'd', name: '粉红', color: '#FF55FF' },
  { code: 'e', name: '金黄', color: '#FFFF55' },
  { code: 'f', name: '白', color: '#FFFFFF' }
].sort((a, b) => a.code.localeCompare(b.code));

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
      className="w-8 h-8 rounded border-2 border-gray-300 relative"
      style={{ backgroundColor: color }}
      title={label}
    >
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
      >
        <span className="text-xs font-bold text-black">{code}</span>
      </div>
    </button>
  );
};

const FormatToolbar = () => {
  const editor = useSlate();
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex gap-2">
        <button
          onClick={() => Transforms.insertText(editor, '&l')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="粗体"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          onClick={() => Transforms.insertText(editor, '&o')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 italic"
          title="斜体"
        >
          <span className="italic">I</span>
        </button>
        <button
          onClick={() => Transforms.insertText(editor, '&m')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 relative"
          title="删除线"
        >
          <span className="relative">
            S
            <div className="absolute inset-x-0 top-1/2 h-px bg-current transform -translate-y-1/2" />
          </span>
        </button>
        <button
          onClick={() => Transforms.insertText(editor, '&n')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 underline"
          title="下划线"
        >
          U
        </button>
        <button
          onClick={() => Transforms.insertText(editor, '&r')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="重置样式"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V1M8 3C5.23858 3 3 5.23858 3 8C3 10.7614 5.23858 13 8 13C10.7614 13 13 10.7614 13 8C13 6.1455 11.8857 4.502 10.2857 3.71429" stroke="currentColor" strokeLinecap="round"/>
            <path d="M11 5L13 3L11 1" stroke="currentColor" strokeLinecap="square"/>
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-8 gap-2">
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

interface MOTDEditorProps {
  initialValue?: Descendant[];
  onChange?: (value: Descendant[], plainText: string) => void;
}

// 修改 serializeToString 函数以更安全地处理内容
const serializeToString = (nodes: Descendant[]) => {
  if (!nodes || nodes.length === 0) return '';
  return nodes.map(n => Node.string(n)).join('\n');
};

export default function MOTDEditor({
  initialValue = [{ type: 'paragraph', children: [{ text: '' }] }],
  onChange
}: MOTDEditorProps) {
  const [editor] = useState(() => withReact(createEditor()));

  // 确保编辑器有一个有效的初始状态
  React.useEffect(() => {
    // 只在初始渲染时触发一次 onChange
    if (onChange) {
      const plainText = serializeToString(initialValue);
      onChange(initialValue, plainText);
    }
  }, []);

  return (
    <Slate 
      editor={editor} 
      initialValue={initialValue as CustomElement[]}
      onChange={value => {
        if (onChange) {
          const plainText = serializeToString(value);
          onChange(value as Descendant[], plainText);
        }
      }}
    >
      <FormatToolbar />
      <Editable
        className="min-h-[200px] p-4 border rounded bg-gray-100"
        placeholder="输入MOTD内容..."
        onKeyDown={(event) => {
          const selection = window.getSelection();
          if (selection && selection.anchorNode) {
            const textContent = selection.anchorNode.textContent || '';
            
            // 检查当前行是否已达到59个字符
            if (textContent.length >= 59 && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
              if (event.key === 'Enter') {
                // 允许回车键创建新行
                return;
              }
              // 阻止输入更多字符
              event.preventDefault();
            }
          }
        }}
        onChange={() => {
          if (onChange) {
            const plainText = serializeToString(editor.children);
            onChange(editor.children, plainText);
          }
        }}
      />
    </Slate>
  );
}