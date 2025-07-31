import { useEffect, useRef, useState } from 'react';

export default function useChatWebSocket(sessionId, senderId, senderType) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    if (!sessionId || !senderId) return;
    if (senderType === 'user') console.log('WebSocket userId:', senderId);
    let url = `ws://localhost:8080/ws?sessionId=${sessionId}`;
    if (senderType === 'user') url += `&userId=${senderId}`;
    if (senderType === 'agent') url += `&agentId=${senderId}`;
    ws.current = new window.WebSocket(url);
    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => setConnected(false);
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, { sender: data.sender, text: data.message }]);
    };
    return () => ws.current && ws.current.close();
  }, [sessionId, senderId, senderType]);

  const sendMessage = (text) => {
    if (!text.trim() || !ws.current || ws.current.readyState !== 1) return;
    const msg = {
      sessionId,
      sender: senderType,
      message: text,
    };
    ws.current.send(JSON.stringify(msg));
    setMessages((prev) => [...prev, { sender: senderType, text }]);
  };

  return { messages, sendMessage, connected };
} 