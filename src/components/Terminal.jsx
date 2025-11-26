import { useRef, useEffect } from 'react';
import { useTerminal } from '../hooks/useTerminal';

export function Terminal({ theme, onResize }) {
  const terminalRef = useRef(null);
  const { handleResize } = useTerminal(terminalRef, theme);

  // Setup resize observer
  useEffect(() => {
    if (!terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(terminalRef.current);

    // Also handle window resize
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
}
