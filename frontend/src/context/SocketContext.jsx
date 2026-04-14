// Polling-based "socket" context — works on serverless (Vercel).
// Fires queue:update callbacks every POLL_INTERVAL ms.
// Components use this identically to the Socket.io version — no changes needed.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const POLL_INTERVAL = 15000; // 15 seconds

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const listenersRef = useRef([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setConnected(false);
      listenersRef.current = [];
      return;
    }

    setConnected(true);

    // Fire all registered queue:update listeners on each poll tick
    const interval = setInterval(() => {
      listenersRef.current.forEach((cb) => {
        try { cb({ action: 'poll' }); } catch {}
      });
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [user]);

  // Stable reference — safe to use as a useEffect dependency in consumers
  const onQueueUpdate = useCallback((callback) => {
    listenersRef.current = [...listenersRef.current, callback];
    return () => {
      listenersRef.current = listenersRef.current.filter((cb) => cb !== callback);
    };
  }, []);

  // These are no-ops in polling mode — kept for API compatibility
  const joinDepartment = useCallback(() => {}, []);
  const leaveDepartment = useCallback(() => {}, []);

  return (
    <SocketContext.Provider
      value={{ socket: null, connected, joinDepartment, leaveDepartment, onQueueUpdate }}
    >
      {children}
    </SocketContext.Provider>
  );
}

const defaultSocketValue = {
  socket: null,
  connected: false,
  joinDepartment: () => {},
  leaveDepartment: () => {},
  onQueueUpdate: (cb) => () => {},
};

export function useSocket() {
  return useContext(SocketContext) || defaultSocketValue;
}
