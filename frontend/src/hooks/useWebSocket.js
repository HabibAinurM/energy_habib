import { useState, useEffect, useRef, useCallback } from 'react';

const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastData, setLastData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const token = localStorage.getItem('access_token') || '';
      const wsUrl = `${WS_BASE}/ws/energy/${token ? `?token=${token}` : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sensor_update' || msg.type === 'initial_data') {
            setLastData(msg.data);
          } else if (msg.type === 'alert') {
            setAlerts(prev => [msg.data, ...prev].slice(0, 50));
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WS connection error:', e);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, lastData, alerts, sendMessage };
};

// Polling fallback for when WebSocket is unavailable
export const usePolling = (fetchFn, interval = 3000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetch = async () => {
      try {
        const result = await fetchFn();
        if (mounted) setData(result);
      } catch (e) {
        console.error('Polling error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    const timer = setInterval(fetch, interval);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [interval]);

  return { data, loading };
};
