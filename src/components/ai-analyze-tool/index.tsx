'use client';
import React, { useState, useEffect, useRef } from 'react';
import AnimationText from '../animation-text';

interface AIAnalysisResponse {
  code: number;
  message: string;
  data: {
    conversationId: string;
    requestId: string;
    messageId: string;
    traceId: string;
    contents: Array<{
      type: string;
      text: string;
    }>;
  };
}

// AI分析接口类型定义
interface AIAnalysisRequest {
  appId: string;
  userId: string;
  userType: string;
  accessToken: string;
  utterances: Array<{
    type: 'TEXT' | 'IMAGE';
    content: string;
    mimeType?: string;
  }>;
}

interface AiData {
  mask: string;
  text: string;
}

interface AIAnalyzeToolProps {
  getImageDataUrl: () => Promise<string>;
  displayName: string;
  accessToken: string;
  aiData: AiData[];
  currentStep: number;
}

const userId = 'www' + Math.floor(Math.random() * 1000000);

export default function AIAnalyzeTool({
  getImageDataUrl,
  displayName,
  accessToken,
  aiData,
  currentStep,
}: AIAnalyzeToolProps) {
  // 拖拽相关状态
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>(''); // 显示的内容
  const [aiResponseCache, setAiResponseCache] = useState<string>(''); // 缓存的完整内容
  const [thinkingProcess, setThinkingProcess] = useState<string>(''); // 显示的思考过程
  const [thinkingProcessCache, setThinkingProcessCache] = useState<string>(''); // 缓存的完整思考过程
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isResponseExpanded, setIsResponseExpanded] = useState<boolean>(false);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState<boolean>(true); // 新增：思考过程展开状态
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 50, y: 250 });
  const [dragStartPosition, setDragStartPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState<boolean>(false);

  const dragRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingScrollRef = useRef<HTMLDivElement>(null); // 新增：思考过程滚动容器的ref

  // 自动滚动到思考过程底部
  useEffect(() => {
    if (thinkingScrollRef.current && thinkingProcess) {
      const scrollContainer = thinkingScrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [thinkingProcess]); // 监听思考过程内容变化

  // 流式输出思考过程
  useEffect(() => {
    if (
      thinkingProcessCache &&
      thinkingProcess.length < thinkingProcessCache.length
    ) {
      thinkingTimerRef.current = setTimeout(() => {
        setThinkingProcess((prev) => {
          const nextChar = thinkingProcessCache[prev.length];
          return prev + nextChar;
        });
      }, 5); // 0.5秒一个字符
    }

    return () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
    };
  }, [thinkingProcessCache, thinkingProcess]);

  // 流式输出最终结果 - 必须等思考过程完全输出完毕
  useEffect(() => {
    // 只有在思考完成、思考过程完全输出完毕且有响应内容时才开始输出
    const isThinkingFullyOutputted =
      thinkingProcessCache &&
      thinkingProcess.length === thinkingProcessCache.length;

    if (
      !isThinking &&
      isThinkingFullyOutputted &&
      aiResponseCache &&
      aiResponse.length < aiResponseCache.length
    ) {
      responseTimerRef.current = setTimeout(() => {
        setAiResponse((prev) => {
          const nextChar = aiResponseCache[prev.length];
          return prev + nextChar;
        });
      }, 5); // 0.5秒一个字符
    }

    return () => {
      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current);
      }
    };
  }, [
    aiResponseCache,
    aiResponse,
    isThinking,
    thinkingProcessCache,
    thinkingProcess,
  ]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
      if (responseTimerRef.current) {
        clearTimeout(responseTimerRef.current);
      }
    };
  }, []);

  // 拖拽处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setDragStartPosition({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  // AI分析函数
  const handleAIAnalysis = async (e?: React.MouseEvent) => {
    // 如果刚刚拖拽过，则不执行分析
    if (hasDragged) {
      e?.preventDefault();
      e?.stopPropagation();
      return;
    }
    const imageDataUrl = await getImageDataUrl();
    if (!imageDataUrl) {
      console.error('图片不存在');
      return;
    }

    // 清理之前的定时器
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
    }
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
    }

    setIsAnalyzing(true);
    setIsThinking(true);
    setAiResponse('');
    setAiResponseCache('');
    setThinkingProcess('');
    setThinkingProcessCache('');
    setIsResponseExpanded(true);
    setIsThinkingExpanded(true); // 开始分析时展开思考过程

    try {
      // 准备请求数据
      const requestData: AIAnalysisRequest = {
        appId: '1964643422191878201',
        userId: userId,
        userType: 'MIS',
        accessToken: accessToken,
        utterances: [
          {
            type: 'TEXT',
            content: `小朋友在画${displayName}，现在处于步骤「${
              aiData?.[currentStep]?.text
            }」，全部步骤为「${aiData
              ?.map((item, index) => `步骤${index + 1}：${item.text}`)
              .join('，')}」，请分析下图，给出本步骤下遗漏的细节提示`,
            mimeType: 'text/xml',
          },
          {
            type: 'IMAGE',
            content: imageDataUrl,
          },
        ],
      };

      // 发送API请求
      const response = await fetch('https://aigc.com/conversation/v2/openapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('response', response);
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => line.trim());

        for (const line of lines) {
          const jsonStr = line.replace('data:', '');
          console.log('jsonStr', jsonStr);

          try {
            const json = JSON.parse(jsonStr);
            if (json.data) {
              // 处理思考过程 - 缓存完整内容
              if (json.data.verboseContents?.[0]?.content) {
                const thinkingContent = json.data.verboseContents[0].content;
                console.log('jsonStr-thinking', thinkingContent);
                setThinkingProcessCache(thinkingContent);
              }

              // 处理最终结果 - 缓存完整内容
              if (json.data.contents) {
                if (json.data.contents[0]?.text !== '[DONE]') {
                  const content = json.data.contents[0]?.text;
                  setAiResponseCache(content);
                  setIsThinking(false); // 有最终结果时停止思考状态
                }
              }
            }
          } catch (error) {
            console.log('Failed to parse JSON', error);
          }
        }
      }
    } catch (error) {
      console.error('AI分析出错:', error);
      setAiResponseCache('AI分析出错，请重试');
      setThinkingProcessCache('');
      setIsThinking(false);
    } finally {
      setIsAnalyzing(false);
      setIsThinking(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // 计算拖拽距离
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartPosition.x, 2) +
        Math.pow(e.clientY - dragStartPosition.y, 2),
    );

    // 只有当拖拽距离超过5像素时才认为是真正的拖拽
    if (dragDistance > 5) {
      setHasDragged(true);
    }

    // 限制拖拽范围在视窗内
    const maxX = window?.innerWidth - 200; // 按钮宽度
    const maxY = window?.innerHeight - 100; // 按钮高度

    setButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // 延迟重置hasDragged，确保onClick事件能正确判断
    setTimeout(() => {
      setHasDragged(false);
    }, 100);
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // 防止拖拽时选中文本
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset]);

  // 判断是否还在输出中
  const isThinkingOutputting =
    thinkingProcessCache &&
    thinkingProcess.length < thinkingProcessCache.length;
  const isResponseOutputting =
    aiResponseCache && aiResponse.length < aiResponseCache.length;
  const isOutputting = isThinkingOutputting || isResponseOutputting;

  // 判断整个流程是否完成
  const isProcessComplete = !isAnalyzing && !isThinking && !isOutputting;

  // 跳动文字组件
  const BounceText = ({ text }: { text: string }) => {
    return (
      <>
        {text.split('').map((char, index) => (
          <span
            key={index}
            className="inline-block animate-bounce"
            style={{
              animationDelay: `${index * 0.1}s`,
              animationDuration: '0.6s',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </>
    );
  };

  return (
    <div
      ref={dragRef}
      className="fixed z-10 select-none"
      style={{
        left: `${buttonPosition.x}px`,
        top: `${buttonPosition.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <button
        onClick={handleAIAnalysis}
        onMouseDown={handleMouseDown}
        disabled={isAnalyzing}
        className={`relative overflow-hidden group transition-all duration-300 transform hover:scale-105 active:scale-95 ${
          isAnalyzing ? 'cursor-not-allowed' : ''
        } ${isDragging ? 'shadow-2xl' : 'shadow-lg'}`}
        style={{
          cursor: isDragging
            ? 'grabbing'
            : isAnalyzing
            ? 'not-allowed'
            : 'grab',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 保持原色不变
          borderRadius: '25px',
          padding: '12px 24px',
          border: 'none',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          position: 'relative',
        }}
      >
        {/* 可爱的装饰元素 */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-200/20 to-purple-200/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* 按钮内容 */}
        <div className="relative flex items-center justify-center gap-2">
          <span>遇到难题了吗，让熊宝帮你出出招</span>
          <div className="w-3 h-3 text-yellow-200 animate-pulse">✨</div>
        </div>

        {/* 思考时的循环光效动画 */}
        {isAnalyzing && (
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
            style={{
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          ></div>
        )}

        {/* 悬停时的光效 */}
        {!isAnalyzing && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        )}
      </button>

      {/* AI分析结果弹窗 */}
      {(isAnalyzing || thinkingProcess || aiResponse) && (
        <div className="mt-4 bg-white rounded-lg shadow-lg w-[300px] border border-gray-200 max-h-120 flex flex-col">
          {/* 弹窗头部 - 简化loading状态 */}
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100"
            onClick={() => setIsResponseExpanded(!isResponseExpanded)}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-sm">
                {isProcessComplete ? (
                  '看看熊宝出的好点子'
                ) : (
                  <AnimationText text="熊宝正在努力思考中..." />
                )}
              </h3>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">
                {isResponseExpanded ? '点击收起' : '点击展开'}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isResponseExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* 弹窗内容 */}
          {isResponseExpanded && (
            <div className="flex flex-col overflow-hidden">
              {/* 思考过程区域 */}
              {thinkingProcess && (
                <div className="border-b border-gray-100">
                  <div
                    className="px-3 py-2 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                    onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-blue-700">
                        熊宝的思考过程
                      </span>
                      <svg
                        className={`w-3 h-3 text-blue-700 transition-transform duration-200 ${
                          isThinkingExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    {isThinkingExpanded && (
                      <div
                        ref={thinkingScrollRef}
                        className="max-h-32 overflow-y-auto scroll-smooth"
                        style={{
                          scrollBehavior: 'smooth',
                        }}
                      >
                        <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-wrap">
                          {thinkingProcess}
                          {isThinkingOutputting && (
                            <span className="animate-pulse">|</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 最终结果区域 - 只在思考过程完全输出完毕后显示 */}
              {!isThinking &&
                thinkingProcessCache &&
                thinkingProcess.length === thinkingProcessCache.length &&
                aiResponse && (
                  <div className="px-3 py-3 ">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        分析完成
                      </span>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      <p className="text-gray-700 h-[180px] text-sm leading-relaxed ">
                        {aiResponse}
                        {isResponseOutputting && (
                          <span className="animate-pulse">|</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {/* 加载状态但还没有内容时的占位 */}
              {isAnalyzing && !thinkingProcess && !aiResponse && (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-gray-500">熊宝正在准备分析...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 添加自定义CSS动画 */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
