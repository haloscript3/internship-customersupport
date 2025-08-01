import { useEffect, useState } from 'react';
import { Inter } from "next/font/google";
import Link from 'next/link';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function UserMessages() {
  const [userId, setUserId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setUserId(userId);
    setDebug('userId: ' + userId);
    
    if (userId) {
      fetchUserSessions(userId);
    }
  }, []);

  const fetchUserSessions = async (userId) => {
    try {
      setLoading(true);
      
      const activeResponse = await fetch(`http://localhost:8080/api/session/user/active?userId=${userId}`);
      const activeData = await activeResponse.json();
      
      if (activeData.session) {
        window.location.href = `/user/chat?sessionId=${activeData.session.sessionId}`;
        return;
      }

      const response = await fetch(`http://localhost:8080/api/session/user/${userId}`);
      const data = await response.json();
      
      if (data.sessions) {
        setSessions(data.sessions);
        setDebug(d => d + '\nsessions: ' + JSON.stringify(data.sessions));
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setDebug(d => d + '\nerror: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.sessionId) {
        setDebug(d => d + '\nnew session: ' + data.sessionId);
        window.location.href = `/user/chat?sessionId=${data.sessionId}`;
      } else {
        setDebug(d => d + '\nfailed to start session: ' + data.message);
      }
    } catch (error) {
      setDebug(d => d + '\nstart session error: ' + error.message);
    }
  };

  if (!userId) {
    return (
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Kullanıcı Girişi Gerekli</h1>
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

  if (loading) {
    return (
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Yükleniyor...</h1>
            <p className="card-description">Session'larınız getiriliyor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.variable} h-screen bg-background flex flex-col`}>
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-card-foreground">Mesajlarım</h1>
            <div className="text-sm text-muted-foreground">
              Geçmiş konuşmalarınız ve yeni sohbetler
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="btn btn-primary btn-sm"
              onClick={startNewChat}
            >
              Yeni Sohbet
            </button>
            <a href="/user/history" className="btn btn-outline btn-sm">
              Geçmiş
            </a>
            <a href="/user/login" className="btn btn-outline btn-sm">
              Çıkış
            </a>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <Link 
                  key={index} 
                  href={`/user/chat?sessionId=${session.sessionId}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                          {session.mode === 'system' ? '🤖' : '👤'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {session.mode === 'system' ? 'AI Asistan' : 'Müşteri Temsilcisi'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.lastMessage || 'Henüz mesaj yok'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {new Date(session.lastActivity).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(session.lastActivity).toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {session.status === 'active' && (
                        <div className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 mt-1">
                          Aktif
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">Henüz konuşma yok</h3>
              <p className="text-muted-foreground mb-4">
                İlk konuşmanızı başlatmak için "Yeni Sohbet" butonuna tıklayın
              </p>
              <button 
                className="btn btn-primary"
                onClick={startNewChat}
              >
                Yeni Sohbet Başlat
              </button>
            </div>
          )}
        </div>
        
        {debug && (
          <div className="mt-4 p-3 bg-muted rounded-lg mx-4 mb-4">
            <pre className="text-xs font-mono text-muted-foreground">{debug}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 