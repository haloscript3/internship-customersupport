import { useState } from 'react';
import styles from '../../styles/ModernUI.module.css';

export default function AgentRegister() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/agent/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.');
        window.location.href = '/agent/login';
      } else {
        alert(data.error || 'Bir hata oluştu.');
      }

    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1>Agent Kayıt</h1>
          <p>Müşteri temsilcisi hesabı oluşturun</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              name="name"
              placeholder="Ad Soyad"
              value={form.name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
          
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
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        
        <div className={styles.link}>
          Zaten hesabınız var mı? <a href="/agent/login">Giriş yapın</a>
        </div>
      </div>
    </div>
  );
}