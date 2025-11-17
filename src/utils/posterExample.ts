import { generatePoster, quickPoster, posterStyles } from './posterGenerator';

/**
 * 海报生成使用示例
 */
export class PosterExample {

  /**
   * 基础使用示例
   */
  static async basicExample() {
    try {
      const poster = await generatePoster({
        title: '欢迎使用海报生成器',
      });

      return poster;
    } catch (error) {
      console.error('生成海报失败:', error);
      throw error;
    }
  }

  /**
   * 使用预设样式示例
   */
  static async presetStyleExample() {
    try {
      // 使用现代风格
      const modernPoster = await quickPoster(
        '现代风格海报',
        '简洁而富有设计感',
        'modern'
      );

      // 使用优雅风格
      const elegantPoster = await quickPoster(
        '优雅风格海报',
        '经典而精致的排版',
        'elegant'
      );

      // 使用活力风格
      const vibrantPoster = await quickPoster(
        '活力风格海报',
        '充满活力的色彩搭配',
        'vibrant'
      );

      return { modernPoster, elegantPoster, vibrantPoster };
    } catch (error) {
      console.error('生成预设样式海报失败:', error);
      throw error;
    }
  }

  /**
   * 自定义样式示例
   */
  static async customStyleExample() {
    try {
      const poster = await generatePoster({
        title: '自定义样式海报',
      });

      return poster;
    } catch (error) {
      console.error('生成自定义样式海报失败:', error);
      throw error;
    }
  }

  /**
   * 活动海报示例
   */
  static async eventPosterExample() {
    try {
      const poster = await generatePoster({
        title: '2024年技术大会',
      });

      return poster;
    } catch (error) {
      console.error('生成活动海报失败:', error);
      throw error;
    }
  }

  /**
   * 产品海报示例
   */
  static async productPosterExample() {
    try {
      const poster = await generatePoster({
        title: '新一代智能产品',
      });

      return poster;
    } catch (error) {
      console.error('生成产品海报失败:', error);
      throw error;
    }
  }

  /**
   * 将海报添加到页面
   */
  static addPosterToPage(poster: HTMLImageElement, containerId: string) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      container.appendChild(poster);
    } else {
      console.error(`找不到容器元素: ${containerId}`);
    }
  }

  /**
   * 下载海报
   */
  static downloadPoster(poster: HTMLImageElement, filename: string = 'poster.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = poster.src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
