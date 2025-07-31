import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/ModernUI.module.css';

export default function UserHome() {
  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const sessionId = localStorage.getItem('sessionId');
    
    if (!userId) {
      router.push('/user/login');
      return;
    }

    setUser({ id: userId });

    checkActiveSession(userId);
  }, []);

  const checkActiveSession = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/session/user/active?userId=${userId}`);
      const data = await response.json();
      
      if (data.hasActiveSession) {
        setActiveSession(data.session);
        router.push('/user/chat');
        return;
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
        router.push('/user/chat');
      } else {
        alert('Session başlatılamadı. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionId');
    router.push('/user/login');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <h1>Yükleniyor...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <h1>Customer Service</h1>
          <p>Hoş geldiniz!</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.button}
            onClick={handleLogout}
          >
            Çıkış
          </button>
        </div>
      </header>
      
      <div className={styles.homeContent}>
        <div className={styles.welcomeSection}>
          <div className={styles.welcomeIcon}>
            💬
          </div>
          <h2>Müşteri Hizmetleri</h2>
          <p>Size nasıl yardımcı olabiliriz?</p>
        </div>

        <div className={styles.actionButtons}>
          <button 
            className={`${styles.button} ${styles.buttonPrimary} ${styles.startChatButton}`}
            onClick={startNewChat}
            disabled={loading}
          >
            {loading ? 'Başlatılıyor...' : '💬 Sohbet Başlat'}
          </button>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoCard}>
            <h3>🤖 Sistem Asistanı</h3>
            <p>Anında yanıt alın, 7/24 hizmet</p>
          </div>
          <div className={styles.infoCard}>
            <h3>👨‍💼 Müşteri Temsilcisi</h3>
            <p>Uzman temsilcilerimizle görüşün</p>
          </div>
          <div className={styles.infoCard}>
            <h3>⚡ Hızlı Çözüm</h3>
            <p>Sorunlarınızı hızlıca çözelim</p>
          </div>
        </div>

        {activeSession && (
          <div className={styles.activeSessionWarning}>
            <p>⚠️ Aktif bir sohbetiniz var. Devam etmek için chat sayfasına gidin.</p>
            <button 
              className={styles.button}
              onClick={() => router.push('/user/chat')}
            >
              Sohbete Devam Et
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 