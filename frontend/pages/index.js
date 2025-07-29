import Head from "next/head";
import Image from "next/image";
import { Inter, JetBrains_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import modernStyles from "@/styles/ModernUI.module.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <>
      <Head>
        <title>AI Destekli Müşteri Hizmetleri</title>
        <meta name="description" content="Modern müşteri hizmetleri platformu" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={modernStyles.container}>
        <div className={modernStyles.card}>
          <div className={modernStyles.logo}>
            <h1>AI Destekli Müşteri Hizmetleri</h1>
            <p>Modern ve akıllı müşteri desteği platformu</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '18px' }}>
                Müşteri misiniz?
              </h3>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <a 
                  href="/user/login" 
                  className={modernStyles.button}
                  style={{ flex: 1, maxWidth: '150px', textAlign: 'center' }}
                >
                  Giriş Yap
                </a>
                <a 
                  href="/user/register" 
                  className={modernStyles.button}
                  style={{ 
                    flex: 1, 
                    maxWidth: '150px', 
                    textAlign: 'center',
                    background: 'transparent',
                    color: '#667eea',
                    border: '2px solid #667eea'
                  }}
                >
                  Kayıt Ol
                </a>
              </div>
            </div>
            
            <div style={{ 
              width: '100%', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
              margin: '20px 0'
            }} />
            
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '18px' }}>
                Müşteri Temsilcisi misiniz?
              </h3>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <a 
                  href="/agent/login" 
                  className={modernStyles.button}
                  style={{ flex: 1, maxWidth: '150px', textAlign: 'center' }}
                >
                  Agent Girişi
                </a>
                <a 
                  href="/agent/register" 
                  className={modernStyles.button}
                  style={{ 
                    flex: 1, 
                    maxWidth: '150px', 
                    textAlign: 'center',
                    background: 'transparent',
                    color: '#667eea',
                    border: '2px solid #667eea'
                  }}
                >
                  Agent Kayıt
                </a>
              </div>
            </div>
          </div>
          
          <div className={modernStyles.link} style={{ marginTop: '30px' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              AI destekli müşteri hizmetleri platformu
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
