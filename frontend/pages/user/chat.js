import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';
import styles from '../../styles/ModernUI.module.css';

export default function UserChat() {
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [mode, setMode] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [assignedAgent, setAssignedAgent] = useState(null);
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
        setAssignedAgent(data.assignedAgent);
        setSessionStatus('active');
      })
      .catch(err => {
        console.error('Session info error:', err);
        setSessionStatus('error');
      });

    const ws = new window.WebSocket(`ws://localhost:8080/ws?sessionId=${sessionId}&userId=${userId}`);
    setWsRef(ws);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('WS message:', msg);
      
      if (msg.sender === 'system') {
        if (msg.mode) {
          setMode(msg.mode);
        }
        if (msg.status) {
          setSessionStatus(msg.status);
        }
        if (msg.assignedAgent) {
          setAssignedAgent(msg.assignedAgent);
        }
        return;
      }
      
      setMessages((prev) => [...prev, { sender: msg.sender, text: msg.message }]);
    };

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setSessionStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSessionStatus('disconnected');
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

  const getStatusMessage = () => {
    if (sessionStatus === 'error') return 'Bağlantı hatası';
    if (sessionStatus === 'disconnected') return 'Bağlantı kesildi';
    if (mode === 'system') return 'Sistem Asistanı ile görüşüyorsunuz';
    if (mode === 'human') return 'Müşteri Temsilcisi ile görüşüyorsunuz';
    return 'Bağlanıyor...';
  };

  const getStatusBadgeClass = () => {
    if (sessionStatus === 'error' || sessionStatus === 'disconnected') {
      return `${styles.statusBadge} ${styles.statusError}`;
    }
    if (mode === 'human') {
      return `${styles.statusBadge} ${styles.statusHuman}`;
    }
    if (mode === 'system') {
      return `${styles.statusBadge} ${styles.statusAI}`;
    }
    return `${styles.statusBadge} ${styles.statusConnecting}`;
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <h1>Customer Service Chat</h1>
          <div className={styles.sessionInfo}>
            <span>Session: {sessionId?.substring(0, 8)}...</span>
            {assignedAgent && assignedAgent !== 'System' && (
              <span>Agent: {assignedAgent.substring(0, 8)}...</span>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={getStatusBadgeClass()}>
            {getStatusMessage()}
          </div>
        </div>
      </header>
      
      <div ref={chatRef} className={styles.chatMessages}>
        {messages.length === 0 && (
          <div className={styles.welcomeMessage}>
            <div className={styles.welcomeBubble}>
              <h3>Hoş Geldiniz! 👋</h3>
              <p>Size nasıl yardımcı olabilirim?</p>
              {mode === 'system' && (
                <div className={styles.aiNote}>
                  <small>🤖 Sistem Asistanı ile görüşüyorsunuz. Uygun bir müşteri temsilcisi bulunduğunda otomatik olarak transfer edileceksiniz.</small>
                </div>
              )}
            </div>
          </div>
        )}
        
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
          disabled={sessionStatus === 'error' || sessionStatus === 'disconnected'}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sessionStatus === 'error' || sessionStatus === 'disconnected'}
          className={styles.sendButton}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}