"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, Edit3, X, Check, RefreshCw, Mail, Eye, Loader2, Search, Users, Calendar, Phone, MessageSquare, Star } from "lucide-react";
import { getAllReviews, updateReviewStatus, deleteReview, updateReviewContent } from "../actions/reviews-admin";

export default function AdminPage() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("bookings"); // "bookings", "users" or "reviews"
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [emailModal, setEmailModal] = useState(null); // { booking, zoomLink }
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "nazli123") {
      setIsAuthenticated(true);
    } else {
      alert("Hatalı şifre!");
    }
  };

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    const res = await getAllReviews();
    setReviews(res);
    setIsLoadingReviews(false);
  };

  useEffect(() => {
    if (activeTab === "reviews") {
      fetchReviews();
    }
  }, [activeTab]);


  const handleDelete = async (id) => {
    if (!confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
    } catch (err) {
      alert("Silme hatası: " + err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const { id, ...data } = editingBooking;
      
      const oldBooking = bookings.find(b => b.id === id);
      const isNewlyPaid = (oldBooking && oldBooking.status !== "PAID" && data.status === "PAID");

      await updateDoc(doc(db, "bookings", id), data);
      
      if (isNewlyPaid) {
        try {
          await fetch("/api/send-success-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking: { ...oldBooking, ...data } })
          });
        } catch (emailErr) {
          console.error("E-posta gönderim hatası:", emailErr);
          alert("Durum güncellendi ancak onay mailleri gönderilemedi!");
        }
      }

      setEditingBooking(null);
    } catch (err) {
      alert("Güncelleme hatası: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailModal.zoomLink) return alert("Lütfen Zoom linkini girin.");
    
    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailModal.booking.email,
          name: emailModal.booking.name,
          zoomLink: emailModal.zoomLink,
          date: (() => {
            if (!emailModal.booking.date) return "";
            if (emailModal.booking.date.includes('T')) return format(new Date(emailModal.booking.date), "dd MMMM yyyy", { locale: tr });
            const [y, m, d] = emailModal.booking.date.split('-').map(Number);
            return format(new Date(y, m-1, d), "dd MMMM yyyy", { locale: tr });
          })(),
          time: emailModal.booking.time
        })
      });

      if (response.ok) {
        alert("E-posta başarıyla gönderildi!");
        setEmailModal(null);
      } else {
        const error = await response.json();
        alert("E-posta gönderilemedi: " + (error.message || "Bilinmeyen hata"));
      }
    } catch (err) {
      alert("Hata: " + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !db) return;

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

  useEffect(() => {
    if (isAuthenticated && activeTab === "users") {
      fetchUsers();
    }
  }, [isAuthenticated, activeTab]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        console.error("Fetch users error:", data.error);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <form onSubmit={handleLogin} className="glass p-8 rounded-3xl max-w-sm w-full glow-gold">
          <h2 className="text-2xl font-bold mb-6 text-center italic">Yönetici Girişi</h2>
          <input 
            type="password" 
            placeholder="Şifre" 
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary-hover transition-all">
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto pb-24">
      {/* Header & Tabs */}
      <div className="mt-12 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-black italic tracking-tighter">İşlem Paneli</h1>
          <button 
            onClick={() => {
              if (activeTab === "bookings") window.location.reload();
              else if (activeTab === "users") fetchUsers();
              else if (activeTab === "reviews") fetchReviews();
            }}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-primary"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingUsers || isLoadingReviews ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit">
          <button 
            onClick={() => setActiveTab("bookings")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-muted hover:text-white'}`}
          >
            Rezervasyonlar
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-muted hover:text-white'}`}
          >
            Kayıtlı Üyeler
          </button>
          <button 
            onClick={() => setActiveTab("reviews")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'reviews' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-muted hover:text-white'}`}
          >
            Yorumlar
          </button>
        </div>
      </div>

      {activeTab === "reviews" && (
        <div className="glass rounded-3xl overflow-hidden border border-white/10">
          <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-text-muted font-bold">Yorum İstekleri</span>
            <div className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
              {reviews.length} Toplam
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 font-semibold text-text-muted text-sm">Tarih</th>
                  <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">İsim & Hesap</th>
                  <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">Mesaj</th>
                  <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">Durum</th>
                  <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingReviews ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-text-muted text-sm font-medium">Yorumlar yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-text-muted">Henüz yorum bulunmuyor.</td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="p-4 border-r border-white/5 text-xs">
                        {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="p-4 border-r border-white/5 font-medium">
                        <div>{r.name}</div>
                        <div className="text-xs text-primary">{r.handle}</div>
                      </td>
                      <td className="p-4 border-r border-white/5 text-sm italic max-w-sm truncate">
                        <div className="flex gap-0.5 text-primary mb-1">
                          {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-primary" />)}
                        </div>
                        "{r.text}"
                      </td>
                      <td className="p-4 border-r border-white/5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${r.isApproved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {r.isApproved ? 'Onaylı' : 'Bekliyor'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!r.isApproved && (
                            <button 
                              onClick={async () => {
                                await updateReviewStatus(r.id, true);
                                fetchReviews();
                              }}
                              className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => setEditingReview(r)}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm("Yorumu silmek istediğinize emin misiniz?")) {
                                await deleteReview(r.id);
                                fetchReviews();
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "bookings" ? (
        <div className="glass rounded-3xl overflow-hidden border border-white/10">
          <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-text-muted font-bold">Mevcut Rezervasyonlar</span>
            <div className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
              {bookings.length} Kayıt
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-semibold text-text-muted text-sm">Tarih Düzenleme</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">Ad Soyad</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">İletişim</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5">Durum</th>
                <th className="p-4 font-semibold text-text-muted text-sm border-l border-white/5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {!db ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-yellow-400 bg-yellow-400/10">
                    Firebase yapılandırılmamış. Rezervasyonlar listelenemiyor.
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-text-muted">Henüz rezervasyon bulunmuyor.</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                     <td className="p-4 border-r border-white/5">
                        <div className="font-semibold">
                          {(() => {
                            if (!booking.date) return "Bilinmiyor";
                            try {
                              const d = new Date(booking.date);
                              if (isNaN(d.getTime())) return "Geçersiz Tarih";
                              return format(d, "dd MMM yyyy", { locale: tr });
                            } catch (e) {
                              return "Hatalı Format";
                            }
                          })()}
                        </div>
                        <div className="text-sm text-primary">{booking.time || "Bilinmiyor"}</div>
                     </td>
                     <td className="p-4 border-r border-white/5 font-medium flex flex-col gap-1 items-start">
                        {booking.name}
                        {booking.package === 'monthly' && (
                          <span className="text-[10px] text-primary border border-primary/20 px-2 py-0.5 rounded-full bg-primary/10 tracking-widest uppercase">Aylık Danışmanlık</span>
                        )}
                        {(!booking.package || booking.package === 'single') && (
                          <span className="text-[10px] text-text-muted border border-white/10 px-2 py-0.5 rounded-full bg-white/5 tracking-widest uppercase">Tek Seferlik</span>
                        )}
                     </td>
                     <td className="p-4 border-r border-white/5">
                        <div className="text-sm truncate max-w-[200px]">{booking.email}</div>
                        <div className="text-sm text-text-muted">{booking.phone}</div>
                     </td>
                     <td className="p-4 border-r border-white/5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                            booking.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {booking.status === 'PAID' ? 'Ödendi' : booking.status === 'FAILED' ? 'Başarısız' : 'Bekliyor'}
                        </span>
                     </td>
                     <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setViewingBooking(booking)}
                            title="Detayları Gör"
                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEmailModal({ booking, zoomLink: "" })}
                            title="Mail Gönder"
                            className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingBooking(booking)}
                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(booking.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="space-y-6">
          {/* Members Search & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass p-4 rounded-2xl border border-white/10 flex items-center gap-3">
              <Search className="text-text-muted" size={20} />
              <input 
                type="text" 
                placeholder="İsim, e-posta veya telefon ile ara..."
                className="bg-transparent border-none outline-none w-full text-white placeholder:text-gray-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="glass p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">Toplam Üye</p>
                <p className="text-2xl font-black italic">{users.length}</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-xl text-primary">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-text-muted font-bold">Kayıtlı KNK Üyeleri</span>
              {searchTerm && (
                <div className="text-[10px] bg-white/10 text-white px-3 py-1 rounded-full font-bold">
                  "{searchTerm}" için sonuçlar
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-4 font-semibold text-text-muted text-sm uppercase tracking-wider">Üye</th>
                    <th className="p-4 font-semibold text-text-muted text-sm uppercase tracking-wider border-l border-white/5">İletişim</th>
                    <th className="p-4 font-semibold text-text-muted text-sm uppercase tracking-wider border-l border-white/5">Bilgiler</th>
                    <th className="p-4 font-semibold text-text-muted text-sm uppercase tracking-wider border-l border-white/5">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan="4" className="p-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-12 h-12 text-primary animate-spin" />
                          <span className="text-text-muted font-bold tracking-widest animate-pulse uppercase text-xs">Veritabanına bağlanılıyor...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-24 text-center">
                        <div className="flex flex-col items-center gap-4 text-text-muted">
                          <Users size={40} className="opacity-20" />
                          <span className="italic">Henüz kayıtlı üye bulunmuyor.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.filter(u => 
                      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      u.phone?.includes(searchTerm)
                    ).map((user, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                        <td className="p-4 border-r border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-transparent flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
                              {user.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-white group-hover:text-primary transition-colors">{user.name || "İsimsiz Üye"}</div>
                              <div className="text-[10px] text-text-muted uppercase tracking-tighter opacity-60">Üye #{idx + 1}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 border-r border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-3 h-3 text-primary/60" />
                            <div className="text-sm font-medium">{user.email}</div>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-text-muted" />
                              <div className="text-xs text-text-muted">{user.phone}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 border-r border-white/5">
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-text-muted border border-white/10 uppercase tracking-tighter">
                              {user.gender === 'female' ? 'Kadın' : user.gender === 'male' ? 'Erkek' : "Belirtilmedi"}
                            </span>
                            {user.age && (
                              <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-text-muted border border-white/10 uppercase tracking-tighter">
                                {user.age} Yaş
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-text-muted">
                            <Calendar className="w-3 h-3" />
                            {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: tr }) : "-"}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleUpdate} className="glass p-8 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold italic">Rezervasyonu Düzenle</h2>
              <button type="button" onClick={() => setEditingBooking(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Durum</label>
                  <select 
                    value={editingBooking.status}
                    onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="PENDING">Bekliyor</option>
                    <option value="PAID">Ödendi</option>
                    <option value="FAILED">Hatalı/İptal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Saat</label>
                  <input 
                    type="text" 
                    value={editingBooking.time || ""}
                    onChange={(e) => setEditingBooking({...editingBooking, time: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Ad Soyad</label>
                <input 
                  type="text" 
                  value={editingBooking.name || ""}
                  onChange={(e) => setEditingBooking({...editingBooking, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Telefon</label>
                <input 
                  type="text" 
                  value={editingBooking.phone || ""}
                  onChange={(e) => setEditingBooking({...editingBooking, phone: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">E-posta</label>
                <input 
                  type="email" 
                  value={editingBooking.email || ""}
                  onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full py-4 bg-primary text-black font-bold rounded-2xl hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                >
                  {isUpdating ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* View Details Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass p-8 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold italic">Rezervasyon Detayları</h2>
              <button onClick={() => setViewingBooking(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Danışan & Paket</p>
                  <p className="font-semibold flex items-center gap-2">
                    {viewingBooking.name}
                    {viewingBooking.package === 'monthly' ? (
                      <span className="text-[10px] text-primary border border-primary/20 px-2 py-0.5 rounded-full bg-primary/10 tracking-widest uppercase">Aylık</span>
                    ) : (
                      <span className="text-[10px] text-text-muted border border-white/10 px-2 py-0.5 rounded-full bg-white/5 tracking-widest uppercase">Birebir</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Randevu</p>
                  <p className="font-semibold text-primary">{format(new Date(viewingBooking.date), "dd MMM yyyy", { locale: tr })} - {viewingBooking.time}</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Sosyal Medya", value: viewingBooking.socialMedia },
                  { label: "Marka Hikayesi", value: viewingBooking.brandStory },
                  { label: "Hedef Kitle", value: viewingBooking.targetAudience },
                  { label: "Rakipler", value: viewingBooking.competitors },
                  { label: "En Çok Zorlandığı Konu", value: viewingBooking.challenge },
                  { label: "Önceki Eğitim", value: viewingBooking.previousTraining === 'evet' ? 'Katıldı' : 'İlk Kez' },
                  { label: "Konuşulacak Konular", value: viewingBooking.topics },
                ].map((item, idx) => (
                  <div key={idx}>
                    <p className="text-xs text-primary/60 uppercase tracking-widest mb-2">{item.label}</p>
                    <p className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm leading-relaxed whitespace-pre-wrap">
                      {item.value || "Belirtilmedi"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleSendEmail} className="glass p-8 rounded-3xl max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">Mail Gönder</h2>
              </div>
              <button type="button" onClick={() => setEmailModal(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-6">
              <strong>{emailModal.booking.name}</strong> kişisine Zoom linkini içeren bir onay maili gönderilecek.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Zoom / Görüşme Linki</label>
                <textarea 
                  required
                  rows="3"
                  placeholder="https://zoom.us/j/..."
                  value={emailModal.zoomLink}
                  onChange={(e) => setEmailModal({...emailModal, zoomLink: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSendingEmail}
                className="w-full py-4 bg-purple-500 text-white font-bold rounded-2xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingEmail ? "Gönderiliyor..." : "Maili Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Review Edit Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md glass p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Yorum Düzenle</h3>
              <button onClick={() => setEditingReview(null)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData);
              await updateReviewContent(editingReview.id, data);
              setEditingReview(null);
              fetchReviews();
            }} className="space-y-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block uppercase">İsim</label>
                <input type="text" name="name" defaultValue={editingReview.name} required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block uppercase">Handle (Instagram)</label>
                <input type="text" name="handle" defaultValue={editingReview.handle} required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block uppercase">Puan</label>
                <input type="number" name="rating" defaultValue={editingReview.rating} min="1" max="5" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block uppercase">Mesaj</label>
                <textarea name="text" defaultValue={editingReview.text} required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary" />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary-hover transition-all"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
