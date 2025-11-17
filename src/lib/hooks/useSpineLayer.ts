import { useState, useRef, useEffect } from "react";
import * as PIXI from "pixi.js";
import * as spine from "pixi-spine";

// 骨骼点击事件配置接口
export interface BoneClickConfig {
  filter: BoneFilter; // 骨骼过滤器
  handler: BoneClickHandler; // 点击处理器
  hitAreaSize?: { width: number; height: number }; // 自定义点击区域大小
}

// 显示配置
interface DisplayConfig {
  zIndex?: number;
  position?: { x: number; y: number };
  scale?: number;
}

// 动画配置
interface AnimationConfig {
  autoPlay?: boolean;
  initialAnimation?: string; // 初始动画名称
  initialAnimationLoop?: boolean; // 初始动画是否循环，默认 true
  initialAnimationTrack?: number; // 初始动画轨道索引，默认 0
  initialAnimationTime?: number; // 初始动画时间位置（秒），直接设置到指定秒数
}

// 交互配置
interface InteractionConfig {
  hitAreaSize?: { width: number; height: number }; // 点击区域大小
  boneClickConfigs?: BoneClickConfig[]; // 骨骼点击事件配置数组
}

// 初始化配置
interface InitializationConfig {
  slotInitializers?: SlotInitializer[]; // slot 初始化配置数组
}

interface SpineLayerOptions {
  display?: DisplayConfig;
  animation?: AnimationConfig;
  interaction?: InteractionConfig;
  initialization?: InitializationConfig;
}

// slot 初始化配置接口
interface SlotInitializer {
  slotName: string;
  property: string; // 要设置的属性名，如 'color', 'attachment' 等
  value: any; // 属性值
}

interface SpineLayerState {
  isLoaded: boolean;
  isPlaying: boolean;
  bounds: { x: number; y: number; width: number; height: number } | null;
}

// 骨骼过滤器接口
export interface BoneFilter {
  (bone: any): boolean;
}

// Slot 信息接口
export interface SlotInfo {
  name: string;                   // slot 名称
  slot: any;                     // 原始 slot 对象
  attachment: string | null;      // 当前 attachment 名称
  color: { r: number; g: number; b: number; a: number }; // 颜色值
}

// 骨骼信息接口
export interface BoneInfo {
  name: string;                    // 骨骼名称
  bone: any;                      // 原始骨骼对象
  worldPosition: { x: number; y: number }; // 世界坐标
  localPosition: { x: number; y: number }; // 本地坐标
  rotation: number;               // 旋转角度
  scale: { x: number; y: number }; // 缩放
  parent: string | null;          // 父骨骼名称
  children: string[];             // 子骨骼名称列表
  slots: SlotInfo[];              // 关联的 slots 信息
}

// 骨骼点击事件处理器接口
export interface BoneClickHandler {
  (boneInfo: BoneInfo, spine: spine.Spine, event?: any): void;
}

interface SpineLayerControls {
  playAnimation: (animationName: string, loop?: boolean, trackIndex?: number) => void; // 播放指定动画
  stopAnimation: (trackIndex?: number) => void; // 停止动画
  getAvailableAnimations: () => string[]; // 获取可用动画列表
  getCurrentAnimation: (trackIndex?: number) => string | null; // 获取当前播放的动画名称
  setPosition: (x: number, y: number) => void;
  setScale: (scale: number) => void;
  isPointInBounds: (x: number, y: number) => boolean;
  enableInteraction: () => void;
  disableInteraction: () => void;
  addClickEventsToBones: (
    boneFilter: BoneFilter,
    clickHandler: BoneClickHandler,
    hitAreaSize?: { width: number; height: number }
  ) => void; // 为骨骼添加点击事件
  getSpineInstance: () => spine.Spine | null; // 获取Spine实例
  // Slot 控制方法
  getSlot: (slotName: string) => any | null; // 获取指定 slot 对象
  setSlotProperty: (slotName: string, property: string, value: any) => void; // 设置 slot 属性
  getSlotProperty: (slotName: string, property: string) => any; // 获取 slot 属性
}

/**
 * Hook for managing a Spine animation layer in a PIXI application
 */
export function useSpineLayer(
  app: PIXI.Application | null,
  spineAssetPath: string,
  createLayer: (zIndex: number) => PIXI.Container,
  options: SpineLayerOptions = {}
): [SpineLayerState, SpineLayerControls] {
  // 解构分组配置，提供默认值
  const {
    display = {},
    animation = {},
    interaction = {},
    initialization = {},
  } = options;

  // 解构各组配置项
  const {
    zIndex = 2,
    position: initialPosition = { x: 100, y: 600 },
    scale: initialScale = 0.5,
  } = display;

  const {
    autoPlay = false,
    initialAnimation, // 初始动画名称，可选
    initialAnimationLoop = true, // 初始动画是否循环，默认 true
    initialAnimationTrack = 0, // 初始动画轨道索引，默认 0
    initialAnimationTime, // 初始动画时间位置（秒），可选
  } = animation;

  const {
    hitAreaSize = { width: 20, height: 20 }, // 默认点击区域大小为20x20
    boneClickConfigs = [], // 默认为空数组
  } = interaction;

  const {
    slotInitializers = [], // 默认为空数组
  } = initialization;

  // 状态引用
  const stateRef = useRef<SpineLayerState>({
    isLoaded: false,
    isPlaying: false,
    bounds: null,
  });

  // 辅助函数更新状态
  const updateState = (updater: (prev: SpineLayerState) => Partial<SpineLayerState>) => {
    stateRef.current = { ...stateRef.current, ...updater(stateRef.current) };
    // 如果需要触发重新渲染，可以在这里添加 forceUpdate 逻辑
    return stateRef.current;
  };

  // 引用
  const layerRef = useRef<PIXI.Container | null>(null);
  const animationRef = useRef<spine.Spine | null>(null);

  // 启用图层交互
  const enableInteraction = () => {
    if (!layerRef.current || !animationRef.current) return;

    const spineLayer = layerRef.current;

    console.log("启用Spine子图层交互，禁用图层交互");

    // 设置为交互式
    (spineLayer as any).interactive = false;
    (spineLayer as any).interactiveChildren = true;
    (spineLayer as any).buttonMode = true; // 确保鼠标样式变为指针
  };

  // 禁用图层交互
  const disableInteraction = () => {
    if (!layerRef.current) return;

    const spineLayer = layerRef.current;

    // 移除交互性
    (spineLayer as any).interactive = false;
    (spineLayer as any).interactiveChildren = false;
    (spineLayer as any).buttonMode = false;

    // 移除所有事件监听器
    (spineLayer as any).removeAllListeners("pointerdown");
    (spineLayer as any).removeAllListeners("pointermove");
    (spineLayer as any).removeAllListeners("pointerover");
    (spineLayer as any).removeAllListeners("pointerout");

    console.log("禁用Spine图层交互");
  };

  // 加载Spine动画
  useEffect(() => {
    if (!app || layerRef.current) return;

    // 创建Spine动画图层
    const spineLayer = createLayer(zIndex);
    layerRef.current = spineLayer;

    // 加载Spine动画资源
    PIXI.Assets.load(spineAssetPath)
      .then((resource) => {
        try {
          // 创建Spine动画实例
          const spineData = resource.spineData;
          if (!spineData) {
            console.error("无法获取Spine数据");
            return;
          }

          const animation = new spine.Spine(spineData);
          animationRef.current = animation;

          // 设置动画位置和缩放
          animation.position.set(initialPosition.x, initialPosition.y);
          animation.scale.set(initialScale);

          // 添加到Spine图层
          spineLayer.addChild(animation as unknown as PIXI.DisplayObject);

          // 计算并保存边界框
          let newBounds = null;
          try {
            // 确保animation已经准备好进行边界计算
            if (animation && animation.parent) {
              const bounds = animation.getBounds();
              newBounds = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
              };
            } else {
              console.log("Spine动画尚未准备好进行边界计算");
            }
          } catch (error) {
            console.error("Spine边界计算错误:", error);
          }

          // 如果设置了自动播放，则播放动画
          if (autoPlay) {
            // 播放第一个可用动画
            const animations = animation.state.data.skeletonData.animations;
            if (animations.length > 0) {
              const firstAnimation = animations[0].name;
              animation.state.setAnimation(0, firstAnimation, true);
              console.log(`自动播放动画: ${firstAnimation}`);
            }
          }

          updateState((prev: SpineLayerState) => ({
            ...prev,
            isLoaded: true,
            isPlaying: autoPlay,
            bounds: newBounds,
          }));

          console.log("Spine动画已加载");

          // 启用交互
          enableInteraction();

          // 自动初始化骨骼点击事件
          if (boneClickConfigs.length > 0) {
            console.log("自动初始化骨骼点击事件，配置数量:", boneClickConfigs.length);
            boneClickConfigs.forEach((config, index) => {
              console.log(`初始化第${index + 1}个骨骼点击事件配置`);
              addClickEventsToBones(config.filter, config.handler, config.hitAreaSize);
            });
          }

          // 自动应用 slot 初始化配置
          if (slotInitializers.length > 0) {
            console.log("应用 slot 初始化配置，数量:", slotInitializers.length);
            // 延迟一帧确保 Spine 完全初始化
            setTimeout(() => {
              slotInitializers.forEach((initializer) => {
                const slot = animationRef.current?.skeleton.findSlot(initializer.slotName);
                if (slot) {
                  slot.color.r = ((initializer.value >> 16) & 0xFF) / 255;
                  slot.color.g = ((initializer.value >> 8) & 0xFF) / 255;
                  slot.color.b = (initializer.value & 0xFF) / 255;
                  slot.color.a = 1;
                }
              });
            }, 0);
          }

          // 设置初始动画状态
          if (initialAnimation) {
            console.log(`设置初始动画: ${initialAnimation}, 循环: ${initialAnimationLoop}, 轨道: ${initialAnimationTrack}`);

            try {
              // 设置动画
              const trackEntry = animationRef.current.state.setAnimation(initialAnimationTrack, initialAnimation, initialAnimationLoop);

              // 如果指定了动画时间，立即暂停并定位到特定帧
              if (initialAnimationTime !== undefined) {
                // 立即暂停动画播放，避免闪烁
                trackEntry.timeScale = 0;

                // 设置时间位置
                trackEntry.trackTime = initialAnimationTime;
                console.log(`设置动画时间位置: ${initialAnimationTime}秒`);

                // 立即更新骨架状态以显示正确的帧
                animationRef.current.state.update(0);
                animationRef.current.state.apply(animationRef.current.skeleton);
                animationRef.current.skeleton.updateWorldTransform();

                updateState((prev: SpineLayerState) => ({
                  ...prev,
                  isPlaying: false,
                }));
                console.log(`动画定位到指定帧，已暂停`);
              } else {
                updateState((prev: SpineLayerState) => ({
                  ...prev,
                  isPlaying: true,
                }));
              }

              console.log(`成功设置初始动画: ${initialAnimation}`);
            } catch (error) {
              console.error(`设置初始动画 "${initialAnimation}" 失败:`, error);
            }
          }
        } catch (error) {
          console.error("加载Spine动画时出错:", error);
        }
      })
      .catch((error) => {
        console.error("无法加载Spine动画资源:", error);
      });
    console.log("Spine图层加载完毕");
    // 清理函数
    return () => {
      disableInteraction();
      if (layerRef.current && layerRef.current.parent) {
        layerRef.current.parent.removeChild(layerRef.current);
      }
    };
  }, [app]);



  // 设置位置
  const setPosition = (x: number, y: number) => {
    if (!animationRef.current) return;

    animationRef.current.position.set(x, y);

    // 更新边界框
    if (animationRef.current) {
      const bounds = animationRef.current.getBounds();
      updateState((prev: SpineLayerState) => ({
        ...prev,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      }));
    }
  };

  // 设置缩放
  const setScale = (scale: number) => {
    if (!animationRef.current) return;

    animationRef.current.scale.set(scale);

    // 更新边界框
    if (animationRef.current) {
      const bounds = animationRef.current.getBounds();
      updateState((prev: SpineLayerState) => ({
        ...prev,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      }));
    }
  };

  // 检查点是否在边界框内
  const isPointInBounds = (x: number, y: number): boolean => {
    console.log(stateRef.current.bounds, 'state.bounds');
    if (!stateRef.current.bounds) return false;

    const { x: bx, y: by, width, height } = stateRef.current.bounds;
    return x >= bx && x <= bx + width && y >= by && y <= by + height;
  };

  // 构建骨骼信息对象
  const buildBoneInfo = (bone: any, spine: spine.Spine): BoneInfo => {
    // 获取世界坐标
    const worldX = (bone.worldX || 0) * spine.scale.x + spine.x;
    const worldY = (bone.worldY || 0) * spine.scale.y + spine.y;

    // 获取本地坐标
    const localX = bone.x || 0;
    const localY = bone.y || 0;

    // 获取父骨骼名称
    const parentName = bone.parent ? bone.parent.data.name : null;

    // 获取子骨骼名称列表
    const childrenNames = bone.children ? bone.children.map((child: any) => child.data.name) : [];

    // 查找关联的 slots
    const associatedSlots: SlotInfo[] = [];
    if (spine.skeleton && spine.skeleton.slots) {
      spine.skeleton.slots.forEach((slot: any) => {
        // 检查 slot 是否绑定到当前骨骼
        if (slot.bone && slot.bone.data.name === bone.data.name) {
          const slotInfo: SlotInfo = {
            name: slot.data.name,
            slot: slot,
            attachment: slot.attachment ? slot.attachment.name : null,
            color: {
              r: slot.color.r,
              g: slot.color.g,
              b: slot.color.b,
              a: slot.color.a
            }
          };
          associatedSlots.push(slotInfo);
        }
      });
    }

    return {
      name: bone.data.name,
      bone: bone,
      worldPosition: { x: worldX, y: worldY },
      localPosition: { x: localX, y: localY },
      rotation: bone.rotation || 0,
      scale: { x: bone.scaleX || 1, y: bone.scaleY || 1 },
      parent: parentName,
      children: childrenNames,
      slots: associatedSlots
    };
  };

  // 为骨骼添加点击事件
  const addClickEventsToBones = (
    boneFilter: BoneFilter,
    clickHandler: BoneClickHandler,
    customHitAreaSize?: { width: number; height: number }
  ) => {
    if (!animationRef.current || !app) return;

    const spine = animationRef.current;
    console.log("添加骨骼点击事件", spine);

    // 使用自定义点击区域大小或默认值
    const boneHitAreaSize = customHitAreaSize || hitAreaSize;

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
      const clickArea = new PIXI.Graphics();
      clickArea.beginFill(0xffffff, 0.000001); // 几乎透明
      clickArea.drawRect(
        -boneHitAreaSize.width / 2,
        -boneHitAreaSize.height / 2,
        boneHitAreaSize.width,
        boneHitAreaSize.height
      );
      clickArea.endFill();

      // 获取骨骼世界坐标
      let boneWorldX = (bone as any).worldX * spine.scale.x + spine.x;
      let boneWorldY = (bone as any).worldY * spine.scale.y + spine.y;

      clickArea.x = boneWorldX;
      clickArea.y = boneWorldY;

      // 设置为交互式
           (clickArea as any).interactive = true;
      (clickArea as any).buttonMode = true; (clickArea as any).cursor = "pointer";


      // 添加点击事件
      (clickArea as any).on("pointerdown", (event: any) => {
        console.log(`点击了骨骼: ${boneName}`);

        // 构建骨骼信息对象
        const boneInfo = buildBoneInfo(bone, spine);
        clickHandler(boneInfo, spine, event);

        // 阻止事件冒泡
        event.stopPropagation();
      });

      // 添加悬停效果
      (clickArea as any).on("pointerover", () => {
        console.log(`悬停在骨骼 ${boneName} 上`);
        document.body.style.cursor = "pointer";
      });

      (clickArea as any).on("pointerout", () => {
        document.body.style.cursor = "default";
      });

      // 将点击区域添加到舞台
      if (layerRef.current) {
        layerRef.current.addChild(clickArea);
      }

      // 在动画更新时同步位置
      const updatePosition = () => {
        if (!animationRef.current) return;

        const currentBone = animationRef.current.skeleton.findBone(boneName);
        if (currentBone) {
          // 修正坐标计算方式
          let currentWorldX =
            (currentBone as any).worldX * animationRef.current.scale.x +
            animationRef.current.x;
          let currentWorldY =
            (currentBone as any).worldY * animationRef.current.scale.y +
            animationRef.current.y;

          clickArea.x = currentWorldX;
          clickArea.y = currentWorldY;
        }
      };

      // 监听动画更新，同步位置
      if (app) {
        app.ticker.add(updatePosition);
      }
    });
  };

  // 获取Spine实例
  const getSpineInstance = (): spine.Spine | null => {
    return animationRef.current;
  };

  // 播放指定动画（异步）
  const playAnimation = (animationName: string, loop: boolean = true, trackIndex: number = 0): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!animationRef.current) {
        console.warn("Spine实例未加载，无法播放动画");
        reject(new Error("Spine实例未加载"));
        return;
      }

      try {
        // 检查动画是否存在
        const availableAnimations = getAvailableAnimations();
        if (!availableAnimations.includes(animationName)) {
          console.warn(`动画 "${animationName}" 不存在。可用动画:`, availableAnimations);
          reject(new Error(`动画 "${animationName}" 不存在`));
          return;
        }

        // 播放指定动画
        const trackEntry = animationRef.current.state.setAnimation(trackIndex, animationName, loop);
        updateState((prev: SpineLayerState) => ({
          ...prev,
          isPlaying: true,
        }));

        console.log(`播放动画: ${animationName}, 循环: ${loop}, 轨道: ${trackIndex}`);

        // 如果是循环动画，立即 resolve（因为永远不会结束）
        if (loop) {
          resolve();
          return;
        }

        // 监听动画完成事件
        const onComplete = () => {
          console.log(`动画 "${animationName}" 播放完成`);
          updateState((prev: SpineLayerState) => ({
            ...prev,
            isPlaying: false,
          }));
          resolve();
        };

        const onInterrupt = () => {
          console.log(`动画 "${animationName}" 被中断`);
          resolve();
        };

        // 添加事件监听器
        trackEntry.listener = {
          complete: onComplete,
          interrupt: onInterrupt,
        };

      } catch (error) {
        console.error("播放动画时出错:", error);
        reject(error);
      }
    });
  };

  // 停止动画
  const stopAnimation = (trackIndex: number = 0) => {
    if (!animationRef.current) {
      console.warn("Spine实例未加载，无法停止动画");
      return;
    }

    try {
      if (trackIndex === undefined) {
        // 停止所有轨道的动画
        animationRef.current.state.clearTracks();
        console.log("停止所有动画");
      } else {
        // 停止指定轨道的动画
        animationRef.current.state.clearTrack(trackIndex);
        console.log(`停止轨道 ${trackIndex} 的动画`);
      }

      updateState((prev: SpineLayerState) => ({
        ...prev,
        isPlaying: false,
      }));
    } catch (error) {
      console.error("停止动画时出错:", error);
    }
  };

  // 获取可用动画列表
  const getAvailableAnimations = (): string[] => {
    if (!animationRef.current) {
      return [];
    }

    try {
      const animations = animationRef.current.state.data.skeletonData.animations;
      return animations.map((animation: any) => animation.name);
    } catch (error) {
      console.error("获取动画列表时出错:", error);
      return [];
    }
  };

  // 获取当前播放的动画名称
  const getCurrentAnimation = (trackIndex: number = 0): string | null => {
    if (!animationRef.current) {
      return null;
    }

    try {
      // 使用 tracks 数组来获取当前播放的动画
      const tracks = (animationRef.current.state as any).tracks;
      if (tracks && tracks.length > 0 && tracks[trackIndex]) {
        return tracks[trackIndex].animation ? tracks[trackIndex].animation.name : null;
      }
      return null;
    } catch (error) {
      console.error("获取当前动画时出错:", error);
      return null;
    }
  };

  // 获取指定 slot 对象
  const getSlot = (slotName: string): any | null => {
    if (!animationRef.current || !animationRef.current.skeleton) {
      console.warn("Spine实例未加载，无法获取slot");
      return null;
    }

    try {
      const slot = animationRef.current.skeleton.findSlot(slotName);
      if (!slot) {
        console.warn(`未找到名为 "${slotName}" 的slot`);
        return null;
      }
      return slot;
    } catch (error) {
      console.error(`获取slot "${slotName}" 时出错:`, error);
      return null;
    }
  };

  // 设置 slot 属性
  const setSlotProperty = (slotName: string, property: string, value: any): void => {
    const slot = getSlot(slotName);
    if (!slot) return;

    try {
      if (property === 'color') {
        // 特殊处理颜色属性
        if (typeof value === 'number') {
          // 十六进制颜色值转换为 RGBA
          slot.color.r = ((value >> 16) & 0xFF) / 255;
          slot.color.g = ((value >> 8) & 0xFF) / 255;
          slot.color.b = (value & 0xFF) / 255;
          slot.color.a = 1;
        } else if (typeof value === 'object' && value.r !== undefined) {
          // RGBA 对象
          slot.color.r = value.r;
          slot.color.g = value.g;
          slot.color.b = value.b;
          slot.color.a = value.a !== undefined ? value.a : 1;
        }
        console.log(`设置slot "${slotName}" 的颜色属性`);
      } else if (property === 'size') {
        // 特殊处理 attachment 属性
        slot.bone.scaleX = value;
        slot.bone.scaleY = value;
        console.log(`设置slot "${slotName}" 的 attachment 属性`);
      } else {
        // 设置其他属性
        if (slot[property] !== undefined) {
          slot[property] = value;
          console.log(`设置slot "${slotName}" 的 "${property}" 属性为:`, value);
        } else {
          console.warn(`slot "${slotName}" 没有 "${property}" 属性`);
        }
      }
    } catch (error) {
      console.error(`设置slot "${slotName}" 的 "${property}" 属性时出错:`, error);
    }
  };

  // 获取 slot 属性
  const getSlotProperty = (slotName: string, property: string): any => {
    const slot = getSlot(slotName);
    if (!slot) return null;
    try {
      if (property === 'color') {
        // 特殊处理颜色属性，返回十六进制值
        const r = Math.round(slot.color.r * 255);
        const g = Math.round(slot.color.g * 255);
        const b = Math.round(slot.color.b * 255);
        return (r << 16) | (g << 8) | b;
      } else if (property === 'size') {
        return slot.bone.scaleX;
      }
      else {
        return slot[property];
      }
    } catch (error) {
      console.error(`获取slot "${slotName}" 的 "${property}" 属性时出错:`, error);
      return null;
    }
  };


  // 返回状态和控制函数
  return [
    stateRef.current,
    {
      playAnimation,
      stopAnimation,
      getAvailableAnimations,
      getCurrentAnimation,
      setPosition,
      setScale,
      isPointInBounds,

      enableInteraction,
      disableInteraction,
      addClickEventsToBones,
      getSpineInstance,

      // Slot 控制方法
      getSlot,
      setSlotProperty,
      getSlotProperty,
    },
  ];
}
