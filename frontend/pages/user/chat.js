import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
        if (msg.message) {
          setMessages((prev) => [...prev, { sender: 'system', text: msg.message }]);
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
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Oturum Gerekli</h1>
            <p className="card-description">Lütfen önce giriş yapın</p>
          </div>
          <div className="card-footer justify-center">
            <a href="/user/login" className="btn btn-primary btn-md">
              Giriş Yap
            </a>
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
      return "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground";
    }
    if (mode === 'human') {
      return "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    }
    if (mode === 'system') {
      return "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
    return "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  };

  return (
    <div className={`${inter.variable} h-screen bg-background flex flex-col`}>
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-card-foreground">Customer Service Chat</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Session: {sessionId?.substring(0, 8)}...</span>
              {assignedAgent && assignedAgent !== 'System' && (
                <span>Agent: {assignedAgent.substring(0, 8)}...</span>
              )}
            </div>
          </div>
          <div className={getStatusBadgeClass()}>
            {getStatusMessage()}
          </div>
        </div>
      </header>
      
      <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex justify-center">
            <div className="bg-card border rounded-lg p-6 max-w-md text-center">
              <h3 className="text-lg font-semibold mb-2">Hoş Geldiniz! 👋</h3>
              <p className="text-muted-foreground mb-4">Size nasıl yardımcı olabilirim?</p>
              {mode === 'system' && (
                <div className="bg-muted/50 rounded-md p-3">
                  <small className="text-muted-foreground">
                    🤖 Sistem Asistanı ile görüşüyorsunuz. Uygun bir müşteri temsilcisi bulunduğunda otomatik olarak transfer edileceksiniz.
                  </small>
                </div>
              )}
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
              msg.sender === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t bg-card p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mesajınızı yazın..."
            className="input flex-1"
            disabled={sessionStatus === 'error' || sessionStatus === 'disconnected'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sessionStatus === 'error' || sessionStatus === 'disconnected'}
            className="btn btn-primary"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}