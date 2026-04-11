// Polling-based "socket" context — works on serverless (Vercel).
// Fires queue:update callbacks every POLL_INTERVAL ms.
// Components use this identically to the Socket.io version — no changes needed.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
      if (listenersRef.current.length > 0) {
        listenersRef.current.forEach((cb) => {
          try { cb({ action: 'poll' }); } catch {}
        });
      }
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      setConnected(false);
    };
  }, [user]);

  // Register a queue update listener — returns an unsubscribe function
  const onQueueUpdate = (callback) => {
    listenersRef.current = [...listenersRef.current, callback];
    return () => {
      listenersRef.current = listenersRef.current.filter((cb) => cb !== callback);
    };
  };

  // These are no-ops in polling mode — kept for API compatibility
  const joinDepartment = () => {};
  const leaveDepartment = () => {};

  return (
    <SocketContext.Provider
      value={{ socket: null, connected, joinDepartment, leaveDepartment, onQueueUpdate }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
