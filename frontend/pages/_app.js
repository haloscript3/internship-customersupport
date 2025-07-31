import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { useEffect } from "react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function App({ Component, pageProps }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className={inter.variable}>
      <Component {...pageProps} />
    </div>
  );
}
