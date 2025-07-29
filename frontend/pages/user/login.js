import { useState } from 'react';
import styles from '../../styles/ModernUI.module.css';

export default function UserLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        const userId = form.email;
        const agentId = localStorage.getItem('agentId');
        let sessionId = null;
        if (agentId) {
          const sessionRes = await fetch('http://localhost:8080/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, agentId }),
          });
          const sessionData = await sessionRes.json();
          if (sessionRes.ok && sessionData.sessionId) {
            sessionId = sessionData.sessionId;
          } else {
            alert('Session başlatılamadı.');
            setLoading(false);
            return;
          }
        } else {
          const sessionRes = await fetch('http://localhost:8080/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          const sessionData = await sessionRes.json();
          if (sessionRes.ok && sessionData.sessionId) {
            sessionId = sessionData.sessionId;
          } else {
            alert('Session başlatılamadı.');
            setLoading(false);
            return;
          }
        }
        localStorage.setItem('sessionId', sessionId);
        localStorage.setItem('userId', userId);
        window.location.href = '/user/chat';
      } else {
        alert(data.error || 'Hatalı giriş.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>Hoş Geldiniz</h1>
          <p>Müşteri hizmetleri sistemine giriş yapın</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              name="email"
              type="email"
              placeholder="E-posta adresiniz"
              value={form.email}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <input
              name="password"
              type="password"
              placeholder="Şifreniz"
              value={form.password}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className={styles.button}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className={styles.link}>
          Hesabınız yok mu? <a href="/user/register">Kayıt olun</a>
        </div>
      </div>
    </div>
  );
}