import Head from "next/head";
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
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
      <div className={`${inter.variable} min-h-screen bg-gray-900 text-white flex items-center justify-center p-4`}>
        <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold mb-2">
              AI Destekli Müşteri Hizmetleri
            </h1>
            <p className="text-gray-400">
              Modern ve akıllı müşteri desteği platformu
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-3">
                Müşteri misiniz?
              </h3>
              <div className="flex gap-3 justify-center">
                <a 
                  href="/user/login" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Giriş Yap
                </a>
                <a 
                  href="/user/register" 
                  className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-md"
                >
                  Kayıt Ol
                </a>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 text-gray-400">
                  veya
                </span>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium mb-3">
                Müşteri Temsilcisi misiniz?
              </h3>
              <div className="flex gap-3 justify-center">
                <a 
                  href="/agent/login" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Agent Girişi
                </a>
                <a 
                  href="/agent/register" 
                  className="border border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-md"
                >
                  Agent Kayıt
                </a>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              AI destekli müşteri hizmetleri platformu
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
