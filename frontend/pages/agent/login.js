import { useState } from 'react';
import styles from '../../styles/ModernUI.module.css';

export default function AgentLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        const agentId = data.agentId;
        localStorage.setItem('agentId', agentId);
        window.location.href = '/agent/chat';
      } else {
        alert(data.error || 'Giriş bilgileri hatalı.');
      }
    } catch (err) {
      console.error(err);
      alert('Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>Agent Girişi</h1>
          <p>Müşteri temsilcisi paneli</p>
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
          Hesabınız yok mu? <a href="/agent/register">Kayıt olun</a>
        </div>
      </div>
    </div>
  );
}