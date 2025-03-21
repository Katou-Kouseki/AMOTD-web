import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 初始化颜色选择器
  useEffect(() => {
    if (canvasRef.current && showPicker) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // 创建渐变色轮
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = canvas.width / 2 - 5;
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制颜色色轮
      for (let angle = 0; angle < 360; angle++) {
        const startAngle = (angle - 1) * Math.PI / 180;
        const endAngle = (angle + 1) * Math.PI / 180;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        const hue = angle;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fill();
      }
      
      // 添加内部白色渐变
      const innerRadius = radius * 0.7;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, innerRadius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, [showPicker]);
  
  // 处理颜色选取
  const handleColorSelect = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(x, y, 1, 1).data;
    const r = imageData[0];
    const g = imageData[1];
    const b = imageData[2];
    
    onChange(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
  };
  
  // 关闭选择器的事件处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={pickerRef}>
      <div 
        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={() => setShowPicker(!showPicker)}
      />
      
      {showPicker && (
        <div className="absolute z-10 mt-2 p-3 bg-white rounded shadow-lg">
          <canvas 
            ref={canvasRef}
            width={200}
            height={200}
            onClick={handleColorSelect}
            className="cursor-crosshair"
          />
          <div className="mt-2 flex items-center">
            <div 
              className="w-6 h-6 rounded mr-2 border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <input 
              type="text" 
              value={color} 
              onChange={(e) => onChange(e.target.value)}
              className="px-2 py-1 border rounded text-sm"
              aria-label="颜色代码"
              placeholder="颜色代码"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 