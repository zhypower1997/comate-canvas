'use client';
import React, { useState, useEffect, useRef, Suspense } from 'react';

import { usePixiCanvas } from '@/lib/hooks/usePixiCanvas';
import { useSpineLayer } from '@/lib/hooks/useSpineLayer';
import { useDrawingLayer, BrushType } from '@/lib/hooks/useDrawingLayer';
import { useGuideLineLayer } from '@/lib/hooks/useGuideLineLayer';
import { useAnimation } from '@/lib/hooks/useAnimation';
import { rgbaToNumber, hexToNumber } from '@/lib/utils/color';
import * as spine from 'pixi-spine';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import generateData from '../../public/allMockData.json';
import CustomModal from '@/components/custom_modal';
interface Brush {
  type: BrushType;
  color: number;
  size: number;
}

enum BoneEvent {
  pen = 'pen',
  color_pen = 'color_pen',
  rubber = 'rubber',
  undo_btn = 'undo_btn',
  color = 'color',
  small_platte = 'small_platte',
  size_ctr_left = 'size_ctr_left',
  size_ctr_right = 'size_ctr_right',
}

function colorToHex(color) {
  // 处理 # 开头的颜色（如 #f00、#ff0000）
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    // 处理简写（如 #f00 → #ff0000）
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      return parseInt(`0x${hex}`, 16); // 转为 0x 开头的十六进制数
    }
  }

  // 处理 rgb() 或 rgba() 格式（如 rgb(255,0,0)、rgba(255,0,0,0.5)）
  const rgbMatch = color.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*\d+(\.\d+)?\s*)?\)$/,
  );
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    // 确保数值在 0-255 范围内
    const clamp = (v) => Math.max(0, Math.min(255, parseInt(v, 10)));
    const hexR = clamp(r).toString(16).padStart(2, '0');
    const hexG = clamp(g).toString(16).padStart(2, '0');
    const hexB = clamp(b).toString(16).padStart(2, '0');
    return parseInt(`0x${hexR}${hexG}${hexB}`, 16);
  }

  // 处理颜色名（如 red、blue，需借助 DOM 解析）
  const tempDiv = document.createElement('div');
  tempDiv.style.color = color;
  document.body.appendChild(tempDiv); // 必须插入 DOM 才能获取计算后的样式
  const computedColor = getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);

  // 颜色名解析失败（非标准颜色名）
  if (computedColor === color) return null;

  // 递归解析计算后的颜色（通常是 rgb 格式）
  return colorToHex(computedColor);
}

function hexToColor(hex, useRgb = false) {
  // 提取 R、G、B 通道
  const r = (hex >> 16) & 0xff; // 右移 16 位取高 8 位（R）
  const g = (hex >> 8) & 0xff; // 右移 8 位取中 8 位（G）
  const b = hex & 0xff; // 取低 8 位（B）

  // 转换为 # 格式（如 #ff0000）
  if (!useRgb) {
    const hexStr = [
      r.toString(16).padStart(2, '0'),
      g.toString(16).padStart(2, '0'),
      b.toString(16).padStart(2, '0'),
    ]
      .join('')
      .toLowerCase();
    return `#${hexStr}`;
  }

  // 转换为 rgb 格式（如 rgb(255,0,0)）
  return `rgb(${r}, ${g}, ${b})`;
}

// 颜色选择器组件，使用 useSearchParams
function ColorPicker({ brush, setBrush }: { brush: Brush; setBrush: (brush: Brush) => void }) {
  const searchParams = useSearchParams();
  const showColorPicker = searchParams.get('showColorPicker') === 'true';

  if (!showColorPicker) return null;

  return (
    <div className="ml-4 mt-1 flex items-center gap-2">
      <input
        type="color"
        value={hexToColor(brush.color)}
        onChange={(e) => {
          const newColor = parseInt(
            e.target.value.replace('#', ''),
            16,
          );
          setBrush({
            ...brush,
            color: newColor,
          });
        }}
        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
      />
    </div>
  );
}

export default function PainterPage() {
  const [data, setData] = useState({
    output: [
      {
        image: 'null',
        text: `让我们自由创作吧！`,
      },
    ],
  });
  const router = useRouter();
  const [brush, setBrush] = useState<Brush>({
    type: BrushType.PEN,
    color: 0x000000,
    size: 10,
  });
  const [displayName, setDisplayName] = useState('');
  const [source, setSource] = useState('animal');

  // 添加初始颜色状态
  const [initialColors, setInitialColors] = useState<any>({
    color1: 0xf8d247,
    color2: 0xf1d4d0,
    color3: 0xc87d60,
    color4: 0x6dd4f1,
    color5: 0xf4f6b6,
    color6: 0xdd5654,
    color7: Math.floor(Math.random() * 0xffffff),
    color8: Math.floor(Math.random() * 0xffffff),
    color9: Math.floor(Math.random() * 0xffffff),
    // size_ctr_dot: Math.floor(Math.random() * 0xffffff),
  });

  const aiData = data.output?.map?.((item) => ({
    mask: item.image,
    text: item.text,
  }));

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isGuideLineVisible, setIsGuideLineVisible] = useState<boolean>(true);
  const [isUndo, setIsUndo] = useState<boolean>(false);
  const [customImageUrl, setCustomImageUrl] = useState<string>('null');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [isGetData, setIsGetData] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const toolRef = useRef<BrushType>(BrushType.PEN);
  const [isToolPanelOpen, setIsToolPanelOpen] = useState<boolean>(false);
  useEffect(() => {
    toolRef.current = brush.type;
  }, [brush.type]);

  useEffect(() => {
    if (displayName === '') return;
    setData({
      output:
        generateData.data.find((item) => item.displayName === displayName)
          ?.steps || [],
    });
    const randomIndex = Math.floor(
      Math.random() *
      generateData.data.find((item) => item.displayName === displayName)
        ?.imageUrl?.length || 0,
    );
    setCustomImageUrl(
      generateData.data.find((item) => item.displayName === displayName)
        ?.imageUrl?.[randomIndex] || 'null',
    );
    const colors =
      generateData.data
        .find((item) => item.displayName === displayName)
        ?.colors.map((item) => {
          return colorToHex(item);
        }) || [];
    setInitialColors({
      color1: colors[0],
      color2: colors[1],
      color3: colors[2],
      color4: colors[3],
      color5: colors[4],
      color6: colors[5],
      color7: colors[6],
      color8: colors[7],
      color9: colors[8],
    });
  }, [displayName]);

  useEffect(() => {
    let displayName = '';
    let source = 'animal';
    if (typeof window !== 'undefined') {
      displayName =
        new URLSearchParams(window?.location?.search).get('displayName') ||
        '逗逗狐';
      source =
        new URLSearchParams(window?.location?.search).get('source') || 'animal';
    }
    setDisplayName(displayName);
    setSource(source);
  }, []);

  // 按宽度自适应缩放（使用 zoom）
  useEffect(() => {
    const updateScale = () => {
      const containerWidth = outerRef.current?.clientWidth || 0;
      const designWidth = 1150; // 设计基准宽度
      if (containerWidth === 0) return;
      if (containerWidth < designWidth) {
        setScale(containerWidth / designWidth);
      } else {
        setScale(1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // useEffect(() => {
  //   setTimeout(() => {
  //     setIsGetData(true);
  //     bearControls.playAnimation('loading_end', true, 2);
  //     bearControls.playAnimation('idle', true, 3);
  //   }, 1000);
  // }, []);

  // 处理颜色修改的函数 - 重命名避免冲突
  const handleInitialColorChange = (colorKey: string, newColor: number) => {
    setInitialColors((prev) => ({
      ...prev,
      [colorKey]: newColor,
    }));

    // 立即更新 Spine 中的颜色
    if (spineControls) {
      spineControls.setSlotProperty(colorKey, 'color', newColor);
    }
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }

      // 创建FileReader来读取文件
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomImageUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 支持从剪贴板粘贴图片
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const result = ev.target?.result as string;
              setCustomImageUrl(result);
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', (event) => {
      // 撤销快捷键：Ctrl+Z（Windows/Linux）或 Command+Z（Mac）
      const isUndo = (event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey;

      // 重做快捷键：
      // - Windows/Linux: Ctrl+Y
      // - Mac: Command+Shift+Z 或 Command+Y
      const isRedo =
        (event.ctrlKey && !event.metaKey && event.key === 'y') ||  // Windows/Linux
        (event.metaKey && ((event.shiftKey && event.key === 'z') || event.key === 'y'));  // Mac

      if (isUndo) {
        event.preventDefault(); // 阻止默认行为（如浏览器自带撤销）
        console.log('执行撤销操作');
        drawingControls.undo();
        // 这里添加你的撤销逻辑（如 undo()）
      } else if (isRedo) {
        event.preventDefault(); // 阻止默认行为（如浏览器自带重做）
        console.log('执行重做操作');
        drawingControls.redo();
        // 这里添加你的重做逻辑（如 redo()）
      }
    });

    window.addEventListener('paste', onPaste as any);
    return () => {
      window.removeEventListener('paste', onPaste as any);
    };
  }, []);

  // 触发文件选择
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 固定的左下角截图区域
  const fixedRegion = {
    x: 100, // 左边距，与画板图层位置一致
    y: 420, // 下边位置，画布高度700，画板高度500，所以y=700-500+100=300，再往下一点到400
    width: 1550, // 画板宽度
    height: 780, // 画板下半部分高度
  };

  // 关闭骨骼点击处理函数
  const handleBoneClick = (boneInfo: any, spine: spine.Spine, event?: any) => {
    const boneEvent = boneInfo.name;

    const toolEvent = [BoneEvent.pen, BoneEvent.color_pen, BoneEvent.rubber];
    const colorEvent = [BoneEvent.small_platte, BoneEvent.color];
    const sizeEvent = [BoneEvent.size_ctr_left, BoneEvent.size_ctr_right];
    const undoEvent = [BoneEvent.undo_btn];
    if (toolEvent.includes(boneEvent)) {
      handleToolChange(boneInfo, spine, event);
    } else if (sizeEvent.includes(boneEvent)) {
      handleBrushSizeChange(boneInfo, spine, event);
    } else if (
      colorEvent.includes(boneEvent) ||
      boneEvent.startsWith('color')
    ) {
      handleSpineColorChange(boneInfo, spine, event);
    } else if (undoEvent.includes(boneEvent)) {
      handleUndo();
    }
  };

  // 重命名原有的颜色处理函数
  const handleSpineColorChange = async (
    boneInfo: any,
    spine: spine.Spine,
    event?: any,
  ) => {
    const boneEvent = boneInfo.name;
    await spineControls.playAnimation('small_plattle_start', false, 5);
    if (boneEvent === BoneEvent.small_platte) {
      if (toolRef.current === BrushType.COLOR_PEN) {
        await spineControls.playAnimation('color_pen_close', false, 2);
      }
      if (toolRef.current === BrushType.ERASER) {
        await spineControls.playAnimation('rubber_close', false, 3);
      }
      if (toolRef.current === BrushType.PEN) {
        spineControls.playAnimation('pen_close', false, 1);
      }
      await spineControls.playAnimation('platte_color_start', false, 0);
      await spineControls.playAnimation('platte_color_idle', true, 0);
    } else {
      const newColor = rgbaToNumber(boneInfo.slots[0].color);
      setBrush((prev) => ({
        ...prev,
        color: newColor,
        type: BrushType.COLOR_PEN,
      }));
      animationFSM?.current?.switchState?.(BrushType.COLOR_PEN);
      await spineControls.playAnimation('small_pattle_close', false, 5);
      await spineControls.playAnimation('color_pen_start', false, 2);
      await spineControls.playAnimation('platte_color_end', false, 0);
    }
  };

  const handleToolChange = async (
    boneInfo: any,
    spine: spine.Spine,
    event?: any,
  ) => {
    const newTool = boneInfo.name;
    animationFSM?.current?.switchState?.(newTool);
    setBrush((prev) => {
      return { ...prev, type: newTool };
    });
  };

  const handleBrushSizeChange = async (
    boneInfo: any,
    spine: spine.Spine,
    event?: any,
  ) => {
    const sizeChange = boneInfo.name;
    const isIncrease = sizeChange.includes('right');
    setBrush((prev) => ({
      ...prev,
      size: Math.max(
        5,
        Math.min(30, isIncrease ? prev.size + 2 : prev.size - 2),
      ),
    }));
  };

  const handleUndo = () => {
    setIsUndo((prev) => !prev);
  };

  useEffect(() => {
    if (!spineControls) return;
    const { color, size, type } = brush;
    spineControls?.setSlotProperty('single_color', 'color', color);
    spineControls?.setSlotProperty('size_ctr_dot', 'color', color);
    spineControls?.setSlotProperty('size_ctr_dot', 'size', 1 + (size - 5) / 25);
    switch (type) {
      case BrushType.PEN:
        drawingControls.setBrush(BrushType.PEN, color, size);
        break;
      case BrushType.ERASER:
        drawingControls.setBrush(BrushType.ERASER, color, size);
        break;
      case BrushType.COLOR_PEN:
        drawingControls.setBrush(BrushType.COLOR_PEN, color, size);
        break;
    }
  }, [brush]);

  useEffect(() => {
    if (isUndo) {
      drawingControls.undo();
    } else {
      drawingControls.redo();
    }
  }, [isUndo]);

  // 初始化Pixi画布
  const {
    canvasRef,
    app,
    stage,
    loading,
    error,
    addChild,
    createLayer,
    clear,
  } = usePixiCanvas({
    width: 1150,
    height: 700,
    backgroundColor: hexToNumber('FFFFFF'), // 白色背景
    preserveDrawingBuffer: true, // 保留绘制缓冲区，解决导出黑色图片问题
    onInit: (app) => {
      console.log('Pixi应用已初始化完成');
    },
  });

  // 初始化画板图层
  const [drawingState, drawingControls] = useDrawingLayer(app, createLayer, {
    zIndex: 1,
    width: 800,
    height: 500,
    position: { x: 40, y: 200 },
    backgroundColor: rgbaToNumber({ r: 255, g: 255, b: 255, a: 0 }),
    borderColor: hexToNumber('999999'),
    borderWidth: 0,
    onClick: () => {
      const spine = spineControls?.getCurrentAnimation();
      if (spine === 'platte_color_idle') {
        spineControls.playAnimation('platte_color_end', false);
      }
    },
  });

  // 使用辅助线图层hook
  const { updateImage, show, hide } = useGuideLineLayer(
    app,
    {
      imageUrl: customImageUrl,
      height: 400,
      alpha: 0.2,
      x: 440, // 画布中心X (1150 / 2)
      y: 425, // 画布中心Y (700 / 2)
      zIndex: 2,
    },
    createLayer,
  );

  // 当currentStep或customImageUrl变化时更新辅助线图片（有 imageUrl 用 imageUrl，否则回退 steps.image）
  useEffect(() => {
    const stepImage = aiData?.[currentStep]?.mask || 'null';
    const urlToUse =
      customImageUrl && customImageUrl !== 'null' ? customImageUrl : stepImage;

    if (urlToUse && urlToUse !== 'null') {
      updateImage(urlToUse);
      if (isGuideLineVisible) {
        show();
      } else {
        hide();
      }
    } else {
      hide();
    }
  }, [currentStep, customImageUrl, updateImage, isGuideLineVisible, aiData]);

  // 初始化Spine动画图层
  const [spineState, spineControls] = useSpineLayer(
    app,
    '/assets/spine/draw-layer/canvas.json',
    createLayer,
    {
      // 显示配置
      display: {
        zIndex: 3,
        position: { x: 0, y: 700 },
        scale: 1,
      },
      // 动画配置
      animation: {
        autoPlay: true,
        initialAnimation: 'pen_start', // 设置初始动画为 start
        initialAnimationLoop: false, // 不循环播放
        initialAnimationTrack: 0, // 使用轨道 0
        //initialAnimationTime: 0, // 定位到动画的第一帧（0秒）
      },
      // 交互配置
      interaction: {
        hitAreaSize: { width: 20, height: 20 },
        boneClickConfigs: [
          {
            filter: (bone: any) =>
              bone.data.name.toLowerCase().startsWith('pen'),
            handler: handleBoneClick,
            hitAreaSize: { width: 340, height: 65 },
          },
          {
            filter: (bone: any) =>
              bone.data.name.toLowerCase().startsWith('color_pen'),
            handler: handleBoneClick,
            hitAreaSize: { width: 290, height: 65 },
          },
          {
            filter: (bone: any) =>
              bone.data.name.toLowerCase().startsWith('rubber'),
            handler: handleBoneClick,
            hitAreaSize: { width: 280, height: 105 },
          },
          {
            filter: (bone: any) =>
              bone.data.name.toLowerCase().startsWith('color') &&
              bone.data.name !== 'color_pen',
            handler: handleBoneClick,
            hitAreaSize: { width: 70, height: 70 },
          },
          {
            filter: (bone: any) =>
              bone.data.name.toLowerCase().startsWith('small_platte'),
            handler: handleBoneClick,
            hitAreaSize: { width: 200, height: 200 },
          },
          {
            filter: (bone: any) =>
              bone.data.name.toLowerCase().startsWith('size_ctr_'),
            handler: handleBoneClick,
            hitAreaSize: { width: 70, height: 70 },
          },
          // {
          //   filter: (bone: any) =>
          //     bone.data.name.toLowerCase().startsWith('undo_btn'),
          //   handler: handleBoneClick,
          //   hitAreaSize: { width: 200, height: 120 },
          // },
        ],
      },
      // 初始化配置
      initialization: {
        slotInitializers: [
          // 为颜色 slots 设置可修改的颜色
          {
            slotName: 'color1',
            property: 'color',
            value: initialColors.color1,
          },
          {
            slotName: 'color2',
            property: 'color',
            value: initialColors.color2,
          },
          {
            slotName: 'color3',
            property: 'color',
            value: initialColors.color3,
          },
          {
            slotName: 'color4',
            property: 'color',
            value: initialColors.color4,
          },
          {
            slotName: 'color5',
            property: 'color',
            value: initialColors.color5,
          },
          {
            slotName: 'color6',
            property: 'color',
            value: initialColors.color6,
          },
          {
            slotName: 'color7',
            property: 'color',
            value: initialColors.color7,
          },
          {
            slotName: 'color8',
            property: 'color',
            value: initialColors.color8,
          },
          {
            slotName: 'color9',
            property: 'color',
            value: initialColors.color9,
          },
          {
            slotName: 'size_ctr_dot',
            property: 'color',
            value: initialColors.color1,
          },
        ],
      },
    },
  );
  const [bearState, bearControls] = useSpineLayer(
    app,
    '/assets/spine/canvas/bear.json',
    createLayer,
    {
      display: {
        zIndex: 4,
        position: { x: 0, y: 700 },
        scale: 1,
      },
      animation: {
        autoPlay: true,
        initialAnimation: 'idle', // 设置初始动画为 start
        initialAnimationLoop: true, // 不循环播放
        initialAnimationTrack: 2, // 使用轨道 0
      },
    },
  );

  const animationFSM = useAnimation({ spineControls: spineControls });

  // 当 initialColors 变化时，更新 Spine 中的颜色
  useEffect(() => {
    if (spineControls) {
      Object.entries(initialColors).forEach(([colorKey, colorValue]) => {
        spineControls.setSlotProperty(colorKey, 'color', colorValue);
      });
    }
  }, [initialColors]);



  return (
    <div
      className="min-h-screen bg-[#f5efe4] pt-responsive-1250"
      ref={outerRef}
    >


      <div
        className="flex justify-center flex-col mx-auto relative"
        style={{ width: '1150px', zoom: scale }}
      >
        {isGetData && (
          <div className="absolute flex flex-row top-[15px] left-[0px] h-[100px] w-[1150px] pl-[50px] pr-[30px] ">
            <div className="w-[110px] h-[100px] rounded-full"></div>
            <div className="w-[950px] h-[148px]  ml-[50px] rounded-[18px] p-[16px] flex flex-row justify-between">
              <span className="text-[#222222] w-[700px] text-[18px]">
                <span className="bg-[#eecfd8] rounded-[6px] p-[6px] pl-[12px] pr-[12px] mr-[12px] text-[#754555] text-[14px]">
                  {`步骤${currentStep + 1}/${aiData?.length}`}
                </span>
                {aiData?.[currentStep]?.text}
              </span>
              <div className="flex flex-col justify-between">
                <button
                  className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px]"
                  onClick={() => {
                    setIsGuideLineVisible(!isGuideLineVisible);
                  }}
                >
                  {isGuideLineVisible ? '隐藏辅助线' : '显示辅助线'}
                </button>
                <div className="flex flex-row justify-between gap-[12px]">
                  {aiData?.length > 1 && (
                    <button
                      className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px]"
                      onClick={() => {
                        setCurrentStep((prev) => Math.max(0, prev - 1));
                      }}
                    >
                      上一步
                    </button>
                  )}
                  <button
                    className={
                      aiData?.length - 1 === currentStep
                        ? 'bg-[#80b516] text-white rounded-[6px] p-[6px] pl-[12px] pr-[12px]'
                        : 'bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px]'
                    }
                    onClick={async () => {
                      if (aiData?.length - 1 === currentStep) {
                        const layer = drawingControls.getLayer();
                        const imageDataUrl = await app.renderer.extract.base64(
                          layer,
                        );
                        const info = {
                          image: imageDataUrl,
                          name: displayName,
                          score: 0,
                          text: '画的真不错呀',
                          source: source,
                        };
                        // 先取数据，再追加
                        const image_info = localStorage.getItem('image_info');
                        if (image_info) {
                          const image_info_list = JSON.parse(image_info);
                          //插入头部
                          image_info_list.unshift(info);
                          localStorage.setItem(
                            'image_info',
                            JSON.stringify(image_info_list),
                          );
                        } else {
                          localStorage.setItem(
                            'image_info',
                            JSON.stringify([info]),
                          );
                        }
                        setIsModalOpen(true);
                        return;
                      }
                      setCurrentStep((prev) =>
                        Math.min(aiData?.length - 1, prev + 1),
                      );
                    }}
                  >
                    {aiData?.length - 1 === currentStep ? '完成' : '下一步'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div
          ref={canvasRef}
          className="rounded-lg"
          style={{
            width: '100%',
            maxWidth: '1150px',
            height: 'auto',
            maxHeight: '700px',
            aspectRatio: '4/3',
          }}
        ></div>
        <header
          className="paper-card mb-6 px-6 py-4 flex justify-between items-center w-[1150px] h-[700px]"
          style={{ height: '97px' }}
        >
          <div className="flex flex-row justify-between items-center">
            <button
              className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px] mr-4"
              onClick={() => setIsToolPanelOpen(!isToolPanelOpen)}
            >
              {isToolPanelOpen ? '收起工具' : '展开工具'}
            </button>
            {isToolPanelOpen && (
              <>
                {/* 上传图片按钮 */}
                <button
                  onClick={triggerFileUpload}
                  className="mr-4 bg-blue-500 hover:bg-blue-600 transition-colors duration-200 rounded-full p-3 shadow-lg border border-blue-300 z-20 text-white flex flex-row items-center"
                  title="点击上传或直接粘贴"
                >
                  <>
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </>
                  <div className="flex flex-col align-middle justify-center items-center mr-4">
                    <span className="text-[#ffffff] text-[16px] font-bold">上传参考图</span>
                    <span className="text-[#ffffff] text-[12px] ml-[12px]">
                      可Ctrl+V直接粘贴
                    </span>
                  </div>


                </button>

                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <div className="text-2xl text-[#222222] ml-[12px] text-[16px]">
                  调色盘默认颜色
                  {/* 添加颜色选择器面板 */}
                  <div className="grid grid-cols-10">
                    {Object.entries(initialColors).map(
                      ([colorKey, colorValue]) => {
                        return (
                          <div
                            key={colorKey}
                            className="flex flex-col items-center"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={hexToColor(colorValue)}
                                onChange={(e) => {
                                  const newColor = parseInt(
                                    e.target.value.replace('#', ''),
                                    16,
                                  );
                                  handleInitialColorChange(colorKey, newColor);
                                }}
                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

              </>
            )}

            <button
              className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px] mr-4"
              onClick={() => {
                router.push('/showdetail');
              }}
            >
              欣赏图鉴
            </button>
            <button
              className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px] mr-4"
              onClick={() => {
                drawingControls?.clear();
              }}
            >
              清空画布
            </button>
            <button className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px] mr-4" onClick={() => {
              drawingControls.undo();
            }}>上一步</button>
            <button className="bg-[#ffffff] rounded-[6px] p-[6px] pl-[12px] pr-[12px]" onClick={() => {
              drawingControls.redo();
            }}>下一步</button>
            <Suspense fallback={null}>
              <ColorPicker brush={brush} setBrush={setBrush} />
            </Suspense>
          </div>


          <div className="relative">
            <div className="badge-circle w-10 h-10 rounded-full grid place-items-center">
              <span className="text-yellow-300 text-xl">★</span>
            </div>
          </div>
        </header>
        <CustomModal
          isOpen={isModalOpen}
          title="已收录图鉴"
          message="是否进入图鉴页面查看？"
          onConfirm={() => {
            setIsModalOpen(false);
            router.push('/showdetail');
          }}
          onCancel={() => {
            setIsModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
