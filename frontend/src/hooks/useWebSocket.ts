import { useEffect, useRef } from 'react';

export const useWebSocket = (onMessageReceived: (data: any) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let wsUrl = 'ws://localhost:8000/ws/updates/';
    if (import.meta.env.VITE_API_URL) {
      // Convert https://.../api/ to wss://.../ws/updates/
      const baseUrl = import.meta.env.VITE_API_URL;
      if (baseUrl.includes('https')) {
        wsUrl = baseUrl.replace('https://', 'wss://').replace('/api/', '/ws/updates/');
      } else {
        wsUrl = baseUrl.replace('http://', 'ws://').replace('/api/', '/ws/updates/');
      }
    }

    const connect = () => {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageReceived(data);
        } catch (e) {
          console.error('WebSocket message parsing error', e);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 3s...');
        setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error: ', error);
        ws.current?.close();
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.onclose = null; // prevent reconnect on unmount
        ws.current.close();
      }
    };
  }, [onMessageReceived]);

  return ws.current;
};
