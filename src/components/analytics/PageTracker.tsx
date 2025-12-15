'use client';

import { useEffect } from 'react';
import { usePageTracking } from '../../hooks/usePageTracking';
import { initClarity } from '../../lib/clarity';

/**
 * 页面跟踪组件
 * 使用此组件在布局中可以确保每个页面的访问都被跟踪
 * 该组件负责：
 * 1. 初始化 Microsoft Clarity
 * 2. 跟踪页面浏览量 (PV)
 * 3. 跟踪独立访问用户 (UV) - 由 Clarity 自动处理
 */
export function PageTracker() {
  // 初始化 Clarity
  useEffect(() => {
    initClarity();
  }, []);

  // 使用自定义 Hook 跟踪页面浏览
  usePageTracking();

  // 这个组件不渲染任何内容，仅用于跟踪
  return null;
}
