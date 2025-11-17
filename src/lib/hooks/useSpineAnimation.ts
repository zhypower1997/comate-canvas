import { useEffect, useRef, useState } from "react";
import { Application, Assets, Graphics } from "pixi.js";
import { Spine } from "pixi-spine";

// Spine动画配置接口
interface UseSpineAnimationProps {
  spineJsonPath: string; // Spine JSON文件路径
  initialPosition?: { x: number; y: number }; // 初始位置
  initialScale?: number; // 初始缩放
  backgroundColor?: number; // 背景颜色
  canvasWidth?: number; // 画布宽度
  canvasHeight?: number; // 画布高度
}

// 骨骼点击事件处理器接口
export interface BoneClickHandler {
  (boneName: string, spine: Spine): void;
}

// 骨骼过滤器接口
export interface BoneFilter {
  (bone: any): boolean;
}

// Spine动画状态接口
interface SpineAnimationState {
  loading: boolean;
  currentAnimation: string;
}

/**
 * Spine动画通用Hook
 * 只负责初始化和基本事件监听，不包含具体业务逻辑
 */
export const useSpineAnimation = ({
  spineJsonPath,
  initialPosition = { x: 50, y: 310 },
  initialScale = 0.3,
  backgroundColor = 0x000000,
  canvasWidth = 400,
  canvasHeight = 300,
}: UseSpineAnimationProps) => {
  // 引用
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spineRef = useRef<Spine | null>(null);

  // 状态
  const [state, setState] = useState<SpineAnimationState>({
    loading: true,
    currentAnimation: "",
  });

  /**
   * 播放指定动画
   * @param animationName 动画名称
   * @param loop 是否循环播放
   */
  const playAnimation = (animationName: string, loop: boolean = true) => {
    if (spineRef.current) {
      const spine = spineRef.current;
      if (spine.state.hasAnimation(animationName)) {
        spine.state.clearTracks();
        spine.state.setAnimation(0, animationName, loop);
        setState((prev) => ({
          ...prev,
          currentAnimation: animationName,
        }));
      } else {
        console.warn(`动画 "${animationName}" 不存在`);
      }
    }
  };

  /**
   * 添加动画到队列
   * @param animationName 动画名称
   * @param loop 是否循环播放
   * @param delay 延迟时间
   */
  const addAnimation = (
    animationName: string,
    loop: boolean = true,
    delay: number = 0
  ) => {
    if (spineRef.current) {
      const spine = spineRef.current;
      if (spine.state.hasAnimation(animationName)) {
        spine.state.addAnimation(0, animationName, loop, delay);
      } else {
        console.warn(`动画 "${animationName}" 不存在`);
      }
    }
  };

  /**
   * 播放动画序列
   * @param animations 动画序列配置
   */
  const playAnimationSequence = (
    animations: { name: string; loop: boolean }[]
  ) => {
    if (!spineRef.current || animations.length === 0) return;

    const spine = spineRef.current;
    spine.state.clearTracks();

    // 检查动画是否存在并播放第一个
    const firstAnim = animations[0];
    if (spine.state.hasAnimation(firstAnim.name)) {
      spine.state.setAnimation(0, firstAnim.name, firstAnim.loop);

      // 添加后续动画
      for (let i = 1; i < animations.length; i++) {
        const anim = animations[i];
        if (spine.state.hasAnimation(anim.name)) {
          spine.state.addAnimation(0, anim.name, anim.loop, 0);
        }
      }

      setState((prev) => ({
        ...prev,
        currentAnimation: "sequence",
      }));
    }
  };

  /**
   * 为指定骨骼添加点击事件
   * @param boneFilter 骨骼过滤函数
   * @param clickHandler 点击处理函数
   * @param hitAreaSize 点击区域大小
   */
  const addClickEventsToBones = (
    boneFilter: BoneFilter,
    clickHandler: BoneClickHandler,
    hitAreaSize: { width: number; height: number } = { width: 20, height: 20 }
  ) => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;
    console.log("添加点击事件", spine, app);
    // 过滤符合条件的骨骼
    const filteredBones = spine.skeleton.bones.filter(boneFilter);

    console.log(
      "找到的骨骼:",
      filteredBones.map((bone) => bone.data.name)
    );

    // 为每个骨骼创建点击区域
    filteredBones.forEach((bone) => {
      const boneName = bone.data.name;

      // 创建点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xffffff, 0.01); // 几乎透明
      clickArea.drawRect(
        -hitAreaSize.width / 2,
        -hitAreaSize.height / 2,
        hitAreaSize.width,
        hitAreaSize.height
      );
      clickArea.endFill();

      // 获取骨骼世界坐标 - 修正坐标计算
      // 注意：骨骼的worldX/worldY已经考虑了spine的缩放
      let boneWorldX = (bone as any).worldX * spine.scale.x + spine.x;
      let boneWorldY = (bone as any).worldY * spine.scale.y + spine.y;

      clickArea.x = boneWorldX;
      clickArea.y = boneWorldY;

      // 添加交互属性
           (clickArea as any).interactive = true;
      (clickArea as any).buttonMode = true; (clickArea as any).cursor = "pointer";


      // 添加点击事件
      clickArea.on("pointerdown", (event) => {
        const localPoint = event.data.getLocalPosition(clickArea);
        const hitAreaWidth = hitAreaSize.width;
        const hitAreaHeight = hitAreaSize.height;

        // 检查是否命中元素 (相对于点击区域中心)
        const isHit =
          localPoint.x >= -hitAreaWidth / 2 &&
          localPoint.x <= hitAreaWidth / 2 &&
          localPoint.y >= -hitAreaHeight / 2 &&
          localPoint.y <= hitAreaHeight / 2;

        console.log(`点击事件 - 骨骼: ${boneName}`);
        console.log(
          `点击坐标 (相对于点击区域): x=${localPoint.x.toFixed(
            2
          )}, y=${localPoint.y.toFixed(2)}`
        );
        console.log(`点击区域大小: ${hitAreaWidth}x${hitAreaHeight}`);
        console.log(`是否命中: ${isHit ? "是" : "否"}`);

        // 只有命中时才触发回调
        if (isHit) {
          clickHandler(boneName, spine);
        }
      });

      // 添加悬停效果
      clickArea.on("pointerover", () => {
        console.log(`悬停在 ${boneName} 上`);
      });

      // 将点击区域添加到舞台
      app.stage.addChild(clickArea);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          // 修正坐标计算方式
          let currentWorldX =
            (currentBone as any).worldX * spine.scale.x + spine.x;
          let currentWorldY =
            (currentBone as any).worldY * spine.scale.y + spine.y;

          clickArea.x = currentWorldX;
          clickArea.y = currentWorldY;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  /**
   * 获取所有可用的动画名称
   */
  const getAvailableAnimations = (): string[] => {
    if (!spineRef.current) return [];

    return spineRef.current.state.data.skeletonData.animations.map(
      (anim) => anim.name
    );
  };

  /**
   * 获取Spine实例
   */
  const getSpineInstance = (): Spine | null => {
    return spineRef.current;
  };

  /**
   * 获取PIXI应用实例
   */
  const getAppInstance = (): Application | null => {
    return appRef.current;
  };

  /**
   * 加载Spine动画
   */
  const loadSpineAnimation = async () => {
    if (!canvasRef.current) return;

    try {
      setState((prev) => ({ ...prev, loading: true }));

      // 创建PIXI应用
      const app = new Application({
        width: canvasWidth,
        height: canvasHeight,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        backgroundAlpha: 0,
      });
      console.log(app.renderer.plugins, "plugins");
      const interaction = app.renderer.plugins.interaction;
      interaction.autoPreventDefault = false;

      console.log(app.renderer.plugins.interaction);
      canvasRef.current.appendChild(app.view as any);
      appRef.current = app;

      // 加载Spine资源
      const resource = await new Promise((resolve, reject) => {
        Assets.load(spineJsonPath).then((resource) => {
          resolve(resource);
        });
      });

      // 创建Spine实例
      const spine = new Spine((resource as any).spineData);
      spineRef.current = spine;

      // 设置位置和缩放
      spine.x = initialPosition.x;
      spine.y = initialPosition.y;
      spine.scale.set(initialScale);

      // 添加到舞台
      app.stage.addChild(spine);

      setState((prev) => ({ ...prev, loading: false }));

      return spine;
    } catch (error) {
      console.error("加载Spine动画时出错:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return null;
    }
  };

  // 初始化
  useEffect(() => {
    loadSpineAnimation();

    return () => {
      // 清理PIXI应用
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      spineRef.current = null;
    };
  }, [spineJsonPath]); // 当spineJsonPath变化时重新加载

  return {
    canvasRef,
    loading: state.loading,
    currentAnimation: state.currentAnimation,
    playAnimation,
    addAnimation,
    playAnimationSequence,
    addClickEventsToBones,
    getAvailableAnimations,
    getSpineInstance,
    getAppInstance,
  };
};
