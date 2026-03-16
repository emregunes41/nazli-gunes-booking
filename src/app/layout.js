import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Rezervasyon | Nazlı Güneş Danışmanlık",
  description: "Nazlı Güneş Sosyal Medya Danışmanlığı - Online Rezervasyon ve Ödeme Paneli",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} antialiased selection:bg-primary/30 selection:text-primary`}>
        {children}
      </body>
    </html>
  );
}
