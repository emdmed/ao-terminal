import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useCwdMonitor(sessionId, enabled) {
  const [currentCwd, setCurrentCwd] = useState(null);
  const lastCwdRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const checkCwd = useCallback(async () => {
    if (!sessionId || !enabled) return;

    try {
      const cwd = await invoke('get_terminal_cwd', { sessionId });

      if (cwd !== lastCwdRef.current) {
        console.log('CWD changed:', lastCwdRef.current, '->', cwd);
        lastCwdRef.current = cwd;
        setCurrentCwd(cwd);
      }
    } catch (error) {
      // Terminal might not be ready yet, ignore
    }
  }, [sessionId, enabled]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkCwd();

    // Poll every 500ms while sidebar is open
    checkIntervalRef.current = setInterval(checkCwd, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [sessionId, enabled, checkCwd]);

  return currentCwd;
}
