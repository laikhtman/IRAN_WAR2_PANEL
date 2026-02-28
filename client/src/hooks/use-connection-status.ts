import { useEffect, useRef, useState, useCallback } from "react";

export type WsStatus = "connected" | "disconnected" | "reconnecting";

interface ConnectionStatus {
  wsStatus: WsStatus;
  lastMessageTime: number | null;
  /** True if a WS message was received within the staleness window (default 120s) */
  isDataFresh: boolean;
}

const STALE_THRESHOLD_MS = 120_000; // 2 minutes without data → stale

/**
 * Hook that manages a WebSocket connection with auto-reconnect,
 * and exposes real-time connection / data-freshness status.
 */
export function useConnectionStatus(
  onMessage: (data: any) => void,
): ConnectionStatus & { wsRef: React.RefObject<WebSocket | null> } {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [isDataFresh, setIsDataFresh] = useState(false);
  const onMessageRef = useRef(onMessage);

  // Keep callback ref current without re-triggering the effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Freshness timer: check every 10s whether we've gone stale
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastMessageTime) {
        setIsDataFresh(Date.now() - lastMessageTime < STALE_THRESHOLD_MS);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [lastMessageTime]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let unmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (unmounted) return;
      setWsStatus("reconnecting");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!unmounted) setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        const now = Date.now();
        setLastMessageTime(now);
        setIsDataFresh(true);
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (_) {}
      };

      ws.onerror = () => {
        // onclose will fire after this
      };

      ws.onclose = () => {
        if (!unmounted) {
          setWsStatus("disconnected");
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { wsStatus, lastMessageTime, isDataFresh, wsRef };
}
