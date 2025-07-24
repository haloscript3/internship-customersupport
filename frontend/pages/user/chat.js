import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';

export default function UserChat() {
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [mode, setMode] = useState(null);
  const chatRef = useRef(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    setSessionId(localStorage.getItem('sessionId'));
    setUserId(localStorage.getItem('userId'));
    console.log('UserChat userId:', localStorage.getItem('userId'));
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetch('http://localhost:8080/api/session/messages?sessionId=' + sessionId)
        .then(res => res.json())
        .then(messages => {
          // ...
        });
      fetch('http://localhost:8080/api/session/info?sessionId=' + sessionId)
        .then(res => res.json())
        .then(data => {
          setMode(data.mode);
        });
    }
  }, [sessionId]);

  const { messages, sendMessage, connected } = useChatWebSocket(sessionId, userId, 'user');

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (!sessionId || !userId) {
    return <div>Lütfen önce giriş yapın.</div>;
  }

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'Inter',
      background: '#f4f4f4'
    }}>
      <header style={{
        padding: '15px 20px',
        background: '#222',
        color: '#fff',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
         AI Destekli Müşteri Hizmetleri
      </header>
      {mode === 'human' && <div style={{padding: '10px', background: '#d1e7dd', color: '#222'}}>Bir müşteri temsilcisine bağlandınız.</div>}
      {mode === 'ai' && <div style={{padding: '10px', background: '#ffeeba', color: '#222'}}>AI ile görüşüyorsunuz.</div>}
      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          backgroundColor: '#f9f9f9'
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '10px'
          }}>
            <div style={{
              maxWidth: '70%',
              padding: '10px 15px',
              borderRadius: '20px',
              background: msg.sender === 'user' ? '#d1e7dd' : '#e2e3e5',
              color: '#000',
              fontSize: '15px',
              fontFamily: 'Inter',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex',
        padding: '15px 20px',
        backgroundColor: '#fff',
        borderTop: '1px solid #ccc'
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: '10px 15px',
            borderRadius: '20px',
            border: '1px solid #ccc',
            fontSize: '15px'
          }}
        />
        <button
          onClick={handleSend}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: '#198754',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}