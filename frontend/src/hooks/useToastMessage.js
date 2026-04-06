import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Shared toast/message hook — replaces 5+ identical showMessage implementations.
 *
 * Returns { message, showMessage } where:
 *   - message: { type: string, text: string } | null
 *   - showMessage(type, text, duration?): sets message and auto-clears after `duration` ms
 *
 * Usage:
 *   const { message, showMessage } = useToastMessage();
 *   showMessage('success', 'Saved!');
 *   showMessage('error', 'Something went wrong');
 *
 * The consuming component is responsible for rendering the toast UI
 * (to preserve each page's existing visual styling).
 */
export const useToastMessage = (defaultDuration = 4000) => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showMessage = useCallback((type, text, duration) => {
    clearTimeout(timerRef.current);
    setMessage({ type, text });
    timerRef.current = setTimeout(() => setMessage(null), duration || defaultDuration);
  }, [defaultDuration]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { message, showMessage };
};
