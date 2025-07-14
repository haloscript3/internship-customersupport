import { useState } from 'react';

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
        body: JSON.stringify({form}),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Successful login! Redirecting to chat page.');
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
    <div style={{ maxWidth: 400, margin: '50px auto', padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="E-posta"
          value={form.email}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 ,fontFamily: 'Inter',}}
          
        />
        <input
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <button type="submit" disabled={loading} style={{ padding: 10, width: '100%' ,fontFamily: 'Inter',}}>
          {loading ? 'Logging in' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}