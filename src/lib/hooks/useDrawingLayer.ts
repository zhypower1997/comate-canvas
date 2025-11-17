import { useState, useRef, useEffect, useCallback } from "react";
import * as PIXI from "pixi.js";

interface DrawingLayerOptions {
  zIndex?: number;
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  brushColor?: number;
  brushType?: BrushType;
  brushSize?: number;
  opacity?: number;
  maxCacheSize?: number;
  onClick?: () => void;
  onPaintStart?: () => void;
}

interface DrawingLayerState {
  isReady: boolean;
  isDrawing: boolean;
  brushColor: number; // 绘图颜色
  brushType: BrushType; // 笔刷类型
  brushSize: number; // 笔刷大小
  opacity: number; // 透明度
  // 可以根据需要扩展更多绘图选项
}

export enum BrushType {
  PEN = "pen",
  ERASER = "rubber",
  COLOR_PEN = "color_pen",
}

interface LayerPoint {
  x: number;
  y: number;
  brush: {
    type: BrushType;
    color: number;
    size: number;
  };
  random: number[];
}

interface DrawingLayerControls {
  startDrawing: (x: number, y: number) => void;
  continueDrawing: (x: number, y: number) => void;
  endDrawing: () => void;
  clear: () => void;
  isPointInBounds: (x: number, y: number) => boolean;
  enableInteraction: () => void; // 启用图层交互
  disableInteraction: () => void; // 禁用图层交互
  getLayer: () => PIXI.Container | null; // 获取图层对象
  setBrush: (type: BrushType, color?: number, size?: number) => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Hook for managing a drawing layer in a PIXI application using RenderTexture
 * 使用 RenderTexture 实现的绘图层，支持更高效的绘制和橡皮擦功能
 */
export function useDrawingLayer(
  app: PIXI.Application | null,
  createLayer: (zIndex: number) => PIXI.Container,
  options: DrawingLayerOptions = {}
): [DrawingLayerState, DrawingLayerControls] {
  const {
    zIndex = 3,
    width = 500,
    height = 500,
    position = { x: 150, y: 50 },
    backgroundColor = 0xffffff,
    borderColor = 0x999999,
    borderWidth = 2,
    brushColor = 0x000000,
    brushType = BrushType.PEN,
    brushSize = 3,
    opacity = 1,
    maxCacheSize = 10,
    onClick = () => { },
    onPaintStart = () => { },
  } = options;

  // 全部使用 useRef 管理状态，避免闭包问题
  const stateRef = useRef<DrawingLayerState>({
    isReady: false,
    isDrawing: false,
    brushColor: brushColor, // 默认黑色
    brushType: brushType,
    brushSize: brushSize, // 默认笔刷大小
    opacity: opacity, // 默认透明度
    // 可以根据需要扩展更多绘图选项
  });

  const [pathState, setPathState] = useState<{
    pathsCache: LayerPoint[][];
    paths: LayerPoint[][];
  }>({
    pathsCache: [],
    paths: [],
  });
  const [renderFrame, setRenderFrame] = useState<number>(0);

  // 引用
  const layerRef = useRef<PIXI.Container | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<any>(null);
  const lastUpdateTime = useRef(0);

  // RenderTexture 相关引用
  const renderPenTextureRef = useRef<PIXI.RenderTexture | null>(null);
  const renderColorTextureRef = useRef<PIXI.RenderTexture | null>(null);
  const spritePenRef = useRef<PIXI.Sprite | null>(null);
  const spriteColorRef = useRef<PIXI.Sprite | null>(null);

  // 更新状态的帮助函数，替代 setState
  const updateState = (updates: Partial<DrawingLayerState>) => {
    stateRef.current = { ...stateRef.current, ...updates };
  };

  // 初始化画板图层
  useEffect(() => {
    if (!app || layerRef.current) return;
    console.log("画板图层加载完毕 (RenderTexture版本)");

    // 创建画板图层
    const drawingLayer = createLayer(zIndex);
    layerRef.current = drawingLayer;

    // 设置位置
    drawingLayer.position.set(position.x, position.y);

    // 创建画板边框
    const borderGraphics = new PIXI.Graphics();
    borderGraphics.lineStyle(borderWidth, borderColor);
    borderGraphics.drawRect(0, 0, width, height);
    drawingLayer.addChild(borderGraphics);

    // 创建绘图图层的背景
    const drawingBg = new PIXI.Graphics();
    // drawingBg.beginFill(backgroundColor);
    drawingBg.drawRect(0, 0, width, height);
    // drawingBg.endFill();
    drawingLayer.addChild(drawingBg);

    // 创建 RenderTexture
    renderPenTextureRef.current = PIXI.RenderTexture.create({
      width,
      height,
      scaleMode: PIXI.SCALE_MODES.NEAREST, // 使用最近邻缩放模式，避免模糊
    });
    renderColorTextureRef.current = PIXI.RenderTexture.create({
      width,
      height,
      scaleMode: PIXI.SCALE_MODES.NEAREST, // 使用最近邻缩放模式，避免模糊
    });

    // 创建显示 RenderTexture 的 Sprite
    spritePenRef.current = new PIXI.Sprite(renderPenTextureRef.current);
    spriteColorRef.current = new PIXI.Sprite(renderColorTextureRef.current);

    drawingLayer.addChild(spriteColorRef.current);
    drawingLayer.addChild(spritePenRef.current);

    // 创建一个交互区域
    const hitArea = new PIXI.Rectangle(0, 0, width, height);
    (drawingBg as any).hitArea = hitArea;
    enableInteraction();

    // 初始化完成
    updateState({ isReady: true });
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // 定义动画更新函数
    const updateFrame = (timestamp) => {
      // 初始化时间
      if (!lastUpdateTime.current) {
        lastUpdateTime.current = timestamp;
      }

      // 计算与上一次更新的时间差（毫秒）
      const elapsed = timestamp - lastUpdateTime.current;

      // 当时间差大于等于100ms时更新
      if (elapsed >= 100) {
        setRenderFrame((prevFrame) => prevFrame + 1);
        // 更新上一次更新时间（减去多余的毫秒以保持精确间隔）
        lastUpdateTime.current = timestamp - (elapsed % 100);
      }

      // 继续请求下一帧
      animationRef.current = requestAnimationFrame(updateFrame);
    };

    animationRef.current = requestAnimationFrame(updateFrame);

    // 清理函数
    return () => {
      if (layerRef.current && layerRef.current.parent) {
        // 确保禁用交互
        disableInteraction();
        layerRef.current.parent.removeChild(layerRef.current);
      }

      // 销毁 RenderTexture
      if (renderPenTextureRef.current) {
        renderPenTextureRef.current.destroy(true);
      }
      if (renderColorTextureRef.current) {
        renderColorTextureRef.current.destroy(true);
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [app, layerRef]);

  const drawCross = (
    g: PIXI.Graphics,
    x: number,
    y: number,
    size: number[] = [20, 20],
    color: number,
    thickness: number[] = [1, 1]
  ) => {
    //X轴
    g.lineStyle(thickness[0], color, 1);
    g.moveTo(x - size[0], y);
    g.lineTo(x + size[0], y);
    //Y轴
    g.lineStyle(thickness[1], color, 1);
    g.moveTo(x, y - size[1]);
    g.lineTo(x, y + size[1]);
  };

  const setDrawBrush = (
    brush: PIXI.Graphics,
    brushConfig: { type: BrushType; color: number; size: number },
    random: number[],
    renderFrame: number
  ) => {
    if (!brush) return;
    const { type, color } = brushConfig;
    switch (type) {
      case BrushType.PEN:
        const size = [4, 4];
        const thickness = [4, 4];
        drawCross(brush, 0, 0, size, 0x000000, thickness);

        const randomNumber = random[renderFrame % 3];
        const randomConfig = [
          { x: -size[0] / 2, y: -size[1] / 2 },
          { x: size[0] / 2, y: -size[1] / 2 },
          { x: -size[0] / 2, y: size[1] / 2 },
          { x: size[0] / 2, y: size[1] / 2 },
        ];
        if (randomNumber > 0) {
          drawCross(
            brush,
            randomConfig[randomNumber - 1].x,
            randomConfig[randomNumber - 1].y,
            size,
            0x000000,
            thickness
          );
        }
        break;
      case BrushType.ERASER:
        brush.blendMode = PIXI.BLEND_MODES.ERASE;
        brush.beginFill(0xffffff, 1); // 白色半透明
        brush.drawCircle(0, 0, brushConfig.size);
        brush.endFill();
        break;
      case BrushType.COLOR_PEN:
        const positionConfig = [
          { x: -brushConfig.size / 10, y: -brushConfig.size / 10 },
          { x: brushConfig.size / 10, y: -brushConfig.size / 10 },
          { x: -brushConfig.size / 10, y: brushConfig.size / 10 },
          { x: brushConfig.size / 10, y: brushConfig.size / 10 },
        ];
        brush.beginFill(color, 1); // 白色半透明
        brush.drawCircle(
          positionConfig[random[renderFrame % 3]]?.x,
          positionConfig[random[renderFrame % 3]]?.y,
          brushConfig.size
        );
        brush.endFill();
        break;
    }
  };

  // 开始绘制
  const startDrawing = (x: number, y: number) => {
    if (!layerRef.current) return;

    // 转换为画板图层的相对坐标
    const layerPos = layerRef.current.position;
    const localX = x - layerPos.x;
    const localY = y - layerPos.y;

    // 检查点击是否在画板区域内
    if (localX < 0 || localX > width || localY < 0 || localY > height) {
      console.log("点击在画板区域外，不处理");
      return; // 如果点击在画板区域外，则不处理
    }

    // 设置绘制状态
    updateState({ isDrawing: true });

    // 保存最后位置
    lastPosRef.current = { x: localX, y: localY };
    onPaintStart();

    const newPoint = {
      x: localX,
      y: localY,
      brush: {
        type: stateRef.current.brushType,
        color: stateRef.current.brushColor,
        size: stateRef.current.brushSize,
      },
      random: new Array(3).fill(0).map(() => Math.floor(Math.random() * 5)),
    };
    setPathState((prevPath) => ({
      pathsCache: [],
      paths: [...prevPath.paths, [newPoint]],
    }));

  };

  // 继续绘制
  const continueDrawing = (x: number, y: number) => {
    if (!lastPosRef.current || !layerRef.current) {
      console.log("继续绘制 - 条件不满足:", {
        hasApp: !!app,
        hasRenderPenTexture: !!renderPenTextureRef.current,
        hasRenderColorTexture: !!renderColorTextureRef.current,
        hasLastPos: !!lastPosRef.current,
        hasLayer: !!layerRef.current,
      });
      return;
    }

    // 转换为画板图层的相对坐标
    const layerPos = layerRef.current.position;
    const localX = x - layerPos.x;
    const localY = y - layerPos.y;

    // 检查是否在画板区域内
    if (localX < 0 || localX > width || localY < 0 || localY > height) {
      console.log("移动到画板区域外，不处理");
      return; // 如果移动到画板区域外，则不处理
    }

    // 使用插值算法绘制平滑的线条
    const pointsOrigin = interpolatePoints(
      lastPosRef.current.x,
      lastPosRef.current.y,
      localX,
      localY,
      10
    );
    const randomNumber = new Array(3)
      .fill(0)
      .map(() => Math.floor(Math.random() * 5));
    const newPoints = pointsOrigin.map((point) => ({
      x: point.x,
      y: point.y,
      brush: {
        type: stateRef.current.brushType,
        color: stateRef.current.brushColor,
        size: stateRef.current.brushSize,
      },
      random: randomNumber,
    }));
    setPathState((prevPath) => {
      const lastPath = prevPath.paths[prevPath.paths.length - 1];
      return {
        pathsCache: [],
        paths: [...prevPath.paths.slice(0, prevPath.paths.length - 1), [...lastPath, ...newPoints]],
      };
    });
    // 更新最后位置
    lastPosRef.current = { x: localX, y: localY };
  };

  // 结束绘制
  const endDrawing = () => {
    updateState({ isDrawing: false });
    lastPosRef.current = null;
  };

  useEffect(() => {
    if (!app || !renderPenTextureRef.current || !renderColorTextureRef.current)
      return;
    // 创建渲染容器
    const penContainer = new PIXI.Container();
    const colorContainer = new PIXI.Container();

    for (const path of pathState.paths) {
      const points = path;
      for (const point of points) {
        const brush = new PIXI.Graphics();
        // 清除之前的笔刷
        brush.clear();
        // 设置笔刷位置
        brush.position.set(point.x, point.y);
        // 渲染笔刷
        setDrawBrush(brush, point.brush, point.random, renderFrame);

        switch (point.brush.type) {
          case BrushType.PEN:
            penContainer.addChild(brush);
            break;
          case BrushType.ERASER:
            const newBrush = new PIXI.Graphics();
            newBrush.position.set(point.x, point.y);
            setDrawBrush(newBrush, point.brush, point.random, renderFrame);
            penContainer.addChild(brush);
            colorContainer.addChild(newBrush);
            break;
          case BrushType.COLOR_PEN:
            colorContainer.addChild(brush);
            break;
        }
      }
    }
    app?.renderer?.render(colorContainer as any, {
      renderTexture: renderColorTextureRef.current as any,
      clear: true,
      transform: new PIXI.Matrix(),
    });
    app?.renderer?.render(penContainer as any, {
      renderTexture: renderPenTextureRef.current as any,
      clear: true,
      transform: new PIXI.Matrix(),
    });
  }, [renderFrame, pathState.paths]);

  // 清除画板
  const clear = () => {
    if (!app || !renderPenTextureRef.current || !renderColorTextureRef.current)
      return;
    setPathState({ pathsCache: [], paths: [] });
    console.log("画板已清除");
  };

  // 检查点是否在画板区域内
  const isPointInBounds = (x: number, y: number): boolean => {
    if (!layerRef.current) return false;

    const layerPos = layerRef.current.position;
    const localX = x - layerPos.x;
    const localY = y - layerPos.y;

    return localX >= 0 && localX <= width && localY >= 0 && localY <= height;
  };

  // 启用图层交互
  const enableInteraction = () => {
    if (!layerRef.current) return;

    const drawingBg = layerRef.current.children[1] as PIXI.Graphics;
    if (!drawingBg) return;

    console.log("启用图层交互");

    // 设置为交互式
    (drawingBg as any).interactive = true;
    (drawingBg as any).buttonMode = true; // 使用指针样式以便于绘制

    // 添加事件监听器
    (drawingBg as any).on("pointerdown", (event: any) => {
      if (!layerRef.current) return;

      const globalPos = event.data.global;
      console.log("pointerdown事件 - 位置:", {
        x: globalPos.x,
        y: globalPos.y,
      });
      // 设置鼠标样式为绘制图标
      document.body.style.cursor = "crosshair";
      startDrawing(globalPos.x, globalPos.y);
      onClick();
    });

    (drawingBg as any).on("pointermove", (event: any) => {
      const globalPos = event.data.global;
      // 直接使用lastPosRef来判断是否正在绘制，而不是依赖state.isDrawing
      if (!lastPosRef.current || !layerRef.current) {
        console.log("pointermove - 不满足绘制条件");
        return;
      }

      continueDrawing(globalPos.x, globalPos.y);
    });

    (drawingBg as any).on("pointerup", (event: any) => {
      console.log("pointerup事件");
      endDrawing();
    });

    (drawingBg as any).on("pointerupoutside", (event: any) => {
      console.log("pointerupoutside事件");
      endDrawing();
    });
  };

  // 禁用图层交互
  const disableInteraction = () => {
    if (!layerRef.current) return;

    const drawingBg = layerRef.current.children[1] as PIXI.Graphics;
    if (!drawingBg) return;

    // 移除交互性
    (drawingBg as any).interactive = false;

    // 移除所有事件监听器
    (drawingBg as any).removeAllListeners("pointerdown");
    (drawingBg as any).removeAllListeners("pointermove");
    (drawingBg as any).removeAllListeners("pointerup");
    (drawingBg as any).removeAllListeners("pointerupoutside");
  };

  const setBrush = (
    brushType: BrushType,
    color?: number,
    brushSize?: number
  ) => {
    updateState({
      brushColor: color,
      brushType: brushType,
      brushSize: brushSize,
    });
  };

  // 获取图层对象
  const getLayer = () => layerRef.current;

  // 辅助函数：在两点之间插值，生成平滑的线条点
  const interpolatePoints = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    spacing: number
  ): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    // 如果距离太短，直接返回终点
    if (distance < spacing / 2) {
      return [{ x: x2, y: y2 }];
    }

    // 计算需要插入的点数量
    const numPoints = Math.ceil(distance / (spacing / 2));

    // 生成插值点
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      points.push({ x, y });
    }

    return points;
  };


  const undo = useCallback(() => {
    console.log("undo-in");


    setPathState((prevPath) => {
      const { pathsCache, paths } = prevPath;
      const newPaths = [...paths];
      const lastPath = newPaths.pop();
      if (lastPath && pathsCache.length < 10) {
        return {
          pathsCache: [...pathsCache, lastPath],
          paths: newPaths,
        }
      }
      return {
        pathsCache,
        paths,
      }
    });


  }, []);
  const redo = () => {
    setPathState((prevPath) => {
      const { pathsCache, paths } = prevPath;
      const newPathsCache = [...pathsCache];
      const lastPath = newPathsCache.pop();
      if (lastPath) {
        return {
          pathsCache: [...newPathsCache],
          paths: [...paths, lastPath],
        };
      }
      return {
        pathsCache,
        paths,
      };
    });
  };

  // 返回状态和控制函数
  return [
    stateRef.current,
    {
      startDrawing,
      continueDrawing,
      endDrawing,
      clear,
      isPointInBounds,
      enableInteraction,
      disableInteraction,
      getLayer,
      setBrush,
      undo,
      redo,
    },
  ];
}
