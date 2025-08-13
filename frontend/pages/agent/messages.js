import { useEffect, useState } from 'react';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function AgentMessages() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState(null);

  useEffect(() => {
    const agentId = localStorage.getItem('agentId');
    setAgentId(agentId);
    
    if (agentId) {
      fetchSessions(agentId);
    }
  }, []);

  const fetchSessions = async (agentId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/session/agent/${agentId}`);
      const data = await response.json();
      
      if (response.ok) {
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to fetch sessions:', data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/session/messages?sessionId=${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw messages from API:', data);
        
        const messagesArray = Array.isArray(data) ? data : (data.messages || []);
        console.log('Processed messages array:', messagesArray);
        
        const formattedMessages = messagesArray.map(msg => ({
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp || new Date().toISOString()
        }));
        
        console.log('Final formatted messages:', formattedMessages);
        console.log('Timestamp samples:', formattedMessages.slice(0, 3).map(m => ({ 
          sender: m.sender, 
          timestamp: m.timestamp, 
          parsed: new Date(m.timestamp) 
        })));
        setMessages(formattedMessages);
      } else {
        console.error('Failed to fetch messages - response not ok:', response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    fetchMessages(session.sessionId);
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Tarih bilgisi yok';
    }
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Geçersiz tarih';
      }
      
      return date.toLocaleString('tr-TR');
    } catch (error) {
      console.error('Date formatting error:', error, 'for dateString:', dateString);
      return 'Tarih hatası';
    }
  };

  const getSenderInfo = (sender) => {
    switch (sender) {
      case 'agent':
        return { name: 'Siz', icon: '👨‍💼', bgColor: 'bg-primary', textColor: 'text-primary-foreground' };
      case 'user':
        return { name: 'Müşteri', icon: '👤', bgColor: 'bg-blue-500', textColor: 'text-white' };
      case 'system':
      case 'ai':
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

  return (
    <div className={`${inter.variable} h-screen bg-background flex flex-col`}>
      
      <header className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a href="/agent/sessions" className="btn btn-ghost btn-sm p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-lg font-semibold text-card-foreground">Mesaj Geçmişi</h1>
              <p className="text-sm text-muted-foreground">Tamamlanan sohbetler ve mesajlar</p>
            </div>
          </div>
        </div>
      </header>

      
      <div className="flex-1 flex">
        
        <div className="w-1/3 border-r bg-card">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Sohbet Geçmişi</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Yükleniyor...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">Henüz Sohbet Yok</h3>
                <p className="text-muted-foreground">Tamamlanan sohbetler burada görünecek</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedSession?.sessionId === session.sessionId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {session.userId ? `Müşteri: ${session.userId}` : 'Bilinmeyen Müşteri'}
                        </p>
                        <p className="text-xs opacity-75">
                          {formatDate(session.lastActivity || session.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          session.mode === 'human' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {session.mode === 'human' ? 'Human' : 'AI'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              <div className="border-b bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {selectedSession.userId ? `Müşteri: ${selectedSession.userId}` : 'Bilinmeyen Müşteri'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedSession.lastActivity || selectedSession.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      selectedSession.mode === 'human' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedSession.mode === 'human' ? 'Human Agent' : 'AI Assistant'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Bu sohbette henüz mesaj yok</p>
                    <p className="text-xs text-muted-foreground mt-2">Debug: {selectedSession?.sessionId}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-blue-800">
                      Toplam {messages.length} mesaj bulundu
                    </div>
                    {messages.map((message, index) => {
                      const senderInfo = getSenderInfo(message.sender);
                      const isAgent = message.sender === 'agent';
                      
                      return (
                        <div key={index} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isAgent ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${senderInfo.bgColor} ${senderInfo.textColor} flex-shrink-0`}>
                              {senderInfo.icon}
                            </div>
                            
                            <div className={`px-3 py-2 rounded-lg ${
                              isAgent 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <div className="text-sm">{message.text}</div>
                              <div className="text-xs opacity-75 mt-1">
                                {formatDate(message.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">Sohbet Seçin</h3>
                <p className="text-muted-foreground">Mesajları görüntülemek için bir sohbet seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 