import React, { useState, useEffect } from 'react';
import { createEditor, Descendant, Editor, Node, Transforms } from 'slate';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import ColorPicker from './ColorPicker';

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

// const StyleButton = ({ code, color, label }: StyleButtonProps) => {
//   const editor = useSlate();
//   
//   const handleClick = () => {
//     Transforms.insertText(editor, `&${code}`);
//   };
//
//   return (
//     <button
//       onClick={handleClick}
//       className="w-8 h-8 rounded border-2 border-gray-300 relative"
//       style={{ backgroundColor: color }}
//       title={label}
//     >
//       <div 
//         className="absolute inset-0 flex items-center justify-center"
//         style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
//       >
//         <span className="text-xs font-bold text-black">{code}</span>
//       </div>
//     </button>
//   );
// };

interface MOTDEditorProps {
  initialValue?: Descendant[];
  onChange?: (value: Descendant[], plainText: string) => void;
  isMinimessage?: boolean;
  onFormatChange?: (isMinimessage: boolean) => void;
}

// 确保使用正确的 Node 引用
const serializeToString = (nodes: Descendant[]) => {
  if (!nodes || nodes.length === 0) return '';
  return nodes.map(n => Node.string(n)).join('\n');
};

export default function MOTDEditor({
  initialValue = [{ type: 'paragraph' as const, children: [{ text: '' }] }],
  onChange,
  isMinimessage = false,
  onFormatChange
}: MOTDEditorProps) {
  const [editor] = useState(() => withReact(createEditor()));

  // 添加初始化效果
  useEffect(() => {
    // 只在初始渲染时触发一次onChange
    if (onChange && initialValue) {
      const plainText = serializeToString(initialValue);
      console.log("初始化文本:", plainText);
      onChange(initialValue, plainText);
    }
  }, []);

  return (
    <Slate 
      editor={editor} 
      initialValue={initialValue as CustomElement[]}
      onChange={(value) => {
        if (onChange) {
          const plainText = serializeToString(value);
          console.log("编辑器内容变更:", plainText); // 应该在控制台看到这个
          onChange(value as Descendant[], plainText);
        }
      }}
    >
      <FormatToolbar 
        isMinimessage={isMinimessage} 
        onFormatChange={onFormatChange} 
      />
      <Editable
        className="min-h-[200px] p-4 border rounded bg-gray-100"
        placeholder={isMinimessage ? "输入MiniMessage内容..." : "输入MOTD内容..."}
        onKeyDown={(event) => {
          // 获取当前编辑器中的行数
          const value = editor.children;
          const linesCount = value.length;
          
          // 如果当前行数超过2行并且用户尝试添加新行，则阻止
          if (linesCount >= 2 && event.key === 'Enter') {
            event.preventDefault();
            return;
          }
          
          // 移除单行59字符的限制
        }}
      />
    </Slate>
  );
}

// 添加接口定义
interface FormatToolbarProps {
  isMinimessage: boolean;
  onFormatChange?: (isMinimessage: boolean) => void;
}

export const FormatToolbar = ({ isMinimessage, onFormatChange }: FormatToolbarProps) => {
  const editor = useSlate();
  
  // Minecraft 格式化代码映射
  const colorCodes = [
    { code: '0', name: '黑色', color: '#000000' },
    { code: '1', name: '深蓝色', color: '#0000AA' },
    { code: '2', name: '深绿色', color: '#00AA00' },
    { code: '3', name: '深青色', color: '#00AAAA' },
    { code: '4', name: '深红色', color: '#AA0000' },
    { code: '5', name: '紫色', color: '#AA00AA' },
    { code: '6', name: '金色', color: '#FFAA00' },
    { code: '7', name: '灰色', color: '#AAAAAA' },
    { code: '8', name: '深灰色', color: '#555555' },
    { code: '9', name: '蓝色', color: '#5555FF' },
    { code: 'a', name: '绿色', color: '#55FF55' },
    { code: 'b', name: '青色', color: '#55FFFF' },
    { code: 'c', name: '红色', color: '#FF5555' },
    { code: 'd', name: '粉色', color: '#FF55FF' },
    { code: 'e', name: '黄色', color: '#FFFF55' },
    { code: 'f', name: '白色', color: '#FFFFFF' },
  ];

  const formatButtons = [
    { code: 'l', name: '粗体', icon: 'format_bold' },
    { code: 'o', name: '斜体', icon: 'format_italic' },
    { code: 'n', name: '下划线', icon: 'format_underlined' },
    { code: 'm', name: '删除线', icon: 'strikethrough_s' },
    { code: 'r', name: '重置', icon: 'restart_alt' },
  ];

  // MiniMessage格式代码
  const miniMessageFormatButtons = [
    { code: '<bold>', name: '粗体', icon: 'format_bold' },
    { code: '<italic>', name: '斜体', icon: 'format_italic' },
    { code: '<underlined>', name: '下划线', icon: 'format_underlined' },
    { code: '<strikethrough>', name: '删除线', icon: 'strikethrough_s' },
    { code: '<reset>', name: '重置', icon: 'restart_alt' },
  ];

  // 颜色选择器状态
  const [selectedColor, setSelectedColor] = useState('#AA0000');
  const [startColor, setStartColor] = useState('#FF5555');
  const [endColor, setEndColor] = useState('#5555FF');

  // 在FormatToolbar组件内添加状态变量
  const [gradientExpanded, setGradientExpanded] = useState(false);

  return (
    <div className="p-2 bg-gray-200 rounded-t mb-1">
      {/* 格式选择器 */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-bold">格式工具栏</div>
        <div className="flex items-center">
          <span className="mr-2 text-sm">格式:</span>
          <select 
            className="border rounded px-2 py-1 text-sm bg-white"
            value={isMinimessage ? "minimessage" : "minecraft"}
            onChange={(e) => {
              if (onFormatChange) {
                onFormatChange(e.target.value === "minimessage");
              }
            }}
            aria-label="选择格式"
          >
            <option value="minecraft">Minecraft格式</option>
            <option value="minimessage">MiniMessage格式</option>
          </select>
        </div>
      </div>

      {/* 根据当前模式显示不同的格式工具栏 */}
      {!isMinimessage ? (
        <>
          {/* Minecraft 格式 - 颜色选择器 */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">颜色:</div>
            <div className="grid grid-cols-8 gap-2">
              {colorCodes.map((color) => (
                <button
                  key={color.code}
                  className="flex flex-col items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                  onClick={() => Transforms.insertText(editor, `&${color.code}`)}
                  title={color.name}
                >
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: color.color }}
                  ></div>
                  <div className="text-xs mt-1 font-mono">&{color.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Minecraft 格式 - 格式按钮 */}
          <div>
            <div className="text-xs font-semibold mb-1">格式:</div>
            <div className="flex flex-wrap gap-2">
              {formatButtons.map((button) => (
                <button
                  key={button.code}
                  className="flex items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                  onClick={() => Transforms.insertText(editor, `&${button.code}`)}
                  title={button.name}
                >
                  <span className="material-icons mr-1">{button.icon}</span>
                  <span className="text-sm">{button.name}</span>
                  <span className="ml-1 text-xs font-mono">&{button.code}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* MiniMessage 格式 - 预设颜色 */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">预设颜色:</div>
            <div className="grid grid-cols-8 gap-2 mb-2">
              {[
                { name: '红色', color: '#FF5555', code: 'red' },
                { name: '深红色', color: '#AA0000', code: 'dark_red' },
                { name: '金色', color: '#FFAA00', code: 'gold' },
                { name: '黄色', color: '#FFFF55', code: 'yellow' },
                { name: '绿色', color: '#55FF55', code: 'green' },
                { name: '深绿色', color: '#00AA00', code: 'dark_green' },
                { name: '青色', color: '#55FFFF', code: 'aqua' },
                { name: '深青色', color: '#00AAAA', code: 'dark_aqua' },
                { name: '蓝色', color: '#5555FF', code: 'blue' },
                { name: '深蓝色', color: '#0000AA', code: 'dark_blue' },
                { name: '粉色', color: '#FF55FF', code: 'light_purple' },
                { name: '紫色', color: '#AA00AA', code: 'dark_purple' },
                { name: '白色', color: '#FFFFFF', code: 'white' },
                { name: '灰色', color: '#AAAAAA', code: 'gray' },
                { name: '深灰色', color: '#555555', code: 'dark_gray' },
                { name: '黑色', color: '#000000', code: 'black' }
              ].map((color) => (
    <button
                  key={color.code}
                  className="flex flex-col items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                  onClick={() => Transforms.insertText(editor, `<color:${color.code}>`)}
                  title={color.name}
    >
      <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: color.color }}
                  ></div>
                  <div className="text-xs mt-1 truncate max-w-full">{color.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* MiniMessage 格式 - 自定义颜色 */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">自定义颜色:</div>
            <div className="flex items-center gap-2">
              <ColorPicker 
                color={selectedColor} 
                onChange={(color: string) => setSelectedColor(color)} 
              />
              <button
                onClick={() => {
                  const hexColor = selectedColor.replace('#', '');
                  Transforms.insertText(editor, `<color:#${hexColor}>`);
                }}
                className="px-3 py-2 bg-gray-100 rounded border hover:bg-gray-200"
                title="应用颜色"
              >
                应用颜色 <span className="text-xs font-mono">&lt;color:#{selectedColor.replace('#', '')}&gt;</span>
              </button>
            </div>
          </div>

          {/* MiniMessage 格式 - 渐变色（带折叠功能） */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold mb-1">渐变色:</div>
              <button 
                onClick={() => setGradientExpanded(!gradientExpanded)}
                className="text-xs text-blue-600 hover:underline flex items-center"
              >
                {gradientExpanded ? '收起' : '展开'} 
                <span className="material-icons text-sm ml-1">
                  {gradientExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
            
            {gradientExpanded && (
              <div className="flex flex-col gap-2 mt-1 p-2 bg-gray-100 rounded border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="text-xs mr-2">起始颜色:</span>
                    <ColorPicker 
                      color={startColor || "#FF5555"} 
                      onChange={(color: string) => setStartColor(color)} 
                    />
                  </div>
                  <div className="flex items-center ml-4">
                    <span className="text-xs mr-2">结束颜色:</span>
                    <ColorPicker 
                      color={endColor || "#5555FF"} 
                      onChange={(color: string) => setEndColor(color)} 
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const startHex = startColor?.replace('#', '') || "FF5555";
                    const endHex = endColor?.replace('#', '') || "5555FF";
                    Transforms.insertText(editor, `<gradient:#${startHex}:#${endHex}>`);
                  }}
                  className="px-3 py-2 bg-white rounded border hover:bg-gray-50"
                  title="应用渐变色"
                >
                  应用渐变色
                  <div className="mt-1 w-full h-4 rounded" 
                       style={{background: `linear-gradient(to right, ${startColor || "#FF5555"}, ${endColor || "#5555FF"})`}}>
      </div>
    </button>
              </div>
            )}
            
            {!gradientExpanded && (
              <button
                onClick={() => setGradientExpanded(true)}
                className="w-full px-3 py-2 bg-gray-100 rounded border hover:bg-gray-200 text-sm"
              >
                点击展开渐变色选项
              </button>
            )}
          </div>

          {/* MiniMessage 格式 - 格式按钮 */}
          <div>
            <div className="text-xs font-semibold mb-1">格式:</div>
            <div className="flex flex-wrap gap-2">
              {miniMessageFormatButtons.map((button) => (
                <button
                  key={button.code}
                  className="flex items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                  onClick={() => Transforms.insertText(editor, button.code)}
                  title={button.name}
                >
                  <span className="material-icons mr-1">{button.icon}</span>
                  <span className="text-sm">{button.name}</span>
                  <span className="ml-1 text-xs font-mono">{button.code}</span>
                </button>
              ))}
              
              {/* 添加结束标签按钮 */}
              <button
                className="flex items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                onClick={() => Transforms.insertText(editor, '</color>')}
                title="结束颜色标签"
              >
                <span className="material-icons mr-1">format_color_reset</span>
                <span className="text-sm">结束颜色</span>
                <span className="ml-1 text-xs font-mono">&lt;/color&gt;</span>
              </button>
              
              <button
                className="flex items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                onClick={() => Transforms.insertText(editor, '</gradient>')}
                title="结束渐变标签"
              >
                <span className="material-icons mr-1">gradient</span>
                <span className="text-sm">结束渐变</span>
                <span className="ml-1 text-xs font-mono">&lt;/gradient&gt;</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 为工具栏组件添加类型
interface ToolbarProps {
  editor: any; // 可以使用更具体的Slate编辑器类型
}

const MCFormatToolbar = ({ editor }: ToolbarProps) => (
  <>
    {/* 现有的颜色按钮 */}
    <div className="flex flex-wrap gap-1 mr-2">
      {MC_COLORS.map(color => (
        <button
          key={color.code}
          onClick={() => Transforms.insertText(editor, `&${color.code}`)}
          className="w-5 h-5 rounded"
          style={{ backgroundColor: color.color }}
          title={color.name}
        />
      ))}
    </div>
    
    {/* 现有的格式按钮 */}
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
  </>
);

// 添加MiniMessage工具栏组件
const MinimessageToolbar = ({ editor }: ToolbarProps) => {
  const [selectedColor, setSelectedColor] = useState('#AA0000');
  
  // 应用颜色的函数
  const applyColor = (color: string) => {
    // 将颜色转换为hex格式并去掉#前缀
    const hexColor = color.replace('#', '');
    Transforms.insertText(editor, `<color:#${hexColor}>`);
  };
  
  return (
    <>
      {/* 调色盘部分 */}
      <div className="flex flex-col items-center mr-4">
        <ColorPicker 
          color={selectedColor} 
          onChange={(color: string) => setSelectedColor(color)} 
        />
        <button
          onClick={() => applyColor(selectedColor)}
          className="mt-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          title="应用颜色"
        >
          应用颜色
        </button>
      </div>
      
      {/* 格式按钮 - MiniMessage版本 */}
      <button
        onClick={() => Transforms.insertText(editor, '<bold>')}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
        title="粗体"
      >
        <span className="font-bold">B</span>
      </button>
      <button
        onClick={() => Transforms.insertText(editor, '<italic>')}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 italic"
        title="斜体"
      >
        <span className="italic">I</span>
      </button>
      <button
        onClick={() => Transforms.insertText(editor, '<strikethrough>')}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 relative"
        title="删除线"
      >
        <span className="relative">
          S
          <div className="absolute inset-x-0 top-1/2 h-px bg-current transform -translate-y-1/2" />
        </span>
      </button>
      <button
        onClick={() => Transforms.insertText(editor, '<underlined>')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 underline"
          title="下划线"
        >
          U
        </button>
      <button
        onClick={() => Transforms.insertText(editor, '<reset>')}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
        title="重置样式"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V1M8 3C5.23858 3 3 5.23858 3 8C3 10.7614 5.23858 13 8 13C10.7614 13 13 10.7614 13 8C13 6.1455 11.8857 4.502 10.2857 3.71429" stroke="currentColor" strokeLinecap="round"/>
          <path d="M11 5L13 3L11 1" stroke="currentColor" strokeLinecap="square"/>
        </svg>
      </button>
    </>
  );
};