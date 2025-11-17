# Spine 动画展示页面

这个页面用于展示 Spine 4.x 动画。

## 功能特性

- 自动加载 Spine 运行时（从 CDN）
- 渲染 hand 动画
- 支持三种动画模式：
  - `start`: 开始动画
  - `idle`: 待机动画（循环播放）
  - `end`: 结束动画
- 支持播放完整动画序列：start → idle → end
- 实时动画控制按钮
- 错误处理和加载状态显示

## 使用方法

1. 访问 `/painter` 页面
2. 等待 Spine 运行时和动画资源加载完成
3. 使用控制按钮播放不同的动画

## 技术实现

- 使用 Canvas 2D 渲染
- 使用 Spine 4.x npm 包
- 异步加载纹理和骨骼数据
- 实时动画更新循环

## 文件结构

```
public/assets/spine/hand/
├── hand.atlas    # 纹理图集文件
├── hand.json     # 骨骼动画数据
└── hand.png      # 纹理图片
```

## 注意事项

- 需要安装 @esotericsoftware/spine-canvas 依赖
- 确保资源文件路径正确
- 动画文件使用 Spine 4.x 格式 
