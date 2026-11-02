'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingImageConverter() {
  const pathname = usePathname();

  // إخفاء الأيقونة فقط إذا كان المستخدم داخل صفحة محول الصور
  if (pathname === '/image-converter') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
      }}
    >
      <Link
        href="/image-converter"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          textDecoration: 'none',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            fontSize: '18px',
          }}
        >
          🔄
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: '#bfdbfe', lineHeight: 1.2 }}>
            أداة جديدة
          </span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1.2 }}>
            محول صور احترافي
          </span>
        </div>
      </Link>
    </div>
  );
}
