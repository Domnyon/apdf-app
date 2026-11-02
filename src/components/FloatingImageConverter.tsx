'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingImageConverter() {
  const pathname = usePathname();

  // إخفاء الأيقونة إذا كان المستخدم موجوداً بالفعل داخل صفحة محول الصور
  if (pathname === '/image-converter') {
    return null;
  }

  return (
    <aside aria-label="أدوات سريعة" className="fixed bottom-6 left-6 z-50 flex items-center group">
      <Link
        href="/image-converter"
        className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-white/20"
      >
        {/* أيقونة التحويل الدائرية */}
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-lg">
          🔄
        </span>

        {/* النص التعريفي للأداة */}
        <div className="flex flex-col text-right">
          <span className="text-xs text-blue-100 font-medium leading-none mb-1">
            أداة جديدة
          </span>
          <span className="text-sm font-bold leading-none">
            محول صور احترافي
          </span>
        </div>

        {/* وميض خفيف لجذب الانتباه */}
        <span className="relative flex h-3 w-3 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </Link>
    </aside>
  );
}
