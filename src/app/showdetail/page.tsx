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
} from 'pixi.js';
import { Spine, SpineDebugRenderer, Color, TextureRegion } from 'pixi-spine';
import { useRouter } from 'next/navigation';
import { MeshAttachment, RegionAttachment } from '@pixi-spine/runtime-4.1';

// 添加支持换行的文字绘制函数
const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text?.split('');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words?.length; i++) {
    const testLine = currentLine + words[i];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};
// 安全地获取localStorage数据

export default function PainterPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const router = useRouter();
  const [image_info_list, setImageInfoList] = useState<any[]>([]);
  const [allPageNum, setAllPageNum] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  useEffect(() => {
    let image_info_list = [];
    const image_info = localStorage.getItem('image_info') || '[]';
    if (image_info) {
      image_info_list = JSON.parse(image_info);
    }
    setAllPageNum(Math.ceil(image_info_list.length / 6));
    setImageInfoList(image_info_list);
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

  const isClickOpenRef = useRef(false);
  // 存储所有的 clickArea，用于控制显示/隐藏
  const boneBonesClickAreasRef = useRef<Graphics[]>([]);
  const smallBonesClickAreasRef = useRef<Graphics[]>([]);
  const imageIndexRef = useRef(0);
  const listIndexRef = useRef(1);

  // 控制 clickArea 显示/隐藏的函数
  const toggleClickAreas = (
    showBoneBones: boolean,
    showSmallBones: boolean,
  ) => {
    boneBonesClickAreasRef.current.forEach((clickArea) => {
      clickArea.visible = showBoneBones;
      clickArea.interactive = showBoneBones;
    });

    smallBonesClickAreasRef.current.forEach((clickArea) => {
      clickArea.visible = showSmallBones;
      clickArea.interactive = showSmallBones;
    });
  };

  const initImg = async (listIndex: number = 1) => {
    let image_info_list = [];
    const image_info = localStorage.getItem('image_info') || '[]';
    if (image_info) {
      image_info_list = JSON.parse(image_info);
    }
    console.log('image_info_list', image_info_list);
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;

    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.startsWith('small_pic_img'),
    );

    // 使用 for...of 循环替代 forEach，确保异步操作按顺序执行
    for (let i = 0; i < closeBones.length; i++) {
      const bone = closeBones[i];
      const boneName = bone.data.name;

      // 尝试找到对应的slot
      // if (image_info_list[i + (listIndex - 1) * 6] && image_info_list[i + (listIndex - 1) * 6].image) {
      // 从bone名称中提取slot名称（去掉_img后缀）
      const slotName = boneName.replace('_img', '');
      const slot = spine.skeleton.findSlot(slotName);

      if (slot) {
        const oldAttachment = slot.getAttachment();
        if (oldAttachment) {
          try {
            // 加载图片纹理
            const buttonTexture = Texture.from(
              image_info_list[i + (listIndex - 1) * 6]?.image || 'null',
            );

            // 创建新的TextureRegion
            const textureRegion = new TextureRegion();
            textureRegion.texture = buttonTexture;
            textureRegion.size = new Rectangle(
              0,
              0,
              buttonTexture.width,
              buttonTexture.height,
            );

            const regionAttachment = new MeshAttachment(
              `close${i}`,
              `close${i}`,
            );
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

            // 设置到slot
            (slot as any).setAttachment(regionAttachment);
            console.log(
              `成功替换 ${boneName} 的图片为: ${image_info_list[i]?.image}`,
            );
          } catch (error) {
            console.error(`替换 ${boneName} 图片时出错:`, error);
          }
        } else {
          console.warn(`未找到 ${boneName} 的attachment`);
        }
      } else {
        console.warn(`未找到名为 ${slotName} 的slot`);
      }
      // } else {
      //   console.warn(`第${i}个bone ${boneName} 没有对应的图片信息`);
      // }
    }
    // 更换big_img
    const big_img_bone = spine.skeleton.findBone('big_pic_img');
    if (big_img_bone) {
      const big_img_bone_name = big_img_bone.data.name;
      const big_img_bone_slot = spine.skeleton.findSlot(big_img_bone_name);
      if (big_img_bone_slot) {
        const big_img_bone_slot_attachment = big_img_bone_slot.getAttachment();
        if (big_img_bone_slot_attachment) {
          const oldAttachment = big_img_bone_slot_attachment;
          const newAttachment = new MeshAttachment(
            'big_pic_img',
            'big_pic_img',
          );
          const buttonTexture = Texture.from(
            image_info_list[imageIndexRef.current + (listIndex - 1) * 6]
              ?.image || 'null',
          );
          const textureRegion = new TextureRegion();
          textureRegion.texture = buttonTexture;
          textureRegion.size = new Rectangle(
            0,
            0,
            buttonTexture.width,
            buttonTexture.height,
          );
          newAttachment.region = textureRegion;
          newAttachment.width = (oldAttachment as MeshAttachment).width;
          newAttachment.height = (oldAttachment as MeshAttachment).height;
          newAttachment.regionUVs = (oldAttachment as MeshAttachment).regionUVs;
          newAttachment.triangles = (oldAttachment as MeshAttachment).triangles;
          newAttachment.vertices = (oldAttachment as MeshAttachment).vertices;
          newAttachment.worldVerticesLength = (
            oldAttachment as MeshAttachment
          ).worldVerticesLength;
          (big_img_bone_slot as any).setAttachment(newAttachment);
        }
      }
    }
    const slot = spine.skeleton.findSlot('Illustrated_info_icon');
    const att =
      spine.skeleton.data.findSkin('default').attachments[slot.data.index];
    const emun = {
      animal: 'sharpicons_Monkey',
      food: 'sharpicons_meat',
      tool: 'sharpicons_scissor',
    };
    (slot as any).setAttachment(
      att[emun[image_info_list[imageIndexRef.current]?.source || '']],
    );

    const info_info = spine.skeleton.findSlot('info_info');
    const text = image_info_list[imageIndexRef.current]?.text;

    // 创建Canvas来生成文字图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置Canvas尺寸 - 增加高度以支持多行文字
    const maxWidth = 180; // 限制文字最大宽度 - 从200减少到150
    const lineHeight = 14; // 行高 - 从20减少到16
    canvas.width = 300; // 从300减少到250
    canvas.height = 80; // 增加高度以支持多行

    // 设置文字样式
    ctx.fillStyle = '#bda286';
    ctx.font = 'bold 10px Arial, sans-serif'; // 从14px减少到12px
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // 绘制换行文字
    const lines = drawWrappedText(ctx, text, maxWidth, lineHeight);
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, index * lineHeight + 10);
    });

    // 将Canvas转换为PIXI纹理
    const textTexture = Texture.from(canvas);
    const oldAttachment = (info_info as any).getAttachment();
    const textureRegion = new TextureRegion();
    textureRegion.texture = textTexture;
    textureRegion.size = new Rectangle(
      0,
      0,
      textTexture.width,
      textTexture.height,
    );
    // 创建新的RegionAttachment来替换原来的图片
    const newAttachment = new RegionAttachment(
      'confirm_info1',
      'confirm_info1',
    );
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
    (info_info as any).setAttachment(newAttachment);

    const big_pic_name = spine.skeleton.findSlot('big_pic_name');
    const text1 =
      image_info_list[imageIndexRef.current + (listIndexRef.current - 1) * 6]
        ?.name || '';

    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d');
    if (!ctx1) return;

    // 设置画布尺寸 - 增加宽度以容纳更大的字体
    canvas1.width = 400; // 增加宽度
    canvas1.height = 40; // 增加高度

    // 设置文字样式
    ctx1.fillStyle = '#c8b28d';
    ctx1.font = 'bold 14px Arial, sans-serif';
    ctx1.textAlign = 'center';
    ctx1.textBaseline = 'middle'; // 改为 middle 让文字垂直居中

    // 绘制文字 - 使用画布中心坐标
    ctx1.fillText(text1, canvas1.width / 2, canvas1.height / 2);

    // 将Canvas转换为PIXI纹理
    const textTexture1 = Texture.from(canvas1);
    const oldAttachment1 = (big_pic_name as any).getAttachment();
    const textureRegion1 = new TextureRegion();
    textureRegion1.texture = textTexture1;
    textureRegion1.size = new Rectangle(
      0,
      0,
      textTexture1.width,
      textTexture1.height,
    );
    // 创建新的RegionAttachment来替换原来的图片
    const newAttachment1 = new RegionAttachment(
      'confirm_info1',
      'confirm_info1',
    );
    newAttachment1.region = textureRegion1;
    newAttachment1.width = oldAttachment1.width;
    newAttachment1.height = oldAttachment1.height;
    newAttachment1.offset = oldAttachment1.offset;
    newAttachment1.path = oldAttachment1.path;
    newAttachment1.uvs = oldAttachment1.uvs;
    newAttachment1.x = oldAttachment1.x;
    newAttachment1.y = oldAttachment1.y;
    newAttachment1.rotation = oldAttachment1.rotation;
    newAttachment1.scaleX = oldAttachment1.scaleX;
    newAttachment1.scaleY = oldAttachment1.scaleY;
    // 设置到slot
    (big_pic_name as any).setAttachment(newAttachment1);
  };

  // 为bone开头的bones添加点击事件
  const addClickEventsToBoneBones = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"close"开头的
    const closeBones = spine.skeleton.bones.filter((bone) =>
      bone.data.name.toLowerCase().startsWith('sticky_out'),
    );

    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-100, -100, 150, 150); // 点击区域大小
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
        isClickOpenRef.current = true;
        await initImg();
        console.log(`点击了close bone: ${boneName}，播放结束动画`);
        const start = spine.state.setAnimation(1, 'open_start', false);
        start.listener = {
          complete: (entry) => {
            isClickOpenRef.current = false;
            // 播放 open_start 动画完成后，隐藏 boneBones 的 clickArea，显示 smallBones 的 clickArea
            toggleClickAreas(false, true);
          },
        };
      });

      // 添加悬停效果
      clickArea.on('pointerover', () => {
        if (isClickOpenRef.current) return;
        clickArea.alpha = 0.3;
        console.log(`悬停在 ${boneName} 上`);
        spine.state.setAnimation(1, 'close_stamp_start', false);
      });

      clickArea.on('pointerout', () => {
        if (isClickOpenRef.current) return;
        clickArea.alpha = 0.01;
        const start = spine.state.setAnimation(1, 'close_stamp_start', false);
        start.timeScale = -1;
        start.trackTime = start.animationEnd;
      });

      // 将点击区域添加到舞台
      app.stage.addChild(clickArea);

      // 将 clickArea 添加到数组中，用于后续控制显示/隐藏
      boneBonesClickAreasRef.current.push(clickArea);

      // 添加标签显示bone名称
      const label = new Text(boneName, {
        fontSize: 12,
        fill: 0xff0000, // 红色标签，区分于bone bones
        align: 'center',
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

  // 为bone开头的bones添加点击事件
  const addClickEventsToDecalsBones = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"close"开头的
    const closeBones = spine.skeleton.bones.filter(
      (bone) => bone.data.name === 'decals',
    );

    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-100, -100, 150, 150); // 点击区域大小
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
        router.push('/sticky');
      });

      // 添加悬停效果
      clickArea.on('pointerover', () => {
        console.log(`悬停在 ${boneName} 上`);
        spine.state.setAnimation(4, 'decals_start', false);
      });

      clickArea.on('pointerout', () => {
        const start = spine.state.setAnimation(4, 'decals_start', false);
        start.timeScale = -1;
        start.trackTime = start.animationEnd;
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

          // clickArea.x = currentWorldX + 60;
          // clickArea.y = currentWorldY + 240;

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
  const addClickEventsToSmallBones = () => {
    if (!spineRef.current || !appRef.current) return;

    const spine = spineRef.current;
    const app = appRef.current;

    // 遍历所有bones，找到以"close"开头的
    const closeBones = spine.skeleton.bones.filter(
      (bone) =>
        bone.data.name.toLowerCase().startsWith('small_pic_img') ||
        bone.data.name == 'close_btn' ||
        bone.data.name == 'extra_btn',
    );

    // 为每个close bone创建一个点击区域
    closeBones.forEach((bone, index) => {
      const boneName = bone.data.name;
      let image_info_list = [];
      let allPageNum = 0;
      const image_info = localStorage.getItem('image_info') || '[]';
      if (image_info) {
        image_info_list = JSON.parse(image_info);
        allPageNum = image_info_list.length;
      }

      // 如果boneName是extra_btn，则创建两个点击区域
      if (boneName == 'extra_btn') {
        const clickArea1 = new Graphics();
        clickArea1.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
        clickArea1.drawRect(-75, -75, 100, 100); // 点击区域大小
        clickArea1.endFill();
        let boneWorldX = spine.x + (bone as any).worldX;
        let boneWorldY = spine.y + (bone as any).worldY;

        // 应用spine的缩放
        boneWorldX *= spine.scale.x;
        boneWorldY *= spine.scale.y;

        clickArea1.x = boneWorldX;
        clickArea1.y = boneWorldY;
        clickArea1.interactive = true;
        clickArea1.cursor = 'pointer';
        app.stage.addChild(clickArea1);

        const clickArea2 = new Graphics();
        clickArea2.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
        clickArea2.drawRect(-75, -75, 100, 100); // 点击区域大小
        clickArea2.endFill();
        clickArea2.x = boneWorldX - 400;
        clickArea2.y = boneWorldY;
        clickArea2.interactive = true;
        clickArea2.cursor = 'pointer';
        app.stage.addChild(clickArea2);

        clickArea1.on('pointerdown', () => {
          if (listIndexRef.current >= allPageNum) {
            return;
          } else {
            listIndexRef.current = listIndexRef.current + 1;
          }
          initImg(listIndexRef.current);
        });
        clickArea2.on('pointerdown', () => {
          if (listIndexRef.current <= 1) {
            return;
          } else {
            listIndexRef.current = listIndexRef.current - 1;
          }
          initImg(listIndexRef.current);
        });

        smallBonesClickAreasRef.current.push(clickArea1);
        smallBonesClickAreasRef.current.push(clickArea2);

        // 在动画更新时同步位置clickArea1和clickArea2的位置
        const updatePosition = () => {
          const currentBone = spine.skeleton.findBone(boneName);
          if (currentBone) {
            let currentWorldX = spine.x + (currentBone as any).worldX;
            let currentWorldY = spine.y + (currentBone as any).worldY;

            // 应用spine的缩放
            currentWorldX *= spine.scale.x;
            currentWorldY *= spine.scale.y;

            clickArea1.x =
              (currentBone as any).worldX * spine.scale.x + spine.x + 20 + 240;
            clickArea1.y =
              (currentBone as any).worldY * spine.scale.y + spine.y + 20;

            clickArea2.x =
              (currentBone as any).worldX * spine.scale.x + spine.x + 20 - 210;
            clickArea2.y =
              (currentBone as any).worldY * spine.scale.y + spine.y + 20;
          }
        };
        // 监听动画更新，同步位置
        app.ticker.add(updatePosition);

        return;
      }

      // 创建一个透明的点击区域
      const clickArea = new Graphics();
      clickArea.beginFill(0xff0000, 0.01); // 红色半透明，区分于bone bones
      clickArea.drawRect(-75, -75, 100, 100); // 点击区域大小
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
      clickArea.on('pointerdown', () => {
        if (boneName == 'close_btn') {
          const start = spine.state.setAnimation(1, 'close_start', false);
          start.listener = {
            complete: (entry) => {
              isClickOpenRef.current = false;
              // 播放 open_start 动画完成后，隐藏 boneBones 的 clickArea，显示 smallBones 的 clickArea
              toggleClickAreas(true, false);
              // 重置listIndexRef
              listIndexRef.current = 1;
              imageIndexRef.current = 0;
            },
          };
        } else if (boneName.startsWith('small_pic_img')) {
          let image_info_list = [];
          const image_info = localStorage.getItem('image_info') || '[]';
          if (image_info) {
            image_info_list = JSON.parse(image_info);
          }
          imageIndexRef.current = index;

          // 更换big_img
          const big_img_bone = spine.skeleton.findBone('big_pic_img');
          if (big_img_bone) {
            const big_img_bone_name = big_img_bone.data.name;
            const big_img_bone_slot =
              spine.skeleton.findSlot(big_img_bone_name);
            if (big_img_bone_slot) {
              const big_img_bone_slot_attachment =
                big_img_bone_slot.getAttachment();
              if (big_img_bone_slot_attachment) {
                const oldAttachment = big_img_bone_slot_attachment;
                const newAttachment = new MeshAttachment(
                  'big_pic_img',
                  'big_pic_img',
                );
                const buttonTexture = Texture.from(
                  image_info_list[
                    imageIndexRef.current + (listIndexRef.current - 1) * 6
                  ]?.image || 'null',
                );
                const textureRegion = new TextureRegion();
                textureRegion.texture = buttonTexture;
                textureRegion.size = new Rectangle(
                  0,
                  0,
                  buttonTexture.width,
                  buttonTexture.height,
                );
                newAttachment.region = textureRegion;
                newAttachment.width = (oldAttachment as MeshAttachment).width;
                newAttachment.height = (oldAttachment as MeshAttachment).height;
                newAttachment.regionUVs = (
                  oldAttachment as MeshAttachment
                ).regionUVs;
                newAttachment.triangles = (
                  oldAttachment as MeshAttachment
                ).triangles;
                newAttachment.vertices = (
                  oldAttachment as MeshAttachment
                ).vertices;
                newAttachment.worldVerticesLength = (
                  oldAttachment as MeshAttachment
                ).worldVerticesLength;
                (big_img_bone_slot as any).setAttachment(newAttachment);
              }
            }
          }
          const slot = spine.skeleton.findSlot('Illustrated_info_icon');
          const att =
            spine.skeleton.data.findSkin('default').attachments[
              slot.data.index
            ];
          const emun = {
            animal: 'sharpicons_Monkey',
            food: 'sharpicons_meat',
            tool: 'sharpicons_scissor',
          };
          (slot as any).setAttachment(
            att[
              emun[
                image_info_list[
                  imageIndexRef.current + (listIndexRef.current - 1) * 6
                ]?.source
              ]
            ],
          );

          const info_info = spine.skeleton.findSlot('info_info');
          const text =
            image_info_list[
              imageIndexRef.current + (listIndexRef.current - 1) * 6
            ].text;

          // 创建Canvas来生成文字图片
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // 设置Canvas尺寸 - 增加高度以支持多行文字
          const maxWidth = 180; // 限制文字最大宽度 - 从200减少到150
          const lineHeight = 14; // 行高 - 从20减少到16
          canvas.width = 300; // 从300减少到250
          canvas.height = 80; // 增加高度以支持多行

          // 设置文字样式
          ctx.fillStyle = '#bda286';
          ctx.font = 'bold 10px Arial, sans-serif'; // 从14px减少到12px
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // 绘制换行文字
          const lines = drawWrappedText(ctx, text, maxWidth, lineHeight);
          lines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, index * lineHeight + 10);
          });

          // 将Canvas转换为PIXI纹理
          const textTexture = Texture.from(canvas);
          const oldAttachment = (info_info as any).getAttachment();
          const textureRegion = new TextureRegion();
          textureRegion.texture = textTexture;
          textureRegion.size = new Rectangle(
            0,
            0,
            textTexture.width,
            textTexture.height,
          );
          // 创建新的RegionAttachment来替换原来的图片
          const newAttachment = new RegionAttachment(
            'confirm_info1',
            'confirm_info1',
          );
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
          (info_info as any).setAttachment(newAttachment);

          const big_pic_name = spine.skeleton.findSlot('big_pic_name');
          const text1 =
            image_info_list[
              imageIndexRef.current + (listIndexRef.current - 1) * 6
            ]?.name || '';

          const canvas1 = document.createElement('canvas');
          const ctx1 = canvas1.getContext('2d');
          if (!ctx1) return;

          // 设置画布尺寸 - 增加宽度以容纳更大的字体
          canvas1.width = 400; // 增加宽度
          canvas1.height = 40; // 增加高度

          // 设置文字样式
          ctx1.fillStyle = '#c8b28d';
          ctx1.font = 'bold 14px Arial, sans-serif';
          ctx1.textAlign = 'center';
          ctx1.textBaseline = 'middle'; // 改为 middle 让文字垂直居中

          // 绘制文字 - 使用画布中心坐标
          ctx1.fillText(text1, canvas1.width / 2, canvas1.height / 2);

          // 将Canvas转换为PIXI纹理
          const textTexture1 = Texture.from(canvas1);
          const oldAttachment1 = (big_pic_name as any).getAttachment();
          const textureRegion1 = new TextureRegion();
          textureRegion1.texture = textTexture1;
          textureRegion1.size = new Rectangle(
            0,
            0,
            textTexture1.width,
            textTexture1.height,
          );
          // 创建新的RegionAttachment来替换原来的图片
          const newAttachment1 = new RegionAttachment(
            'confirm_info1',
            'confirm_info1',
          );
          newAttachment1.region = textureRegion1;
          newAttachment1.width = oldAttachment1.width;
          newAttachment1.height = oldAttachment1.height;
          newAttachment1.offset = oldAttachment1.offset;
          newAttachment1.path = oldAttachment1.path;
          newAttachment1.uvs = oldAttachment1.uvs;
          newAttachment1.x = oldAttachment1.x;
          newAttachment1.y = oldAttachment1.y;
          newAttachment1.rotation = oldAttachment1.rotation;
          newAttachment1.scaleX = oldAttachment1.scaleX;
          newAttachment1.scaleY = oldAttachment1.scaleY;
          // 设置到slot
          (big_pic_name as any).setAttachment(newAttachment1);
        }
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

      // 将 clickArea 添加到数组中，用于后续控制显示/隐藏
      smallBonesClickAreasRef.current.push(clickArea);

      // 添加标签显示bone名称
      const label = new Text(boneName, {
        fontSize: 12,
        fill: 0xff0000, // 红色标签，区分于bone bones
        align: 'center',
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

  const changeNum = () => {
    let image_info_list = [];
    const image_info = localStorage.getItem('image_info') || '[]';
    if (image_info) {
      image_info_list = JSON.parse(image_info);
    }
    const spine = spineRef.current;

    const sticky_cotent_num = spine.skeleton.findSlot('sticky_cotent_num');
    const textNum = image_info_list.length;

    // 创建Canvas来生成文字图片
    const canvas1 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d');
    if (!ctx1) return;

    // 设置Canvas尺寸
    canvas1.width = 700; // 根据confirm_info的尺寸
    canvas1.height = 40;
    // 设置文字样式，字体颜色白色
    ctx1.fillStyle = '#d6c5a2';
    ctx1.font = 'bold 32px Arial, sans-serif';
    ctx1.textAlign = 'center';
    ctx1.textBaseline = 'middle';

    // 绘制文字
    ctx1.fillText(textNum.toString(), canvas1.width / 2, canvas1.height / 2);

    // 将Canvas转换为PIXI纹理
    const textTexturetextNum = Texture.from(canvas1);
    const oldAttachmenttextNum = (sticky_cotent_num as any).getAttachment();
    const textureRegiontextNum = new TextureRegion();
    textureRegiontextNum.texture = textTexturetextNum;
    textureRegiontextNum.size = new Rectangle(
      0,
      0,
      textTexturetextNum.width,
      textTexturetextNum.height,
    );
    // 创建新的RegionAttachment来替换原来的图片
    const newAttachmenttextNum = new RegionAttachment(
      'confirm_info2',
      'confirm_info2',
    );
    newAttachmenttextNum.region = textureRegiontextNum;
    newAttachmenttextNum.width = oldAttachmenttextNum.width;
    newAttachmenttextNum.height = oldAttachmenttextNum.height;
    newAttachmenttextNum.offset = oldAttachmenttextNum.offset;
    newAttachmenttextNum.path = oldAttachmenttextNum.path;
    newAttachmenttextNum.uvs = oldAttachmenttextNum.uvs;
    newAttachmenttextNum.x = oldAttachmenttextNum.x;
    newAttachmenttextNum.y = oldAttachmenttextNum.y;
    newAttachmenttextNum.rotation = oldAttachmenttextNum.rotation;
    newAttachmenttextNum.scaleX = oldAttachmenttextNum.scaleX;
    newAttachmenttextNum.scaleY = oldAttachmenttextNum.scaleY;
    // 设置到slot
    (sticky_cotent_num as any).setAttachment(newAttachmenttextNum);
  };

  useEffect(() => {
    const loadSpineAnimation = async () => {
      if (!canvasRef.current) return;

      try {
        const app = new Application({
          width: 1150,
          height: 700,
          // backgroundColor: 0xff0000,
          backgroundAlpha: 0,
          // 透明背景
          antialias: true,
          // resolution: window.devicePixelRatio || 1,
          resolution: 1,
        });

        // 将 PIXI 画布添加到 DOM
        canvasRef.current.appendChild(app.view as any);
        appRef.current = app;

        // 使用 PIXI.js 的加载器加载 Spine 资源
        const resource = await new Promise((resolve, reject) => {
          Assets.load('/assets/spine/show_spine/show_detail.json').then(
            (resource) => {
              resolve(resource);
            },
          );
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

        spine.state.addAnimation(0, 'close_idle', true, 0);
        // 为bone开头的bones添加点击事件
        addClickEventsToBoneBones();
        addClickEventsToSmallBones();
        addClickEventsToDecalsBones();

        changeNum();

        // 设置初始状态：显示 boneBones 的 clickArea，隐藏 smallBones 的 clickArea
        toggleClickAreas(true, false);
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
  }, []);

  return (
    <div className="min-h-screen bg-[#f5efe4] pt-responsive-1250" ref={outerRef}>
    <div
      className="flex justify-center flex-col mx-auto relative"
      style={{ width: '1150px', zoom: scale }}
    >
        {/* 返回按钮 */}
        <div
          onClick={async () => {
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
            router.push(`/`);
          }}
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
        </div>

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
        <header
          className="paper-card mb-6 px-6 py-4 flex justify-between items-center mt-[97px] w-[1150px] h-[700px]"
          style={{ height: '97px' }}
        >
          <h1 className="text-2xl font-bold text-[transparent]">
            Spine 动画展示
          </h1>
          <p className="text-[transparent] mt-2">
            使用 PIXI.js 和 pixi-spine 渲染 hand 动画
          </p>
          <div className="relative">
            <div className="badge-circle w-10 h-10 rounded-full grid place-items-center">
              <span className="text-yellow-300 text-xl">★</span>
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}
