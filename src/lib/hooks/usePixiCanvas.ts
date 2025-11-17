"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import * as PIXI from "pixi.js";
import { Layer, Stage } from "@pixi/layers";

// 不再需要全局设置PIXI和require导入，@pixi/layers是标准ESM模块

// Hook配置参数接口
export interface PixiCanvasOptions {
  width?: number;
  height?: number;
  backgroundColor?: number;
  transparent?: boolean;
  antialias?: boolean;
  resolution?: number;
  autoDensity?: boolean;
  preserveDrawingBuffer?: boolean;
  autoResize?: boolean;
  onInit?: (app: PIXI.Application) => void;
}

// 返回值接口
export interface PixiCanvasReturn {
  app: PIXI.Application | null;
  stage: PIXI.Container | null;
  canvasRef: React.RefObject<HTMLDivElement>;
  loading: boolean;
  error: Error | null;
  resize: (width: number, height: number) => void;
  addChild: (displayObject: PIXI.DisplayObject) => PIXI.DisplayObject;
  removeChild: (displayObject: PIXI.DisplayObject) => PIXI.DisplayObject;
  createLayer: (zIndex?: number) => PIXI.Container & { zIndex?: number };
  clear: () => void;
  destroy: () => void;
}

/**
 * 自定义Hook，用于初始化和管理Pixi.js Canvas
 * @param options - Pixi应用配置选项
 */
export function usePixiCanvas(
  options: PixiCanvasOptions = {}
): PixiCanvasReturn {
  // 默认配置
  const defaultOptions: PixiCanvasOptions = {
    width: 800,
    height: 600,
    backgroundColor: 0xffffff,
    transparent: false,
    antialias: true,
    resolution: global?.devicePixelRatio || 1,
    autoDensity: true,
    preserveDrawingBuffer: false,
    autoResize: true,
  };

  // 合并配置
  const config = { ...defaultOptions, ...options };

  // 状态和引用
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<PIXI.Container | null>(null);

  // 初始化Pixi应用
  const initPixiApp = useCallback(() => {
    if (!canvasRef.current) return;

    try {
      setLoading(true);

      // 创建Pixi应用
      const app = new PIXI.Application({
        width: config.width,
        height: config.height,
        backgroundColor: config.backgroundColor,
        antialias: config.antialias,
        resolution: config.resolution,
        autoDensity: config.autoDensity,
        preserveDrawingBuffer: config.preserveDrawingBuffer,
        backgroundAlpha: config.transparent ? 0 : 1,
        powerPreference: "high-performance",
      });

      // 将画布添加到DOM
      canvasRef.current.appendChild(app.view as any);

      // 设置交互选项
      // Pixi.js v7中不再使用renderer.plugins.interaction
      // 而是使用app.renderer.events
      if (app.renderer.events) {
        app.renderer.events.autoPreventDefault = false; // 允许事件传递给DOM
      }

      // 使用@pixi/layers创建分层舞台
      const stage = new Stage();
      stage.sortableChildren = true;
      app.stage = stage;
      stageRef.current = stage;

      // 存储应用实例
      appRef.current = app;

      // 如果提供了初始化回调，则执行
      if (config.onInit) {
        config.onInit(app);
      }

      setLoading(false);
    } catch (err) {
      console.error("初始化Pixi应用失败", err);
      setError(err instanceof Error ? err : new Error("初始化Pixi应用失败"));
      setLoading(false);
    }
  }, [config]);

  // 调整画布大小
  const resize = useCallback(
    (width: number, height: number) => {
      if (!appRef.current) return;

      appRef.current.renderer.resize(width, height);

      if (config.autoResize && appRef.current.stage) {
        // 可以在这里添加舞台调整逻辑
      }
    },
    [config.autoResize]
  );

  // 添加显示对象到舞台
  const addChild = useCallback(
    (displayObject: PIXI.DisplayObject): PIXI.DisplayObject => {
      if (!appRef.current || !stageRef.current) return displayObject;
      return stageRef.current.addChild(displayObject);
    },
    []
  );

  // 从舞台移除显示对象
  const removeChild = useCallback(
    (displayObject: PIXI.DisplayObject): PIXI.DisplayObject => {
      if (!appRef.current || !stageRef.current) return displayObject;
      return stageRef.current.removeChild(displayObject);
    },
    []
  );

  // 创建新图层
  const createLayer = useCallback(
    (zIndex?: number): PIXI.Container & { zIndex?: number } => {
      const layer = new Layer();
      if (zIndex !== undefined) {
        layer.zIndex = zIndex;
      }

      if (stageRef.current) {
        stageRef.current.addChild(layer);
      }

      return layer;
    },
    []
  );

  // 清除舞台上的所有内容
  const clear = useCallback(() => {
    if (!stageRef.current) return;
    stageRef.current.removeChildren();
  }, []);

  // 销毁Pixi应用
  const destroy = useCallback(() => {
    if (!appRef.current) return;

    appRef.current.destroy(true, {
      children: true,
      texture: true,
      baseTexture: true,
    });

    appRef.current = null;
    stageRef.current = null;
  }, []);

  // 组件挂载时初始化Pixi应用
  useEffect(() => {
    // 确保在浏览器环境中运行
    if (typeof window !== "undefined") {
      initPixiApp();
    }

    // 组件卸载时销毁Pixi应用
    return () => {
      destroy();
    };
  }, []);

  // 返回hook的API
  return {
    app: appRef.current,
    stage: stageRef.current,
    canvasRef,
    loading,
    error,
    resize,
    addChild,
    removeChild,
    createLayer,
    clear,
    destroy,
  };
}

export default usePixiCanvas;
