"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Application, Assets, Graphics, Container, Text } from "pixi.js";
import { Spine, SpineDebugRenderer, Color } from "pixi-spine";
import { useRouter } from 'next/navigation';

export default function PainterPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentAnimation, setCurrentAnimation] = useState<string>("");
  const [currentColor, setCurrentColor] = useState<number>(0xffffff); // 当前颜色
  const [clickedBones, setClickedBones] = useState<string[]>([]); // 记录被点击的bones

  // 定义颜色数组
  const colors = [
    0xfc6865, // 红色
    0xfcad65, // 绿色
    0xffeb00, // 蓝色
    0xc0fc65, // 黄色
    0x65fcb0, // 紫色
    0x65cefc, // 青色
    0x656afc, // 橙色
    0xfc65bc, // 紫色
  ];
  let colorIndex = 0;

  // 处理bone点击事件
  const handleBoneClick = (boneName: string) => {
    console.log(`点击了bone: ${boneName}`);

    // 更新被点击的bones列表
    setClickedBones((prev) => {
      if (prev.includes(boneName)) {
        return prev.filter((name) => name !== boneName);
      } else {
        return [...prev, boneName];
      }
    });

    // 改变颜色
    if (spineRef.current) {
      const spine = spineRef.current;
      const bone = spine.skeleton.findBone(boneName);
      if (bone) {
        // 这里可以添加颜色变化的逻辑
        // 例如改变bone的tint或者其他属性
        console.log(`找到bone: ${boneName}，可以在这里添加颜色变化逻辑`);
        setCurrentColor(colors[colorIndex]);
        colorIndex = (colorIndex + 1) % colors.length;
        // 设置slot中attachement的颜色
        const slot = spine.skeleton.findSlot(boneName.split("_")[1]);
        if (slot) {
          // 转化color为number
          const newColor = colors[colorIndex];
          slot.color.r = ((newColor >> 16) & 0xff) / 255;
          slot.color.g = ((newColor >> 8) & 0xff) / 255;
          slot.color.b = (newColor & 0xff) / 255;
          slot.color.a = 1;
        }
      }
    }
  };

  // 为bone开头的bones添加点击事件
  const addClickEventsToBoneBones = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"bone"开头的
    const boneBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().startsWith("bone")
    );

    // 遍历所有bones，找到以"close"开头的
    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().startsWith("close")
    );

    console.log(
      "找到的bone bones:",
      boneBones.map((bone) => bone.data.name)
    );
    console.log(
      "找到的close bones:",
      closeBones.map((bone) => bone.data.name)
    );
    console.log("Spine位置:", {
      x: spine.x,
      y: spine.y,
      scale: { x: spine.scale.x, y: spine.scale.y },
    });

    // 为每个bone bone创建一个点击区域
    boneBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xffffff, 0.01); // 几乎透明
      clickArea.drawRect(-30, -30, 20, 20); // 点击区域大小
      clickArea.endFill();

      // 获取bone的实际世界坐标
      // 使用spine的变换矩阵来计算bone的世界位置
      // 尝试使用更精确的坐标计算方法
      let boneWorldX = spine.x + (bone as any).worldX;
      let boneWorldY = spine.y + (bone as any).worldY;

      // 应用spine的缩放
      boneWorldX *= spine.scale.x;
      boneWorldY *= spine.scale.y;

      clickArea.x = boneWorldX;
      clickArea.y = boneWorldY;

      // 添加交互属性
      (clickArea as any).interactive = true;
      (clickArea as any).cursor = "pointer";


      // 添加点击事件
      clickArea.on("pointerdown", () => handleBoneClick(boneName));

      // 添加悬停效果
      clickArea.on("pointerover", () => {
        clickArea.alpha = 0.01;
        console.log(`悬停在 ${boneName} 上`);
      });

      clickArea.on("pointerout", () => {
        clickArea.alpha = 0.01;
      });

      // 将点击区域添加到舞台
      app.stage.addChild(clickArea);

      // 添加标签显示bone名称
      const label = new Text(boneName, {
        fontSize: 12,
        fill: 0x000000,
        align: "center",
      });
      label.x = clickArea.x - label.width / 2;
      label.y = clickArea.y + 40;
      // app.stage.addChild(label);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          let currentWorldX = spine.x + (currentBone as any).worldX;
          let currentWorldY = spine.y + (currentBone as any).worldY;
          // 应用spine的缩放
          currentWorldX *= spine.scale.x;
          currentWorldY *= spine.scale.y;

          clickArea.x =
            (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y =
            (currentBone as any).worldY * spine.scale.y + spine.y + 20;
          label.x = currentWorldX - label.width / 2;
          label.y = currentWorldY + 40;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });

    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-30, -30, 20, 20); // 点击区域大小
      clickArea.endFill();

      // 获取bone的实际世界坐标
      let boneWorldX = spine.x + (bone as any).worldX;
      let boneWorldY = spine.y + (bone as any).worldY;

      // 应用spine的缩放
      boneWorldX *= spine.scale.x;
      boneWorldY *= spine.scale.y;

      clickArea.x = boneWorldX;
      clickArea.y = boneWorldY;

      // 添加交互属性
      (clickArea as any).interactive = true;
      (clickArea as any).cursor = "pointer";


      // 添加点击事件 - 播放结束动画
      clickArea.on("pointerdown", () => {
        console.log(`点击了close bone: ${boneName}，播放结束动画`);
        playAnimation("end");
      });

      // 添加悬停效果
      clickArea.on("pointerover", () => {
        clickArea.alpha = 0.3;
        console.log(`悬停在 ${boneName} 上`);
      });

      clickArea.on("pointerout", () => {
        clickArea.alpha = 0.01;
      });

      // 将点击区域添加到舞台
      app.stage.addChild(clickArea);

      // 添加标签显示bone名称
      const label = new Text(boneName, {
        fontSize: 12,
        fill: 0xff0000, // 红色标签，区分于bone bones
        align: "center",
      });
      label.x = clickArea.x - label.width / 2;
      label.y = clickArea.y + 40;
      // app.stage.addChild(label);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          let currentWorldX = spine.x + (currentBone as any).worldX;
          let currentWorldY = spine.y + (currentBone as any).worldY;

          // 应用spine的缩放
          currentWorldX *= spine.scale.x;
          currentWorldY *= spine.scale.y;

          // clickArea.x = currentWorldX + 60;
          // clickArea.y = currentWorldY + 240;

          clickArea.x =
            (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y =
            (currentBone as any).worldY * spine.scale.y + spine.y + 20;

          label.x = currentWorldX - label.width / 2;
          label.y = currentWorldY + 40;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  // 为btn1添加悬浮事件
  const addBtn1HoverEvents = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 查找btn1相关的bone
    const btn1Bones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().includes("btn1")
    );

    console.log(
      "找到的btn1 bones:",
      btn1Bones.map((bone) => bone.data.name)
    );

    if (btn1Bones.length === 0) {
      console.warn("没有找到btn1相关的bones");
      return;
    }

    // 为每个btn1 bone创建悬浮区域
    btn1Bones.forEach((bone) => {
      const boneName = bone.data.name;

      // 创建一个透明的悬浮区域
      const hoverArea = new Graphics();
      hoverArea.beginFill(0x00ff00, 0.01); // 绿色半透明，用于调试
      hoverArea.drawRect(-150, -100, 300, 200); // 悬浮区域大小
      hoverArea.endFill();

      // 获取bone的世界坐标
      let boneWorldX = spine.x + (bone as any).worldX;
      let boneWorldY = spine.y + (bone as any).worldY;

      // 应用spine的缩放
      boneWorldX *= spine.scale.x;
      boneWorldY *= spine.scale.y;

      hoverArea.x = boneWorldX;
      hoverArea.y = boneWorldY;

      // 添加交互属性
      (hoverArea as any).interactive = true;
      (hoverArea as any).cursor = "pointer";

      // 添加悬浮事件 - 播放btn1_hover动画
      hoverArea.on("pointerover", () => {
        console.log(`悬浮在 ${boneName} 上，播放btn1_hover动画`);
        // 使用mix模式播放btn1_hover动画
        if (spine.state.hasAnimation("btn1_hover")) {
          // 在轨道1上播放悬浮动画，不循环，速度加快
          const trackEntry = spine.state.setAnimation(1, "btn1_hover", false);
          if (trackEntry) {
            // 设置动画速度为3倍，让动画更快
            trackEntry.timeScale = 4;
          }
        } else {
          console.warn("btn1_hover动画不存在");
        }
      });

      hoverArea.on("pointerout", () => {
        console.log(`离开 ${boneName}，完整反向播放btn1_hover动画`);
        // 完整反向播放btn1_hover动画
        if (spine.state.hasAnimation("btn1_hover")) {
          // 在轨道1上反向播放悬浮动画
          const trackEntry = spine.state.setAnimation(1, "btn1_hover", false);
          if (trackEntry) {
            // 设置动画为反向播放，速度适中确保完整播放
            trackEntry.timeScale = -4;
            // 从动画的最后一帧开始反向播放
            trackEntry.trackTime = trackEntry.animationEnd;
          }
        } else {
          console.warn("btn1_hover动画不存在");
        }
      });

      hoverArea.on("pointerdown", () => {
        router.push("/select");
      });

      // 将悬浮区域添加到舞台
      app.stage.addChild(hoverArea);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          let currentWorldX = spine.x + (currentBone as any).worldX;
          let currentWorldY = spine.y + (currentBone as any).worldY;

          // 应用spine的缩放
          currentWorldX *= spine.scale.x;
          currentWorldY *= spine.scale.y;

          hoverArea.x = currentWorldX;
          hoverArea.y = currentWorldY;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  // 为btn2添加悬浮事件
  const addBtn2HoverEvents = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 查找btn1相关的bone
    const btn2Bones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().includes("btn2")
    );

    console.log(
      "找到的btn2 bones:",
      btn2Bones.map((bone) => bone.data.name)
    );

    if (btn2Bones.length === 0) {
      console.warn("没有找到btn1相关的bones");
      return;
    }

    // 为每个btn1 bone创建悬浮区域
    btn2Bones.forEach((bone) => {
      const boneName = bone.data.name;

      // 创建一个透明的悬浮区域
      const hoverArea = new Graphics();
      hoverArea.beginFill(0x00ff00, 0.01); // 绿色半透明，用于调试
      hoverArea.drawRect(-150, -100, 300, 200); // 悬浮区域大小
      hoverArea.endFill();

      // 获取bone的世界坐标
      let boneWorldX = spine.x + (bone as any).worldX;
      let boneWorldY = spine.y + (bone as any).worldY;

      // 应用spine的缩放
      boneWorldX *= spine.scale.x;
      boneWorldY *= spine.scale.y;

      hoverArea.x = boneWorldX;
      hoverArea.y = boneWorldY;

      // 添加交互属性
      (hoverArea as any).interactive = true;
      (hoverArea as any).cursor = "pointer";

      // 添加悬浮事件 - 播放btn2_hover动画
      hoverArea.on("pointerover", () => {
        console.log(`悬浮在 ${boneName} 上，播放btn1_hover动画`);
        // 使用mix模式播放btn2_hover动画
        if (spine.state.hasAnimation("btn2_hover")) {
          // 在轨道1上播放悬浮动画，不循环，速度加快
          const trackEntry = spine.state.setAnimation(1, "btn2_hover", false);
          if (trackEntry) {
            // 设置动画速度为3倍，让动画更快
            trackEntry.timeScale = 4;
          }
        } else {
          console.warn("btn1_hover动画不存在");
        }
      });

      hoverArea.on("pointerout", () => {
        console.log(`离开 ${boneName}，完整反向播放btn1_hover动画`);
        // 完整反向播放btn1_hover动画
        if (spine.state.hasAnimation("btn2_hover")) {
          // 在轨道1上反向播放悬浮动画
          const trackEntry = spine.state.setAnimation(1, "btn2_hover", false);
          if (trackEntry) {
            // 设置动画为反向播放，速度适中确保完整播放
            trackEntry.timeScale = -4;
            // 从动画的最后一帧开始反向播放
            trackEntry.trackTime = trackEntry.animationEnd;
          }
        } else {
          console.warn("btn2_hover动画不存在");
        }
      });

      hoverArea.on("pointerdown", () => {
        router.push("/showdetail");
      });

      // 将悬浮区域添加到舞台
      app.stage.addChild(hoverArea);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          let currentWorldX = spine.x + (currentBone as any).worldX;
          let currentWorldY = spine.y + (currentBone as any).worldY;

          // 应用spine的缩放
          currentWorldX *= spine.scale.x;
          currentWorldY *= spine.scale.y;

          hoverArea.x = currentWorldX;
          hoverArea.y = currentWorldY;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  const playAnimation = (animationName: string) => {
    if (spineRef.current) {
      const spine = spineRef.current;
      if (spine.state.hasAnimation(animationName)) {
        spine.state.clearTracks();
        if (animationName === "start") {
          spine.state.setAnimation(0, animationName, true);
        } else {
          spine.state.setAnimation(0, animationName, true);
        }
        setCurrentAnimation(animationName);
      } else {
        console.warn(`动画 "${animationName}" 不存在`);
      }
    }
  };

  const playAnimationSequence = () => {
    if (spineRef.current) {
      const spine = spineRef.current;
      spine.state.clearTracks();

      // 检查动画是否存在
      const animations = ["start", "idle", "end"];
      const availableAnimations = animations.filter((name) =>
        spine.state.hasAnimation(name)
      );

      if (availableAnimations.length > 0) {
        if (availableAnimations.includes("start")) {
          spine.state.setAnimation(0, "start", false);
        }
        if (availableAnimations.includes("idle")) {
          spine.state.addAnimation(0, "idle", true, 0);
        }
        setCurrentAnimation("sequence");
      } else {
        console.warn("没有找到可用的动画");
      }
    }
  };

  useEffect(() => {
    const loadSpineAnimation = async () => {
      if (!canvasRef.current) return;

      try {
        setLoading(true);

        const app = new Application({
          width: 1150,
          height: 700,
          backgroundColor: 0xeeeeee,
          antialias: true,
          // resolution: window.devicePixelRatio || 1,
          resolution: 1,
        });

        // 将 PIXI 画布添加到 DOM
        canvasRef.current.appendChild(app.view as any);
        appRef.current = app;
        // 使用 PIXI.js 的加载器加载 Spine 资源
        const resource = await new Promise((resolve, reject) => {
          Assets.load("/assets/spine/menu/menu1.json").then((resource) => {
            resolve(resource);
          });
        });
        // 创建 Spine 实例
        const spine = new Spine((resource as any).spineData);
        spineRef.current = spine;

        // 设置 Spine 位置到左下角并缩小
        spine.x = 0; // 距离左边150像素
        spine.y = 700; // 距离底部150像素
        spine.scale.set(1); // 缩小到原来的40%

        // 添加到舞台
        app.stage.addChild(spine);
        // 获取可用的动画列表
        const animations = spine.state.data.skeletonData.animations.map(
          (anim) => anim.name
        );

        // 播放默认动画序列
        if (animations.length > 0) {
          if (animations.includes("start")) {
            spine.state.setAnimation(0, "start", true); // false表示不循环播放
          }
          // if (animations.includes('idle')) {
          //   spine.state.addAnimation(0, 'idle', true, 0); // true表示循环播放
          // }
          // setCurrentAnimation('sequence');
        } else if (animations.length === 1) {
          // 如果只有一个动画，直接播放
          spine.state.setAnimation(0, animations[0], true);
          setCurrentAnimation(animations[0]);
        }

        // 为bone开头的bones添加点击事件
        addClickEventsToBoneBones();

        // 为btn1添加悬浮事件
        addBtn1HoverEvents();
        // 为btn2添加悬浮事件
        addBtn2HoverEvents();

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    loadSpineAnimation();

    return () => {
      // 清理 PIXI 应用
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      spineRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5efe4] p-8">
      <div className="max-w-6xl mx-auto relative">
        <header
          className="paper-card mb-6 px-6 py-4 flex justify-between items-center"
          style={{ height: "97px" }}
        >
          {/* 返回按钮 */}
          <Link
            href="/"
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
          <h1 className="text-2xl font-bold text-[transparent]">
            Spine 动画展示
          </h1>
          <div className="relative">
            <div className="badge-circle w-10 h-10 rounded-full grid place-items-center">
              <span className="text-yellow-300 text-xl">★</span>
            </div>
          </div>
        </header>

        <div className="">
          <div className="flex">
            <div
              ref={canvasRef}
              className="rounded-lg"
              style={{
                width: "100%",
                maxWidth: "800px",
                height: "auto",
                maxHeight: "600px",
                aspectRatio: "4/3",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
