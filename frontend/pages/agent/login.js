import { useState } from 'react';

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
    <div style={styles.container}>
      <h2 style={styles.title}>Agent Giriş</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          name="email"
          type="email"
          placeholder="E-posta"
          value={form.email}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          name="password"
          type="password"
          placeholder="Şifre"
          value={form.password}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Logging in' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 400,
    margin: '80px auto',
    padding: '2rem',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    fontFamily: 'Inter',
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#0d6efd',
    fontFamily: 'Inter',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    fontFamily: 'Inter',
  },
  input: {
    padding: '0.75rem',
    borderRadius: 4,
    border: '1px solid #ced4da',
    fontSize: '1rem',
    fontFamily: 'Inter',
  },
  button: {
    padding: '0.75rem',
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#0d6efd',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Inter',
  },
};