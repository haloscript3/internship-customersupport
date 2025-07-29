import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';
import styles from '../../styles/ModernUI.module.css';

export default function UserChat() {
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [mode, setMode] = useState(null);
  const chatRef = useRef(null);
  const [input, setInput] = useState('');
  const [wsRef, setWsRef] = useState(null);

  useEffect(() => {
    setSessionId(localStorage.getItem('sessionId'));
    setUserId(localStorage.getItem('userId'));
    console.log('UserChat userId:', localStorage.getItem('userId'));
  }, []);

  useEffect(() => {
    if (!sessionId || !userId) return;
    fetch('http://localhost:8080/api/session/info?sessionId=' + sessionId)
      .then(res => res.json())
      .then(data => {
        setMode(data.mode);
      });
    const ws = new window.WebSocket(`ws://localhost:8080/ws?sessionId=${sessionId}&userId=${userId}`);
    setWsRef(ws);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('WS message:', msg);
      if (msg.sender === 'system' && msg.mode) {
        setMode(msg.mode);
        return;
      }
      setMessages((prev) => [...prev, { sender: msg.sender, text: msg.message }]);
    };
    return () => ws && ws.close();
  }, [sessionId, userId]);

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (!sessionId || !userId) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Oturum Gerekli</h1>
            <p>Lütfen önce giriş yapın</p>
          </div>
          <div className={styles.link}>
            <a href="/user/login">Giriş Yap</a>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim() || !wsRef) return;
    const msg = {
      sessionId,
      sender: 'user',
      message: input,
    };
    wsRef.send(JSON.stringify(msg));
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <h1>Customer Service Chat</h1>
        {mode === 'human' && (
          <div className={`${styles.statusBadge} ${styles.statusHuman}`}>
            Müşteri Temsilcisi
          </div>
        )}
        {mode === 'ai' && (
          <div className={`${styles.statusBadge} ${styles.statusAI}`}>
            AI Asistan
          </div>
        )}
      </header>
      
      <div ref={chatRef} className={styles.chatMessages}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`${styles.message} ${
              msg.sender === 'user' ? styles.messageUser : styles.messageOther
            }`}
          >
            <div className={`${styles.messageBubble} ${
              msg.sender === 'user' ? styles.messageBubbleUser : styles.messageBubbleOther
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.chatInput}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesajınızı yazın..."
          className={styles.input}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={styles.sendButton}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}