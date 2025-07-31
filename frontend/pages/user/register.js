import { useState } from 'react';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
        window.location.href = '/user/login';
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
    <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
      <div className="card w-full max-w-md">
        <div className="card-header text-center">
          <h1 className="card-title">Hesap Oluştur</h1>
          <p className="card-description">
            Müşteri hizmetleri sistemine kayıt olun
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="card-content space-y-4">
          <div className="space-y-2">
            <input
              name="name"
              placeholder="Ad Soyad"
              value={form.name}
              onChange={handleChange}
              required
              className="input"
            />
          </div>
          
          <div className="space-y-2">
            <input
              name="email"
              type="email"
              placeholder="E-posta adresiniz"
              value={form.email}
              onChange={handleChange}
              required
              className="input"
            />
          </div>
          
          <div className="space-y-2">
            <input
              name="password"
              type="password"
              placeholder="Şifreniz"
              value={form.password}
              onChange={handleChange}
              required
              className="input"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary btn-md w-full"
          >
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        
        <div className="card-footer justify-center">
          <p className="text-sm text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <a href="/user/login" className="text-primary hover:underline">
              Giriş yapın
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}