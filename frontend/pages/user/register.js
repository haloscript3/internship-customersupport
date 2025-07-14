import { useState } from 'react';

export default function UserRegister() {
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
      const res = await fetch('http://localhost:8080/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.');
        window.location.href = '/user/login'; // ileride router.push() yapma ihtimalim var
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
    <div style={{ maxWidth: 400, margin: '50px auto', padding: 20 }}>
      <h2>Kullanıcı Kayıt</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Ad Soyad"
          value={form.name}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <input
          name="email"
          type="email"
          placeholder="E-posta"
          value={form.email}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <input
          name="password"
          type="password"
          placeholder="Şifre"
          value={form.password}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 10, marginBottom: 10 }}
        />
        <button type="submit" disabled={loading} style={{ padding: 10, width: '100%' }}>
          {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
        </button>
      </form>
    </div>
  );
}