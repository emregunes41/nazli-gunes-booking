"use client";

import { motion } from "framer-motion";
import { XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function FailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-8"
      >
        <XCircle className="w-12 h-12" />
      </motion.div>

      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-bold mb-4"
      >
        Ödeme Başarısız
      </motion.h1>

      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-text-muted max-w-md mx-auto mb-10 text-lg"
      >
        İşleminiz sırasında bir hata oluştu ve ödeme alınamadı. Lütfen kart bilgilerinizi kontrol edip tekrar deneyin.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/">
          <button className="px-8 py-4 bg-primary hover:bg-primary-hover text-black font-semibold rounded-full flex items-center justify-center gap-2 transition-all">
            <RefreshCw className="w-5 h-5" />
            TekrarDene
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
