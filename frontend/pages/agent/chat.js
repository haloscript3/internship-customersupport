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
  const [systemSessions, setSystemSessions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const endRef = useRef(null);
  const [input, setInput] = useState('');
  const [debug, setDebug] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const agentId = localStorage.getItem('agentId');
    setAgentId(agentId);
    setDebug('agentId: ' + agentId);
    
    if (agentId) {
      console.log('Fetching active sessions for agent:', agentId);
      fetch(`http://localhost:8080/api/agent/active-sessions/${agentId}`)
        .then(res => {
          console.log('Active sessions response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('Active sessions data:', data);
          setDebug(d => d + '\nactive sessions: ' + JSON.stringify(data.sessions));
          setActiveSessions(data.sessions || []);
          
          if (data.sessions && data.sessions.length > 0) {
            console.log('Found user session:', data.sessions[0]);
          } else {
            console.log('No user sessions found');
          }
        })
        .catch(err => {
          console.error('Error fetching active sessions:', err);
          setDebug(d => d + '\nerror fetching sessions: ' + err.message);
        });

      console.log('Fetching AI sessions');
      fetch('http://localhost:8080/api/sessions/ai')
        .then(res => {
          console.log('AI sessions response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('AI sessions data:', data);
          setDebug(d => d + '\nsystem sessions: ' + JSON.stringify(data.sessions));
          setSystemSessions(data.sessions || []);
        })
        .catch(err => {
          console.error('Error fetching AI sessions:', err);
          setDebug(d => d + '\nerror fetching system sessions: ' + err.message);
        });
    }
  }, []);

  const { messages, sendMessage, connected } = useChatWebSocket(null, agentId, 'agent');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTakeOverSystemSession = async (sessionId) => {
    try {
      const response = await fetch('http://localhost:8080/api/agent/takeover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.available) {
        setSessionId(data.sessionId);
        setCurrentSession({
          sessionId: data.sessionId,
          mode: 'human',
          status: 'active'
        });
        setIsAvailable(false);
        setDebug(d => d + '\ntook over session: ' + data.sessionId);
        
        fetch('http://localhost:8080/api/sessions/ai')
          .then(res => res.json())
          .then(data => setSystemSessions(data.sessions || []));
      } else {
        setDebug(d => d + '\nno system sessions available');
      }
    } catch (error) {
      setDebug(d => d + '\ntakeover error: ' + error.message);
    }
  };

  const handleSetAvailability = async (available) => {
    try {
      const response = await fetch('http://localhost:8080/api/agent/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          status: available ? 'available' : 'busy',
        }),
      });

      if (response.ok) {
        setIsAvailable(available);
        setDebug(d => d + '\nstatus updated to: ' + (available ? 'available' : 'busy'));
      }
    } catch (error) {
      setDebug(d => d + '\nstatus update error: ' + error.message);
    }
  };

  const handleEndSession = () => {
    setSessionId(null);
    setCurrentSession(null);
    setIsAvailable(true);
    setDebug(d => d + '\nsession ended');
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

  if (!sessionId) {
    return (
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Agent Paneli</h1>
            <p className="card-description">Müşteri eşleşmesi bekleniyor...</p>
          </div>
          
          <div className="card-content space-y-4">
            <div className="flex justify-center">
              <button 
                className={`btn btn-md ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSetAvailability(!isAvailable)}
              >
                {isAvailable ? 'Uygun' : 'Meşgul'}
              </button>
            </div>

            {systemSessions.length > 0 && isAvailable && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Sistem Session'ları ({systemSessions.length})</h3>
                {systemSessions.map((session, index) => (
                  <div key={session.sessionId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Session {index + 1}</span>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTakeOverSystemSession(session.sessionId)}
                    >
                      Devral
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-footer justify-center">
            <a href="/agent/login" className="btn btn-outline btn-md">
              Tekrar Giriş Yap
            </a>
          </div>
          
          {debug && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <pre className="text-xs font-mono text-muted-foreground">{debug}</pre>
            </div>
          )}
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

  return (
    <div className={`${inter.variable} h-screen bg-background flex flex-col`}>
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-card-foreground">Müşteri Temsilcisi Paneli</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Agent ID: {agentId?.substring(0, 8)}...</span>
              <span>Durum: {isAvailable ? 'Müsait' : 'Meşgul'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              {connected ? 'Bağlı' : 'Bağlantı Kesildi'}
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => handleSetAvailability(!isAvailable)}
            >
              {isAvailable ? 'Müsait Değil' : 'Müsait'}
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Aktif Müşteri Session'ları</h2>
            </div>
            <div className="card-content">
              {activeSessions.length > 0 ? (
                <div className="space-y-2">
                  {activeSessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">User: {session.userId?.substring(0, 8)}...</div>
                        <div className="text-sm text-muted-foreground">
                          Session: {session.sessionId?.substring(0, 8)}... | Mode: {session.mode}
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSessionId(session.sessionId);
                          setCurrentSession(session);
                          setIsAvailable(false);
                        }}
                      >
                        Session'ı Al
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aktif müşteri session'ı bulunamadı</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Sistem Session'ları (AI Modu)</h2>
            </div>
            <div className="card-content">
              {systemSessions.length > 0 ? (
                <div className="space-y-2">
                  {systemSessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">User: {session.userId?.substring(0, 8)}...</div>
                        <div className="text-sm text-muted-foreground">
                          Session: {session.sessionId?.substring(0, 8)}... | AI Modu
                        </div>
                      </div>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleTakeOverSystemSession(session.sessionId)}
                      >
                        Devral
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Sistem session'ı bulunamadı</p>
              )}
            </div>
          </div>
        </div>
        
        {debug && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <pre className="text-xs font-mono text-muted-foreground">{debug}</pre>
          </div>
        )}
      </div>
      
      <div className="border-t bg-card p-4">
        <div className="flex space-x-2">
          <input
            className="input flex-1"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Müşteriye mesaj yazın..."
            disabled={!currentSession}
          />
          <button 
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || !currentSession}
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}