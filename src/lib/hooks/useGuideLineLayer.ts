import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

interface GuideLineLayerOptions {
  /**
   * 用作参考线的图片URL或路径
   */
  imageUrl: string;
  /**
   * 参考线图片的期望高度
   * @default 500
   */
  height?: number;
  /**
   * 参考线图片的透明度 (0-1)
   * @default 0.2
   */
  alpha?: number;
  /**
   * 参考线图片的x坐标
   * @default 300
   */
  x?: number;
  /**
   * 参考线图片的y坐标
   * @default 150
   */
  y?: number;
  /**
   * 参考线的z-index/图层顺序
   * @default 1
   */
  zIndex?: number;
}

/**
 * 用于在PIXI.js中创建和管理参考线图层的自定义hook
 * @param app PIXI应用实例
 * @param options 参考线图层的配置选项
 * @param createLayer 创建具有指定z-index的新PIXI容器的函数
 */
export function useGuideLineLayer(
  app: PIXI.Application | null,
  options: GuideLineLayerOptions,
  createLayer: (zIndex: number) => PIXI.Container
) {
  const {
    imageUrl,
    height = 500,
    alpha = 0.2,
    x = 300,
    y = 150,
    zIndex = 99999,
  } = options;

  const guideLayerRef = useRef<PIXI.Container | null>(null);
  const spriteRef = useRef<PIXI.Sprite | null>(null);

  useEffect(() => {
    if (!app) return;

    // 创建参考线图层
    const guideLayer = createLayer(zIndex);
    guideLayerRef.current = guideLayer;
    app.stage.addChild(guideLayer);

    // 创建精灵但先不显示
    const sprite = PIXI.Sprite.from(imageUrl);
    // 使用居中锚点，确保 x/y 表示图片中心位置
    sprite.anchor.set(0.5, 0.5);
    // 先把位置放到目标中心，避免加载中出现在左上角
    sprite.position.set(x, y);
    sprite.alpha = 0;
    spriteRef.current = sprite;
    guideLayer.addChild(sprite);

    // 设置纹理更新处理函数
    const onTextureUpdate = (baseTexture: PIXI.BaseTexture) => {
      if (!sprite.texture.valid) return;

      const aspectRatio = baseTexture.width / baseTexture.height;
      sprite.height = height;
      sprite.width = height * aspectRatio;
      sprite.alpha = alpha;
      // 由于锚点为居中，直接将位置设置为中心点
      sprite.position.set(x, y);
    };

    // 如果纹理已经加载，立即更新
    if (sprite?.texture?.baseTexture?.valid) {
      onTextureUpdate(sprite?.texture?.baseTexture);
    } else {
      // 否则等待纹理加载完成
      sprite?.texture?.baseTexture?.on("update", onTextureUpdate);
    }

    // 清理函数
    return () => {
      if (sprite?.texture?.baseTexture) {
        sprite.texture.baseTexture.off("update", onTextureUpdate);
      }
      if (guideLayer.parent) {
        guideLayer.parent.removeChild(guideLayer);
      }
      guideLayer.destroy({ children: true });
      guideLayerRef.current = null;
      spriteRef.current = null;
    };
  }, [app, imageUrl, height, alpha, x, y, zIndex, createLayer]);

  return {
    /**
     * 显示参考线图层
     */
    show: () => {
      if (spriteRef.current) {
        spriteRef.current.alpha = alpha;
      }
    },

    /**
     * 隐藏参考线图层
     */
    hide: () => {
      if (spriteRef.current) {
        spriteRef.current.alpha = 0;
      }
    },

    /**
     * 切换参考线图层的可见性
     */
    toggle: () => {
      if (spriteRef.current) {
        spriteRef.current.alpha = spriteRef.current.alpha > 0 ? 0 : alpha;
      }
    },

    /**
     * 更新参考线图层的大小
     * @param newHeight 新的高度值
     */
    updateSize: (newHeight: number) => {
      if (!spriteRef.current || !spriteRef.current.texture) return;

      const aspectRatio =
        spriteRef.current.texture.baseTexture.width / spriteRef.current.texture.baseTexture.height;

      // 更新精灵大小
      spriteRef.current.height = newHeight;
      spriteRef.current.width = newHeight * aspectRatio;

      // 保持居中位置
      spriteRef.current.position.set(x, y);
    },

    /**
     * 更新参考线图片
     * @param newImageUrl 新的图片URL
     */
    updateImage: (newImageUrl: string) => {
      if (!spriteRef.current) return;

      const oldTexture = spriteRef.current.texture;
      const newTexture = PIXI.Texture.from(newImageUrl);

      // 更新精灵纹理
      spriteRef.current.texture = newTexture;
      // 立即把位置放到中心，避免加载中在左上角闪烁
      spriteRef.current.position.set(x, y);

      // 清理旧纹理（如果存在）
      if (oldTexture && oldTexture !== newTexture) {
        oldTexture.destroy(true);
      }

      // 如果新纹理已加载，更新其尺寸
      if (newTexture.baseTexture.valid) {
        const aspectRatio =
          newTexture.baseTexture.width / newTexture.baseTexture.height;
        if (spriteRef.current) {
          spriteRef.current.height = height;
          spriteRef.current.width = height * aspectRatio;
          // 保持以中心对齐的位置
          spriteRef.current.position.set(x, y);
        }
      } else {
        // 尚未就绪时，等待纹理就绪再正确设置尺寸与位置
        newTexture.baseTexture.on("update", () => {
          const aspectRatio =
            newTexture.baseTexture.width / newTexture.baseTexture.height;
          if (spriteRef.current) {
            spriteRef.current.height = height;
            spriteRef.current.width = height * aspectRatio;
            spriteRef.current.position.set(x, y);
          }
        });
      }
    },
  };
}

export default useGuideLineLayer;
