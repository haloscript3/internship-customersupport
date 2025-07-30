import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';
import styles from '../../styles/ModernUI.module.css';

export default function AgentChat() {
  const [sessionId, setSessionId] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [systemSessions, setSystemSessions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const endRef = useRef(null);
  const [input, setInput] = useState('');
  const [debug, setDebug] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const agentId = localStorage.getItem('agentId');
    setAgentId(agentId);
    setDebug('agentId: ' + agentId);
    
    if (agentId) {
      fetch(`http://localhost:8080/api/agent/active-sessions/${agentId}`)
        .then(res => res.json())
        .then(data => {
          setDebug(d => d + '\nactive sessions: ' + JSON.stringify(data.sessions));
          setActiveSessions(data.sessions || []);
          
          if (data.sessions && data.sessions.length > 0) {
            setSessionId(data.sessions[0].sessionId);
            setCurrentSession(data.sessions[0]);
            setIsAvailable(false);
          }
        })
        .catch(err => {
          setDebug(d => d + '\nerror fetching sessions: ' + err.message);
        });

      fetch('http://localhost:8080/api/sessions/ai')
        .then(res => res.json())
        .then(data => {
          setDebug(d => d + '\nsystem sessions: ' + JSON.stringify(data.sessions));
          setSystemSessions(data.sessions || []);
        })
        .catch(err => {
          setDebug(d => d + '\nerror fetching system sessions: ' + err.message);
        });
    }
  }, []);

  const { messages, sendMessage, connected } = useChatWebSocket(sessionId, agentId, 'agent');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTakeOverSystemSession = async (sessionId) => {
    try {
      const response = await fetch('http://localhost:8080/api/agent/takeover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.available) {
        setSessionId(data.sessionId);
        setCurrentSession({
          sessionId: data.sessionId,
          mode: 'human',
          status: 'active'
        });
        setIsAvailable(false);
        setDebug(d => d + '\ntook over session: ' + data.sessionId);
        
        fetch('http://localhost:8080/api/sessions/ai')
          .then(res => res.json())
          .then(data => setSystemSessions(data.sessions || []));
      } else {
        setDebug(d => d + '\nno system sessions available');
      }
    } catch (error) {
      setDebug(d => d + '\ntakeover error: ' + error.message);
    }
  };

  const handleSetAvailability = async (available) => {
    try {
      const response = await fetch('http://localhost:8080/api/agent/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          status: available ? 'available' : 'busy',
        }),
      });

      if (response.ok) {
        setIsAvailable(available);
        setDebug(d => d + '\nstatus updated to: ' + (available ? 'available' : 'busy'));
      }
    } catch (error) {
      setDebug(d => d + '\nstatus update error: ' + error.message);
    }
  };

  const handleEndSession = () => {
    setSessionId(null);
    setCurrentSession(null);
    setIsAvailable(true);
    setDebug(d => d + '\nsession ended');
  };

  if (!agentId) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Agent Girişi Gerekli</h1>
            <p>Lütfen önce giriş yapın</p>
          </div>
          <div className={styles.link}>
            <a href="/agent/login">Giriş Yap</a>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Agent Paneli</h1>
            <p>Müşteri eşleşmesi bekleniyor...</p>
          </div>
          
          <div className={styles.agentControls}>
            <button 
              className={`${styles.button} ${isAvailable ? styles.buttonPrimary : styles.buttonSecondary}`}
              onClick={() => handleSetAvailability(!isAvailable)}
            >
              {isAvailable ? 'Uygun' : 'Meşgul'}
            </button>
          </div>

          {systemSessions.length > 0 && isAvailable && (
            <div className={styles.aiSessions}>
              <h3>Sistem Session'ları ({systemSessions.length})</h3>
              {systemSessions.map((session, index) => (
                <div key={session.sessionId} className={styles.aiSessionItem}>
                  <span>Session {index + 1}</span>
                  <button 
                    className={styles.button}
                    onClick={() => handleTakeOverSystemSession(session.sessionId)}
                  >
                    Devral
                  </button>
                </div>
              ))}
            </div>
          )}

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
        <div className={styles.headerLeft}>
          <h1>Müşteri Temsilcisi Paneli</h1>
          <div className={styles.sessionInfo}>
            <span>Session: {sessionId?.substring(0, 8)}...</span>
            <span>Mode: {currentSession?.mode || 'unknown'}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.statusBadge} ${styles.statusHuman}`}>
            {connected ? 'Bağlı' : 'Bağlantı Kesildi'}
          </div>
          <button 
            className={styles.button}
            onClick={handleEndSession}
          >
            Session'ı Bitir
          </button>
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