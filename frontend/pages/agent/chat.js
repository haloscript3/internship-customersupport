import { useState, useEffect, useRef } from 'react';

export default function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { sender: 'agent', text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    try {
      const res = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: [newMessage] }),
      });

      const data = await res.json();
      console.log('Server response:', data);
    } catch (error) {
      console.error('Agent API error:', error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Agent Panel</div>

      <div style={styles.chatBox}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.message, alignSelf: msg.sender === 'agent' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'agent' ? '#076effff' : '#dee2e6' }}>
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          type="text"
          placeholder="Yanıt yaz..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button style={styles.button} onClick={sendMessage}>Yanıtla</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#000306ff',
    color: '#212529',
    padding: '1rem',
    fontFamily: 'Inter',
  },
  header: {
    fontFamily: 'Inter',
    fontSize: '1.5rem',
    marginBottom: '1rem',
    textAlign: 'center',
    color: '#ffffffff',
  },
  chatBox: {
    fontFamily: 'Inter',
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    border: '1px solid #ffffffff',
    borderRadius: '8px',
    backgroundColor: '#000000ff',
  },
  message: {
    maxWidth: '60%',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    color: '#ffffff',
    fontFamily: 'Inter',
  },
  inputArea: {
    display: 'flex',
    marginTop: '1rem',
    gap: '0.5rem',
    fontFamily: 'Inter',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #ced4da',
    fontSize: '1rem',
    fontFamily: 'Inter',
  },
  button: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: '#ffffffff',
    color: '#000',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
     fontFamily: 'Inter',
  },
};