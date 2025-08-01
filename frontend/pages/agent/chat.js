import { useEffect, useRef, useState } from 'react';
import useChatWebSocket from '../../useChatWebSocket';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function AgentChat() {
  const [sessionId, setSessionId] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const endRef = useRef(null);
  const [input, setInput] = useState('');
  const [debug, setDebug] = useState('');

  useEffect(() => {
    const agentId = localStorage.getItem('agentId');
    setAgentId(agentId);
    setDebug('agentId: ' + agentId);
    
    if (agentId) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionIdFromUrl = urlParams.get('sessionId');
      
      if (sessionIdFromUrl) {
        setSessionId(sessionIdFromUrl);
        setCurrentSession({
          sessionId: sessionIdFromUrl,
          mode: 'human',
          status: 'active'
        });
        setDebug(d => d + '\nsession from URL: ' + sessionIdFromUrl);
      } else {
        fetch(`http://localhost:8080/api/agent/active-sessions/${agentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.sessions && data.sessions.length > 0) {
              const assignedSession = data.sessions.find(s => s.assignedAgent === agentId);
              if (assignedSession) {
                setSessionId(assignedSession.sessionId);
                setCurrentSession(assignedSession);
                setDebug(d => d + '\nassigned session: ' + assignedSession.sessionId);
              }
            }
          })
          .catch(err => {
            console.error('Error fetching assigned sessions:', err);
            setDebug(d => d + '\nerror: ' + err.message);
          });
      }
    }
  }, []);

  useEffect(() => {
    if (currentSession && currentSession.userId) {
      fetch(`http://localhost:8080/api/user/${currentSession.userId}`)
        .then(res => res.json())
        .then(data => {
          setUserInfo(data);
        })
        .catch(err => {
          console.error('Error fetching user info:', err);
        });
    }
  }, [currentSession]);

  const { messages, sendMessage, connected } = useChatWebSocket(sessionId, agentId, 'agent');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSenderInfo = (sender) => {
    switch (sender) {
      case 'agent':
        return { name: 'Siz', icon: '👨‍💼', bgColor: 'bg-primary', textColor: 'text-primary-foreground' };
      case 'user':
        return { name: userInfo?.name || 'Müşteri', icon: '👤', bgColor: 'bg-blue-500', textColor: 'text-white' };
      case 'system':
        return { name: 'AI Asistan', icon: '🤖', bgColor: 'bg-gray-500', textColor: 'text-white' };
      default:
        return { name: 'Sistem', icon: '⚙️', bgColor: 'bg-gray-500', textColor: 'text-white' };
    }
  };

  if (!agentId) {
    return (
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Agent Girişi Gerekli</h1>
            <p className="card-description">Lütfen önce giriş yapın</p>
          </div>
          <div className="card-footer justify-center">
            <a href="/agent/login" className="btn btn-primary btn-md">
              Giriş Yap
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId || !currentSession) {
    return (
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Chat Session'ı Bulunamadı</h1>
            <p className="card-description">Aktif bir chat session'ınız yok</p>
          </div>
          <div className="card-footer justify-center space-x-2">
            <a href="/agent/sessions" className="btn btn-primary btn-md">
              Session'ları Görüntüle
            </a>
            <a href="/agent/login" className="btn btn-outline btn-md">
              Tekrar Giriş Yap
            </a>
          </div>
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
        window.location.href = '/agent/sessions';
      } else {
        console.error('Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  return (
    <div className={`${inter.variable} h-screen bg-background flex flex-col`}>
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a href="/agent/sessions" className="btn btn-ghost btn-sm p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-semibold text-card-foreground">Müşteri Temsilcisi</h1>
              {userInfo && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{userInfo.name}</span>
                  <span className="mx-2">•</span>
                  <span>{userInfo.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-muted-foreground">
              {connected ? 'Bağlı' : 'Bağlantı Kesildi'}
            </span>
            <button 
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              onClick={handleEndSession}
            >
              Sohbeti Bitir
            </button>
          </div>
        </div>
      </header>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={endRef}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">Müşteri Bekleniyor</h3>
            <p className="text-muted-foreground">Müşteri mesaj gönderdiğinde burada görünecek</p>
          </div>
        )}
        
        {messages.map((message, index) => {
          const senderInfo = getSenderInfo(message.sender);
          const isAgent = message.sender === 'agent';
          
          return (
            <div key={index} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isAgent ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${senderInfo.bgColor} ${senderInfo.textColor} flex-shrink-0`}>
                  {senderInfo.icon}
                </div>
                
                {/* Message */}
                <div className={`px-3 py-2 rounded-lg ${
                  isAgent 
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
      
      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
            👨‍💼
          </div>
          <div className="flex-1 relative">
            <input
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Müşteriye mesaj yazın..."
              disabled={!currentSession}
            />
          </div>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={!input.trim() || !currentSession}
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