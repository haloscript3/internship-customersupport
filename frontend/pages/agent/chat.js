import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';
import styles from '../../styles/ModernUI.module.css';

export default function AgentChat() {
  const [sessionId, setSessionId] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const endRef = useRef(null);
  const [input, setInput] = useState('');
  const [debug, setDebug] = useState('');

  useEffect(() => {
    const agentId = localStorage.getItem('agentId');
    setAgentId(agentId);
    setDebug('agentId: ' + agentId);
    if (agentId) {
      fetch('http://localhost:8080/api/session/agent/' + agentId)
        .then(res => res.json())
        .then(data => {
          setDebug(d => d + '\nsessions: ' + JSON.stringify(data.sessions));
          if (data.sessions && data.sessions.length > 0) {
            setSessionId(data.sessions[0].sessionId);
          } else {
            setDebug(d => d + '\nNo session assigned to this agent.');
          }
        });
    }
  }, []);

  const { messages, sendMessage, connected } = useChatWebSocket(sessionId, agentId, 'agent');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!sessionId || !agentId) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Bekleme Modu</h1>
            <p>Müşteri eşleşmesi bekleniyor...</p>
          </div>
          <div className={styles.link}>
            <a href="/agent/login">Tekrar Giriş Yap</a>
          </div>
          {debug && (
            <div style={{ 
              marginTop: '20px', 
              padding: '10px', 
              background: '#f3f4f6', 
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <pre>{debug}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <h1>Müşteri Temsilcisi Paneli</h1>
        <div className={`${styles.statusBadge} ${styles.statusHuman}`}>
          {connected ? 'Bağlı' : 'Bağlantı Kesildi'}
        </div>
      </header>
      
      <div className={styles.chatMessages}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.message} ${
              m.sender === 'agent' ? styles.messageUser : styles.messageOther
            }`}
          >
            <div className={`${styles.messageBubble} ${
              m.sender === 'agent' ? styles.messageBubbleUser : styles.messageBubbleOther
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      
      <div className={styles.chatInput}>
        <input
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Müşteriye mesaj yazın..."
        />
        <button 
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}