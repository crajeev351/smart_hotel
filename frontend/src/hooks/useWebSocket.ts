import { useEffect, useRef } from 'react';

export const useWebSocket = (onMessageReceived: (data: any) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://smart-hotel-mchq.onrender.com/api/';
    let wsUrl = baseUrl.includes('https')
      ? baseUrl.replace('https://', 'wss://').replace('/api/', '/ws/updates/')
      : baseUrl.replace('http://', 'ws://').replace('/api/', '/ws/updates/');

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
