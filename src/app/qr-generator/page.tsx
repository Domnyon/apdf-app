'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type QRCodeStyling from 'qr-code-styling';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Contact,
  Download,
  Globe,
  ImagePlus,
  Link2,
  Mail,
  Palette,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
  Wifi,
} from 'lucide-react';

type ContentType = 'url' | 'text' | 'vcard' | 'wifi' | 'email' | 'phone';
type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
type CornerSquareType = 'square' | 'extra-rounded' | 'dot';
type CornerDotType = 'square' | 'dot';
type PhoneMode = 'phone' | 'whatsapp';
type TextFieldKey = Exclude<keyof ContentValues, 'encryption' | 'phoneMode'>;

type ContentValues = {
  url: string;
  text: string;
  firstName: string;
  lastName: string;
  contactPhone: string;
  contactEmail: string;
  organization: string;
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  emailTo: string;
  subject: string;
  body: string;
  phoneNumber: string;
  phoneMode: PhoneMode;
};

const initialContent: ContentValues = {
  url: 'https://apdf.app',
  text: 'مرحبًا بك في apdf',
  firstName: '',
  lastName: '',
  contactPhone: '',
  contactEmail: '',
  organization: '',
  ssid: '',
  password: '',
  encryption: 'WPA',
  emailTo: '',
  subject: '',
  body: '',
  phoneNumber: '',
  phoneMode: 'phone',
};

const contentTabs: { id: ContentType; label: string; icon: typeof Link2 }[] = [
  { id: 'url', label: 'رابط URL', icon: Link2 },
  { id: 'text', label: 'نص حر', icon: Type },
  { id: 'vcard', label: 'جهة اتصال', icon: Contact },
  { id: 'wifi', label: 'شبكة Wi-Fi', icon: Wifi },
  { id: 'email', label: 'بريد إلكتروني', icon: Mail },
  { id: 'phone', label: 'هاتف / واتساب', icon: Phone },
];

const dotTypes: { id: DotType; label: string }[] = [
  { id: 'square', label: 'مربعات' },
  { id: 'rounded', label: 'مستدير' },
  { id: 'dots', label: 'نقاط' },
  { id: 'classy', label: 'كلاسيكي' },
  { id: 'classy-rounded', label: 'كلاسيكي ناعم' },
  { id: 'extra-rounded', label: 'دائري ناعم' },
];

const cornerSquareTypes: { id: CornerSquareType; label: string }[] = [
  { id: 'square', label: 'مربع' },
  { id: 'extra-rounded', label: 'مستدير' },
  { id: 'dot', label: 'نقطة' },
];

const cornerDotTypes: { id: CornerDotType; label: string }[] = [
  { id: 'square', label: 'مربع' },
  { id: 'dot', label: 'دائري' },
];

const logoPresets = [
  { label: 'واتساب', mark: 'W', color: '#22c55e' },
  { label: 'الويب', mark: '↗', color: '#3b82f6' },
  { label: 'البريد', mark: '@', color: '#f97316' },
  { label: 'الهاتف', mark: '☎', color: '#8b5cf6' },
];

function escapeWifiValue(value: string) {
  return value.replace(/[\\;,":]/g, '\\$&');
}

function buildPayload(type: ContentType, values: ContentValues) {
  switch (type) {
    case 'url':
      return values.url.trim();
    case 'text':
      return values.text.trim();
    case 'vcard':
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${values.lastName};${values.firstName};;;`,
        `FN:${[values.firstName, values.lastName].filter(Boolean).join(' ')}`,
        values.organization && `ORG:${values.organization}`,
        values.contactPhone && `TEL:${values.contactPhone}`,
        values.contactEmail && `EMAIL:${values.contactEmail}`,
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\n');
    case 'wifi':
      return `WIFI:T:${values.encryption};S:${escapeWifiValue(values.ssid)};P:${escapeWifiValue(values.password)};;`;
    case 'email': {
      const params = new URLSearchParams();
      if (values.subject) params.set('subject', values.subject);
      if (values.body) params.set('body', values.body);
      const query = params.toString();
      return `mailto:${values.emailTo}${query ? `?${query}` : ''}`;
    }
    case 'phone': {
      const number = values.phoneNumber.trim();
      if (values.phoneMode === 'whatsapp') {
        return `https://wa.me/${number.replace(/\D/g, '')}`;
      }
      return `tel:${number}`;
    }
  }
}

function presetLogoData(mark: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="38" fill="${color}"/><text x="80" y="106" text-anchor="middle" font-family="Arial,sans-serif" font-size="82" font-weight="700" fill="#fff">${mark}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function AccordionSection({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  icon: typeof Palette;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-slate-800 bg-slate-900/80"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Icon size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">{title}</span>
          <span className="mt-1 block text-xs text-slate-400">{description}</span>
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-slate-800 px-5 py-5">{children}</div>
    </details>
  );
}

export default function QRGeneratorPage() {
  const [contentType, setContentType] = useState<ContentType>('url');
  const [content, setContent] = useState(initialContent);
  const [dotColor, setDotColor] = useState('#2563eb');
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientColor, setGradientColor] = useState('#7c3aed');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [dotType, setDotType] = useState<DotType>('rounded');
  const [cornerSquareType, setCornerSquareType] =
    useState<CornerSquareType>('extra-rounded');
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot');
  const [customCornerColor, setCustomCornerColor] = useState(false);
  const [cornerColor, setCornerColor] = useState('#2563eb');
  const [logo, setLogo] = useState('');
  const [hideBackgroundDots, setHideBackgroundDots] = useState(true);
  const [logoSize, setLogoSize] = useState(0.35);
  const [logoMargin, setLogoMargin] = useState(5);
  const [exportSize, setExportSize] = useState(1000);
  const [qrReady, setQrReady] = useState(false);
  const [exportError, setExportError] = useState('');
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const payload = useMemo(
    () => buildPayload(contentType, content),
    [content, contentType]
  );
  const dotsGradient = useMemo(
    () => ({
      type: 'linear' as const,
      rotation: 0,
      colorStops: [
        { offset: 0, color: dotColor },
        { offset: 1, color: gradientColor },
      ],
    }),
    [dotColor, gradientColor]
  );
  const qrOptions = useMemo(
    () => ({
      type: 'canvas' as const,
      width: exportSize,
      height: exportSize,
      data: payload || ' ',
      image: logo || undefined,
      margin: 12,
      qrOptions: {
        errorCorrectionLevel: logo ? ('H' as const) : ('Q' as const),
      },
      imageOptions: {
        hideBackgroundDots,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: 'anonymous',
      },
      dotsOptions: gradientEnabled
        ? { type: dotType, gradient: dotsGradient }
        : { type: dotType, color: dotColor },
      cornersSquareOptions: {
        type: cornerSquareType,
        color: customCornerColor ? cornerColor : dotColor,
      },
      cornersDotOptions: {
        type: cornerDotType,
        color: customCornerColor ? cornerColor : dotColor,
      },
      backgroundOptions: {
        color: transparentBackground ? 'rgba(0,0,0,0)' : backgroundColor,
      },
    }),
    [
      backgroundColor,
      cornerColor,
      cornerDotType,
      cornerSquareType,
      customCornerColor,
      dotColor,
      dotType,
      dotsGradient,
      exportSize,
      gradientEnabled,
      hideBackgroundDots,
      logo,
      logoMargin,
      logoSize,
      payload,
      transparentBackground,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    import('qr-code-styling').then(({ default: QRCodeStylingConstructor }) => {
      if (cancelled || !qrContainerRef.current) return;
      const qrCode = new QRCodeStylingConstructor(qrOptions);
      qrCodeRef.current = qrCode;
      qrCode.append(qrContainerRef.current);
      setQrReady(true);
    });

    return () => {
      cancelled = true;
      qrCodeRef.current = null;
    };
    // The instance is created once; all later option changes go through update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!qrReady) return;
    qrCodeRef.current?.update(qrOptions);
  }, [qrOptions, qrReady]);

  const updateContent = <Key extends keyof ContentValues>(key: Key, value: ContentValues[Key]) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const updateTextContent = (key: TextFieldKey, value: string) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setExportError('يرجى اختيار ملف صورة صالح للشعار.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogo(reader.result);
        setExportError('');
      }
    };
    reader.onerror = () => setExportError('تعذر قراءة الصورة. حاول اختيار ملف آخر.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const downloadQRCode = async (extension: 'png' | 'svg') => {
    if (!qrCodeRef.current) {
      setExportError('جارٍ تجهيز رمز QR، يرجى المحاولة بعد لحظة.');
      return;
    }
    try {
      setExportError('');
      await qrCodeRef.current.download({
        name: `apdf-qr-${Date.now()}`,
        extension,
      });
    } catch (error) {
      console.error('تعذر تصدير رمز QR:', error);
      setExportError('تعذر تنزيل الملف. يرجى المحاولة مرة أخرى.');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15';
  const labelClass = 'mb-2 block text-sm font-medium text-slate-300';
  const field = (
    label: string,
    key: TextFieldKey,
    options: { type?: string; placeholder?: string; multiline?: boolean } = {}
  ) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {options.multiline ? (
        <textarea
          value={content[key] as string}
          onChange={(event) => updateTextContent(key, event.target.value)}
          placeholder={options.placeholder}
          rows={3}
          dir="auto"
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type={options.type || 'text'}
          value={content[key] as string}
          onChange={(event) => updateTextContent(key, event.target.value)}
          placeholder={options.placeholder}
          dir="auto"
          className={inputClass}
        />
      )}
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 selection:bg-blue-600 selection:text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition-colors hover:text-blue-400">
            الرئيسية
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-200">منشئ QR Code</span>
        </nav>

        <header className="space-y-4 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-blue-400">
            <QrCode size={28} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            منشئ رمز QR الاحترافي
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            صمّم رمزك الخاص، أضف شعارك، ثم نزّله بجودة عالية. تتم معالجة بياناتك
            محليًا داخل المتصفح ولا يتم رفعها إلى أي خادم.
          </p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl">
          <div className="border-b border-slate-800 px-5 py-6 sm:px-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Type size={18} />
              </span>
              <div>
                <h2 className="font-bold text-white">ماذا تريد أن تشارك؟</h2>
                <p className="mt-1 text-xs text-slate-400">اختر نوع المحتوى وأدخل بياناتك</p>
              </div>
            </div>
            <div
              role="tablist"
              aria-label="نوع محتوى رمز QR"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {contentTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={contentType === id}
                  onClick={() => setContentType(id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    contentType === id
                      ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {contentType === 'url' && (
                <div className="sm:col-span-2">
                  {field('رابط الموقع', 'url', {
                    type: 'url',
                    placeholder: 'https://example.com',
                  })}
                </div>
              )}
              {contentType === 'text' && (
                <div className="sm:col-span-2">
                  {field('النص', 'text', {
                    multiline: true,
                    placeholder: 'اكتب رسالتك هنا...',
                  })}
                </div>
              )}
              {contentType === 'vcard' && (
                <>
                  {field('الاسم الأول', 'firstName', { placeholder: 'الاسم الأول' })}
                  {field('اسم العائلة', 'lastName', { placeholder: 'اسم العائلة' })}
                  {field('رقم الجوال', 'contactPhone', {
                    type: 'tel',
                    placeholder: '+966 5X XXX XXXX',
                  })}
                  {field('البريد الإلكتروني', 'contactEmail', {
                    type: 'email',
                    placeholder: 'name@example.com',
                  })}
                  <div className="sm:col-span-2">
                    {field('المؤسسة', 'organization', { placeholder: 'اسم المؤسسة' })}
                  </div>
                </>
              )}
              {contentType === 'wifi' && (
                <>
                  {field('اسم الشبكة (SSID)', 'ssid', { placeholder: 'اسم شبكة Wi-Fi' })}
                  <label className="block">
                    <span className={labelClass}>نوع التشفير</span>
                    <select
                      value={content.encryption}
                      onChange={(event) =>
                        updateContent('encryption', event.target.value as ContentValues['encryption'])
                      }
                      className={inputClass}
                    >
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">بدون كلمة مرور</option>
                    </select>
                  </label>
                  {content.encryption !== 'nopass' && (
                    <div className="sm:col-span-2">
                      {field('كلمة المرور', 'password', {
                        type: 'text',
                        placeholder: 'كلمة مرور الشبكة',
                      })}
                    </div>
                  )}
                </>
              )}
              {contentType === 'email' && (
                <>
                  {field('إلى (To)', 'emailTo', {
                    type: 'email',
                    placeholder: 'name@example.com',
                  })}
                  {field('الموضوع', 'subject', { placeholder: 'موضوع الرسالة' })}
                  <div className="sm:col-span-2">
                    {field('نص الرسالة', 'body', {
                      multiline: true,
                      placeholder: 'اكتب رسالتك...',
                    })}
                  </div>
                </>
              )}
              {contentType === 'phone' && (
                <>
                  <div className="sm:col-span-2">
                    {field('رقم الهاتف', 'phoneNumber', {
                      type: 'tel',
                      placeholder: '+966 5X XXX XXXX',
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {(
                      [
                        ['phone', 'اتصال هاتفي'],
                        ['whatsapp', 'فتح واتساب'],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateContent('phoneMode', mode)}
                        className={`rounded-lg border px-4 py-2 text-sm transition ${
                          content.phoneMode === mode
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid items-start gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:p-8">
            <div className="space-y-4">
              <AccordionSection
                title="الألوان"
                description="اختر ألوان النقاط والخلفية"
                icon={Palette}
                defaultOpen
              >
                <div className="space-y-5">
                  <div>
                    <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-300">
                      <span>لون النقاط</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-500" dir="ltr">
                          {dotColor.toUpperCase()}
                        </span>
                        <input
                          aria-label="لون النقاط"
                          type="color"
                          value={dotColor}
                          onChange={(event) => setDotColor(event.target.value)}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                        />
                      </span>
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <span>
                      <span className="block text-sm font-medium text-slate-200">تدرج لوني</span>
                      <span className="mt-1 block text-xs text-slate-500">تدرج خطي بلونين</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={gradientEnabled}
                      onChange={(event) => setGradientEnabled(event.target.checked)}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </label>
                  {gradientEnabled && (
                    <label className="flex items-center justify-between text-sm font-medium text-slate-300">
                      <span>اللون الثاني</span>
                      <input
                        aria-label="اللون الثاني للتدرج"
                        type="color"
                        value={gradientColor}
                        onChange={(event) => setGradientColor(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                      />
                    </label>
                  )}
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <span>
                      <span className="block text-sm font-medium text-slate-200">خلفية شفافة</span>
                      <span className="mt-1 block text-xs text-slate-500">مناسبة للدمج في التصاميم</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={transparentBackground}
                      onChange={(event) => setTransparentBackground(event.target.checked)}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </label>
                  {!transparentBackground && (
                    <label className="flex items-center justify-between text-sm font-medium text-slate-300">
                      <span>لون الخلفية</span>
                      <input
                        aria-label="لون الخلفية"
                        type="color"
                        value={backgroundColor}
                        onChange={(event) => setBackgroundColor(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                      />
                    </label>
                  )}
                </div>
              </AccordionSection>

              <AccordionSection
                title="تصميم الأشكال"
                description="خصص النقاط وإطارات الزوايا"
                icon={Sparkles}
                defaultOpen
              >
                <div className="space-y-5">
                  <div>
                    <span className={labelClass}>نمط النقاط</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {dotTypes.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setDotType(id)}
                          className={`rounded-lg border px-3 py-2 text-xs transition ${
                            dotType === id
                              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                              : 'border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>إطار الزوايا</span>
                      <select
                        value={cornerSquareType}
                        onChange={(event) =>
                          setCornerSquareType(event.target.value as CornerSquareType)
                        }
                        className={inputClass}
                      >
                        {cornerSquareTypes.map(({ id, label }) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={labelClass}>بؤبؤ الزوايا</span>
                      <select
                        value={cornerDotType}
                        onChange={(event) =>
                          setCornerDotType(event.target.value as CornerDotType)
                        }
                        className={inputClass}
                      >
                        {cornerDotTypes.map(({ id, label }) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-300">
                        لون مخصص لأعين الرمز
                      </span>
                      <input
                        type="checkbox"
                        checked={customCornerColor}
                        onChange={(event) => setCustomCornerColor(event.target.checked)}
                        className="h-4 w-4 accent-blue-500"
                      />
                    </label>
                    {customCornerColor && (
                      <input
                        aria-label="لون أعين الرمز"
                        type="color"
                        value={cornerColor}
                        onChange={(event) => setCornerColor(event.target.value)}
                        className="h-10 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                      />
                    )}
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="إضافة شعار"
                description="أضف شعارك أو اختر أيقونة جاهزة"
                icon={ImagePlus}
              >
                <div className="space-y-4">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      <Upload size={17} />
                      رفع شعار من الجهاز
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="text-sm text-rose-400 hover:text-rose-300"
                      >
                        إزالة الشعار
                      </button>
                    )}
                  </div>
                  {logo && (
                    /* eslint-disable-next-line @next/next/no-img-element -- Local logo preview from an uploaded image or data URL. */
                    <img
                      src={logo}
                      alt="معاينة الشعار"
                      className="h-16 w-16 rounded-xl border border-slate-700 bg-white object-contain p-1"
                    />
                  )}
                  <div>
                    <span className={labelClass}>أيقونات سريعة</span>
                    <div className="grid grid-cols-4 gap-2">
                      {logoPresets.map(({ label, mark, color }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setLogo(presetLogoData(mark, color))}
                          className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300 transition hover:border-slate-600 hover:text-white"
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {mark}
                          </span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <span>
                      <span className="block text-sm font-medium text-slate-200">
                        تفريغ النقاط خلف الشعار
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        يساعد على وضوح الشعار وسهولة المسح
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={hideBackgroundDots}
                      onChange={(event) => setHideBackgroundDots(event.target.checked)}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>حجم الشعار · {Math.round(logoSize * 100)}%</span>
                      <input
                        type="range"
                        min="0.15"
                        max="0.5"
                        step="0.01"
                        value={logoSize}
                        onChange={(event) => setLogoSize(Number(event.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </label>
                    <label>
                      <span className={labelClass}>هامش الشعار · {logoMargin}px</span>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={logoMargin}
                        onChange={(event) => setLogoMargin(Number(event.target.value))}
                        className="w-full accent-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="جودة التصدير"
                description="حدد مقاس الصورة ثم اختر صيغة التنزيل"
                icon={Download}
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-3 flex items-center justify-between text-sm text-slate-300">
                      <span>دقة الصورة</span>
                      <span className="font-bold text-blue-300" dir="ltr">
                        {exportSize} × {exportSize} px
                      </span>
                    </span>
                    <input
                      type="range"
                      min="300"
                      max="2000"
                      step="50"
                      value={exportSize}
                      onChange={(event) => setExportSize(Number(event.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <span className="mt-1 flex justify-between text-xs text-slate-500" dir="ltr">
                      <span>300 px</span>
                      <span>2000 px</span>
                    </span>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void downloadQRCode('png')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500"
                    >
                      <Download size={17} />
                      تنزيل PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadQRCode('svg')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-white"
                    >
                      <Download size={17} />
                      تنزيل SVG
                    </button>
                  </div>
                </div>
              </AccordionSection>
            </div>

            <aside className="lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h2 className="font-bold text-white">معاينة مباشرة</h2>
                    <p className="mt-1 text-xs text-slate-400">تتحدث تلقائيًا مع كل تغيير</p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Check size={18} />
                  </span>
                </div>
                <div className="p-5">
                  <div
                    className={`flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 p-4 ${
                      transparentBackground
                        ? 'bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]'
                        : 'bg-white'
                    }`}
                  >
                    <div
                      ref={qrContainerRef}
                      aria-label="معاينة رمز QR"
                      className={`flex h-full w-full items-center justify-center [&>canvas]:!h-full [&>canvas]:!w-full [&>svg]:!h-full [&>svg]:!w-full ${
                        qrReady ? '' : 'animate-pulse'
                      }`}
                    />
                  </div>
                  {!payload.trim() && (
                    <p className="mt-3 text-center text-xs text-amber-300">
                      أدخل المحتوى المطلوب لتحديث رمزك.
                    </p>
                  )}
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs leading-5 text-emerald-200/80">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span>خصوصيتك محفوظة — إنشاء الرمز يتم على جهازك دون رفع بياناتك.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadQRCode('png')}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-violet-600 px-5 py-4 font-bold text-white shadow-lg shadow-blue-950/40 transition hover:brightness-110"
                  >
                    <Download size={19} />
                    تنزيل QR Code · PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadQRCode('svg')}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Download size={16} />
                    تنزيل بصيغة SVG للطباعة
                  </button>
                  {exportError && (
                    <p role="alert" className="mt-3 text-center text-sm text-rose-400">
                      {exportError}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Globe size={14} />
                <span>يدعم جميع أجهزة قراءة QR</span>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
