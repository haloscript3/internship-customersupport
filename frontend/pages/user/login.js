import { useState } from 'react';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
        localStorage.setItem('userId', userId);
        window.location.href = '/user/messages';
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
    <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
      <div className="card w-full max-w-md">
        <div className="card-header text-center">
          <h1 className="card-title">Hoş Geldiniz</h1>
          <p className="card-description">
            Müşteri hizmetleri sistemine giriş yapın
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="card-content space-y-4">
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
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="card-footer justify-center">
          <p className="text-sm text-muted-foreground">
            Hesabınız yok mu?{' '}
            <a href="/user/register" className="text-primary hover:underline">
              Kayıt olun
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}