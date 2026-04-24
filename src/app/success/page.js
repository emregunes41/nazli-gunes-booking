"use client";

import { motion } from "framer-motion";
import { CheckCircle, Home } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-8"
      >
        <CheckCircle className="w-12 h-12" />
      </motion.div>

      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-bold mb-4"
      >
        Randevunuz Onaylandı!
      </motion.h1>

      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-text-muted max-w-md mx-auto mb-10 text-lg"
      >
        Ödemeniz başarıyla alındı. Girdiğiniz e-posta adresine detayları içeren bir onay mesajı gönderdik. Görüşmek üzere!
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass border border-white/10 rounded-2xl px-6 py-5 mb-8 max-w-md mx-auto"
      >
        <p className="text-sm text-white/70">
          Herhangi bir sorunuz olursa bize ulaşabilirsiniz:
        </p>
        <a href="tel:+905392052041" className="inline-flex items-center gap-2 mt-2 text-primary font-semibold text-lg hover:underline">
          📞 0539 205 20 41
        </a>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Link href="/">
          <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full flex items-center justify-center gap-2 transition-all">
            <Home className="w-5 h-5" />
            Ana Sayfaya Dön
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
