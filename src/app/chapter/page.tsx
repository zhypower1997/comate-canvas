'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Application,
  Assets,
  Graphics,
  Container,
  Text,
  Texture,
  Rectangle,
} from 'pixi.js';
import { Spine, SpineDebugRenderer, Color, TextureRegion } from 'pixi-spine';
import { MeshAttachment } from '@pixi-spine/runtime-4.1';
import { generatePoster, quickPoster } from '@/utils/posterGenerator';
import { useRouter } from 'next/navigation';
import bookData from '../../../public/bookData.json';

const example = `
[
{"name": "苹果", "color": "#8dc37b", "subtitle": "水果系列", "content": "脆甜的苹果", "subtitle1": "想吃一个"},
{"name": "香蕉", "color": "#7bc3a3", "subtitle": "水果系列", "content": "大个的香蕉", "subtitle1": "一起分享"}
]
`;
const aiContent = {
  food: `请生成20个中文水果名称，不要重复，直接返回JSON数组，严格遵循以下要求：
1. 格式必须与示例完全一致：${example}
2. 每个对象包含4个字段："name"（水果名）、"color"（十六进制颜色值，如#ff0000）、"subtitle"（统一为"水果系列"）、"content"（水果描述）
3. JSON语法要求：
   - 所有字段名必须用双引号包裹（如"name"，不能用单引号或无引号）
   - 字符串值必须用双引号包裹
   - 数组内最后一个对象后**不能有逗号**
   - 不允许任何注释、多余空格或换行
4. 只返回JSON数组，不包含任何其他文字、解释或格式说明`,

  animal: `请生成20个中文动物名称，不要重复，直接返回JSON数组，严格遵循以下要求：
1. 格式必须与示例完全一致：${example}
2. 每个对象包含4个字段："name"（动物名）、"color"（十六进制颜色值，如#ff0000）、"subtitle"（统一为"动物系列"）、"content"（动物描述）
3. JSON语法要求：
   - 所有字段名必须用双引号包裹（如"name"，不能用单引号或无引号）
   - 字符串值必须用双引号包裹
   - 数组内最后一个对象后**不能有逗号**
   - 不允许任何注释、多余空格或换行
4. 只返回JSON数组，不包含任何其他文字、解释或格式说明`,

  tool: `请生成20个中文厨房工具名称，不要重复，直接返回JSON数组，严格遵循以下要求：
1. 格式必须与示例完全一致：${example}
2. 每个对象包含4个字段："name"（工具名）、"color"（十六进制颜色值，如#ff0000）、"subtitle"（统一为"厨房工具"）、"content"（工具描述）
3. JSON语法要求：
   - 所有字段名必须用双引号包裹（如"name"，不能用单引号或无引号）
   - 字符串值必须用双引号包裹
   - 数组内最后一个对象后**不能有逗号**
   - 不允许任何注释、多余空格或换行
4. 只返回JSON数组，不包含任何其他文字、解释或格式说明`,
};

export default function PainterPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const [isBookOpened, setIsBookOpened] = useState<boolean>(false);
  const [currentOpenPageIndex, setCurrentOpenPageIndex] = useState<number>(0);
  const [generate_done, setGenerate_done] = useState<boolean>(false);
  const aiDataRef = useRef<any[]>([]);
  const isChangeRef = useRef<boolean>(false);
  const isChangeCountRef = useRef<number>(0);
  const aiSkinRef = useRef<string>('');

  const displayNameArrRef = useRef<string[]>([]);
  const displayNameRef = useRef<string>('');

  // 使用 useRef 来获取最新的 currentOpenPageIndex 值
  const currentOpenPageIndexRef = useRef(currentOpenPageIndex);
  const isBookOpenedRef = useRef(isBookOpened);
  const isBookStartRef = useRef(false);
  const generateDoneRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      aiSkinRef.current = new URLSearchParams(window?.location?.search).get(
        'skin',
      );
    }
  }, []);

  useEffect(() => {
    if (generate_done) {
      changePage();
      spineRef.current?.state.clearTrack(4);
      spineRef.current?.state.setAnimation(3, 'generate_done', false);
    }
  }, [generate_done]);

  useEffect(() => {
    setTimeout(() => {
      isChangeRef.current = true;
      generateDoneRef.current = true;
      setGenerate_done(true);
      const aiData = bookData[aiSkinRef.current as keyof typeof bookData];
      aiDataRef.current = aiData;
      aiDataRef.current.sort(() => Math.random() - 0.5);
      console.log(aiDataRef.current);
      spineRef.current?.state.setAnimation(2, 'generate_done', false);
      spineRef.current.skeleton.findSlot('generat_btn_bg').color.a = 0;
      spineRef.current.skeleton.findSlot('generat_btn_dot').color.a = 0;
      spineRef.current.skeleton.findSlot('generat_btn_dot2').color.a = 0;
      spineRef.current.skeleton.findSlot('generat_btn_dot3').color.a = 0;
      spineRef.current.skeleton.findSlot('generat_btn_text').color.a = 0;
    }, 3000);
  }, []);

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
      bone.data.name.toLowerCase().startsWith('page_show'),
    );
    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-50, -50, 50, 50); // 点击区域大小
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
      (clickArea as any).cursor = 'pointer';

      // 添加点击事件 - 播放结束动画
      clickArea.on('pointerdown', async () => {
        if (!generateDoneRef.current) {
          alert('内容生成中，请稍后再试【弹窗UI还在绘制中】');
          return;
        }
        // 使用 ref 获取最新值,index + 1这次。currentOpenPageIndexRef.current上次
        setCurrentOpenPageIndex(index + 1);
        setIsBookOpened(true);
        const nowPage = index + 1;
        const prevPage = currentOpenPageIndexRef.current;
        const nowOpen = true;
        const prevOpen = isBookOpenedRef.current;
        // 如果点击的是当前已经打开的页面，不做任何操作
        if (nowPage === prevPage) {
          return;
        } else {
          // 如果没有页面打开过，播放open_start，在播放对应的pagex_open
          if (!prevOpen) {
            isBookStartRef.current = true;
            spine.state.addAnimation(1, 'open_start', false, 0);
            spine.state.addAnimation(1, `page${nowPage}_open`, false, 0);
          } else {
            // 先停止当前轨道上的所有动画
            spine.state.clearTrack(1);
            // 设置关闭动画（反向播放）
            const closeAnimation = spine.state.setAnimation(
              1,
              `page${prevPage}_close`,
              false,
            );
            // 延迟时间设置为关闭动画的持续时间
            spine.state.addAnimation(
              1,
              `page${nowPage}_open`,
              false,
              closeAnimation.animationEnd,
            );
          }
        }
        displayNameRef.current = displayNameArrRef.current[index];
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

          clickArea.x =
            (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y =
            (currentBone as any).worldY * spine.scale.y + spine.y + 20;
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
      clickArea.drawRect(-120, -40, 200, 40); // 点击区域大小
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
      (clickArea as any).cursor = 'pointer';

      // 添加点击事件 - 播放结束动画
      clickArea.on('pointerdown', async () => {
        if (!isChangeRef.current) {
          alert('内容生成中，请稍后再试【弹窗UI还在绘制中】');
          return;
        }
        // 如果页面打开，则先关闭
        if (isBookOpenedRef.current) {
          spine.state.clearTrack(1);
          // 设置关闭动画（反向播放）
          const closeAnimation = spine.state.setAnimation(
            1,
            `page${currentOpenPageIndexRef.current}_close`,
            false,
          );
          const openEndAnimation = spine.state.addAnimation(
            1,
            'open_end',
            false,
            closeAnimation.animationEnd,
          );
          const a = spine.state.addAnimation(
            1,
            'shake',
            false,
            openEndAnimation.animationEnd,
          );
          setIsBookOpened(false);
          setCurrentOpenPageIndex(0);
          isBookStartRef.current = false;
          a.listener = {
            complete: (entry) => {
              changePage();
            },
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
        spine.state.addAnimation(
          1,
          'shake',
          false,
          openEndAnimation.animationEnd,
        );
        changePage();
      });

      // 添加悬停效果
      clickArea.on('pointerover', () => {
        clickArea.alpha = 0.3;
        spine.state.clearTrack(2);
        const change_btn = spine.state.setAnimation(2, 'change_btn', false);
        change_btn.timeScale = 2;
        console.log(`悬停在 ${boneName} 上`);
      });

      clickArea.on('pointerout', () => {
        clickArea.alpha = 0.01;
        const change_btn = spine.state.setAnimation(2, 'change_btn', false);
        change_btn.timeScale = -3;
        change_btn.trackTime = change_btn.animationEnd;
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

          clickArea.x =
            (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y =
            (currentBone as any).worldY * spine.scale.y + spine.y + 20;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
  };

  const addClickEventsToBoneBonesModal = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"page_show"开头的
    const closeBones = spine.skeleton.bones.filter(
      (bone) => bone.data.name === 'modal_close',
    );
    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-50, -50, 50, 50); // 点击区域大小
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
      (clickArea as any).cursor = 'pointer';

      // 添加点击事件 - 播放结束动画
      clickArea.on('pointerdown', async () => {
        const modal_close = spine.state.setAnimation(3, 'modal_close', false);
        modal_close.listener = {
          complete: (entry) => {
            if (generateDoneRef.current) {
              spine.state.clearTrack(3);
              spine.state.clearTrack(2);
              spine.state.setAnimation(2, 'generate_done', false);
            } else {
              spine.state.clearTrack(3);
              spine.state.setAnimation(2, 'generate_start', true);
            }
          },
        };
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

          clickArea.x =
            (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y =
            (currentBone as any).worldY * spine.scale.y + spine.y + 20;
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

    displayNameArrRef.current = [];
    // 记录名称，用于后续跳转
    closeBones.forEach(async (bone, index) => {
      // const imgUrlArr = [
      //   '/images/page1.png',
      //   '/images/page2.png',
      //   '/images/page3.png',
      //   '/images/page4.png',
      //   '/images/page.png',
      // ];
      // 每次顺位拿aiDataRef.current，结合index
      const randomIndex =
        (index + isChangeCountRef.current * 3) % aiDataRef.current.length;
      displayNameArrRef.current.push(aiDataRef.current[randomIndex].name);
      const poster = await generatePoster({
        title: aiDataRef.current[randomIndex].name,
        subtitle1: aiDataRef.current[randomIndex].subtitle,
        subtitle2: aiDataRef.current[randomIndex].content,
        subtitle3: aiDataRef.current[randomIndex].subtitle1,
        width: 394,
        height: 516,
        borderRadius: 25,
      });
      isChangeCountRef.current = isChangeCountRef.current + 1;

      // 尝试找到对应的slot
      const slotName = bone.data.name; // 假设slot名称是bone名称的一部分
      if (slotName) {
        const slot = spine.skeleton.findSlot(slotName);
        const oldAttachment = slot.getAttachment();
        if (slot) {
          // 加载button.png并替换attachment
          // const buttonTexture = Texture.from(
          //   imgUrlArr[Math.floor(Math.random() * imgUrlArr.length)],
          // );
          const buttonTexture = Texture.from(poster);
          // 创建新的TextureRegion
          const textureRegion = new TextureRegion();
          textureRegion.texture = buttonTexture;
          textureRegion.size = new Rectangle(
            0,
            0,
            buttonTexture.width,
            buttonTexture.height,
          );
          const regionAttachment = new MeshAttachment('close1', 'close1');
          regionAttachment.region = textureRegion;
          regionAttachment.width = (oldAttachment as MeshAttachment).width;
          regionAttachment.height = (oldAttachment as MeshAttachment).height;
          regionAttachment.regionUVs = (
            oldAttachment as MeshAttachment
          ).regionUVs;
          regionAttachment.triangles = (
            oldAttachment as MeshAttachment
          ).triangles;
          regionAttachment.vertices = (
            oldAttachment as MeshAttachment
          ).vertices;
          regionAttachment.worldVerticesLength = (
            oldAttachment as MeshAttachment
          ).worldVerticesLength;
          // 设置到slot的hackRegion属性
          (slot as any).setAttachment(regionAttachment);
        }
      }
    });
  };

  // 为bone开头的bones添加点击事件
  const addClickEventsToBoneSatrtBtn = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"close"开头的
    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().startsWith('draw_btn_text'),
    );
    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-120, -40, 200, 40); // 点击区域大小
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
      (clickArea as any).cursor = 'pointer';

      // 添加点击事件 - 播放结束动画
      clickArea.on('pointerdown', async () => {
        if (isBookOpenedRef.current) {
          if (typeof window !== 'undefined') {
            // 带上随机生成书本对应的字段名称
            // 跳转前主动销毁 PIXI 应用，避免软跳转期间旧实例与新页初始化竞争导致的资源状态异常
            if (appRef.current) {
              try {
                appRef.current.destroy(true);
              } catch (e) {}
              appRef.current = null;
            }
            spineRef.current = null;
            // 等待一帧，确保销毁完成
            await new Promise((r) => setTimeout(r, 0));

            // 重置全局资源缓存，避免被销毁的 BaseTexture 复用导致的 null.valid 报错
            try {
              Assets.reset();
            } catch (e) {}

            router.push(
              `/canvas_free_diantu?displayName=${displayNameRef.current}&source=${aiSkinRef.current}`,
            );
          }
        } else {
          spine.state.setAnimation(3, 'modal_start', false);
        }
      });

      // 添加悬停效果
      clickArea.on('pointerover', () => {
        const draw_btn = spine.state.setAnimation(2, 'draw_btn', false);
        draw_btn.timeScale = 5;
        clickArea.alpha = 0.3;
        console.log(`悬停在 ${boneName} 上`);
      });

      clickArea.on('pointerout', () => {
        const draw_btn = spine.state.setAnimation(2, 'draw_btn', false);
        draw_btn.timeScale = -3;
        draw_btn.trackTime = draw_btn.animationEnd;
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

          clickArea.x =
            (currentBone as any).worldX * spine.scale.x + spine.x + 20;
          clickArea.y =
            (currentBone as any).worldY * spine.scale.y + spine.y + 20;
        }
      };

      // 监听动画更新，同步位置
      app.ticker.add(updatePosition);
    });
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
          Assets.load('/assets/spine/chapter-spine/chapter-spine.json').then(
            (resource) => {
              resolve(resource);
            },
          );
        });

        // 创建 Spine 实例
        const spine = new Spine((resource as any).spineData);
        spineRef.current = spine;

        // 设置默认使用 animal skin
        // 从query拿挂载参数，skin
        const skinQuery = new URLSearchParams(window?.location?.search).get(
          'skin',
        );
        if (spine.skeleton.data.skins.length > 1) {
          const animalSkin = spine.skeleton.data.skins.find((skin) => {
            if (skin.name === skinQuery) {
              return true;
            }
            return false;
          });
          if (animalSkin) {
            (spine.skeleton as any).setSkin(animalSkin);
            (spine.skeleton as any).setToSetupPose();
          }
        }

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

        // 播放默认动画序列
        if (animations.length > 0) {
          if (animations.includes('start')) {
            spine.state.setAnimation(0, 'start', true); // false表示不循环播放
            spine.state.setAnimation(1, 'bg', true); // false表示不循环播放
            spine.state.setAnimation(4, 'shake', true); // false表示不循环播放
            spine.state.setAnimation(2, 'generate_start', true);
          }
        } else if (animations.length === 1) {
          // 如果只有一个动画，直接播放
          spine.state.setAnimation(0, animations[0], true);
        }

        // 为bone开头的bones添加点击事件
        addClickEventsToBoneBones();
        addClickEventsToBoneBonesBtn();
        addClickEventsToBoneSatrtBtn();
        addClickEventsToBoneBonesModal();
      } catch (error) {}
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
        <header
          className="paper-card mb-6 px-6 py-4 flex justify-between items-center"
          style={{ height: '97px' }}
        >
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
          <h1 className="text-2xl font-bold text-[transparent]">
            Spine 动画展示
          </h1>
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
