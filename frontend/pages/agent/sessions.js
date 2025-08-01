import { useEffect, useState } from 'react';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function AgentSessions() {
  const [agentId, setAgentId] = useState(null);
  const [systemSessions, setSystemSessions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
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
        setDebug(d => d + '\ntook over session: ' + data.sessionId);
        
        window.location.href = `/agent/chat?sessionId=${data.sessionId}`;
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

  const handleTakeSession = async (session) => {
    try {
      const response = await fetch('http://localhost:8080/api/agent/assign-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          sessionId: session.sessionId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setDebug(d => d + '\nassigned session: ' + session.sessionId);
        window.location.href = `/agent/chat?sessionId=${session.sessionId}`;
      } else {
        setDebug(d => d + '\nfailed to assign session: ' + data.message);
      }
    } catch (error) {
      setDebug(d => d + '\nassignment error: ' + error.message);
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
    <div className={`${inter.variable} min-h-screen bg-background flex flex-col`}>
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-card-foreground">Agent Session Yönetimi</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Agent ID: {agentId?.substring(0, 8)}...</span>
              <span>Durum: {isAvailable ? 'Müsait' : 'Meşgul'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className={`btn btn-sm ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSetAvailability(!isAvailable)}
            >
              {isAvailable ? 'Müsait' : 'Meşgul'}
            </button>
            <a href="/agent/chat" className="btn btn-outline btn-sm">
              Chat'e Git
            </a>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Aktif Müşteri Session'ları</h2>
              <p className="text-sm text-muted-foreground">
                Size atanmış veya alabileceğiniz session'lar
              </p>
            </div>
            <div className="card-content">
              {activeSessions.length > 0 ? (
                <div className="space-y-3">
                  {activeSessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">User ID: {session.userId}</div>
                        <div className="text-sm text-muted-foreground">
                          Session ID: {session.sessionId} | Mode: {session.mode} | Status: {session.status}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(session.createdAt).toLocaleString('tr-TR')} | 
                          Last Activity: {new Date(session.lastActivity).toLocaleString('tr-TR')}
                        </div>
                        {session.assignedAgent && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Assigned to: {session.assignedAgent === agentId ? 'You' : session.assignedAgent}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {session.assignedAgent === agentId ? (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleTakeSession(session)}
                          >
                            Chat'e Git
                          </button>
                        ) : (
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => handleTakeSession(session)}
                          >
                            Session'ı Al
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aktif müşteri session'ı bulunamadı</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Sistem Session'ları (AI Modu)</h2>
              <p className="text-sm text-muted-foreground">
                AI tarafından yönetilen session'ları devralabilirsiniz
              </p>
            </div>
            <div className="card-content">
              {systemSessions.length > 0 ? (
                <div className="space-y-3">
                  {systemSessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">User ID: {session.userId}</div>
                        <div className="text-sm text-muted-foreground">
                          Session ID: {session.sessionId} | AI Modu
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(session.createdAt).toLocaleString('tr-TR')} | 
                          Last Activity: {new Date(session.lastActivity).toLocaleString('tr-TR')}
                        </div>
                      </div>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => handleTakeOverSystemSession(session.sessionId)}
                        disabled={!isAvailable}
                      >
                        Devral
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sistem session'ı bulunamadı</p>
              )}
            </div>
          </div>

          {!isAvailable && (
            <div className="card border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <div className="card-header">
                <h3 className="card-title text-orange-800 dark:text-orange-200">Durum: Meşgul</h3>
              </div>
              <div className="card-content">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Şu anda meşgul durumdasınız. Yeni session'lar alamazsınız. 
                  Müsait duruma geçmek için yukarıdaki "Meşgul" butonuna tıklayın.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {debug && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-medium mb-2">Debug Bilgileri</h3>
            <pre className="text-xs font-mono text-muted-foreground overflow-auto">{debug}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 