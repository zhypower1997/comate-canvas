# 海报生成工具

一个功能强大的海报生成工具，支持多种预设样式和完全自定义配置，能够生成高质量的海报图片。

## 功能特点

- 🎨 **多种预设样式**: 现代、优雅、活力、极简等风格
- 🎯 **完全自定义**: 支持自定义颜色、字体、尺寸、布局
- 🌈 **渐变背景**: 支持线性渐变背景效果
- ✨ **阴影效果**: 可选的阴影和圆角设计
- 🖼️ **图片支持**: 支持背景图片和Logo添加
- 📱 **响应式设计**: 自动文字换行和布局优化
- 💾 **一键下载**: 生成的图片可直接下载使用

## 安装和使用

### 1. 导入工具函数

```typescript
import { generatePoster, quickPoster, posterStyles } from '@/utils/posterGenerator';
```

### 2. 基础使用

#### 使用预设样式快速生成

```typescript
// 使用现代风格
const poster = await quickPoster(
  '海报标题',
  '副标题',
  ['内容行1', '内容行2', '内容行3'],
  'modern'
);
```

#### 完全自定义配置

```typescript
const poster = await generatePoster({
  title: '自定义标题',
  subtitle: '自定义副标题',
  content: ['内容1', '内容2', '内容3'],
  width: 800,
  height: 1200,
  backgroundColor: '#ffffff',
  titleColor: '#333333',
  borderRadius: 20,
  shadow: true,
  gradient: true,
  gradientColors: ['#ff6b6b', '#4ecdc4']
});
```

### 3. 配置选项

#### PosterConfig 接口

```typescript
interface PosterConfig {
  width?: number;                    // 海报宽度，默认800
  height?: number;                   // 海报高度，默认1200
  backgroundColor?: string;          // 背景颜色
  title?: string;                    // 主标题
  subtitle?: string;                 // 副标题
  content?: string[];                // 内容数组
  titleColor?: string;               // 标题颜色
  subtitleColor?: string;            // 副标题颜色
  contentColor?: string;             // 内容颜色
  titleFontSize?: number;            // 标题字体大小
  subtitleFontSize?: number;         // 副标题字体大小
  contentFontSize?: number;          // 内容字体大小
  titleFontFamily?: string;          // 标题字体
  subtitleFontFamily?: string;       // 副标题字体
  contentFontFamily?: string;        // 内容字体
  backgroundImage?: string;          // 背景图片URL
  logo?: string;                     // Logo图片URL
  logoSize?: number;                 // Logo大小
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  borderRadius?: number;             // 圆角半径
  shadow?: boolean;                  // 是否显示阴影
  gradient?: boolean;                // 是否使用渐变背景
  gradientColors?: string[];         // 渐变颜色数组
}
```

### 4. 预设样式

#### 现代风格 (modern)
- 深色背景配合渐变
- 白色和蓝色系文字
- 圆角设计和阴影效果

#### 优雅风格 (elegant)
- 浅色背景
- 灰色系文字
- 简洁的圆角设计

#### 活力风格 (vibrant)
- 鲜艳的红色背景
- 白色和黄色系文字
- 渐变效果和现代感

#### 极简风格 (minimal)
- 纯白背景
- 黑色系文字
- 无圆角无阴影

## 使用示例

### 活动海报

```typescript
const eventPoster = await generatePoster({
  title: '2024年技术大会',
  subtitle: '探索未来，拥抱创新',
  content: [
    '时间: 2024年12月15日',
    '地点: 北京国际会议中心',
    '主题: AI时代的机遇与挑战'
  ],
  width: 900,
  height: 1300,
  backgroundColor: '#1e3a8a',
  titleColor: '#fbbf24',
  subtitleColor: '#60a5fa',
  contentColor: '#ffffff',
  borderRadius: 25,
  shadow: true,
  gradient: true,
  gradientColors: ['#1e3a8a', '#3b82f6', '#1e3a8a']
});
```

### 产品海报

```typescript
const productPoster = await generatePoster({
  title: '新一代智能产品',
  subtitle: '科技改变生活',
  content: [
    '产品特点:',
    '• 智能识别技术',
    '• 高效处理能力',
    '• 人性化设计',
    '价格: ¥2999起'
  ],
  width: 800,
  height: 1200,
  backgroundColor: '#ffffff',
  titleColor: '#1f2937',
  subtitleColor: '#6b7280',
  contentColor: '#374151',
  borderRadius: 20,
  shadow: true
});
```

### 添加Logo和背景图片

```typescript
const posterWithAssets = await generatePoster({
  title: '品牌海报',
  subtitle: '专业品质，值得信赖',
  content: ['产品介绍', '服务承诺', '联系方式'],
  backgroundImage: '/images/background.jpg',
  logo: '/images/logo.png',
  logoSize: 100,
  logoPosition: 'top-right',
  borderRadius: 20,
  shadow: true
});
```

## 工具函数

### generatePoster(config: PosterConfig)
主要的海报生成函数，支持完整的自定义配置。

### quickPoster(title, subtitle, content, style)
快速生成海报的便捷方法，使用预设样式。

### posterStyles
预设样式配置对象，包含多种风格的海报样式。

## 在React组件中使用

```typescript
import { useState } from 'react';
import { generatePoster } from '@/utils/posterGenerator';

export default function PosterComponent() {
  const [poster, setPoster] = useState<HTMLImageElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePoster = async () => {
    setIsGenerating(true);
    try {
      const generatedPoster = await generatePoster({
        title: '我的海报',
        subtitle: '副标题',
        content: ['内容1', '内容2'],
        width: 800,
        height: 1200
      });
      setPoster(generatedPoster);
    } catch (error) {
      console.error('生成海报失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button onClick={handleGeneratePoster} disabled={isGenerating}>
        {isGenerating ? '生成中...' : '生成海报'}
      </button>
      
      {poster && (
        <div>
          <img src={poster.src} alt="生成的海报" />
          <p>尺寸: {poster.width} × {poster.height}</p>
        </div>
      )}
    </div>
  );
}
```

## 下载海报

```typescript
// 下载海报到本地
function downloadPoster(poster: HTMLImageElement, filename: string = 'poster.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = poster.src;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 使用示例
downloadPoster(poster, 'my-poster.png');
```

## 注意事项

1. **浏览器兼容性**: 需要支持Canvas API的现代浏览器
2. **图片加载**: 背景图片和Logo需要支持跨域访问
3. **字体支持**: 自定义字体需要确保在目标环境中可用
4. **性能考虑**: 生成大尺寸海报时注意内存使用

## 演示页面

访问 `/poster-demo` 页面可以查看完整的演示和测试各种功能。

## 许可证

MIT License 
