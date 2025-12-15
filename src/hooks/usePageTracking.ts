'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Clarity from '@microsoft/clarity';
import { trackPageView } from '../lib/clarity';

/**
 * 自定义 Hook 用于页面追踪
 * 在每个页面路由变化时自动发送页面浏览事件
 *
 * 使用方法：
 * 在客户端组件中调用 usePageTracking()
 */
export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 确保代码只在客户端执行
    if (typeof window === 'undefined') return;

    // 构建完整的URL
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    const pageTitle = document.title || '趣绘像素岛';

    // 延迟一点点时间确保页面完全加载
    const timer = setTimeout(() => {
      // 检查 clarity 是否已初始化
      if (window.clarity) {
        try {
          // 使用 Clarity 的自定义事件 API
          Clarity.setTag('page_path', pathname);
          Clarity.setTag('page_url', url);
          Clarity.setTag('page_title', pageTitle);

          // 发送页面浏览事件
          Clarity.event(`pageview: ${JSON.stringify({
            page_path: pathname,
            page_url: url,
            page_title: pageTitle,
            timestamp: new Date().toISOString()
          })}`);

          console.log(`Page tracked: ${url}`);
        } catch (error) {
          console.error('Failed to track page view:', error);
        }
      } else {
        console.warn('Clarity not initialized yet. Page view not tracked.');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]); // 依赖项：当路径或查询参数变化时重新执行
}

