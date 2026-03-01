import { useEffect, useRef, useState, useCallback } from "react";

export type WsStatus = "connected" | "disconnected" | "reconnecting";

interface ConnectionStatus {
  wsStatus: WsStatus;
  lastMessageTime: number | null;
  /** True if a WS message was received within the staleness window (default 120s) */
  isDataFresh: boolean;
}

const STALE_THRESHOLD_MS = 120_000; // 2 minutes without data → stale

// ─── Module-level WebSocket singleton ───
// Keeps WS alive regardless of component mounts/unmounts (Dialog, tab switches, etc.)

type Listener = (data: any) => void;
type StatusListener = (status: WsStatus) => void;
type FreshnessListener = (time: number) => void;

interface WsSingleton {
  ws: WebSocket | null;
  status: WsStatus;
  lastMessageTime: number | null;
  messageListeners: Set<Listener>;
  statusListeners: Set<StatusListener>;
  freshnessListeners: Set<FreshnessListener>;
  initialized: boolean;
}

const singleton: WsSingleton = {
  ws: null,
  status: "disconnected",
  lastMessageTime: null,
  messageListeners: new Set(),
  statusListeners: new Set(),
  freshnessListeners: new Set(),
  initialized: false,
};

function setStatus(s: WsStatus) {
  singleton.status = s;
  singleton.statusListeners.forEach((fn) => fn(s));
}

function initWsSingleton() {
  if (singleton.initialized) return;
  singleton.initialized = true;

  if (typeof window === "undefined") return;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  const connect = () => {
    setStatus("reconnecting");

    const ws = new WebSocket(wsUrl);
    singleton.ws = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      const now = Date.now();
      singleton.lastMessageTime = now;
      singleton.freshnessListeners.forEach((fn) => fn(now));
      try {
        const data = JSON.parse(event.data);
        singleton.messageListeners.forEach((fn) => fn(data));
      } catch (_) {}
    };

    ws.onerror = () => {
      // onclose will fire after this
    };

    ws.onclose = () => {
      setStatus("disconnected");
      setTimeout(connect, 3000);
    };
  };

  connect();
}

/**
 * Hook that subscribes to the module-level WebSocket singleton.
 * Component mounts/unmounts do NOT affect the WebSocket connection.
 */
export function useConnectionStatus(
  onMessage: (data: any) => void,
): ConnectionStatus & { wsRef: React.MutableRefObject<WebSocket | null> } {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>(singleton.status);
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(singleton.lastMessageTime);
  const [isDataFresh, setIsDataFresh] = useState(false);
  const onMessageRef = useRef(onMessage);

  // Keep callback ref current without re-triggering the effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Initialize singleton once
  useEffect(() => {
    initWsSingleton();
  }, []);

  // Subscribe to singleton events
  useEffect(() => {
    const msgHandler: Listener = (data) => {
      onMessageRef.current(data);
    };
    const statusHandler: StatusListener = (s) => {
      setWsStatus(s);
    };
    const freshHandler: FreshnessListener = (time) => {
      setLastMessageTime(time);
      setIsDataFresh(true);
    };

    singleton.messageListeners.add(msgHandler);
    singleton.statusListeners.add(statusHandler);
    singleton.freshnessListeners.add(freshHandler);

    // Sync current state on mount
    setWsStatus(singleton.status);
    if (singleton.lastMessageTime) {
      setLastMessageTime(singleton.lastMessageTime);
      setIsDataFresh(Date.now() - singleton.lastMessageTime < STALE_THRESHOLD_MS);
    }
    wsRef.current = singleton.ws;

    return () => {
      singleton.messageListeners.delete(msgHandler);
      singleton.statusListeners.delete(statusHandler);
      singleton.freshnessListeners.delete(freshHandler);
    };
  }, []);

  // Keep wsRef current
  useEffect(() => {
    wsRef.current = singleton.ws;
  }, [wsStatus]);

  // Freshness timer: check every 10s whether we've gone stale
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastMessageTime) {
        setIsDataFresh(Date.now() - lastMessageTime < STALE_THRESHOLD_MS);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [lastMessageTime]);

  return { wsStatus, lastMessageTime, isDataFresh, wsRef };
}
