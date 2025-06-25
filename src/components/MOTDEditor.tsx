'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createEditor, Descendant, Node, Transforms, BaseEditor } from 'slate';
import { Slate, Editable, withReact, useSlate, ReactEditor } from 'slate-react';
import ColorPicker from './ColorPicker';
import styles from '../styles/editor.module.css';
import { useTranslations } from 'next-intl';

export type CustomElement = { type: 'paragraph'; children: CustomText[] };
export type CustomText = { text: string; color?: string };

// 在导入语句下方添加类型声明
type CustomEditor = BaseEditor & ReactEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export const MC_COLORS: Array<{ code: string; name: string; color: string; hex?: string }> = [
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
].sort((a, b) => a.code.localeCompare(b.code));

// 为组件的props添加类型定义
// interface StyleButtonProps {
//   code: string;
//   color: string;
//   label: string;
// }

interface MOTDEditorProps {
  initialValue: Descendant[];
  onChange: (value: Descendant[], plainText: string) => void;
  isMinimessage: boolean;
  onFormatChange?: (value: boolean) => void;
  currentText?: string;
}

export default function MOTDEditor({
  initialValue,
  onChange,
  isMinimessage,
  onFormatChange,
  currentText = ''
}: MOTDEditorProps) {
  const [editor] = useState(() => withReact(createEditor()));
  const t = useTranslations('editor');
  
  // 添加内部编辑标志
  const isUserEditingRef = useRef(false);
  
  // 修改useEffect，只有当确定为外部更新时才更新编辑器
  useEffect(() => {
    if (currentText && editor) {
      try {
        // 防止递归更新
        if (isUserEditingRef.current) return;
        
        // 处理文本
        let textToImport = currentText;
        
        // 处理MiniMessage换行标记
        if (textToImport.includes('<newline>')) {
          textToImport = textToImport.replace(/<newline>\n?/g, '\n');
        }
        
        // 将文本分割成行
        const lines = textToImport.split('\n');
        
        // 创建新的编辑器内容
        const newValue: Descendant[] = lines.map(line => ({
          type: 'paragraph' as const,
          children: [{ text: line }],
        }));
        
        // 关键修复：确保编辑器至少有一个空节点
        if (newValue.length === 0) {
          newValue.push({
            type: 'paragraph' as const,
            children: [{ text: '' }],
          });
        }
        
        // 更新编辑器内容
        editor.children = newValue;
        
        // 确保更新后再设置选区
        setTimeout(() => {
          try {
            // 确保编辑器有内容后再设置选区
            if (editor.children.length > 0) {
              Transforms.select(editor, { path: [0, 0], offset: 0 });
            }
            // 更新编辑器状态
            editor.onChange();
          } catch {
            // 选区设置错误
          }
        }, 0);
      } catch {
        // 文本导入错误
      }
    }
  }, [currentText, editor, isMinimessage]);

  return (
    <Slate 
      editor={editor} 
      initialValue={initialValue as CustomElement[]}
      onChange={(value) => {
        // 确保这是由用户编辑触发的
        isUserEditingRef.current = true;
        
        // 转换为纯文本
        const newText = value
          .map(n => Node.string(n))
          .join('\n');
        
        // 调用外部onChange
        if (onChange) {
          onChange(value as Descendant[], newText);
        }
        
        // 使用短时间延迟重置标志，允许下一次外部更新
        setTimeout(() => {
          isUserEditingRef.current = false;
        }, 100);
      }}
    >
      <FormatToolbar 
        isMinimessage={isMinimessage} 
        onFormatChange={onFormatChange} 
      />
      <Editable
        className="min-h-[200px] p-4 border rounded bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
        placeholder={isMinimessage ? t('inputMinimessage') : t('inputMotd')}
        // 添加键盘事件处理，确保编辑时标记为用户编辑
        onKeyDown={() => {
          isUserEditingRef.current = true;
        }}
      />
    </Slate>
  );
}

// 添加接口定义
interface FormatToolbarProps {
  isMinimessage: boolean;
  onFormatChange?: (value: boolean) => void;
}

export const FormatToolbar = ({ isMinimessage, onFormatChange }: FormatToolbarProps) => {
  const editor = useSlate();
  const t = useTranslations('editor');
  
  // Minecraft 格式化代码映射
  const colorCodes = [
    { code: '0', name: t('colors.black'), color: '#000000' },
    { code: '1', name: t('colors.darkBlue'), color: '#0000AA' },
    { code: '2', name: t('colors.darkGreen'), color: '#00AA00' },
    { code: '3', name: t('colors.darkAqua'), color: '#00AAAA' },
    { code: '4', name: t('colors.darkRed'), color: '#AA0000' },
    { code: '5', name: t('colors.purple'), color: '#AA00AA' },
    { code: '6', name: t('colors.gold'), color: '#FFAA00' },
    { code: '7', name: t('colors.gray'), color: '#AAAAAA' },
    { code: '8', name: t('colors.darkGray'), color: '#555555' },
    { code: '9', name: t('colors.blue'), color: '#5555FF' },
    { code: 'a', name: t('colors.green'), color: '#55FF55' },
    { code: 'b', name: t('colors.aqua'), color: '#55FFFF' },
    { code: 'c', name: t('colors.red'), color: '#FF5555' },
    { code: 'd', name: t('colors.pink'), color: '#FF55FF' },
    { code: 'e', name: t('colors.yellow'), color: '#FFFF55' },
    { code: 'f', name: t('colors.white'), color: '#FFFFFF' },
  ];

  const formatButtons = [
    { code: 'l', name: t('formats.bold'), icon: 'format_bold' },
    { code: 'o', name: t('formats.italic'), icon: 'format_italic' },
    { code: 'n', name: t('formats.underline'), icon: 'format_underlined' },
    { code: 'm', name: t('formats.strikethrough'), icon: 'strikethrough_s' },
    { code: 'r', name: t('formats.reset'), icon: 'restart_alt' },
  ];

  // MiniMessage格式代码
  const miniMessageFormatButtons = [
    { code: '<bold>', name: t('formats.bold'), icon: 'format_bold' },
    { code: '<italic>', name: t('formats.italic'), icon: 'format_italic' },
    { code: '<underlined>', name: t('formats.underline'), icon: 'format_underlined' },
    { code: '<strikethrough>', name: t('formats.strikethrough'), icon: 'strikethrough_s' },
    { code: '<reset>', name: t('formats.reset'), icon: 'restart_alt' },
  ];

  // 颜色选择器状态
  const [selectedColor, setSelectedColor] = useState('#AA0000');
  const [startColor, setStartColor] = useState('#FF5555');
  const [endColor, setEndColor] = useState('#5555FF');

  // 在FormatToolbar组件内添加状态变量
  const [gradientExpanded, setGradientExpanded] = useState(false);

  return (
    <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-t mb-1">
      {/* 格式选择器 */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-bold dark:text-white">{t('formatToolbar')}</div>
        <div className="flex items-center">
          <span className="mr-2 text-sm dark:text-white">{t('format')}:</span>
          <select 
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={isMinimessage ? "minimessage" : "minecraft"}
            onChange={(e) => {
              if (onFormatChange) {
                onFormatChange(e.target.value === "minimessage");
              }
            }}
            aria-label={t('format')}
          >
            <option value="minecraft">{t('minecraftFormat')}</option>
            <option value="minimessage">{t('miniMessageFormat')}</option>
          </select>
        </div>
      </div>

      {/* 根据当前模式显示不同的格式工具栏 */}
      {!isMinimessage ? (
        <>
          {/* Minecraft 格式 - 颜色选择器 */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1 dark:text-white">{t('colors.title')}:</div>
            <div className="grid grid-cols-8 gap-2">
              {colorCodes.map((color) => (
                <button
                  key={color.code}
                  className="flex flex-col items-center p-2 rounded border hover:bg-gray-100 transition-colors"
                  onClick={() => Transforms.insertText(editor, `&${color.code}`)}
                  title={color.name}
                >
                  <div 
                    className={styles.colorSwatch}
                    style={{ 
                      backgroundColor: color.color,
                      border: '1px solid #999999'
                    }}
                  ></div>
                  <div className="text-xs mt-1 font-mono">&{color.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Minecraft 格式 - 格式按钮 */}
          <div>
            <div className="text-xs font-semibold mb-1 dark:text-white">{t('formats.title')}:</div>
            <div className="flex flex-wrap gap-2">
              {formatButtons.map((button) => (
                <button
                  key={button.code}
                  className="flex items-center p-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
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
            <div className="text-xs font-semibold mb-1 dark:text-white">{t('colors.title')}:</div>
            <div className="grid grid-cols-8 gap-2 mb-2">
              {[
                { name: t('colors.red'), color: '#FF5555', code: 'red' },
                { name: t('colors.darkRed'), color: '#AA0000', code: 'dark_red' },
                { name: t('colors.gold'), color: '#FFAA00', code: 'gold' },
                { name: t('colors.yellow'), color: '#FFFF55', code: 'yellow' },
                { name: t('colors.green'), color: '#55FF55', code: 'green' },
                { name: t('colors.darkGreen'), color: '#00AA00', code: 'dark_green' },
                { name: t('colors.aqua'), color: '#55FFFF', code: 'aqua' },
                { name: t('colors.darkAqua'), color: '#00AAAA', code: 'dark_aqua' },
                { name: t('colors.blue'), color: '#5555FF', code: 'blue' },
                { name: t('colors.darkBlue'), color: '#0000AA', code: 'dark_blue' },
                { name: t('colors.pink'), color: '#FF55FF', code: 'light_purple' },
                { name: t('colors.purple'), color: '#AA00AA', code: 'dark_purple' },
                { name: t('colors.white'), color: '#FFFFFF', code: 'white' },
                { name: t('colors.gray'), color: '#AAAAAA', code: 'gray' },
                { name: t('colors.darkGray'), color: '#555555', code: 'dark_gray' },
                { name: t('colors.black'), color: '#000000', code: 'black' }
              ].map((color) => (
        <button
                  key={color.code}
                  className="flex flex-col items-center p-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => Transforms.insertText(editor, `<color:${color.code}>`)}
                  title={color.name}
                >
                  <div 
                    className={styles.colorSwatch}
                    style={{ 
                      backgroundColor: color.color,
                      border: '1px solid #999999'
                    }}
                  ></div>
                  <div className="text-xs mt-1 truncate max-w-full">{color.code}</div>
        </button>
              ))}
            </div>
          </div>

          {/* MiniMessage 格式 - 自定义颜色 */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1 dark:text-white">{t('colors.custom')}:</div>
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
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded border hover:bg-gray-200 dark:hover:bg-gray-600"
                title={t('colors.apply')}
              >
                {t('colors.apply')} <span className="text-xs font-mono">&lt;color:#{selectedColor.replace('#', '')}&gt;</span>
        </button>
            </div>
          </div>

          {/* MiniMessage 格式 - 渐变色（带折叠功能） */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold mb-1 dark:text-white">{t('colors.gradient')}:</div>
        <button
                onClick={() => setGradientExpanded(!gradientExpanded)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                {gradientExpanded ? t('colors.collapse') : t('colors.expand')} 
                <span className="material-icons text-sm ml-1">
                  {gradientExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
            </div>
            
            {gradientExpanded && (
              <div className="flex flex-col gap-2 mt-1 p-2 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 rounded border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="text-xs mr-2 dark:text-gray-200">{t('colors.startColor')}:</span>
                    <ColorPicker 
                      color={startColor || "#FF5555"} 
                      onChange={(color: string) => setStartColor(color)} 
                    />
                  </div>
                  <div className="flex items-center ml-4">
                    <span className="text-xs mr-2 dark:text-gray-200">{t('colors.endColor')}:</span>
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
                  className="px-3 py-2 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded border hover:bg-gray-50 dark:hover:bg-gray-600"
                  title={t('colors.applyGradient')}
                >
                  {t('colors.applyGradient')}
                  <div 
                    className={styles.gradientPreview}
                    style={{ 
                      background: `linear-gradient(to right, ${startColor || "#FF5555"}, ${endColor || "#5555FF"})` 
                    }}
                  ></div>
                </button>
              </div>
            )}
            
            {!gradientExpanded && (
              <button
                onClick={() => setGradientExpanded(true)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded border hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                {t('colors.clickToExpandGradient')}
              </button>
            )}
          </div>

          {/* MiniMessage 格式 - 格式按钮 */}
          <div>
            <div className="text-xs font-semibold mb-1 dark:text-white">{t('formats.title')}:</div>
            <div className="flex flex-wrap gap-2">
              {miniMessageFormatButtons.map((button) => (
                <button
                  key={button.code}
                  className="flex items-center p-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                className="flex items-center p-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                onClick={() => Transforms.insertText(editor, '</color>')}
                title={t('formats.endColorTag')}
              >
                <span className="material-icons mr-1">format_color_reset</span>
                <span className="text-sm">{t('formats.endColor')}</span>
                <span className="ml-1 text-xs font-mono">&lt;/color&gt;</span>
        </button>
              
        <button
                className="flex items-center p-2 rounded border hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                onClick={() => Transforms.insertText(editor, '</gradient>')}
                title={t('formats.endGradientTag')}
              >
                <span className="material-icons mr-1">gradient</span>
                <span className="text-sm">{t('formats.endGradient')}</span>
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
// interface ToolbarProps {
//   editor: any; 
// }

// 移除或注释掉未使用的组件
// const MCFormatToolbar = ({ editor }: ToolbarProps) => (
//   ...
// );

// const MinimessageToolbar = ({ editor }: ToolbarProps) => {
//   ...
// };