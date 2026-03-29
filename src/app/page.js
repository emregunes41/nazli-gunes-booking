"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Calendar as CalendarIcon, ArrowRight, Video, ArrowLeft, Loader2, Instagram, Check, Star } from "lucide-react";
import BookingCalendar from "@/components/BookingCalendar";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { getApprovedReviews } from "./actions/reviews-admin";

const IS_TEST_MODE = false; // Real payments and real persistence required
const TESTIMONIALS = [
  { name: "Ayşe Y.", handle: "@aysedesign", text: "Nazlı Hanım ile yaptığımız görüşme profilim için dönüm noktası oldu. İçerik ve kurgu fikirleri gerçekten vizyon katıyor. Kesinlikle tavsiye ederim!", stars: 5 },
  { name: "Mehmet K.", handle: "@mehmetstudio", text: "Aylık danışmanlık paketi sayesinde Instagram'da büyüme hızım 3 kat arttı. Özellikle senaryo ve kurgu desteği mükemmel. Çok teşekkürler.", stars: 5 },
  { name: "Selin T.", handle: "@selinbeauty", text: "Profil analizi ve bio düzenlemesi sonrası bile etkileşimlerim fark edilir şekilde arttı. İşini bu kadar profesyonel yapan biriyle çalışmak çok keyifli.", stars: 5 }
];

export default function Home() {
  const [step, setStep] = useState(1); // 1 = Hero, 2 = Calendar, 3 = Form, 4 = Payment Iframe
  const [selectedPackage, setSelectedPackage] = useState("single");
  const [bookingData, setBookingData] = useState({ date: null, time: null });
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', socialMedia: '', brandStory: '', targetAudience: '', competitors: '', challenge: '', previousTraining: '', topics: '' });
  const [liveTestimonials, setLiveTestimonials] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paytrToken, setPaytrToken] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]); // Array of {date: "YYYY-MM-DD", time: "HH:MM"}
  const calendarRef = useRef(null);

  // Fetch booked slots from Firebase
  useEffect(() => {
    if (!db) {
      // Simulation for local development without Firebase
      console.log("Firebase dev dışı - Test için örnek 'Dolu' slot eklendi.");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setBookedSlots([{ date: tomorrowStr, time: "10:00" }]);
      return;
    }

    const q = query(collection(db, "bookings"), where("status", "==", "PAID"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const slots = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date && data.time) {
          // data.date is already yyyy-MM-dd string or ISO string
          let dateStr = data.date;
          if (dateStr.includes('T')) {
            // Fallback for old ISO format entries
            const d = new Date(dateStr);
            dateStr = d.toISOString().split('T')[0];
          }
          slots.push({
            date: dateStr,
            time: data.time
          });
        }
      });
      setBookedSlots(slots);
    });

    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    const fetchLiveReviews = async () => {
      try {
        const res = await getApprovedReviews();
        if (res && res.length > 0) {
          setLiveTestimonials(res.map(r => ({ ...r, stars: r.rating })));
        }
      } catch (err) {
        console.error("Testimonials Fetch Error:", err);
      }
    };
    fetchLiveReviews();
  }, []);

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
      if (!db) {
        throw new Error("Firebase veritabanı bağlantısı kurulamadı. Lütfen yapılandırmayı kontrol edin.");
      }

      const amount = selectedPackage === 'monthly' ? 15000 : 3500;
      let merchantOid = "NG_" + Date.now();

      console.log("Firestore kaydı başlatılıyor... Veri:", { date: bookingData.date, time: bookingData.time });
      
      const newBooking = {
        date: bookingData.date ? format(bookingData.date, "yyyy-MM-dd") : null,
        time: bookingData.time,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        socialMedia: formData.socialMedia,
        brandStory: formData.brandStory,
        targetAudience: formData.targetAudience,
        competitors: formData.competitors,
        challenge: formData.challenge,
        previousTraining: formData.previousTraining,
        topics: formData.topics,
        status: IS_TEST_MODE ? 'PAID' : 'PENDING',
        notes: IS_TEST_MODE ? 'TEST_MODE_BOOKING' : 'REAL_BOOKING_INITIATED',
        package: selectedPackage,
        createdAt: serverTimestamp(),
        amount
      };

      // 1. KESİN KAYIT (Burası başarısız olursa ilerleme)
      let docRef;
      try {
        console.log("Firestore 'addDoc' çağrılıyor...");
        docRef = await addDoc(collection(db, "bookings"), newBooking);
        console.log("Firestore kaydı başarılı. ID:", docRef.id);
        merchantOid = docRef.id;
      } catch (fbErr) {
        console.error("Firestore Yazma Hatası:", fbErr);
        throw new Error("Veritabanına kaydedilemedi: " + fbErr.message + ". İnternet bağlantınızı veya Firestore kurallarını kontrol edin.");
      }

      // 2. Ödeme Adımı
      if (IS_TEST_MODE) {
        console.log("Test modu aktif: Başarılı kayıt sonrası yönlendiriliyor...");
        setStep(4);
        setTimeout(() => {
          window.location.href = "/success";
        }, 1000);
        return;
      }

      console.log("PayTR token alınıyor... MerchantOID:", merchantOid);
      const paytrRes = await fetch("/api/paytr/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          paymentAmount: amount,
          merchantOid,
          userBasket: [[selectedPackage === 'monthly' ? "Aylık Danışmanlık" : "Sosyal Medya Danışmanlık - 45 Dk", amount.toString(), 1]]
        })
      });

      console.log("PayTR yanıtı bekleniyor...");
      const paytrData = await paytrRes.json();
      console.log("PayTR yanıtı alındı:", paytrData);

      if (paytrData.token) {
        setPaytrToken(paytrData.token);
        setStep(4);
      } else {
        throw new Error("Ödeme altyapısı başlatılamadı: " + (paytrData.error || "Bilinmeyen hata"));
      }

    } catch (err) {
      console.error("Booking Flow Error:", err);
      alert(err.message || "Bir hata oluştu, lütfen tekrar deneyin.");
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
          İçerik stratejiniz tıkandı mı? Profil analizi, düzenleme fikirleri, kurgu, büyüme odaklı stratejiler ve videographer ile video kalite, tarz, ekipman danışmanlığı sayesinde potansiyelinizi açığa çıkarın.
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16 w-full max-w-4xl mx-auto"
        >
          {/* Tek Seferlik Paket */}
          <div className="glass p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden transition-all hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-white/5 hover:border-primary/30">
            <h3 className="text-2xl font-bold mb-2">Birebir Danışmanlık</h3>
            <p className="text-sm text-text-muted mb-6">Tek seferlik özel strateji ve analiz görüşmesi (45 Dk)</p>
            <div className="text-4xl font-black mb-6 text-gradient-gold">3.500 TL</div>
            
            <ul className="text-sm text-left text-white/80 space-y-3 mb-8 w-full flex-1">
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Profil analizi ve bio düzenleme</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Büyüme odaklı stratejiler</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Kitlenize özel senaryo fikirleri</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Videographer destekli kalite danışmanlığı</li>
            </ul>

            <button 
              onClick={() => { setSelectedPackage('single'); startBooking(); }}
              className="w-full py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-primary hover:text-black transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black flex items-center justify-center gap-2"
            >
              Randevu Al <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Aylık Paket */}
          <div className="glass p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden transition-all hover:-translate-y-2 shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-primary/50">
            <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">En Popüler</div>
            <h3 className="text-2xl font-bold mb-2">Aylık Danışmanlık</h3>
            <p className="text-sm text-text-muted mb-6">1 aylık tam kapsamlı strateji, içerik yönetimi ve destek</p>
            <div className="text-4xl font-black mb-6 text-gradient-gold">15.000 TL</div>
            
            <ul className="text-sm text-left text-white/80 space-y-3 mb-8 w-full flex-1">
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Detaylı profil analizi & font/tasarım kimliği</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Aylık içerik planı & Reels senaryoları (Hook/Cover)</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Haftalık 1 Zoom görüşmesi (Toplam 4)</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Sürekli WhatsApp destek hizmeti</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> Hazırlanan videolara geri bildirim & analiz</li>
               <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5"/> DM'den satış ve dönüşüm stratejisi</li>
            </ul>

            <button 
              onClick={() => { setSelectedPackage('monthly'); startBooking(); }}
              className="w-full py-4 bg-primary text-black font-semibold rounded-xl hover:bg-primary-hover transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black flex items-center justify-center gap-2"
            >
              Paketi Başlat <ArrowRight className="w-5 h-5" />
            </button>
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
                <BookingCalendar onSelectDateTime={handleDateTimeSelect} bookedSlots={bookedSlots} />
                
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

                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-medium text-white/80">Sosyal Medya Hesabınız (Kullanıcı adı veya Link) *</label>
                     <input required type="text" name="socialMedia" value={formData.socialMedia} onChange={handleFormChange} placeholder="@kullanici_adi veya https://instagram.com/..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/30" />
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

      {/* TESTIMONIALS SECTION */}
      <section className="relative w-full max-w-5xl px-6 py-24 mx-auto z-10 border-t border-white/10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 italic">Birlikte Başardıklarımız</h2>
          <p className="text-text-muted">Danışanlarımın başarı hikayeleri ve deneyimleri.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(liveTestimonials.length > 0 ? liveTestimonials : TESTIMONIALS).map((t, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass p-8 rounded-3xl flex flex-col items-start gap-4 hover:border-primary/30 transition-all group"
            >
              <div className="flex gap-1 text-primary mb-2">
                {[...Array(t.stars)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-primary" />)}
              </div>
              <p className="text-sm leading-relaxed text-white/90 italic">"{t.text}"</p>
              <div className="mt-auto flex items-center gap-3 pt-6 w-full border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner group-hover:scale-110 transition-transform">
                  {t.name[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{t.name}</span>
                  <span className="text-[10px] text-text-muted tracking-wide uppercase">{t.handle}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

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
