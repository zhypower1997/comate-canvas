import { useState, useRef, useEffect } from "react";
import * as PIXI from "pixi.js";

// 动画方向类型
export type AnimationDirection =
  | "horizontal"
  | "vertical"
  | "diagonal"
  | number; // 支持以角度值指定方向，0-360度

// 动画缓动类型
export type EasingFunction = (t: number) => number;

// 动画状态
export type AnimationStatus = "idle" | "running" | "paused" | "completed";

// 动画参数接口
export interface AnimationParams {
  distance: number;
  duration: number;
  direction: AnimationDirection;
  loop?: boolean; // 是否循环播放
  reverse?: boolean; // 是否反向播放
  easing?: EasingFunction; // 缓动函数
}

interface ImageLayerOptions {
  zIndex?: number;
  position?: { x: number; y: number };
  imageUrl?: string;
  svgData?: string;
  scale?: number;
  tint?: number; // 16进制颜色值，如 0xFF0000 表示红色
  handleImageClick?: () => void;
}

interface ImageLayerState {
  isReady: boolean;
  error: string | null;
  animationStatus: AnimationStatus;
  tint: number; // 当前颜色值
  sprite: PIXI.Sprite | null;
}

interface ImageLayerControls {
  // 动画控制
  animate: (params: AnimationParams) => void;
  stopAnimation: () => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  getAnimationStatus: () => AnimationStatus;

  // 图层控制
  updatePosition: (x: number, y: number) => void;
  updateScale: (scale: number) => void;
  updateTexture: (imageUrl: string) => Promise<void>;
  getLayer: () => PIXI.Container | null;
  getSprite: () => PIXI.Sprite | null;

  // 颜色控制
  setTint: (color: number) => void; // 设置图层颜色
  getTint: () => number; // 获取当前颜色

  // 交互控制
  enableInteraction: (callback?: () => void) => void;
  disableInteraction: () => void;
}

/**
 * 通用图片图层 Hook，用于在 PIXI 应用中管理图片图层
 * @param app PIXI 应用实例
 * @param createLayer 创建图层的函数
 * @param options 图层选项
 * @returns [图层状态, 图层控制函数]
 */
export function useImageLayer(
  app: PIXI.Application | null,
  createLayer: (zIndex: number) => PIXI.Container,
  options: ImageLayerOptions = {}
): [ImageLayerState, ImageLayerControls] {
  const {
    zIndex = 2,
    position = { x: 100, y: 100 },
    imageUrl,
    svgData,
    scale = 1,
    handleImageClick = () => {},
  } = options;

  useEffect(() => {
    console.log("options.tint", options.tint);
    if (spriteRef.current && options.tint) {
      setTint(options.tint);
    }
  }, [options.tint]);

  // 状态
  const [state, setState] = useState<ImageLayerState>({
    isReady: false,
    error: null,
    animationStatus: "idle",
    tint: options.tint || 0xffffff, // 默认白色
    sprite: null,
  });

  // 引用
  const layerRef = useRef<PIXI.Container | null>(null);
  const spriteRef = useRef<PIXI.Sprite | null>(null);
  const animationRef = useRef<{
    progress: number;
    originalPosition: { x: number; y: number };
    targetPosition: { x: number; y: number };
    params: AnimationParams | null;
    tickerId: PIXI.TickerCallback<any> | null;
    status: AnimationStatus;
    direction: "forward" | "backward";
    loopCount: number;
  }>({
    progress: 0,
    originalPosition: { x: 0, y: 0 },
    targetPosition: { x: 0, y: 0 },
    params: null,
    tickerId: null,
    status: "idle",
    direction: "forward",
    loopCount: 0,
  });

  // 点击回调引用
  const clickCallbackRef = useRef<(() => void) | null>(null);

  // 存储传入的回调函数
  useEffect(() => {
    clickCallbackRef.current = handleImageClick;
  }, [handleImageClick]);

  // 初始化图片图层
  useEffect(() => {
    if (!app || layerRef.current) return;

    // 创建图层
    const imageLayer = createLayer(zIndex);
    layerRef.current = imageLayer;

    const initializeLayer = async () => {
      try {
        // 检查是否提供了图片资源
        if (!imageUrl && !svgData) {
          setState((prev) => ({
            ...prev,
            isReady: false,
            animationStatus: "idle",
            sprite: null,
            error: "未提供图片资源，请提供 imageUrl 或 svgData",
          }));
          console.warn("未提供图片资源，请提供 imageUrl 或 svgData");
          return;
        }

        let sprite: PIXI.Sprite;

        if (imageUrl) {
          // 从图片URL创建精灵
          const texture = await PIXI.Assets.load(imageUrl);
          sprite = new PIXI.Sprite(texture);
        } else if (svgData) {
          // 从SVG数据创建精灵
          const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
          const url = URL.createObjectURL(svgBlob);
          const texture = await PIXI.Assets.load(url);
          sprite = new PIXI.Sprite(texture);
          URL.revokeObjectURL(url);
        } else {
          // 这里不应该被执行，因为前面已经检查了资源
          throw new Error("未提供图片资源");
        }

        // 设置精灵属性
        sprite.position.set(position.x, position.y);
        sprite.scale.set(scale, scale);
        sprite.tint = state.tint; // 应用颜色

        // 存储精灵引用
        spriteRef.current = sprite;

        // 添加到图层
        imageLayer.addChild(sprite);

        // 更新状态
        setState((prev) => ({
          ...prev,
          isReady: true,
          animationStatus: "idle",
          sprite,
        }));
        enableInteraction();
        console.log("图片图层初始化完成");
      } catch (error) {
        console.error("图片图层初始化失败:", error);
        setState((prev) => ({
          ...prev,
          isReady: false,
          animationStatus: "idle",
          sprite: null,
          error: `图片图层初始化失败: ${error}`,
        }));
      }
    };

    initializeLayer();

    // 清理函数
    return () => {
      if (layerRef.current && layerRef.current.parent) {
        disableInteraction();
        layerRef.current.parent.removeChild(layerRef.current);
      }

      // 清理动画
      if (animationRef.current.tickerId !== null && app) {
        app.ticker.remove(animationRef.current.tickerId);
        animationRef.current.tickerId = null;
      }
    };
  }, [
    app,
    imageUrl,
    svgData,
    scale,
    position.x,
    position.y,
    zIndex,
    createLayer,
  ]);

  // 缓动函数集合
  const defaultEasing = {
    easeInQuad: (t: number): number => t * t,
    easeOutQuad: (t: number): number => t * (2 - t),
    easeInOutQuad: (t: number): number =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    linear: (t: number): number => t,
  };

  /**
   * 执行自定义动画
   * @param params 动画参数
   * @returns Promise 动画完成后的Promise
   */
  const animate = (params: AnimationParams): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (!app || !spriteRef.current) {
        reject(new Error("图层未初始化"));
        return;
      }

      if (
        state.animationStatus === "running" ||
        state.animationStatus === "paused"
      ) {
        console.warn("动画正在进行中，请等待当前动画完成");
        // 直接返回，不作为异常处理
        resolve();
        return;
      }

      // 更新状态
      setState((prev) => ({ ...prev, animationStatus: "running" }));

      const sprite = spriteRef.current;
      const originalPosition = { x: sprite.x, y: sprite.y };
      let targetPosition = { ...originalPosition };

      // 根据动画方向计算目标位置
      if (typeof params.direction === "number") {
        // 如果方向是角度值，使用三角函数计算
        const angleInRadians = (params.direction * Math.PI) / 180;
        targetPosition.x += params.distance * Math.cos(angleInRadians);
        targetPosition.y += params.distance * Math.sin(angleInRadians);
      } else {
        // 兼容原有的字符串方向
        switch (params.direction) {
          case "horizontal":
            targetPosition.x += params.distance;
            break;
          case "vertical":
            targetPosition.y += params.distance;
            break;
          case "diagonal":
            targetPosition.x += params.distance;
            targetPosition.y += params.distance;
            break;
        }
      }

      // 存储动画状态
      animationRef.current = {
        progress: 0,
        originalPosition,
        targetPosition,
        params,
        tickerId: null,
        status: "running",
        direction: params.reverse ? "backward" : "forward",
        loopCount: 0,
      };

      // 使用提供的缓动函数或默认缓动函数
      const easingFunction = params.easing || defaultEasing.easeOutQuad;

      // 创建动画函数
      const animationTicker = (delta: number) => {
        if (!spriteRef.current) return;

        const animation = animationRef.current;
        if (!animation.params) return;

        // 如果动画被暂停，不更新进度
        if (animation.status === "paused") return;

        // 根据方向调整进度
        if (animation.direction === "forward") {
          animation.progress += delta / (60 * animation.params.duration);
        } else {
          animation.progress -= delta / (60 * animation.params.duration);
        }

        // 检查动画是否完成
        if (animation.progress >= 1 || animation.progress <= 0) {
          // 设置精确的终点位置
          if (animation.progress >= 1) {
            spriteRef.current.x = animation.targetPosition.x;
            spriteRef.current.y = animation.targetPosition.y;
            animation.progress = 1;

            // 如果是循环动画
            if (animation.params.loop) {
              animation.direction = "backward";
              animation.loopCount++;
              return; // 继续动画
            }
          } else if (animation.progress <= 0) {
            spriteRef.current.x = animation.originalPosition.x;
            spriteRef.current.y = animation.originalPosition.y;
            animation.progress = 0;

            // 如果是循环动画
            if (animation.params.loop) {
              animation.direction = "forward";
              animation.loopCount++;
              return; // 继续动画
            }
          }

          // 移除动画器
          if (app && animation.tickerId) {
            app.ticker.remove(animation.tickerId);
            animation.tickerId = null;
          }

          // 更新状态
          animation.status = "completed";
          setState((prev) => ({ ...prev, animationStatus: "completed" }));

          // 动画完成，解决 Promise
          resolve();
          return;
        }

        // 使用缓动函数计算当前位置
        const eased = easingFunction(animation.progress);
        spriteRef.current.x =
          animation.originalPosition.x +
          (animation.targetPosition.x - animation.originalPosition.x) * eased;
        spriteRef.current.y =
          animation.originalPosition.y +
          (animation.targetPosition.y - animation.originalPosition.y) * eased;
      };

      // 启动动画
      app.ticker.add(animationTicker);
      animationRef.current.tickerId = animationTicker as any;
    });
  };

  /**
   * 停止动画并重置位置
   */
  const stopAnimation = (): void => {
    if (!app || !spriteRef.current) return;

    const animation = animationRef.current;

    // 如果有活跃的动画，移除它
    if (animation.tickerId) {
      app.ticker.remove(animation.tickerId);
      animation.tickerId = null;
    }

    // 重置精灵位置到原始位置
    if (spriteRef.current && animation.originalPosition) {
      spriteRef.current.x = animation.originalPosition.x;
      spriteRef.current.y = animation.originalPosition.y;
    }

    // 更新状态
    animation.status = "idle";
    animation.progress = 0;
    setState((prev) => ({ ...prev, animationStatus: "idle" }));
  };

  /**
   * 暂停动画
   */
  const pauseAnimation = (): void => {
    if (!app || !spriteRef.current || state.animationStatus !== "running")
      return;

    // 更新状态
    animationRef.current.status = "paused";
    setState((prev) => ({ ...prev, animationStatus: "paused" }));
  };

  /**
   * 恢复动画
   */
  const resumeAnimation = (): void => {
    if (!app || !spriteRef.current || state.animationStatus !== "paused")
      return;

    // 更新状态
    animationRef.current.status = "running";
    setState((prev) => ({ ...prev, animationStatus: "running" }));
  };

  /**
   * 获取当前动画状态
   */
  const getAnimationStatus = (): AnimationStatus => {
    return state.animationStatus;
  };

  // 更新精灵位置
  const updatePosition = (x: number, y: number) => {
    if (spriteRef.current) {
      spriteRef.current.position.set(x, y);
    }
  };

  // 更新精灵比例
  const updateScale = (newScale: number) => {
    if (spriteRef.current) {
      spriteRef.current.scale.set(newScale, newScale);
    }
  };

  // 更新精灵纹理
  const updateTexture = async (newImageUrl: string) => {
    if (spriteRef.current) {
      try {
        const texture = await PIXI.Assets.load(newImageUrl);
        spriteRef.current.texture = texture;
      } catch (error) {
        console.error("更新纹理失败:", error);
      }
    }
  };

  // 获取图层对象
  const getLayer = () => layerRef.current;

  // 获取精灵对象
  const getSprite = () => spriteRef.current;

  // 设置图层颜色
  const setTint = (color: number) => {
    if (!spriteRef.current) return;

    // 更新精灵颜色
    spriteRef.current.tint = color;

    // 更新状态
    setState((prev) => ({
      ...prev,
      tint: color,
    }));
  };

  // 获取当前颜色
  const getTint = () => state.tint;

  // 启用交互
  const enableInteraction = () => {
    if (!spriteRef.current) return;

    // 设置为交互式
    (spriteRef.current as any).interactive = true;
    (spriteRef.current as any).cursor = "pointer";

    // 添加点击事件
    (spriteRef.current as any).on("pointerdown", () => {
      console.log("图片被点击");
      // 使用 ref 调用最新的回调函数
      if (clickCallbackRef.current) {
        clickCallbackRef.current();
      }
    });
  };

  // 禁用交互
  const disableInteraction = () => {
    if (!spriteRef.current) return;

    // 移除交互性
    (spriteRef.current as any).eventMode = "none";

    // 移除所有事件监听器
    (spriteRef.current as any).removeAllListeners("pointerdown");

    // 清除回调引用
    clickCallbackRef.current = null;
  };

  // 返回状态和控制函数
  return [
    state,
    {
      // 动画控制
      animate,
      stopAnimation,
      pauseAnimation,
      resumeAnimation,
      getAnimationStatus,

      // 图层控制
      updatePosition,
      updateScale,
      updateTexture,
      getLayer,
      getSprite,

      // 颜色控制
      setTint,
      getTint,

      // 交互控制
      enableInteraction,
      disableInteraction,
    },
  ];
}
