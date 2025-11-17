interface PosterConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  title?: string;
  subtitle1?: string; // 右上角副标题1
  subtitle2?: string; // 右下角副标题2
  subtitle3?: string; // 背景20%透明度的白色副标题3
  titleFontSize?: number;
  subtitleFontSize?: number;
  backgroundSubtitleFontSize?: number;
  titleFontFamily?: string;
  subtitleFontFamily?: string;
  backgroundSubtitleFontFamily?: string;
  borderRadius?: number;
}

// 预设色板
const colorPalette = [
  '#8dc37b', // 深蓝色
  '#7bc3a3', // 深青蓝色
  '#c3947b', // 深灰蓝色
  '#c37b7b', // 深蓝灰色
  '#807bc3', // 深靛蓝色
  '#bc7bc3', // 深蓝色
  '#c37b94', // 深蓝色
  '#49a36b', // 深蓝灰色
];

/**
 * 海报生成工具函数 - 新布局
 * @param config 海报配置信息
 * @returns Promise<HTMLImageElement> 生成的海报图片
 */
export async function generatePoster(config: PosterConfig): Promise<HTMLImageElement> {
  const {
    width = 800,
    height = 1200,
    backgroundColor,
    title = '苹果真香',
    subtitle1 = 'Apple',
    subtitle2 = '水果系列',
    subtitle3 = '好吃的苹果',
    titleFontSize = 120,
    subtitleFontSize = 32,
    backgroundSubtitleFontSize = 120,
    titleFontFamily = 'Arial, sans-serif',
    subtitleFontFamily = 'Arial, sans-serif',
    backgroundSubtitleFontFamily = 'Arial, sans-serif',
    borderRadius = 0
  } = config;

  // 创建canvas元素
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('无法获取canvas上下文');
  }

  // 设置canvas尺寸
  canvas.width = width;
  canvas.height = height;

  // 随机选择背景色
  const randomBackgroundColor = backgroundColor || colorPalette[Math.floor(Math.random() * colorPalette.length)];

  // 绘制背景
  ctx.fillStyle = randomBackgroundColor;
  if (borderRadius > 0) {
    // 绘制圆角矩形背景
    ctx.beginPath();
    ctx.moveTo(borderRadius, 0);
    ctx.lineTo(width - borderRadius, 0);
    ctx.quadraticCurveTo(width, 0, width, borderRadius);
    ctx.lineTo(width, height - borderRadius);
    ctx.quadraticCurveTo(width, height, width - borderRadius, height);
    ctx.lineTo(borderRadius, height);
    ctx.quadraticCurveTo(0, height, 0, height - borderRadius);
    ctx.lineTo(0, borderRadius);
    ctx.quadraticCurveTo(0, 0, borderRadius, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, width, height);
  }

          // 绘制背景副标题3（20%透明度的白色）- 四个角依次排列
  if (subtitle3) {
    ctx.font = `${backgroundSubtitleFontSize}px ${backgroundSubtitleFontFamily}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 将文字拆分成单个字符
    const characters = subtitle3.split('');

    // 定义四个角的区域
    const corners = [
      { x: 0, y: 0, width: 200, height: 200 },           // 左上角
      { x: width - 200, y: 0, width: 200, height: 200 },   // 右上角
      { x: 0, y: height - 200, width: 200, height: 200 },  // 左下角
      { x: width - 200, y: height - 200, width: 200, height: 200 } // 右下角
    ];

    // 在四个角依次排列字符
    characters.forEach((char, index) => {
      const cornerIndex = index % 4;
      const corner = corners[cornerIndex];

      // 在对应角区域内随机位置
      const x = corner.x + Math.random() * corner.width;
      const y = corner.y + Math.random() * corner.height;

      // 随机字体大小（背景字体的70%-120%）
      const randomSize = backgroundSubtitleFontSize * (0.7 + Math.random() * 0.5);

      // 随机旋转角度（-20度到20度）
      const rotation = (Math.random() - 0.5) * 40;

      // 保存当前状态
      ctx.save();

      // 移动到字符位置并旋转
      ctx.translate(x, y);
      ctx.rotate(rotation * Math.PI / 180);

      // 设置随机字体大小
      ctx.font = `${randomSize}px ${backgroundSubtitleFontFamily}`;

      // 绘制字符
      ctx.fillText(char, 0, 0);

      // 恢复状态
      ctx.restore();
    });
  }

    // 绘制标题（永远垂直水平居中，白色）
  ctx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 标题换行处理
  const titleLines = wrapText(ctx, title, width - 80, titleFontSize);
  const titleY = height / 2 - (titleLines.length * (titleFontSize + 20)) / 2 + 75;

  titleLines.forEach((line, index) => {
    const y = titleY + index * (titleFontSize + 20);
    ctx.fillText(line, width / 2, y);
  });

  // 绘制右上角副标题1
  if (subtitle1) {
    ctx.font = `${subtitleFontSize}px ${subtitleFontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const subtitle1X = width - 40;
    const subtitle1Y = 40;
    ctx.fillText(subtitle1, subtitle1X, subtitle1Y);
  }

  // 绘制右下角副标题2
  if (subtitle2) {
    ctx.font = `${subtitleFontSize}px ${subtitleFontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const subtitle2X = width - 40;
    const subtitle2Y = height - 40;
    ctx.fillText(subtitle2, subtitle2X, subtitle2Y);
  }

  // 转换为Image对象
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/png');
  });
}



/**
 * 文字换行处理
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
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
}

/**
 * 加载图片
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 预设海报样式
 */
export const posterStyles = {
  modern: {
    backgroundColor: '#2c3e50',
    title: '苹果真香',
    subtitle1: 'Apple',
    subtitle2: '水果系列',
    subtitle3: 'Fragrance',
    borderRadius: 0
  },
  elegant: {
    backgroundColor: '#34495e',
    title: '苹果真香',
    subtitle1: 'Apple',
    subtitle2: '水果系列',
    subtitle3: 'Fragrance',
    borderRadius: 0
  },
  vibrant: {
    backgroundColor: '#1e3a8a',
    title: '苹果真香',
    subtitle1: 'Apple',
    subtitle2: '水果系列',
    subtitle3: 'Fragrance',
    borderRadius: 0
  },
  minimal: {
    backgroundColor: '#1e293b',
    title: '苹果真香',
    subtitle1: 'Apple',
    subtitle2: '水果系列',
    subtitle3: 'Fragrance',
    borderRadius: 0
  }
};

/**
 * 快速生成海报的便捷方法
 */
export async function quickPoster(
  title: string,
  subtitle1?: string,
  subtitle2?: string,
  subtitle3?: string,
  style: keyof typeof posterStyles = 'modern'
): Promise<HTMLImageElement> {
  const baseConfig = posterStyles[style];
  return generatePoster({
    ...baseConfig,
    title: title || baseConfig.title,
    subtitle1: subtitle1 || baseConfig.subtitle1,
    subtitle2: subtitle2 || baseConfig.subtitle2,
    subtitle3: subtitle3 || baseConfig.subtitle3
  });
}
