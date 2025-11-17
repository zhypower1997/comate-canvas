'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Assets, Graphics, Container, Text, Texture, Rectangle } from 'pixi.js';
import { Spine, SpineDebugRenderer, Color, TextureRegion } from 'pixi-spine';
import { useRouter } from 'next/navigation';
import { MeshAttachment, RegionAttachment } from '@pixi-spine/runtime-4.1';


export default function PainterPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const [isBookOpened, setIsBookOpened] = useState<boolean>(false);
  const [currentOpenPageIndex, setCurrentOpenPageIndex] = useState<number>(0);

  // 使用 useRef 来获取最新的 currentOpenPageIndex 值
  const currentOpenPageIndexRef = useRef(currentOpenPageIndex);
  const isBookOpenedRef = useRef(isBookOpened);
  const isBookStartRef = useRef(false);
  const skinNameRef = useRef('')

  // 更新 ref 值
  useEffect(() => {
    currentOpenPageIndexRef.current = currentOpenPageIndex;
  }, [currentOpenPageIndex]);

  useEffect(() => {
    isBookOpenedRef.current = isBookOpened;
  }, [isBookOpened]);

  // 为bone开头的bones添加点击事件
  const addClickEventsToBoneBones = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"page_show"开头的
    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().endsWith('book') || bone.data.name.toLowerCase().endsWith('count_btn') || bone.data.name.toLowerCase().endsWith('comfirm_btn'),
    );

    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;
      console.log('boneName', boneName);
      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-150, -160, 250, 300); // 点击区域大小
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
      (clickArea as any).buttonMode = true;
      (clickArea as any).cursor = "pointer";


      // 添加点击事件 - 播放结束动画
      clickArea.on('pointerdown', () => {
        if (boneName.toLowerCase().endsWith('book')) {
          if (boneName === 'show_book') {
            router.push("/showdetail");
            return;
          };
          skinNameRef.current = boneName.split('_')[0]
          spine.state.setAnimation(3, `${boneName}_check`, false);
          spine.state.setAnimation(4, "comfirm_check", false);

          // 替换confirm_info中的图片为文字生成的图片
          replaceConfirmInfoImage(boneName.split('_')[0]);
        } else if (boneName.toLowerCase().endsWith('count_btn')) {
          spine.state.setAnimation(2, "count_open_start", false);
          spine.state.addAnimation(2, "count_open_idle", true, 0);
        } else if (boneName.toLowerCase().endsWith('comfirm_btn')) {
          if(skinNameRef.current === '') {
            alert('请先选择一本书');
            return;
          }
          router.push(`/chapter?skin=${skinNameRef.current}`);
        }
      });

      // 添加悬停效果
      clickArea.on('pointerover', () => {
        if (boneName === 'show_book') {
          spine.state.setAnimation(5, 'show_hover', false);
          return;
        }
        if(boneName === 'comfirm_btn' && skinNameRef.current !== '') {
          const comfirm_hover = spine.state.setAnimation(5, 'comfirm_hover', false);
          comfirm_hover.timeScale = 3;
          return;
        }
        console.log(`悬停在 ${boneName} 上`);
      });

      clickArea.on('pointerout', () => {
        if (boneName === 'show_book') {
          const show_hover = spine.state.setAnimation(5, 'show_hover', false);
          show_hover.timeScale = -1.2;
          show_hover.trackTime = show_hover.animationEnd;
          return;
        }
        if(boneName === 'comfirm_btn' && skinNameRef.current !== '') {
          const comfirm_hover = spine.state.setAnimation(5, 'comfirm_hover', false);
          comfirm_hover.timeScale = -3;
          comfirm_hover.trackTime = comfirm_hover.animationEnd;
          return;
        }
      });

      // 将点击区域添加到舞台
      app.stage.addChild(clickArea);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          let currentWorldX = spine.x + (currentBone as any).worldX;
          let currentWorldY = spine.y + (currentBone as any).worldY;

          // 应用spine的缩放
          currentWorldX *= spine.scale.x;
          currentWorldY *= spine.scale.y;

          clickArea.x = (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y = (currentBone as any).worldY * spine.scale.y + spine.y + 20;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  // 为bone开头的bones添加点击事件
  const addClickEventsToBoneBonesBtn = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"close"开头的
    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().startsWith('change_btn_text'),
    );
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
      (clickArea as any).buttonMode = true; (clickArea as any).cursor = "pointer";


      // 添加点击事件 - 播放结束动画
      clickArea.on('pointerdown', () => {
        // 如果页面打开，则先关闭
        if (isBookOpenedRef.current) {
          spine.state.clearTrack(1);
          // 设置关闭动画（反向播放）
          const closeAnimation = spine.state.setAnimation(1, `page${currentOpenPageIndexRef.current}_close`, false);
          const openEndAnimation = spine.state.addAnimation(1, 'open_end', false, closeAnimation.animationEnd);
          const a = spine.state.addAnimation(1, 'shake', false, openEndAnimation.animationEnd);
          setIsBookOpened(false);
          setCurrentOpenPageIndex(0);
          isBookStartRef.current = false;
          a.listener = {
            complete: (entry) => {
              changePage();
            }
          };
          return;
        }
        if (!isBookStartRef.current) {
          spine.state.clearTrack(1);
          spine.state.addAnimation(1, 'shake', false, 0);
          changePage();
          return;
        }
        isBookStartRef.current = false;
        // 播放open_end
        const openEndAnimation = spine.state.setAnimation(1, 'open_end', false);
        spine.state.addAnimation(1, 'shake', false, openEndAnimation.animationEnd);
        changePage();
      });

      // 添加悬停效果
      clickArea.on('pointerover', () => {
        clickArea.alpha = 0.3;
        console.log(`悬停在 ${boneName} 上`);
      });

      clickArea.on('pointerout', () => {
        clickArea.alpha = 0.01;
      });

      // 将点击区域添加到舞台
      app.stage.addChild(clickArea);

      // 在动画更新时同步位置
      const updatePosition = () => {
        const currentBone = spine.skeleton.findBone(boneName);
        if (currentBone) {
          let currentWorldX = spine.x + (currentBone as any).worldX;
          let currentWorldY = spine.y + (currentBone as any).worldY;

          // 应用spine的缩放
          currentWorldX *= spine.scale.x;
          currentWorldY *= spine.scale.y;

          clickArea.x = (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y = (currentBone as any).worldY * spine.scale.y + spine.y + 20;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  // 为bone开头的bones添加点击事件
  const changePage = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().endsWith('img'),
    );
    // 替换close按钮的图片为button.png
    // 替换close按钮的图片为button.png
    closeBones.forEach((bone, index) => {
      const imgUrlArr = [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWR4fteZ5HS3Pjr6VmN42zFJfgRJcqLI47Og&s',
        'https://pic.chaopx.com/chao_origin_pic/24/01/08/92889bf42fbc3b1a3d5423912c8a5459.jpg!/fw/572/quality/90/unsharp/true/compress/true',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSLh4W05umBpBGBoKt3-aAXSp7N7dsfPYEYQ&s',
        '/images/page.png',
      ];
      // 尝试找到对应的slot
      const slotName = bone.data.name // 假设slot名称是bone名称的一部分
      if (slotName) {
        const slot = spine.skeleton.findSlot(slotName);
        const oldAttachment = slot.getAttachment();
        if (slot) {
          // 加载button.png并替换attachment
          const buttonTexture = Texture.from(imgUrlArr[Math.floor(Math.random() * imgUrlArr.length)]);
          // 创建新的TextureRegion
          const textureRegion = new TextureRegion();
          textureRegion.texture = buttonTexture;
          textureRegion.size = new Rectangle(0, 0, buttonTexture.width, buttonTexture.height);
          const regionAttachment = new MeshAttachment('close1', 'close1');
          regionAttachment.region = textureRegion;
          regionAttachment.width = (oldAttachment as MeshAttachment).width;
          regionAttachment.height = (oldAttachment as MeshAttachment).height;
          regionAttachment.regionUVs = (oldAttachment as MeshAttachment).regionUVs;
          regionAttachment.triangles = (oldAttachment as MeshAttachment).triangles;
          regionAttachment.vertices = (oldAttachment as MeshAttachment).vertices;
          regionAttachment.worldVerticesLength = (oldAttachment as MeshAttachment).worldVerticesLength;
          // 设置到slot的hackRegion属性
          (slot as any).setAttachment(regionAttachment);
        }
      }
    });
  };

  // 替换confirm_info中的图片为文字生成的图片
  const replaceConfirmInfoImage = (skinName: string) => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    const textArr = {
      'food': '全是食物的图鉴，比如好吃苹果、香蕉、梨',
      'animal': '全是动物的图鉴，可可爱爱的小兔子、猫咪、猴子',
      // 'tool': '全是厨房工具的图鉴，比如锅铲、勺子、刀子',
      // 'solar24': '全是二十四节气的图鉴，比如立春春牛、春分纸鸢',
      'tool': '全是二十四节气的图鉴，比如立春春牛、春分纸鸢',
    }

    // 创建文字纹理
    const text = textArr[skinName as keyof typeof textArr];

    // 创建Canvas来生成文字图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置Canvas尺寸
    canvas.width = 700; // 根据confirm_info的尺寸
    canvas.height = 40;

    // 设置文字样式，字体颜色白色
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 绘制文字
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // 将Canvas转换为PIXI纹理
    const textTexture = Texture.from(canvas);

    // 找到confirm_info slot
    const confirmInfoSlot = spine.skeleton.findSlot('confirm_info');
    if (confirmInfoSlot) {
      // 使用类型断言来访问setAttachment方法
      const oldAttachment = (confirmInfoSlot as any).getAttachment();
      const textureRegion = new TextureRegion();
      textureRegion.texture = textTexture;
      textureRegion.size = new Rectangle(0, 0, textTexture.width, textTexture.height);
      // 创建新的RegionAttachment来替换原来的图片
      const newAttachment = new RegionAttachment('confirm_info1', 'confirm_info1');
      newAttachment.region = textureRegion;
      newAttachment.width = oldAttachment.width;
      newAttachment.height = oldAttachment.height;
      newAttachment.offset = oldAttachment.offset;
      newAttachment.path = oldAttachment.path;
      newAttachment.uvs = oldAttachment.uvs;
      newAttachment.x = oldAttachment.x;
      newAttachment.y = oldAttachment.y;
      newAttachment.rotation = oldAttachment.rotation;
      newAttachment.scaleX = oldAttachment.scaleX;
      newAttachment.scaleY = oldAttachment.scaleY;
      // 设置到slot
      (confirmInfoSlot as any).setAttachment(newAttachment);
    }
  };

  useEffect(() => {
    const loadSpineAnimation = async () => {
      if (!canvasRef.current) return;

      try {

        const app = new Application({
          width: 1150,
          height: 700,
          backgroundAlpha: 0,
          // 透明背景
          antialias: true,
          resolution: 1,
        });

        // 将 PIXI 画布添加到 DOM
        canvasRef.current.appendChild(app.view as any);
        appRef.current = app;

        // 使用 PIXI.js 的加载器加载 Spine 资源
        const resource = await new Promise((resolve, reject) => {
          Assets.load("/assets/spine/select/select.json").then((resource) => {
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
          (anim) => anim.name,
        );

        console.log('animations', animations, animations.includes('start'));


        // 播放默认动画序列
        if (animations.length > 0) {
          spine.state.setAnimation(0, 'bg', true); // false表示不循环播放
          spine.state.setAnimation(1, 'show_idle', true); // false表示不循环播放
          spine.state.setAnimation(2, "count_close_idle", true); // false表示不循环播放

        } else if (animations.length === 1) {
          // 如果只有一个动画，直接播放
          spine.state.setAnimation(0, animations[0], true);
        }

        // 为bone开头的bones添加点击事件
        addClickEventsToBoneBones();
        addClickEventsToBoneBonesBtn();

      } catch (error) {
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
  }, []); // 空依赖数组

  return (
    <div className="min-h-screen bg-[#f5efe4] p-8">
      <div className="max-w-6xl mx-auto relative">


        <header className="paper-card mb-6 px-6 py-4 flex justify-between items-center" style={{height: '97px'}}>
          {/* 返回按钮 */}
          <Link
            href="/menu"
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
          <h1 className="text-2xl font-bold text-[transparent]">Spine 动画展示</h1>
          <div className="relative">
            <div className="badge-circle w-10 h-10 rounded-full grid place-items-center">
              <span className="text-yellow-300 text-xl">★</span>
            </div>
          </div>
        </header>
        <div
          ref={canvasRef}
          className="rounded-lg"
          style={{
            width: '100%',
            maxWidth: '800px',
            height: 'auto',
            maxHeight: '600px',
            aspectRatio: '4/3',
          }}
        />

      </div>
    </div>
  );
}
