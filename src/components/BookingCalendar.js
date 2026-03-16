"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfToday } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TIME_SLOTS = [
  "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"
];

export default function BookingCalendar({ onSelectDateTime }) {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());
  }, []);

  if (!mounted) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 min-h-[400px]">
        {/* Loading skeleton or empty state to preserve space during SSR */}
        <div className="flex-1 glass p-6 rounded-3xl animate-pulse">
           <div className="h-8 bg-white/10 rounded-lg w-1/3 mb-6"></div>
           <div className="grid grid-cols-7 gap-2 mb-2">
             {[...Array(7)].map((_, i) => <div key={i} className="h-6 bg-white/5 rounded"></div>)}
           </div>
           <div className="grid grid-cols-7 gap-2 h-48 bg-white/5 rounded-xl"></div>
        </div>
        <div className="w-full md:w-80 glass p-6 rounded-3xl flex flex-col animate-pulse">
           <div className="h-8 bg-white/10 rounded-lg w-1/2 mb-6"></div>
           <div className="flex-1 border border-dashed border-white/20 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const today = startOfToday();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDateSelect = (day) => {
    if (isBefore(day, today)) return;
    setSelectedDate(day);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    if (onSelectDateTime) {
      onSelectDateTime({ date: selectedDate, time });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Calendar Section */}
      <div className="flex-1 glass p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold capitalize">
            {format(currentDate, "MMMM yyyy", { locale: tr })}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              disabled={isBefore(startOfMonth(subMonths(currentDate, 1)), startOfMonth(today))}
              className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <div key={day} className="text-center text-sm text-text-muted font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day, dayIdx) => {
            const isPast = isBefore(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            // Calculate grid column start for the first day of the month
            const colStart = dayIdx === 0 ? (day.getDay() === 0 ? 7 : day.getDay()) : 'auto';

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateSelect(day)}
                disabled={isPast || !isCurrentMonth}
                style={{ gridColumnStart: colStart !== 'auto' ? colStart : 'auto' }}
                className={`
                  aspect-square rounded-xl flex items-center justify-center text-sm transition-all
                  ${!isCurrentMonth ? 'invisible' : ''}
                  ${isPast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary/20 cursor-pointer'}
                  ${isSelected ? 'bg-primary text-black font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5'}
                  ${isToday(day) && !isSelected ? 'border border-primary/50' : ''}
                `}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection Section */}
      <div className="w-full md:w-80 glass p-6 rounded-3xl flex flex-col min-h-[400px]">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Saat Seçimi
        </h3>

        <AnimatePresence mode="wait">
          {!selectedDate ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center text-center text-text-muted text-sm border border-dashed border-white/20 rounded-2xl p-6"
            >
              Lütfen uygun saatleri görmek için takvimden bir gün seçin.
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <div className="text-sm font-medium text-primary mb-4 capitalize">
                {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`
                      py-3 px-4 rounded-xl text-sm font-medium transition-all
                      ${selectedTime === time 
                        ? 'bg-primary text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                        : 'bg-white/5 hover:bg-white/15 border border-white/10'}
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
