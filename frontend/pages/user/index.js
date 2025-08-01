import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function UserHome() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      router.push('/user/login');
      return;
    }

    setUser({ id: userId });
    setLoading(false);
    
    router.push('/user/messages');
  }, []);

  if (loading) {
    return (
      <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
        <div className="card w-full max-w-md">
          <div className="card-header text-center">
            <h1 className="card-title">Yükleniyor...</h1>
            <p className="card-description">Yönlendiriliyor</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.variable} min-h-screen bg-background flex items-center justify-center p-4`}>
      <div className="card w-full max-w-md">
        <div className="card-header text-center">
          <h1 className="card-title">Yönlendiriliyor</h1>
          <p className="card-description">Mesajlar sayfasına yönlendiriliyorsunuz</p>
        </div>
      </div>
    </div>
  );
} 