'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Application,
  Assets,
  Graphics,
  Container,
  Text,
  Texture,
  Rectangle,
  Sprite,
} from 'pixi.js';

interface ImageInfo {
  image: string;
  name: string;
  score: number;
  text: string;
  source: string;
}

interface StickerItem {
  id: string;
  image: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const strokeWidth = 20;

export default function StickyPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [imageInfoList, setImageInfoList] = useState<ImageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [placedStickers, setPlacedStickers] = useState<StickerItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<Sprite | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedSticker, setSelectedSticker] = useState<Sprite | null>(null);
  const [selectedStickerScale, setSelectedStickerScale] = useState(0.15);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  const itemsPerPage = 6;
  const totalPages = Math.ceil(imageInfoList.length / itemsPerPage);

  // 删除贴纸的函数
  const deleteSticker = (index: number) => {
    const newImageInfoList = imageInfoList.filter((_, i) => i !== index);
    setImageInfoList(newImageInfoList);

    // 更新localStorage
    localStorage.setItem('image_info', JSON.stringify(newImageInfoList));

    // 如果当前页没有内容了，回到上一页
    const newTotalPages = Math.ceil(newImageInfoList.length / itemsPerPage);
    if (currentPage >= newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages - 1);
    }
  };

  // 删除画布上已放置的贴纸的函数
  const deletePlacedSticker = () => {
    if (!selectedSticker || !appRef.current) return;

    // 从PIXI stage中移除贴纸
    appRef.current.stage.removeChild(selectedSticker);

    // 从状态中移除贴纸
    setPlacedStickers((prev) =>
      prev.filter((sticker) => sticker.id !== selectedSticker.name),
    );

    // 清除选中状态
    setSelectedSticker(null);
  };

  // 将选中贴纸复制到系统剪贴板（PNG）
  const copySelectedStickerToClipboard = async () => {
    try {
      if (!selectedSticker) return;

      const contentBounds = (selectedSticker as any).contentBounds;
      if (!contentBounds) {
        console.log('未找到贴纸内容边界，无法复制');
        return;
      }

      const baseResource = (selectedSticker.texture.baseTexture as any)?.resource;
      const source: HTMLImageElement | HTMLCanvasElement | undefined = baseResource?.source;
      if (!source) {
        console.log('无法获取贴纸图像资源');
        return;
      }

      // 基于当前缩放并提高像素密度，导出更高清的PNG
      const baseScale = selectedSticker.scale.x;
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 10); // 至少2x，Retina更高
      const sx = contentBounds.minX;
      const sy = contentBounds.minY;
      const sw = Math.max(1, contentBounds.width);
      const sh = Math.max(1, contentBounds.height);

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw * baseScale * pixelRatio));
      canvas.height = Math.max(1, Math.round(sh * baseScale * pixelRatio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob失败'))), 'image/png'),
      );

      const ClipboardItemCtor = (window as any).ClipboardItem || (window as any).window?.ClipboardItem;
      if (ClipboardItemCtor && navigator.clipboard && (navigator.clipboard as any).write) {
        const item = new ClipboardItemCtor({ 'image/png': blob });
        await (navigator.clipboard as any).write([item]);
        console.log('已复制贴纸到剪贴板');
      } else {
        // 退化：复制为DataURL文本
        const dataURL = canvas.toDataURL('image/png');
        await navigator.clipboard.writeText(dataURL);
        console.log('环境不支持图片剪贴板，已复制为图片DataURL文本');
      }
    } catch (error) {
      console.error('复制贴纸失败:', error);
      console.log('复制失败，请重试');
    }
  };

  // 下载选中贴纸为本地PNG（高分辨率）
  const downloadSelectedSticker = async () => {
    try {
      if (!selectedSticker) return;

      const contentBounds = (selectedSticker as any).contentBounds;
      if (!contentBounds) {
        console.log('未找到贴纸内容边界，无法下载');
        return;
      }

      const baseResource = (selectedSticker.texture.baseTexture as any)?.resource;
      const source: HTMLImageElement | HTMLCanvasElement | undefined = baseResource?.source;
      if (!source) {
        console.log('无法获取贴纸图像资源');
        return;
      }

      const baseScale = selectedSticker.scale.x;
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 10);
      const sx = contentBounds.minX;
      const sy = contentBounds.minY;
      const sw = Math.max(1, contentBounds.width);
      const sh = Math.max(1, contentBounds.height);

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw * baseScale * pixelRatio));
      canvas.height = Math.max(1, Math.round(sh * baseScale * pixelRatio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob失败'))), 'image/png'),
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `${selectedSticker.name || 'sticker'}.png`;
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('已下载贴纸到本地');
    } catch (error) {
      console.error('下载贴纸失败:', error);
      console.log('下载失败，请重试');
    }
  };

  // 从localStorage获取图片信息
  useEffect(() => {
    const imageInfo = localStorage.getItem('image_info');
    if (imageInfo) {
      const parsedData = JSON.parse(imageInfo);
      setImageInfoList(parsedData);
    }
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

  // 移除图片背景的函数
  const removeBackground = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;

        // 1. 绘制原始图片
        ctx.drawImage(img, 0, 0);

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        // 2. 填充透明区域为白色
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) {
            // 如果完全透明
            data[i] = 255; // 红色
            data[i + 1] = 255; // 绿色
            data[i + 2] = 255; // 蓝色
            data[i + 3] = 255; // Alpha (设为不透明)
          }
        }
        ctx.putImageData(imageData, 0, 0); // 应用更改

        // 3. 使用洪水填充算法移除背景
        // 重新获取图像数据
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;

        const width = canvas.width;
        const height = canvas.height;

        // 获取左上角像素颜色作为背景色
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const bgA = data[3];

        const tolerance = 30; // 颜色匹配容差

        const matchColor = (
          r1: number,
          g1: number,
          b1: number,
          a1: number,
          r2: number,
          g2: number,
          b2: number,
          a2: number,
        ) => {
          return (
            Math.abs(r1 - r2) < tolerance &&
            Math.abs(g1 - g2) < tolerance &&
            Math.abs(b1 - b2) < tolerance &&
            Math.abs(a1 - a2) < tolerance
          );
        };

        const visited = new Uint8Array(width * height); // 记录已访问的像素

        const floodFill = (startX: number, startY: number) => {
          const stack: [number, number][] = [[startX, startY]];

          while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const i = (y * width + x) * 4;

            if (
              x < 0 ||
              x >= width ||
              y < 0 ||
              y >= height ||
              visited[y * width + x]
            ) {
              continue;
            }

            const currentR = data[i];
            const currentG = data[i + 1];
            const currentB = data[i + 2];
            const currentA = data[i + 3];

            if (
              matchColor(
                currentR,
                currentG,
                currentB,
                currentA,
                bgR,
                bgG,
                bgB,
                bgA,
              )
            ) {
              data[i + 3] = 0; // 设为透明
              visited[y * width + x] = 1;

              // 添加相邻像素到栈中
              stack.push([x + 1, y]);
              stack.push([x - 1, y]);
              stack.push([x, y + 1]);
              stack.push([x, y - 1]);
            }
          }
        };

        // 从四个角落开始洪水填充
        floodFill(0, 0);
        floodFill(width - 1, 0);
        floodFill(0, height - 1);
        floodFill(width - 1, height - 1);

        // 4. 添加白色描边到主体轮廓
        const edgeData = new Uint8ClampedArray(data);

        // 找到主体边缘并添加白色描边
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const alpha = data[i + 3];

            // 如果当前像素是主体（不透明）
            if (alpha > 0) {
              // 检查周围是否有透明像素（边缘）
              let isEdge = false;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;

                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const ni = (ny * width + nx) * 4;
                    if (data[ni + 3] === 0) {
                      // 相邻像素是透明的
                      isEdge = true;
                      break;
                    }
                  }
                }
                if (isEdge) break;
              }

              // 如果是边缘，添加10px白色描边
              if (isEdge) {
                for (let dy = -strokeWidth; dy <= strokeWidth; dy++) {
                  for (let dx = -strokeWidth; dx <= strokeWidth; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                      const ni = (ny * width + nx) * 4;
                      // 只在外围透明区域添加白色描边
                      if (edgeData[ni + 3] === 0) {
                        edgeData[ni] = 255; // 红色
                        edgeData[ni + 1] = 255; // 绿色
                        edgeData[ni + 2] = 255; // 蓝色
                        edgeData[ni + 3] = 255; // Alpha
                      }
                    }
                  }
                }
              }
            }
          }
        }

        ctx.putImageData(new ImageData(edgeData, width, height), 0, 0);
        resolve(canvas.toDataURL());
      };
      img.src = imageUrl;
    });
  };

  // 计算贴纸实际内容的边界框（基于背景移除后的图片）
  const calculateContentBounds = async (
    processedImageUrl: string,
  ): Promise<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let minX = canvas.width,
          minY = canvas.height,
          maxX = 0,
          maxY = 0;
        let hasContent = false;

        // 扫描所有像素，找到有内容的区域
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const alpha = data[i + 3];

            // 如果像素不透明（有内容）
            if (alpha > 0) {
              hasContent = true;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // 如果没有找到内容，使用整个图片
        if (!hasContent) {
          minX = 0;
          minY = 0;
          maxX = canvas.width;
          maxY = canvas.height;
        }

        resolve({
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
      };
      img.src = processedImageUrl;
    });
  };

  // 创建贴纸（无描边）
  const createStickerWithBorder = async (
    imageUrl: string,
    name: string,
  ): Promise<Sprite> => {
    const processedImageUrl = await removeBackground(imageUrl);
    const texture = Texture.from(processedImageUrl);
    const sprite = new Sprite(texture);

    // 设置锚点为左上角 (0, 0)，确保位置计算准确
    sprite.anchor.set(0, 0);

    // 设置交互属性
    sprite.interactive = true;
    sprite.cursor = 'pointer';

    // 计算实际内容边界并存储（使用处理后的图片）
    const contentBounds = await calculateContentBounds(processedImageUrl);
    (sprite as any).contentBounds = contentBounds;

    return sprite;
  };

  // 初始化PIXI应用 - 只初始化一次，不依赖页面变化
  useEffect(() => {
    const initApp = async () => {
      if (!canvasRef.current) return;

      const app = new Application({
        width: 1150,
        height: 700,
        // backgroundColor: 0xf5efe4, // 浅黄色背景
        backgroundAlpha: 0,
        antialias: true,
        resolution: 1,
      });

      canvasRef.current.appendChild(app.view as any);
      appRef.current = app;

      // 创建左侧贴纸选择区域背景
      const leftPanel = new Graphics();
      // leftPanel.beginFill(0xf5efe4);
      leftPanel.drawRect(0, 0, 400, 700);
      leftPanel.endFill();
      app.stage.addChild(leftPanel);

      // 创建右侧绿色区域
      const rightPanel = new Graphics();
      rightPanel.beginFill(0x33b28e); // 绿色背景
      rightPanel.drawRect(700, 50, 380, 550);
      rightPanel.endFill();
      app.stage.addChild(rightPanel);
      // 添加右侧区域标题图片
      const titleTexture = Texture.from('/images/sticky-header.png');
      const titleSprite = new Sprite(titleTexture);
      titleSprite.anchor.set(0.5, 0);
      titleSprite.x = 700 + 190; // rightPanel中心 (700 + 380/2)
      titleSprite.y = 50;
      // 设置合适的缩放比例，使图片不会太大
      const targetWidth = 0.97; // 进一步减小目标宽度
      const scaleX = targetWidth / titleTexture.width;
      titleSprite.scale.set(scaleX, scaleX); // 保持宽高比
      app.stage.addChild(titleSprite);

      // 添加打印按钮
      const printButton = new Graphics();
      printButton.beginFill(0xffa560); // 橙色背景
      printButton.drawRoundedRect(400 + 750 - 170, 700 - 80, 100, 50, 10); // 增大按钮尺寸：宽度100，高度50
      printButton.endFill();
      printButton.interactive = true;
      printButton.cursor = 'pointer';

      const printText = new Text('打印', {
        fontSize: 16,
        fill: 0xffffff,
        align: 'center',
      });
      // 计算按钮中心位置
      const buttonX = 400 + 750 - 170; // 按钮x位置
      const buttonY = 700 - 80; // 按钮y位置
      const buttonWidth = 100; // 更新宽度
      const buttonHeight = 50; // 更新高度

      // 设置文字位置为按钮中心
      printText.x = buttonX + buttonWidth / 2 - printText.width / 2;
      printText.y = buttonY + buttonHeight / 2 - printText.height / 2;
      printButton.addChild(printText);

      // 添加悬浮效果
      printButton.on('pointerover', () => {
        printButton.clear();
        printButton.beginFill(0xff6b00); // 更深的橙色
        printButton.drawRoundedRect(400 + 750 - 170, 700 - 80, 100, 50, 10); // 增大按钮尺寸：宽度100，高度50
        printButton.endFill();
        printButton.addChild(printText);
      });

      printButton.on('pointerout', () => {
        printButton.clear();
        printButton.beginFill(0xffa560); // 恢复原始橙色
        printButton.drawRoundedRect(400 + 750 - 170, 700 - 80, 100, 50, 10); // 增大按钮尺寸：宽度100，高度50
        printButton.endFill();
        printButton.addChild(printText);
      });

      app.stage.addChild(printButton);

      // 打印按钮点击事件
      printButton.on('pointerdown', async () => {
        try {
          // 创建一个新的容器来包含右侧区域的内容
          const exportContainer = new Container();

          // 添加绿色背景 - 只导出指定区域
          const background = new Graphics();
          background.beginFill(0x33b28e);
          background.drawRect(0, 0, 380, 550); // 对应 rightPanel.drawRect(700, 50, 380, 550)
          background.endFill();
          exportContainer.addChild(background);

          // 添加标题图片
          const titleTexture = Texture.from('/images/sticky-header.png');
          const titleSprite = new Sprite(titleTexture);
          titleSprite.anchor.set(0.5, 0);
          titleSprite.x = 190; // 导出容器中心 (380/2)
          titleSprite.y = 0;
          // 设置合适的缩放比例，使图片不会太大
          const targetWidth = 380; // 进一步减小目标宽度
          const scaleX = targetWidth / titleTexture.width;
          titleSprite.scale.set(scaleX, scaleX); // 保持宽高比
          exportContainer.addChild(titleSprite);

          // 获取所有已放置的贴纸
          const placedStickers = app.stage.children.filter(
            (child) => child.name && child.name.startsWith('placed_sticker_'),
          );

          // 将贴纸添加到导出容器中，调整位置到新的坐标系
          placedStickers.forEach((sticker) => {
            const sprite = sticker as Sprite;
            const clonedSticker = new Sprite(sprite.texture);
            // 调整相对位置：从 (700, 50) 坐标系转换到 (0, 0) 坐标系
            clonedSticker.x = sticker.x - 700;
            clonedSticker.y = sticker.y - 50;
            clonedSticker.scale.set(sticker.scale.x, sticker.scale.y);
            clonedSticker.rotation = sticker.rotation;
            exportContainer.addChild(clonedSticker);
          });

          // 导出为PNG
          const canvas = app.renderer.extract.canvas(exportContainer);
          const dataURL = canvas.toDataURL('image/png');

          // 创建下载链接
          const link = document.createElement('a');
          link.download = `贴纸收藏_${new Date()
            .toISOString()
            .slice(0, 10)}.png`;
          link.href = dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          console.log('贴纸图片导出成功！');
        } catch (error) {
          console.error('导出失败:', error);
          console.log('导出失败，请重试');
        }
      });

      // 添加页面导航箭头
      const leftArrow = new Graphics();
      leftArrow.beginFill(0xffa500);
      leftArrow.lineStyle(2, 0x0000ff);
      leftArrow.moveTo(100, 380); // 400 - 20
      leftArrow.lineTo(120, 360); // 380 - 20
      leftArrow.lineTo(120, 400); // 420 - 20
      leftArrow.lineTo(100, 380); // 400 - 20
      leftArrow.endFill();
      leftArrow.interactive = true;
      leftArrow.cursor = 'pointer';
      leftArrow.name = 'leftArrow';
      app.stage.addChild(leftArrow);

      const rightArrow = new Graphics();
      rightArrow.beginFill(0xffa500);
      rightArrow.lineStyle(2, 0x0000ff);
      rightArrow.moveTo(560, 380); // 400 - 20
      rightArrow.lineTo(540, 360); // 380 - 20
      rightArrow.lineTo(540, 400); // 420 - 20
      rightArrow.lineTo(560, 380); // 400 - 20
      rightArrow.endFill();
      rightArrow.interactive = true;
      rightArrow.cursor = 'pointer';
      rightArrow.name = 'rightArrow';
      app.stage.addChild(rightArrow);

      // 添加页面指示器
      const pageText = new Text('1/1', {
        fontSize: 16,
        fill: 0x000000,
        align: 'center',
      });
      pageText.x = 330 - pageText.width / 2; // 360 - 30
      pageText.y = 580; // 600 - 20
      pageText.name = 'pageIndicator';
      app.stage.addChild(pageText);
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []); // 移除依赖，只初始化一次

  // 设置箭头点击事件
  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;
    const leftArrow = app.stage.getChildByName('leftArrow');
    const rightArrow = app.stage.getChildByName('rightArrow');

    if (leftArrow) {
      leftArrow.removeAllListeners();
      leftArrow.on('pointerdown', () => {
        setCurrentPage((prev) => Math.max(0, prev - 1));
      });
    }

    if (rightArrow) {
      rightArrow.removeAllListeners();
      rightArrow.on('pointerdown', () => {
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
      });
    }
  }, [totalPages]);

  // 更新页面指示器
  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;
    const pageIndicator = app.stage.getChildByName('pageIndicator') as Text;

    if (pageIndicator) {
      pageIndicator.text = `${currentPage + 1}/${totalPages}`;
      pageIndicator.x = 330 - pageIndicator.width / 2; // 360 - 30
    }
  }, [currentPage, totalPages]);

  // 渲染贴纸选择区域
  useEffect(() => {
    if (!appRef.current || imageInfoList.length === 0) return;

    const app = appRef.current;

    // 延迟渲染，确保PIXI应用完全初始化
    const renderStickers = () => {
      // 清除之前的贴纸和背景
      const existingStickers = app.stage.children.filter(
        (child) =>
          child.name &&
          (child.name.startsWith('sticker_') ||
            child.name.startsWith('sticker_bg_') ||
            child.name.startsWith('delete_btn_')),
      );
      existingStickers.forEach((sticker) => app.stage.removeChild(sticker));

      // 计算当前页面的贴纸
      const startIndex = currentPage * itemsPerPage;
      const endIndex = Math.min(
        startIndex + itemsPerPage,
        imageInfoList.length,
      );
      const currentPageItems = imageInfoList.slice(startIndex, endIndex);

      // 创建贴纸选择区域 - 使用Promise.all确保所有贴纸都创建完成
      const createStickers = async () => {
        const stickerPromises = currentPageItems.map(async (item, index) => {
          const row = Math.floor(index / 2);
          const col = index % 2;
          const x = 150 + col * 200; // 180 - 30
          const y = 150 + row * 150; // 170 - 20

          try {
            // 创建背景圆角矩形
            const backgroundRect = new Graphics();
            backgroundRect.beginFill(0xffffff, 0.8); // 半透明白色背景
            backgroundRect.drawRoundedRect(x - 10, y - 10, 180, 110, 15); // 圆角矩形，比贴纸稍大
            backgroundRect.endFill();
            backgroundRect.name = `sticker_bg_${startIndex + index}`;
            app.stage.addChild(backgroundRect);

            // 创建删除按钮
            const deleteButton = new Graphics();
            deleteButton.beginFill(0xff4444, 0.9); // 红色半透明背景
            deleteButton.drawCircle(x + 165, y - 5, 12); // 圆形删除按钮，位置在右上角
            deleteButton.endFill();
            deleteButton.interactive = true;
            deleteButton.cursor = 'pointer';
            deleteButton.name = `delete_btn_${startIndex + index}`;

            // 添加删除按钮的"×"符号
            const deleteText = new Text('×', {
              fontSize: 16,
              fill: 0xffffff,
              align: 'center',
              fontWeight: 'bold',
            });
            deleteText.anchor.set(0.5, 0.5);
            deleteText.x = x + 165;
            deleteText.y = y - 5;
            deleteButton.addChild(deleteText);

            // 添加悬浮效果
            deleteButton.on('pointerover', () => {
              deleteButton.clear();
              deleteButton.beginFill(0xff0000, 1); // 完全不透明的红色
              deleteButton.drawCircle(x + 165, y - 5, 12);
              deleteButton.endFill();
              deleteButton.addChild(deleteText);
            });

            deleteButton.on('pointerout', () => {
              deleteButton.clear();
              deleteButton.beginFill(0xff4444, 0.9); // 恢复半透明红色
              deleteButton.drawCircle(x + 165, y - 5, 12);
              deleteButton.endFill();
              deleteButton.addChild(deleteText);
            });

            // 添加删除按钮点击事件
            deleteButton.on('pointerdown', (event) => {
              event.stopPropagation(); // 阻止事件冒泡，防止触发贴纸点击事件
              deleteSticker(startIndex + index);
            });

            app.stage.addChild(deleteButton);

            const sticker = await createStickerWithBorder(
              item.image,
              item.name,
            );
            sticker.name = `sticker_${startIndex + index}`;
            sticker.x = x;
            sticker.y = y;
            sticker.scale.set(0.1); // 进一步缩小贴纸

            // 确保interactive属性正确设置
            sticker.interactive = true;
            sticker.cursor = 'pointer';

            // 添加点击事件，将贴纸添加到右侧区域
            sticker.on('pointerdown', async (event) => {
              console.log(`点击了贴纸: ${sticker.name}`);
              try {
                // 创建经过抠图处理的贴纸
                const processedSticker = await createStickerWithBorder(
                  item.image,
                  item.name,
                );
                processedSticker.scale.set(0.15);

                // 获取贴纸的实际内容尺寸（考虑缩放）
                const contentBounds = (processedSticker as any).contentBounds;
                if (!contentBounds) {
                  console.error('贴纸内容边界未找到');
                  return;
                }

                const stickerWidth =
                  contentBounds.width * processedSticker.scale.x;
                const stickerHeight =
                  contentBounds.height * processedSticker.scale.y;

                // 限制在右侧绿色区域内，确保贴纸完全在区域内
                // rightPanel.drawRect(700, 50, 380, 550) 对应 x: 700, y: 50, width: 380, height: 550
                const panelX = 700;
                const panelY = 150;
                const panelWidth = 380;
                const panelHeight = 450;

                // 确保贴纸的整个内容都在面板内
                // 考虑内容边界偏移，确保实际内容不超出面板
                const contentOffsetX =
                  contentBounds.minX * processedSticker.scale.x;
                const contentOffsetY =
                  contentBounds.minY * processedSticker.scale.y;

                const minX = panelX - contentOffsetX;
                const maxX =
                  panelX + panelWidth - stickerWidth - contentOffsetX;
                const minY = panelY - contentOffsetY;
                const maxY =
                  panelY + panelHeight - stickerHeight - contentOffsetY;

                processedSticker.x = minX + Math.random() * (maxX - minX);
                processedSticker.y = minY + Math.random() * (maxY - minY);
                processedSticker.interactive = true;
                processedSticker.cursor = 'pointer';
                processedSticker.name = `placed_sticker_${Date.now()}`;

                // 添加拖拽和选择功能
                processedSticker.on('pointerdown', (dragEvent) => {
                  dragEvent.stopPropagation(); // 阻止事件冒泡

                  // 选择当前贴纸
                  setSelectedSticker(processedSticker);
                  setSelectedStickerScale(processedSticker.scale.x);

                  setIsDragging(true);
                  setDragTarget(processedSticker);
                  // 使用贴纸的实际位置计算偏移量，而不是getBounds()
                  setDragOffset({
                    x: dragEvent.data.global.x - processedSticker.x,
                    y: dragEvent.data.global.y - processedSticker.y,
                  });
                });

                app.stage.addChild(processedSticker);

                // 保存到状态
                const stickerItem: StickerItem = {
                  id: processedSticker.name,
                  image: item.image,
                  name: item.name,
                  x: processedSticker.x,
                  y: processedSticker.y,
                  scale: 0.15,
                  rotation: 0,
                };
                setPlacedStickers((prev) => [...prev, stickerItem]);
              } catch (error) {
                console.error('创建右侧贴纸失败:', error);
              }
            });

            app.stage.addChild(sticker);

            // 添加到stage后再次确保interactive属性
            sticker.interactive = true;
            sticker.cursor = 'pointer';

            console.log(`贴纸 ${sticker.name} 已添加到stage:`, {
              interactive: sticker.interactive,
              parent: sticker.parent !== null,
            });

            return sticker;
          } catch (error) {
            console.error('创建贴纸失败:', error);
            return null;
          }
        });

        // 等待所有贴纸创建完成
        await Promise.all(stickerPromises);
        console.log('所有贴纸创建完成，点击事件已绑定');

        // 延迟一帧确保PIXI交互系统完全初始化
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 再次确保所有贴纸的interactive属性
        const stickers = app.stage.children.filter(
          (child) => child.name && child.name.startsWith('sticker_'),
        );
        stickers.forEach((sticker) => {
          sticker.interactive = true;
          sticker.cursor = 'pointer';
        });

        console.log('所有贴纸interactive属性已重新设置');
      };

      createStickers();
    };

    // 延迟执行渲染，确保PIXI应用完全初始化
    setTimeout(renderStickers, 100);
  }, [imageInfoList, currentPage]);

  // 更新选中贴纸的大小
  useEffect(() => {
    if (selectedSticker) {
      selectedSticker.scale.set(selectedStickerScale);

      // 更新状态中的缩放值
      setPlacedStickers((prev) =>
        prev.map((sticker) =>
          sticker.id === selectedSticker.name
            ? { ...sticker, scale: selectedStickerScale }
            : sticker,
        ),
      );
    }
  }, [selectedStickerScale, selectedSticker]);

  // 处理拖拽
  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;

    const handlePointerMove = (event: any) => {
      if (isDragging && dragTarget) {
        const newX = event.data.global.x - dragOffset.x;
        const newY = event.data.global.y - dragOffset.y;

        // 限制在右侧绿色区域内
        // rightPanel.drawRect(700, 50, 380, 550) 对应 x: 700, y: 50, width: 380, height: 550
        const panelX = 700;
        const panelY = 150;
        const panelWidth = 380;
        const panelHeight = 450;

        // 使用实际内容尺寸计算显示尺寸
        const contentBounds = (dragTarget as any).contentBounds;
        if (!contentBounds) {
          console.error('拖拽贴纸内容边界未找到');
          return;
        }

        const stickerWidth = contentBounds.width * dragTarget.scale.x;
        const stickerHeight = contentBounds.height * dragTarget.scale.y;

        // 确保贴纸的整个内容都在面板内，不能超出边界
        // 考虑内容边界偏移，确保实际内容不超出面板
        const contentOffsetX = contentBounds.minX * dragTarget.scale.x;
        const contentOffsetY = contentBounds.minY * dragTarget.scale.y;

        const minX = panelX - contentOffsetX;
        const maxX = panelX + panelWidth - stickerWidth - contentOffsetX;
        const minY = panelY - contentOffsetY;
        const maxY = panelY + panelHeight - stickerHeight - contentOffsetY;

        const constrainedX = Math.max(minX, Math.min(maxX, newX));
        const constrainedY = Math.max(minY, Math.min(maxY, newY));

        dragTarget.x = constrainedX;
        dragTarget.y = constrainedY;
      }
    };

    const handlePointerUp = () => {
      if (isDragging && dragTarget) {
        // 更新状态中的位置
        setPlacedStickers((prev) =>
          prev.map((sticker) =>
            sticker.id === dragTarget.name
              ? { ...sticker, x: dragTarget.x, y: dragTarget.y }
              : sticker,
          ),
        );
      }
      setIsDragging(false);
      setDragTarget(null);
    };

    // 使用全局事件监听器
    app.stage.interactive = true;
    app.stage.on('pointermove', handlePointerMove);
    app.stage.on('pointerup', handlePointerUp);
    app.stage.on('pointerupoutside', handlePointerUp);

    return () => {
      if (app.stage) {
        app.stage.off('pointermove', handlePointerMove);
        app.stage.off('pointerup', handlePointerUp);
        app.stage.off('pointerupoutside', handlePointerUp);
      }
    };
  }, [isDragging, dragTarget, dragOffset]);

  return (
    <div className="min-h-screen bg-[#f5efe4] pt-responsive-1250" ref={outerRef}>
    <div
      className="flex justify-center flex-col mx-auto relative"
      style={{ width: '1150px', zoom: scale }}
    >
        {/* 返回按钮 */}
        <Link
          href="/showdetail"
          className="absolute top-0 left-0 bg-white/90 hover:bg-white transition-colors duration-200 rounded-full p-3 shadow-lg border border-gray-200 z-20"
        >
          <svg
            className="w-6 h-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>

        <div
          ref={canvasRef}
          style={{
            width: '1150px',
            height: '700px',
            backgroundColor: '#baced4',
          }}
        />

        <header
          className="paper-card mb-6 px-6 py-4 flex justify-between items-center w-[1150px] h-[700px]"
          style={{ height: '97px' }}
        >
          <h1 className="text-2xl font-bold text-[transparent]">贴纸功能</h1>
          <p className="text-[transparent] mt-2">
            选择贴纸并在右侧区域自由摆放
          </p>
          <div className="flex items-center gap-4">
            {selectedSticker && (
              <div className="flex items-center gap-3 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200 shadow-sm">
                <label className="text-sm text-orange-700 font-medium">
                  选中贴纸大小:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="0.4"
                    step="0.025"
                    value={selectedStickerScale}
                    onChange={(e) =>
                      setSelectedStickerScale(Number(e.target.value))
                    }
                    className="w-24 h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer slider-orange"
                    style={{
                      background: `linear-gradient(to right, #f97316 0%, #f97316 ${
                        ((selectedStickerScale - 0.1) / (0.4 - 0.1)) * 100
                      }%, #fed7aa ${
                        ((selectedStickerScale - 0.1) / (0.4 - 0.1)) * 100
                      }%, #fed7aa 100%)`,
                    }}
                  />
                  <span className="text-sm text-orange-600 font-semibold w-12 text-center">
                    {Math.round(selectedStickerScale * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSticker(null)}
                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md transition-colors duration-200 font-medium shadow-sm"
                >
                  取消选择
                </button>
                <button
                  onClick={deletePlacedSticker}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition-colors duration-200 font-medium shadow-sm"
                >
                  删除贴纸
                </button>
                <button
                  onClick={copySelectedStickerToClipboard}
                  className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors duration-200 font-medium shadow-sm"
                >
                  复制贴纸
                </button>
                <button
                  onClick={downloadSelectedSticker}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors duration-200 font-medium shadow-sm"
                >
                  下载贴纸
                </button>
              </div>
            )}
            <div className="relative">
              <div className="badge-circle w-10 h-10 rounded-full grid place-items-center">
                <span className="text-yellow-300 text-xl">★</span>
              </div>
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}
