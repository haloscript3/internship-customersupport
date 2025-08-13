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
    const userId = localStorage.getItem('userId');
    setUserId(userId);
    console.log('UserChat userId:', userId);
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('sessionId');
    
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      localStorage.setItem('sessionId', sessionIdFromUrl);
    } else {
      const sessionIdFromStorage = localStorage.getItem('sessionId');
      setSessionId(sessionIdFromStorage);
    }
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
      console.log('WS message received:', msg);
      
      if (msg.sender === 'system' && (msg.mode || msg.status || msg.assignedAgent)) {
        if (msg.mode) {
          setMode(msg.mode);
      
          if (msg.mode === 'human' && msg.assignedAgent) {
            console.log('Agent took over session');
        
          }
        }
        if (msg.status) {
          setSessionStatus(msg.status);
      
          if (msg.status === 'completed') {
            console.log('Session completed, redirecting to messages page');
            window.location.href = '/user/messages';
            return;
          }
        }
        if (msg.assignedAgent) {
          setAssignedAgent(msg.assignedAgent);
        }
        if (msg.mode) {
          setMode(msg.mode);
          if (msg.mode === 'human' && msg.assignedAgent) {
            console.log('Agent took over session:', msg.assignedAgent);
        
          }
        }
        return;
      }
      
      console.log('Adding message to UI:', { sender: msg.sender, text: msg.message });
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

  const getSenderInfo = (sender) => {
    switch (sender) {
      case 'user':
        return { name: 'Siz', icon: '👤', bgColor: 'bg-primary', textColor: 'text-primary-foreground' };
      case 'system':
        return { name: 'AI Asistan', icon: '🤖', bgColor: 'bg-blue-500', textColor: 'text-white' };
      case 'agent':
        return { name: 'Müşteri Temsilcisi', icon: '👨‍💼', bgColor: 'bg-green-500', textColor: 'text-white' };
      default:
        return { name: 'Sistem', icon: '⚙️', bgColor: 'bg-gray-500', textColor: 'text-white' };
    }
  };

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
    
    const messageText = input.trim();
    
    const message = {
      sessionId: sessionId,
      userId: userId,
      message: messageText,
      sender: 'user'
    };
    
    try {
      wsRef.send(JSON.stringify(message));
      console.log('Message sent to WebSocket:', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
    
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch('http://localhost:8080/api/session/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
        }),
      });

      if (response.ok) {
        console.log('Session ended successfully');
        window.location.href = '/user/messages';
      } else {
        console.error('Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  return (
    <div className={`${inter.variable} h-screen bg-background flex flex-col`}>
      {}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a href="/user/messages" className="btn btn-ghost btn-sm p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-semibold text-card-foreground">Customer Service Chat</h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'system' ? 'AI Asistan' : assignedAgent ? 'Müşteri Temsilcisi' : 'Bağlanıyor...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              sessionStatus === 'active' ? 'bg-green-500' : 
              sessionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-muted-foreground">
              {sessionStatus === 'active' ? 'Çevrimiçi' : 'Bağlantı yok'}
            </span>
            <a href="/user/history" className="btn btn-outline btn-xs">
              Geçmiş
            </a>
            <button 
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              onClick={handleEndSession}
            >
              Sohbeti Bitir
            </button>
          </div>
        </div>
      </header>
      
      {}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatRef}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">Hoş Geldiniz! 👋</h3>
            <p className="text-muted-foreground">Size nasıl yardımcı olabilirim?</p>
          </div>
        )}
        
        {messages.map((message, index) => {
          const senderInfo = getSenderInfo(message.sender);
          const isUser = message.sender === 'user';
          
          console.log('Rendering message:', { index, sender: message.sender, text: message.text, isUser });
          
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${senderInfo.bgColor} ${senderInfo.textColor} flex-shrink-0`}>
                  {senderInfo.icon}
                </div>
                
                {}
                <div className={`px-3 py-2 rounded-lg ${
                  isUser 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <div className="text-sm">{message.text}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {}
      <div className="border-t bg-card p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
            👤
          </div>
          <div className="flex-1 relative">
            <input
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın..."
              disabled={!sessionId}
            />
          </div>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={!input.trim() || !sessionId}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}