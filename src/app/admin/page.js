"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function AdminPage() {
  const [bookings, setBookings] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "nazli123") {
      setIsAuthenticated(true);
    } else {
      alert("Hatalı şifre!");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bks = [];
      querySnapshot.forEach((doc) => {
        bks.push({ id: doc.id, ...doc.data() });
      });
      setBookings(bks);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="glass p-8 rounded-3xl max-w-sm w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">Yönetici Girişi</h2>
          <input 
            type="password" 
            placeholder="Şifre" 
            autoFocus
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mb-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full py-3 bg-primary text-black font-semibold rounded-xl">
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 mt-12">
        <h1 className="text-3xl font-bold">Rezervasyonlar</h1>
        <div className="text-sm bg-primary/20 text-primary px-4 py-2 rounded-full border border-primary/30">
          Toplam: {bookings.length}
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-semibold text-text-muted text-sm">Tarih Düzenleme</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">Ad Soyad</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">İletişim</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">Durum</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-text-muted">Henüz rezervasyon bulunmuyor.</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                     <td className="p-4 border-r border-white/5">
                        <div className="font-semibold">{booking.date ? format(new Date(booking.date), "dd MMM yyyy", { locale: tr }) : "Bilinmiyor"}</div>
                        <div className="text-sm text-primary">{booking.time || "Bilinmiyor"}</div>
                     </td>
                     <td className="p-4 border-r border-white/5 font-medium">
                        {booking.name}
                     </td>
                     <td className="p-4 border-r border-white/5">
                        <div className="text-sm truncate max-w-[200px]">{booking.email}</div>
                        <div className="text-sm text-text-muted">{booking.phone}</div>
                     </td>
                     <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                            booking.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {booking.status === 'PAID' ? 'Ödendi' : booking.status === 'FAILED' ? 'Başarısız' : 'Bekliyor'}
                        </span>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
