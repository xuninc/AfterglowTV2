import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * A simple spatial navigation hook for AndroidTV.
 */
export const useTVNavigation = () => {
  const focusedElementId = useStore(state => state.focusedElementId);
  const setFocusedElement = useStore(state => state.setFocusedElement);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!focusedElementId) return;

    const current = document.getElementById(focusedElementId);
    if (!current) return;

    // Support the Enter/OK/Select key for TV/keyboard users
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return; // Allow native inputs to process their own Enter key
      }
      e.preventDefault();
      (current as HTMLElement).click();
      return;
    }

    const rect = current.getBoundingClientRect();
    const allFocusables = Array.from(document.querySelectorAll('[tabindex="-1"], button, input, [id^="channel-"], [id^="nav-"], [id^="input-"], [id="btn-sync"]'));
    
    let bestMatch: Element | null = null;
    let minDistance = Infinity;

    const getDistance = (r1: DOMRect, r2: DOMRect, direction: string) => {
      const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };
      const c2 = { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
      
      switch (direction) {
        case 'ArrowUp':
          if (c2.y >= c1.y) return Infinity;
          return Math.abs(c2.x - c1.x) + Math.abs(c2.y - c1.y) * 2;
        case 'ArrowDown':
          if (c2.y <= c1.y) return Infinity;
          return Math.abs(c2.x - c1.x) + Math.abs(c2.y - c1.y) * 2;
        case 'ArrowLeft':
          if (c2.x >= c1.x) return Infinity;
          return Math.abs(c2.x - c1.x) * 2 + Math.abs(c2.y - c1.y);
        case 'ArrowRight':
          if (c2.x <= c1.x) return Infinity;
          return Math.abs(c2.x - c1.x) * 2 + Math.abs(c2.y - c1.y);
        default:
          return Infinity;
      }
    };

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      allFocusables.forEach(el => {
        if (el.id === focusedElementId) return;
        const r = el.getBoundingClientRect();
        const d = getDistance(rect, r, e.key);
        if (d < minDistance) {
          minDistance = d;
          bestMatch = el;
        }
      });

      if (bestMatch) {
        setFocusedElement((bestMatch as HTMLElement).id);
      }
    }
  }, [focusedElementId, setFocusedElement]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { focusedElementId };
};
