'use client';
import React, { useState, useEffect } from 'react';
import { BrushType } from '@/lib/hooks/useDrawingLayer';

interface BrushSettingsProps {
  brushSize: number;
  brushType: BrushType;
  brushColor: number;
  jitterAmount?: number; // 笔刷抖动幅度
  onSizeChange: (size: number) => void;
  onColorChange?: (color: number) => void;
  onTypeChange?: (type: BrushType) => void;
  onJitterChange?: (amount: number) => void; // 抖动幅度变化回调
}

function hexToColor(hex: number) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;

  const hexStr = [
    r.toString(16).padStart(2, '0'),
    g.toString(16).padStart(2, '0'),
    b.toString(16).padStart(2, '0'),
  ]
    .join('')
    .toLowerCase();

  return `#${hexStr}`;
}

export default function BrushSettings({
  brushSize,
  brushType,
  brushColor,
  jitterAmount = 0.1, // 默认抖动幅度为0.1
  onSizeChange,
  onColorChange,
  onTypeChange,
  onJitterChange,
}: BrushSettingsProps) {
  const [size, setSize] = useState(brushSize);
  const [jitter, setJitter] = useState(jitterAmount);

  // 同步外部brushSize变化
  useEffect(() => {
    setSize(brushSize);
  }, [brushSize]);

  // 同步外部jitterAmount变化
  useEffect(() => {
    setJitter(jitterAmount);
  }, [jitterAmount]);

  // 处理画笔大小滑块变化
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setSize(newSize);
  };

  // 处理画笔大小滑块释放，减少状态更新次数
  const handleSliderRelease = () => {
    onSizeChange(size);
  };

  // 处理抖动幅度滑块变化
  const handleJitterSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newJitter = parseFloat(e.target.value);
    setJitter(newJitter);
  };

  // 处理抖动幅度滑块释放
  const handleJitterSliderRelease = () => {
    if (onJitterChange) {
      onJitterChange(jitter);
    }
  };

  // 处理微调按钮
  const handleSizeAdjust = (amount: number) => {
    const newSize = Math.max(1, Math.min(30, size + amount));
    setSize(newSize);
    onSizeChange(newSize);
  };

  return (
    <div className="brush-settings p-3 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-4">
        {/* 画笔粗细预览 */}
        <div className="preview-section flex items-center gap-4">
          <div className="text-sm font-medium text-gray-700">粗细预览:</div>
          <div
            className="brush-preview rounded-full bg-black"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: hexToColor(brushColor),
            }}
          ></div>
          <div className="text-sm font-medium text-gray-700">{size}px</div>
        </div>

        {/* 粗细滑动条控制 */}
        <div className="slider-section flex flex-col gap-2">
          <div className="text-sm font-medium text-gray-700">画笔粗细:</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">细</span>
            <input
              type="range"
              min="1"
              max="30"
              value={size}
              onChange={handleSliderChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              className="w-full mx-2"
            />
            <span className="text-sm text-gray-600">粗</span>
          </div>
        </div>

        {/* 抖动幅度滑动条控制 */}
        <div className="slider-section flex flex-col gap-2">
          <div className="text-sm font-medium text-gray-700">抖动幅度:</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">弱</span>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={jitter}
              onChange={handleJitterSliderChange}
              onMouseUp={handleJitterSliderRelease}
              onTouchEnd={handleJitterSliderRelease}
              className="w-full mx-2"
            />
            <span className="text-sm text-gray-600">强</span>
          </div>
          <div className="text-center text-sm font-medium text-gray-700">
            {Math.round(jitter * 100)}%
          </div>
        </div>

        {/* 微调按钮 */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleSizeAdjust(-1)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
          >
            -
          </button>
          <button
            onClick={() => handleSizeAdjust(1)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
