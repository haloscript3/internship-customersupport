import { useState, useEffect, useRef } from 'react';

export default function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'agent', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await fetch('http://localhost:8080/api/agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: "<agentObjectIdHex>", 
          status: "busy"
        }),
      });
    try {
      const res = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: [
            ...messages,
            userMsg
          ]
        }),
      });

      if (!res.ok) {
        console.error('Server error:', await res.text());
        setLoading(false);
        return;
      }

      const { reply } = await res.json();

      const aiMsg = { sender: 'ai', text: reply };
      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
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
              color: m.sender === 'agent' ? '#000' : '#000',
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ fontStyle: 'italic', color: '#666', margin: '0.5rem' }}>
            AI cevap yazıyor...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Yazıp Enter’a basın…"
        />
        <button style={styles.btn} onClick={sendMessage} disabled={loading}>
          Gönder
        </button>
      </div>
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