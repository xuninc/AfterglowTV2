import React, { useEffect, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useStore } from '../../store/useStore';

/**
 * Utility for merging tailwind classes.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FocusableProps {
  id: string;
  children: React.ReactNode;
  onEnter?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  activeClassName?: string;
  autoFocus?: boolean;
}

export const Focusable: React.FC<FocusableProps> = ({
  id,
  children,
  onEnter,
  onFocus,
  onBlur,
  className,
  activeClassName = "focus-ring",
  autoFocus = false,
}) => {
  const focusedElementId = useStore(state => state.focusedElementId);
  const setFocusedElement = useStore(state => state.setFocusedElement);
  
  const isFocused = focusedElementId === id;
  const elementRef = useRef<HTMLDivElement>(null);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);

  // Sync refs to avoid useEffect dependency on unstable callbacks
  useEffect(() => {
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
  }, [onFocus, onBlur]);

  useEffect(() => {
    if (autoFocus && !focusedElementId) {
      setFocusedElement(id);
    }
  }, [autoFocus, id, setFocusedElement, focusedElementId]);

  useEffect(() => {
    if (isFocused) {
      onFocusRef.current?.();
      elementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      
      const childInput = elementRef.current?.querySelector('input, textarea');
      if (childInput) {
        (childInput as HTMLElement).focus();
      } else {
        elementRef.current?.focus();
      }
    } else {
      onBlurRef.current?.();
    }
  }, [isFocused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused) return;
    
    if (e.key === 'Enter') {
      onEnter?.();
    }
  };

  return (
    <div
      ref={elementRef}
      id={id}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={() => {
        setFocusedElement(id);
        onEnter?.();
      }}
      className={cn(
        "transition-all duration-200 cursor-pointer",
        className,
        isFocused && activeClassName
      )}
    >
      {children}
    </div>
  );
};
