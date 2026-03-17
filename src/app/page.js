"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar as CalendarIcon, ArrowRight, Video, ArrowLeft, Loader2, Instagram } from "lucide-react";
import BookingCalendar from "@/components/BookingCalendar";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Home() {
  const [step, setStep] = useState(1); // 1 = Hero, 2 = Calendar, 3 = Form, 4 = Payment Iframe
  const [bookingData, setBookingData] = useState({ date: null, time: null });
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', brandStory: '', targetAudience: '', competitors: '', challenge: '', previousTraining: '', topics: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paytrToken, setPaytrToken] = useState("");
  const calendarRef = useRef(null);

  const startBooking = () => {
    setStep(2);
    setTimeout(() => {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDateTimeSelect = ({ date, time }) => {
    setBookingData(prev => ({ ...prev, date, time }));
  };

  const handleContinueToForm = () => {
    setStep(3);
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = 3500; // 3500 TL
      let merchantOid = "NG_" + Date.now(); // Fallback OID

      // 1. Try to save to Firebase if configured
      try {
        if (db) {
          const newBooking = {
            date: bookingData.date?.toISOString(),
            time: bookingData.time,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            brandStory: formData.brandStory,
            targetAudience: formData.targetAudience,
            competitors: formData.competitors,
            challenge: formData.challenge,
            previousTraining: formData.previousTraining,
            topics: formData.topics,
            status: 'PENDING',
            createdAt: serverTimestamp(),
            amount
          };
          const docRef = await addDoc(collection(db, "bookings"), newBooking);
          merchantOid = docRef.id;
        }
      } catch (fbErr) {
        console.warn("Firebase kaydı atlandı:", fbErr.message);
        // Continue without Firebase — payment still goes through
      }

      // 2. Fetch PayTR Token
      const paytrRes = await fetch("/api/paytr/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          paymentAmount: amount,
          merchantOid,
          userBasket: [["Sosyal Medya Danışmanlık - 45 Dk", amount.toString(), 1]]
        })
      });

      const paytrData = await paytrRes.json();

      if (paytrData.token) {
        setPaytrToken(paytrData.token);
        setStep(4); // Move to iframe step
      } else {
        alert("Ödeme altyapısı başlatılamadı: " + (paytrData.error || "Bilinmeyen hata"));
      }
    } catch (err) {
      console.error("Booking Error:", err);
      alert("Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Listen for iframe messages from PayTR (optional but recommended for iframe resizing)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data === "paytr_success" || event.data === "paytr_fail") {
          // You can also handle client-side redirect logic here if needed,
          // though the iframe will redirect itself based on merchant_*_url.
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* HERO SECTION */}
      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl px-6 min-h-screen text-center pb-24">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8 mt-24"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium tracking-wide text-primary">With Nazlı Güneş · Birebir Özel Danışmanlık</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Sosyal Medyada <br />
          <span className="text-gradient-gold">İz Bırakın.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-lg sm:text-xl text-text-muted mb-4"
        >
          İçerik stratejiniz tıkandı mı? Strateji, kurgu ve büyüme odaklı tek seferlik özel danışmanlık ile potansiyelinizi açığa çıkarın.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-sm text-primary/70 mb-12 tracking-widest uppercase"
        >
          @withnazligunes
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button 
            onClick={startBooking}
            className="group relative w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-black font-semibold rounded-full overflow-hidden transition-all hover:scale-105 hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
          >
            <span className="relative z-10 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Hemen Randevu Al
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full"
        >
          <div className="glass glass-hover p-6 rounded-2xl flex flex-col items-center text-center transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Birebir Görüşme</h3>
            <p className="text-sm text-text-muted">45 dakikalık yoğun ve hedefe yönelik online strateji toplantısı.</p>
          </div>
          
          <div className="glass glass-hover p-6 rounded-2xl flex flex-col items-center text-center transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">İçerik Kurgusu</h3>
            <p className="text-sm text-text-muted">Profilinize ve kitlenize en uygun video/içerik senaryo fikirleri.</p>
          </div>
          
          <div className="glass glass-hover p-6 rounded-2xl flex flex-col items-center text-center transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Hızlı Planlama</h3>
            <p className="text-sm text-text-muted">Size uygun zamanı seçin, güvenle ödeyin ve randevunuzu anında alın.</p>
          </div>
        </motion.div>
      </main>

      {/* BOOKING FLOW */}
      <AnimatePresence>
        {step >= 2 && (
          <motion.section 
            ref={calendarRef}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-5xl px-6 py-24 mx-auto z-20 flex flex-col items-center border-t border-white/10"
          >
            {step === 2 && (
              <div className="w-full">
                <div className="text-center mb-12 w-full flex flex-col items-center relative">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Ne Zaman Görüşelim?</h2>
                  <p className="text-text-muted max-w-lg">Size en uygun gün ve saati seçerek randevu sürecini başlatın.</p>
                </div>
                <BookingCalendar onSelectDateTime={handleDateTimeSelect} />
                
                {bookingData.time && (
                  <div className="flex justify-center mt-12 w-full">
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleContinueToForm}
                      className="px-8 py-4 bg-primary text-black font-semibold rounded-full flex items-center gap-2 hover:bg-primary-hover transition-all"
                    >
                      Bilgilerini Gir
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
               <motion.div 
                 initial={{ opacity: 0, y: 40 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="w-full max-w-2xl mt-16 p-8 glass rounded-3xl"
               >
                 <div className="flex items-center gap-4 mb-8">
                   <button onClick={() => setStep(2)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                     <ArrowLeft className="w-5 h-5 text-white" />
                   </button>
                   <div>
                     <h3 className="text-2xl font-semibold">Bilgileriniz</h3>
                     <p className="text-sm text-text-muted">Randevuyu tamamlamak için lütfen formu doldurun.</p>
                   </div>
                 </div>
                 
                 <form onSubmit={submitBooking} className="flex flex-col gap-5">
                   {/* Kişisel Bilgiler */}
                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Ad Soyad *</label>
                     <input required type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="Örn: Nazlı Güneş" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30" />
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                       <label className="text-sm font-medium text-white/80">E-posta Adresi *</label>
                       <input required type="email" name="email" value={formData.email} onChange={handleFormChange} placeholder="ornek@mail.com" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30" />
                     </div>
                     <div className="flex flex-col gap-2">
                       <label className="text-sm font-medium text-white/80">Telefon Numarası *</label>
                       <input required type="tel" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="+90 555 000 00 00" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30" />
                     </div>
                   </div>

                   {/* Ayırıcı */}
                   <div className="border-t border-white/10 my-2" />
                   <p className="text-xs text-primary/60 uppercase tracking-widest">Danışmanlık Öncesi Sorular</p>

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Marka hikayenizi anlatır mısınız?</label>
                     <textarea name="brandStory" value={formData.brandStory} onChange={handleFormChange} rows="3" placeholder="Markanızın kuruluş öyküsü, vizyonu ve değerleri..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30 resize-none" />
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Hedef kitlenizi tanımlar mısınız?</label>
                     <textarea name="targetAudience" value={formData.targetAudience} onChange={handleFormChange} rows="3" placeholder="Kimler, gün içinde ne yaparlar, neden sizi takip etmeliler?" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30 resize-none" />
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Rakipleriniz kimler?</label>
                     <textarea name="competitors" value={formData.competitors} onChange={handleFormChange} rows="2" placeholder="Rakip hesapların Instagram/TikTok linklerini paylaşabilirsiniz" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30 resize-none" />
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Süreçte en çok hangi konuda zorlanıyorsunuz?</label>
                     <textarea name="challenge" value={formData.challenge} onChange={handleFormChange} rows="2" placeholder="İçerik üretimi, etkileşim, büyüme, kurgu, düzen..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30 resize-none" />
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Daha önce bir eğitimime katıldınız mı?</label>
                     <select name="previousTraining" value={formData.previousTraining} onChange={handleFormChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none">
                       <option value="" className="bg-black">Seçiniz</option>
                       <option value="evet" className="bg-black">Evet, daha önce katıldım</option>
                       <option value="hayir" className="bg-black">Hayır, ilk kez</option>
                     </select>
                   </div>

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Görüşmede özellikle konuşmamızı istediğiniz konular</label>
                     <textarea name="topics" value={formData.topics} onChange={handleFormChange} rows="3" placeholder="Özellikle değinmemi istediğiniz konular var mı?" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30 resize-none" />
                   </div>

                   <button disabled={isSubmitting} type="submit" className="w-full py-4 mt-4 bg-primary text-black font-semibold rounded-xl hover:bg-primary-hover transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
                     {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                       <>Ödeme Aşamasına Geç <ArrowRight className="w-5 h-5" /></>
                     )}
                   </button>
                 </form>
               </motion.div>
            )}

            {step === 4 && paytrToken && (
               <motion.div 
                 initial={{ opacity: 0, y: 40 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="w-full max-w-3xl mt-16 glass rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.1)]"
               >
                 <iframe 
                   src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`} 
                   id="paytriframe" 
                   frameBorder="0" 
                   scrolling="yes" 
                   className="w-full h-[600px]"
                 ></iframe>
               </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="relative z-10 w-full border-t border-white/10 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">N</span>
            </div>
            <span className="text-sm text-white/60">© 2026 <span className="text-white/90 font-medium">With Nazlı Güneş</span> — Tüm hakları saklıdır.</span>
          </div>
          <a href="https://instagram.com/withnazligunes" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/50 hover:text-primary transition-colors">
            <Instagram className="w-4 h-4" />
            @withnazligunes
          </a>
        </div>
      </footer>
    </div>
  );
}
