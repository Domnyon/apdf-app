'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Slide {
  id: number;
  badge: string;
  title: string;
  desc: string;
  linkText: string;
  href: string;
  icon: string;
  bgGradient: string;
}

const slides: Slide[] = [
  {
    id: 1,
    badge: 'جديد ومجاني',
    icon: '🔄',
    title: 'محول صيغ الصور الذكي',
    desc: 'حول صورك بين JPG و PNG و WebP محلياً على جهازك بأعلى جودة.',
    linkText: 'جرب الأداة الآن',
    href: '/image-converter',
    bgGradient: 'from-blue-600 via-indigo-600 to-blue-700',
  },
  {
    id: 2,
    badge: 'متاح الآن',
    icon: '🧾',
    title: 'صانع الفواتير الاحترافي',
    desc: 'أنشئ فواتير إلكترونية ضريبية جاهزة للطباعة والتنزيل بصيغة PDF بضغطة زر.',
    linkText: 'اكتشف المزيد',
    href: '/invoice-generator',
    bgGradient: 'from-emerald-600 via-teal-600 to-emerald-700',
  },
];

export default function TopPromoSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const current = slides[currentIndex];

  return (
    <header className="relative z-50 isolate w-full overflow-hidden text-white shadow-md">
      <div
        className={`w-full bg-gradient-to-r ${current.bgGradient} transition-all duration-700 py-2.5 px-4`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 flex-1 justify-center sm:justify-start overflow-hidden">
            <span className="text-base sm:text-lg">{current.icon}</span>

            <span className="bg-white/20 text-white font-bold px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap">
              {current.badge}
            </span>

            <span className="font-bold whitespace-nowrap">{current.title}:</span>

            <span className="hidden md:inline text-white/90 truncate max-w-md">
              {current.desc}
            </span>

            <Link
              href={current.href}
              className="relative z-10 pointer-events-auto inline-flex items-center gap-1 bg-white text-gray-900 font-bold px-3 py-1 rounded-full text-xs hover:bg-gray-100 shadow-sm transition-transform active:scale-95 whitespace-nowrap mr-2"
            >
              <span>{current.linkText}</span>
              <span className="text-xs">←</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`شريحة ${idx + 1}`}
                className={`relative z-10 pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
