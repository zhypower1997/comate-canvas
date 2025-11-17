import React, { useState, useEffect, useRef } from "react";

const AnimationText = ({
  text = "跳动的文字",
  jumpHeight = "2rem",
  duration = 300,
}) => {
  // 将文本拆分为单个字符数组
  const characters = text.split("");
  const [activeIndex, setActiveIndex] = useState(0);
  const animationRef = useRef(null);

  // 计算动画总时长
  const totalDuration = characters.length * duration;

  // 处理动画循环
  useEffect(() => {
    // 设置循环动画
    animationRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % characters.length);
    }, duration);

    // 组件卸载时清除定时器
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [characters.length, duration]);

  return (
    <div className="flex items-center justify-center ">
      <div className="text-[14px]  font-bold text-gray-800 tracking-wide">
        {characters.map((char, index) => (
          <span
            key={index}
            className={`
                                inline-block transition-all duration-300 ease-out
                                ${
                                  index === activeIndex
                                    ? "transform -translate-y-1  -rotate-4" +
                                      " text-blue-600"
                                    : "text-gray-700"
                                }
                            `}
            style={{
              animationDelay: `${index * (duration / 1000)}s`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnimationText;
