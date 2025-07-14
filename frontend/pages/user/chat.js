import { useEffect, useRef, useState } from 'react';

export default function UserChat() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Merhaba! Size nasıl yardımcı olabilirim?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage = { sender: 'user', text: input };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: updatedMessages })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Bir hata oluştu.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
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

        {loading && (
          <div style={{ fontStyle: 'italic', color: '#999', fontSize: '14px' }}>
            AI Typing...
          </div>
        )}
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
          onClick={sendMessage}
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