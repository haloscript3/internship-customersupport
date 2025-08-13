import { useEffect, useRef, useState } from 'react';

export default function useChatWebSocket(sessionId, senderId, senderType, initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    console.log('WebSocket useEffect triggered:', { sessionId, senderId, senderType });
    if (!sessionId || !senderId) {
      console.log('WebSocket not connecting - missing params');
      return;
    }
    let url = `ws://localhost:8080/ws?sessionId=${sessionId}`;
    if (senderType === 'user') url += `&userId=${senderId}`;
    if (senderType === 'agent') url += `&agentId=${senderId}`;
    console.log('WebSocket connecting to:', url);
    ws.current = new window.WebSocket(url);
    ws.current.onopen = () => {
      console.log('WebSocket opened successfully');
      setConnected(true);
    };
    ws.current.onclose = () => {
      console.log('WebSocket closed');
      setConnected(false);
    };
    ws.current.onerror = (error) => {
      console.log('WebSocket error:', error);
    };
    ws.current.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      const data = JSON.parse(event.data);
      console.log('Parsed WebSocket data:', data);
      if (data.type === 'history') {
        console.log('Adding history message to state');
        setMessages((prev) => [...prev, { sender: data.sender, text: data.message }]);
      } else if (data.sender && data.message) {
        console.log('Adding regular message to state');
        setMessages((prev) => [...prev, { sender: data.sender, text: data.message }]);
      } else {
        console.log('Message ignored - no sender/message or unrecognized type');
      }
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