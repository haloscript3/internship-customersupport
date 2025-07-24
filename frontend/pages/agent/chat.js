import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';

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
    // Agent'a atanmış session'ları çek
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
    return <div>Lütfen önce giriş yapın ve bir müşteriyle eşleşin.<br/><pre>{debug}</pre></div>;
  }

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Agent Panel</h1>
      <div style={styles.chatBox}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.msg,
              alignSelf: m.sender === 'agent' ? 'flex-end' : 'flex-start',
              backgroundColor: m.sender === 'agent' ? '#b6d4fe' : '#e2e3e5',
              color: '#000',
            }}
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Yazıp Enter’a basın…"
        />
        <button style={styles.btn} onClick={handleSend}>
          Gönder
        </button>
      </div>
      <pre>{debug}</pre>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    padding: '1rem', background: '#f8f9fa', fontFamily: 'sans-serif'
  },
  header: { 
    textAlign: 'center', marginBottom: '1rem', color: '#0d6efd'
  },
  chatBox: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '1rem', gap: '0.5rem',
    border: '1px solid #ced4da', borderRadius: 8,
    overflowY: 'auto', background: '#fff'
  },
  msg: {
    padding: '0.5rem 1rem', borderRadius: 8, maxWidth: '70%',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  inputArea: {
    display: 'flex', gap: '0.5rem', marginTop: '1rem'
  },
  input: {
    flex: 1, padding: '0.75rem', borderRadius: 4,
    border: '1px solid #ced4da', fontSize: '1rem'
  },
  btn: {
    padding: '0.75rem 1rem', borderRadius: 4,
    border: 'none', background: '#0d6efd', color: '#fff',
    cursor: 'pointer'
  }
};