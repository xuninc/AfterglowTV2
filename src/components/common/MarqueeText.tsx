import React, { useEffect, useRef, useState } from 'react';

interface MarqueeTextProps {
  text: string;
  isFocused?: boolean;
  className?: string;
  wordWrap?: boolean;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ 
  text, 
  isFocused = false, 
  className = '', 
  wordWrap = true 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (container && textEl) {
      // Temporarily measure as single line to find real width
      const originalStyle = textEl.style.whiteSpace;
      textEl.style.whiteSpace = 'nowrap';
      setShouldScroll(textEl.offsetWidth > container.offsetWidth);
      textEl.style.whiteSpace = originalStyle;
    }
  }, [text, isFocused]);

  const useMarquee = isFocused && shouldScroll;

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden w-full ${
        useMarquee ? 'whitespace-nowrap' : wordWrap ? 'whitespace-normal break-words' : 'whitespace-nowrap truncate'
      } ${className}`}
    >
      <div
        className="inline-block"
        style={{
          animation: useMarquee ? 'afterglow-marquee 10s linear infinite' : 'none',
          display: useMarquee ? 'inline-flex' : 'block',
          transform: 'translate3d(0, 0, 0)',
          width: useMarquee ? 'auto' : '100%'
        }}
      >
        <span 
          ref={textRef} 
          className={`${useMarquee ? 'pr-12 shrink-0' : 'block'}`}
        >
          {text}
        </span>
        {useMarquee && (
          <span className="pr-12 shrink-0">{text}</span>
        )}
      </div>

      {/* Inject Keyframe Animation Style Dynamically */}
      <style>{`
        @keyframes afterglow-marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
};
