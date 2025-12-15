'use client';

import Clarity from '@microsoft/clarity';

// 这里需要替换为您的实际 Clarity 项目 ID
// 您需要从 Microsoft Clarity 网站获取项目 ID
// https://clarity.microsoft.com/
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'ulubnqia0k';

/**
 * 初始化 Microsoft Clarity
 * 用于跟踪页面访问和用户行为
 */
export function initClarity() {
  // 确保代码只在客户端执行，并且只初始化一次
  Clarity.init(CLARITY_PROJECT_ID);
}

/**
 * 手动发送页面浏览事件
 * 可以在SPA页面切换时调用
 * @param {string} pageName - 页面名称
 */
export function trackPageView(pageName: string) {
  if (typeof window !== 'undefined' && window.clarity) {
    Clarity.event(`pageview: ${pageName}`);
    console.log(`Manual page view tracked: ${pageName}`);
  }
}

// 声明全局 window 类型，包含 clarity
declare global {
  interface Window {
    clarity: any;
  }
}
