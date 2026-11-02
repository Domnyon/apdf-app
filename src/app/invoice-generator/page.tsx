'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type CompanyProfile = {
  name: string;
  vatNumber: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  stamp: string;
  signature: string;
};

type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

const PROFILE_STORAGE_KEY = 'apdf-invoice-company-profile';
const PROFILE_ENABLED_KEY = 'apdf-invoice-save-company-profile';
const VAT_RATE = 0.15;

const emptyCompany: CompanyProfile = {
  name: '',
  vatNumber: '',
  email: '',
  phone: '',
  address: '',
  logo: '',
  stamp: '',
  signature: '',
};

function parseCompanyProfile(value: unknown): CompanyProfile | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as Record<string, unknown>;
  if (
    typeof profile.name !== 'string' ||
    typeof profile.vatNumber !== 'string' ||
    typeof profile.email !== 'string' ||
    typeof profile.phone !== 'string' ||
    typeof profile.address !== 'string' ||
    typeof profile.logo !== 'string' ||
    (profile.stamp !== undefined && typeof profile.stamp !== 'string') ||
    (profile.signature !== undefined && typeof profile.signature !== 'string')
  ) {
    return null;
  }

  return {
    name: profile.name,
    vatNumber: profile.vatNumber,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    logo: profile.logo,
    stamp: typeof profile.stamp === 'string' ? profile.stamp : '',
    signature: typeof profile.signature === 'string' ? profile.signature : '',
  };
}

function getLocalDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ر.س`;
}

function formatDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export default function InvoiceGeneratorPage() {
  const [company, setCompany] = useState<CompanyProfile>(emptyCompany);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientVatNumber, setClientVatNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-0001');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [rememberCompany, setRememberCompany] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const nextItemId = useRef(2);

  // Browser storage is only available after hydration; initialize client-only values here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setInvoiceDate(getLocalDate());

    try {
      if (localStorage.getItem(PROFILE_ENABLED_KEY) === 'true') {
        const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedProfile) {
          const parsedProfile: unknown = JSON.parse(savedProfile);
          const companyProfile = parseCompanyProfile(parsedProfile);
          if (companyProfile) {
            setCompany(companyProfile);
          } else {
            setStorageMessage('تعذر قراءة بيانات المؤسسة المحفوظة؛ يمكنك إدخالها من جديد.');
          }
        }
        setRememberCompany(true);
      }
    } catch (error) {
      console.error('تعذر تحميل بيانات المؤسسة من التخزين المحلي:', error);
      setStorageMessage('تعذر الوصول إلى التخزين المحلي في هذا المتصفح.');
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist changes only after the user opts in; report browser storage failures in the UI.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!rememberCompany) return;

    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(company));
      localStorage.setItem(PROFILE_ENABLED_KEY, 'true');
    } catch (error) {
      console.error('تعذر حفظ بيانات المؤسسة في التخزين المحلي:', error);
      setStorageMessage('تعذر حفظ البيانات محليًا. قد تكون مساحة التخزين ممتلئة.');
    }
  }, [company, rememberCompany]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const discount = subtotal * (discountPercent / 100);
    const taxableAmount = Math.max(0, subtotal - discount);
    const vat = vatEnabled ? taxableAmount * VAT_RATE : 0;

    return {
      subtotal,
      discount,
      taxableAmount,
      vat,
      total: taxableAmount + vat,
    };
  }, [discountPercent, items, vatEnabled]);

  const updateCompany = (field: keyof CompanyProfile, value: string) => {
    setCompany((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (id: number, field: keyof Omit<InvoiceItem, 'id'>, value: string) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (field === 'description') return { ...item, description: value };
        const parsedValue = Number(value);
        return {
          ...item,
          [field]: Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0,
        };
      })
    );
  };

  const addItem = () => {
    const id = nextItemId.current++;
    setItems((current) => [
      ...current,
      { id, description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: number) => {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.id !== id) : current
    );
  };

  const toggleCompanySaving = (enabled: boolean) => {
    setRememberCompany(enabled);
    setStorageMessage('');

    try {
      if (enabled) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(company));
        localStorage.setItem(PROFILE_ENABLED_KEY, 'true');
      } else {
        localStorage.removeItem(PROFILE_ENABLED_KEY);
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('تعذر تحديث إعداد حفظ بيانات المؤسسة:', error);
      setStorageMessage('تعذر تحديث إعداد الحفظ المحلي في هذا المتصفح.');
    }
  };

  const handleCompanyImageChange = (
    field: 'logo' | 'stamp' | 'signature',
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStorageMessage('يرجى اختيار ملف صورة صالح.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateCompany(field, reader.result);
        setStorageMessage('');
      }
    };
    reader.onerror = () => {
      setStorageMessage('تعذر قراءة الصورة. يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDownloadPDF = async () => {
    const invoiceElement = document.getElementById('invoice-print-area');
    if (!invoiceElement || isExporting) return;

    setIsExporting(true);
    setExportError('');

    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: Math.max(invoiceElement.scrollWidth, Math.ceil((210 / 25.4) * 96)),
        windowHeight: Math.ceil((297 / 25.4) * 96),
        onclone: (clonedDocument) => {
          const clonedInvoice = clonedDocument.getElementById('invoice-print-area');
          const clonedWindow = clonedDocument.defaultView;
          const colorCanvas = clonedDocument.createElement('canvas');
          const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
          if (!clonedInvoice || !clonedWindow || !colorContext) {
            throw new Error('تعذر تجهيز الفاتورة لالتقاط PDF.');
          }

          Object.assign(clonedInvoice.style, {
            boxSizing: 'border-box',
            width: '210mm',
            minWidth: '210mm',
            maxWidth: '210mm',
            height: '297mm',
            minHeight: '297mm',
            maxHeight: '297mm',
            overflow: 'hidden',
          });

          const colorProperties = [
            'color',
            'background-color',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'outline-color',
            'text-decoration-color',
            'text-emphasis-color',
            'column-rule-color',
          ];

          [clonedInvoice, ...Array.from(clonedInvoice.querySelectorAll<HTMLElement>('*'))].forEach(
            (element: HTMLElement) => {
              const computedStyle = clonedWindow.getComputedStyle(element);
              colorProperties.forEach((property) => {
                const color = computedStyle.getPropertyValue(property);
                if (!/(?:lab|oklch|oklab)\(/i.test(color)) return;

                colorContext.clearRect(0, 0, 1, 1);
                colorContext.fillStyle = color;
                colorContext.fillRect(0, 0, 1, 1);
                const [red, green, blue, alpha] = colorContext.getImageData(0, 0, 1, 1).data;
                element.style.setProperty(
                  property,
                  alpha === 255
                    ? `rgb(${red}, ${green}, ${blue})`
                    : `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
                );
              });
            }
          );
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const safeInvoiceNumber = (invoiceNumber || 'INV-001').replace(
        /[<>:"/\\|?*\u0000-\u001f]/g,
        '-'
      );

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 295));
      pdf.save(`invoice-${safeInvoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setExportError('حدث خطأ أثناء تحميل الفاتورة، يرجى المحاولة مجدداً');
      alert('حدث خطأ أثناء تحميل الفاتورة، يرجى المحاولة مجدداً');
    } finally {
      setIsExporting(false);
    }
  };

  /* eslint-disable @next/next/no-img-element -- Uploaded logos are local data URLs and should bypass image optimization. */
  return (
    <main
      className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 selection:bg-blue-600 selection:text-white sm:px-6 lg:px-8"
      style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <nav className="no-print flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition-colors hover:text-blue-400">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-slate-200">منشئ الفواتير</span>
        </nav>

        <header className="no-print space-y-3 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-3xl text-blue-400">
            🧾
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            منشئ الفواتير
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            أنشئ فاتورة احترافية وخصص بياناتها، ثم حمّلها مباشرة بصيغة PDF.
            تتم معالجة بياناتك داخل متصفحك.
          </p>
        </header>

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="no-print space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">بيانات المؤسسة</h2>
                  <p className="mt-1 text-sm text-slate-400">تظهر هذه البيانات في الفاتورة.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                  <span className="max-w-40">حفظ بيانات مؤسستي في المتصفح محليًا</span>
                  <input
                    type="checkbox"
                    checked={rememberCompany}
                    onChange={(event) => toggleCompanySaving(event.target.checked)}
                    className="peer sr-only"
                    aria-label="حفظ بيانات مؤسستي في المتصفح محليًا"
                  />
                  <span className="relative h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-blue-600 after:absolute after:right-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:-translate-x-5" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">اسم المؤسسة</span>
                  <input
                    value={company.name}
                    onChange={(event) => updateCompany('name', event.target.value)}
                    placeholder="اسم المؤسسة أو مقدم الخدمة"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">البريد الإلكتروني</span>
                  <input
                    type="email"
                    value={company.email}
                    onChange={(event) => updateCompany('email', event.target.value)}
                    placeholder="name@example.com"
                    dir="auto"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">رقم الهاتف</span>
                  <input
                    type="tel"
                    value={company.phone}
                    onChange={(event) => updateCompany('phone', event.target.value)}
                    placeholder="+966 5X XXX XXXX"
                    dir="auto"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
                {vatEnabled && (
                  <label className="space-y-2 text-sm">
                    <span className="block text-slate-300">الرقم الضريبي للمؤسسة</span>
                    <input
                      value={company.vatNumber}
                      onChange={(event) => updateCompany('vatNumber', event.target.value)}
                      placeholder="الرقم الضريبي"
                      dir="auto"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                    />
                  </label>
                )}
                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="block text-slate-300">عنوان المؤسسة</span>
                  <textarea
                    value={company.address}
                    onChange={(event) => updateCompany('address', event.target.value)}
                    rows={2}
                    placeholder="المدينة، الشارع، الرمز البريدي"
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
                <div className="space-y-2 text-sm sm:col-span-2">
                  <span className="block text-slate-300">شعار المؤسسة</span>
                  <div className="flex flex-wrap items-center gap-4">
                    {company.logo && (
                      <img
                        src={company.logo}
                        alt="معاينة شعار المؤسسة"
                        className="h-16 w-16 rounded-xl border border-slate-700 bg-white object-contain p-1"
                      />
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleCompanyImageChange('logo', event)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-700"
                    >
                      {company.logo ? 'تغيير الشعار' : 'رفع شعار'}
                    </button>
                    {company.logo && (
                      <button
                        type="button"
                        onClick={() => updateCompany('logo', '')}
                        className="text-sm text-rose-400 transition hover:text-rose-300"
                      >
                        إزالة الشعار
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 text-sm sm:col-span-2">
                  <div>
                    <h3 className="font-bold text-slate-200">الختم والتوقيع المعتمد</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      تُحفظ الصورتان محليًا مع بيانات المؤسسة عند تفعيل خيار الحفظ.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <span className="mb-3 block font-medium text-slate-300">ختم المؤسسة</span>
                      <div className="flex min-h-20 items-center gap-3">
                        {company.stamp ? (
                          <img
                            src={company.stamp}
                            alt="معاينة ختم المؤسسة"
                            className="h-16 w-16 shrink-0 rounded-lg border border-slate-700 bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-2xl text-slate-500">
                            ◉
                          </span>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={stampInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleCompanyImageChange('stamp', event)}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => stampInputRef.current?.click()}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-semibold text-slate-200 transition hover:bg-slate-700"
                          >
                            {company.stamp ? 'تغيير الختم' : 'رفع الختم'}
                          </button>
                          {company.stamp && (
                            <button
                              type="button"
                              onClick={() => updateCompany('stamp', '')}
                              className="rounded-lg px-3 py-2 font-medium text-rose-400 transition hover:bg-rose-500/10"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <span className="mb-3 block font-medium text-slate-300">التوقيع المعتمد</span>
                      <div className="flex min-h-20 items-center gap-3">
                        {company.signature ? (
                          <img
                            src={company.signature}
                            alt="معاينة التوقيع المعتمد"
                            className="h-16 w-24 shrink-0 rounded-lg border border-slate-700 bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-2xl text-slate-500">
                            ✍
                          </span>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <input
                            ref={signatureInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleCompanyImageChange('signature', event)}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => signatureInputRef.current?.click()}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-semibold text-slate-200 transition hover:bg-slate-700"
                          >
                            {company.signature ? 'تغيير التوقيع' : 'رفع التوقيع'}
                          </button>
                          {company.signature && (
                            <button
                              type="button"
                              onClick={() => updateCompany('signature', '')}
                              className="rounded-lg px-3 py-2 font-medium text-rose-400 transition hover:bg-rose-500/10"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {storageMessage && (
                <p role="status" className="mt-4 text-sm text-amber-300">
                  {storageMessage}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">بيانات الفاتورة والعميل</h2>
                  <p className="mt-1 text-sm text-slate-400">أدخل بيانات الفاتورة والجهة المستلمة.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-200">
                  <span>تفعيل ضريبة القيمة المضافة (VAT)</span>
                  <input
                    type="checkbox"
                    checked={vatEnabled}
                    onChange={(event) => setVatEnabled(event.target.checked)}
                    className="peer sr-only"
                    aria-label="تفعيل ضريبة القيمة المضافة (VAT)"
                  />
                  <span className="relative h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-blue-600 after:absolute after:right-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:-translate-x-5" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">رقم الفاتورة</span>
                  <input
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    dir="auto"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">تاريخ الإصدار</span>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">اسم العميل</span>
                  <input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="اسم العميل أو المؤسسة"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">البريد الإلكتروني للعميل</span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(event) => setClientEmail(event.target.value)}
                    placeholder="client@example.com"
                    dir="auto"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
                {vatEnabled && (
                  <label className="space-y-2 text-sm">
                    <span className="block text-slate-300">الرقم الضريبي للعميل</span>
                    <input
                      value={clientVatNumber}
                      onChange={(event) => setClientVatNumber(event.target.value)}
                      placeholder="الرقم الضريبي (اختياري)"
                      dir="auto"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                )}
                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="block text-slate-300">عنوان العميل</span>
                  <textarea
                    value={clientAddress}
                    onChange={(event) => setClientAddress(event.target.value)}
                    rows={2}
                    placeholder="عنوان العميل"
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">بنود الفاتورة</h2>
                  <p className="mt-1 text-sm text-slate-400">أضف المنتجات أو الخدمات والكميات والأسعار.</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  + إضافة بند
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-12"
                  >
                    <label className="space-y-2 text-sm sm:col-span-5">
                      <span className="block text-slate-400">وصف البند {index + 1}</span>
                      <input
                        value={item.description}
                        onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                        placeholder="وصف المنتج أو الخدمة"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm sm:col-span-2">
                      <span className="block text-slate-400">الكمية</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        value={item.quantity}
                        onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-left tabular-nums text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm sm:col-span-3">
                      <span className="block text-slate-400">سعر الوحدة (ر.س)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-left tabular-nums text-white outline-none focus:border-blue-500"
                      />
                    </label>
                    <div className="flex items-end justify-between gap-3 sm:col-span-2 sm:flex-col sm:items-end">
                      <span className="pb-2 text-sm font-bold text-slate-200">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        aria-label={`حذف البند ${index + 1}`}
                        className="text-sm text-rose-400 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        حذف
                      </button>
                    </div>
                    {vatEnabled && (
                      <p className="text-xs text-blue-300 sm:col-span-12">
                        ضريبة البند {VAT_RATE * 100}%: {formatCurrency(item.quantity * item.unitPrice * (1 - discountPercent / 100) * VAT_RATE)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid items-end gap-4 border-t border-slate-800 pt-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">الخصم (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    dir="ltr"
                    value={discountPercent}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setDiscountPercent(Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left tabular-nums text-white outline-none focus:border-blue-500"
                  />
                </label>
                <div className="text-left text-sm text-slate-400">
                  قيمة الخصم: <strong className="text-slate-200">{formatCurrency(totals.discount)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-7">
              <h2 className="text-xl font-bold text-white">بيانات التحويل البنكي (اختياري)</h2>
              <p className="mb-5 mt-1 text-sm text-slate-400">تظهر هذه التفاصيل في الفاتورة عند إدخال رقم IBAN.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">اسم البنك</span>
                  <input
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                    placeholder="اسم البنك"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="block text-slate-300">رقم الآيبان (IBAN)</span>
                  <input
                    value={iban}
                    onChange={(event) => setIban(event.target.value)}
                    placeholder="SA00 0000 0000 0000 0000 0000"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4 xl:sticky xl:top-6">
            <div className="no-print flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">معاينة مباشرة</h2>
                <p className="text-sm text-slate-400">تُحدّث الفاتورة تلقائيًا أثناء التحرير.</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
              >
                {isExporting ? 'جارٍ تجهيز PDF...' : 'تنزيل الفاتورة PDF'}
              </button>
            </div>
            {exportError && (
              <p role="alert" className="no-print text-sm text-rose-300">
                {exportError}
              </p>
            )}

            <article
              id="invoice-print-area"
              className="invoice-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] rounded-xl bg-white p-6 text-slate-900 shadow-2xl sm:p-10 lg:p-12"
              style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
            >
              <div className="flex items-start justify-between gap-5 border-b-2 border-blue-600 pb-5">
                <div className="min-w-0">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    {vatEnabled ? 'TAX INVOICE' : 'INVOICE'}
                  </p>
                  <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                    {vatEnabled ? 'فاتورة ضريبية' : 'فاتورة'}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    رقم الفاتورة: <span dir="ltr" className="inline-block tabular-nums">{invoiceNumber || '—'}</span>
                  </p>
                  <p className="text-sm font-medium leading-6 text-slate-600">تاريخ الإصدار: {formatDate(invoiceDate)}</p>
                </div>
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt="شعار المؤسسة"
                    className="h-20 w-20 shrink-0 rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                    🧾
                  </div>
                )}
              </div>

              <div className="grid gap-6 border-b border-slate-100 py-5 sm:grid-cols-2">
                <div className="space-y-1 leading-6">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">من</p>
                  <h3 className="text-base font-bold text-slate-900">{company.name || 'اسم المؤسسة'}</h3>
                  {company.address && <p className="whitespace-pre-line text-sm text-slate-600">{company.address}</p>}
                  {company.email && <p dir="auto" className="text-sm text-slate-600">{company.email}</p>}
                  {company.phone && <p dir="auto" className="text-sm text-slate-600">{company.phone}</p>}
                  {vatEnabled && company.vatNumber && (
                    <p dir="auto" className="text-sm text-slate-600">الرقم الضريبي: {company.vatNumber}</p>
                  )}
                </div>
                <div className="space-y-1 leading-6">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">إلى</p>
                  <h3 className="text-base font-bold text-slate-900">{clientName || 'اسم العميل'}</h3>
                  {clientAddress && <p className="whitespace-pre-line text-sm text-slate-600">{clientAddress}</p>}
                  {clientEmail && <p dir="auto" className="text-sm text-slate-600">{clientEmail}</p>}
                  {vatEnabled && clientVatNumber && (
                    <p dir="auto" className="text-sm text-slate-600">الرقم الضريبي: {clientVatNumber}</p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-right text-xs leading-5 tabular-nums sm:text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-2 py-3 text-right font-bold sm:px-4">الوصف</th>
                      <th className="px-2 py-3 text-center font-bold sm:px-4">الكمية</th>
                      <th className="px-2 py-3 text-left font-bold sm:px-4">سعر الوحدة</th>
                      {vatEnabled && <th className="px-2 py-3 text-center font-bold sm:px-4">الضريبة</th>}
                      <th className="px-2 py-3 text-left font-bold sm:px-4">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const lineSubtotal = item.quantity * item.unitPrice;
                      const lineAfterDiscount = lineSubtotal * (1 - discountPercent / 100);
                      return (
                        <tr key={item.id} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/60">
                          <td className="px-2 py-3 text-right font-medium text-slate-800 sm:px-4">
                            {item.description || '—'}
                          </td>
                          <td dir="ltr" className="px-2 py-3 text-center text-slate-700 sm:px-4">{item.quantity}</td>
                          <td dir="ltr" className="whitespace-nowrap px-2 py-3 text-left text-slate-700 sm:px-4">{formatCurrency(item.unitPrice)}</td>
                          {vatEnabled && (
                            <td className="px-2 py-3 text-center text-slate-700 sm:px-4">
                              {VAT_RATE * 100}%<br />
                              <span dir="ltr" className="inline-block whitespace-nowrap text-[10px] tabular-nums">{formatCurrency(lineAfterDiscount * VAT_RATE)}</span>
                            </td>
                          )}
                          <td dir="ltr" className="whitespace-nowrap px-2 py-3 text-left font-bold text-slate-900 sm:px-4">
                            {formatCurrency(lineSubtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mr-auto mt-5 w-full max-w-xs space-y-2.5 text-sm">
                <div className="flex justify-between gap-4 text-slate-600">
                  <span className="font-medium">المجموع الفرعي</span><span dir="ltr" className="whitespace-nowrap text-left tabular-nums">{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between gap-4 text-slate-600">
                    <span>الخصم ({discountPercent}%)</span>
                    <span dir="ltr" className="whitespace-nowrap text-left tabular-nums">- {formatCurrency(totals.discount)}</span>
                  </div>
                )}
                {vatEnabled && (
                  <div className="flex justify-between gap-4 text-slate-600">
                    <span>ضريبة القيمة المضافة ({VAT_RATE * 100}%)</span>
                    <span dir="ltr" className="whitespace-nowrap text-left tabular-nums">{formatCurrency(totals.vat)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-slate-300 pt-3 text-base font-bold text-slate-900">
                  <span>الإجمالي النهائي</span><span dir="ltr" className="whitespace-nowrap text-left tabular-nums">{formatCurrency(totals.total)}</span>
                </div>
              </div>

              {iban && (
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="mb-2 text-sm font-bold text-slate-800">بيانات التحويل البنكي</h3>
                  {bankName && <p className="text-sm text-slate-600">البنك: {bankName}</p>}
                  <p dir="ltr" className="text-left text-sm font-semibold tabular-nums text-slate-700">IBAN: {iban}</p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-5 border-t border-slate-200 pt-4">
                <div className="flex flex-col items-center text-center">
                  <h3 className="text-xs font-bold text-slate-700">ختم المنشأة</h3>
                  <div className="mt-2 flex h-[26mm] w-full items-center justify-center">
                    {company.stamp ? (
                      <img
                        src={company.stamp}
                        alt="ختم المنشأة"
                        className="max-h-[22mm] max-w-[55mm] object-contain"
                      />
                    ) : (
                      <span className="h-[22mm] w-[55mm] rounded-lg border border-dashed border-slate-200" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <h3 className="text-xs font-bold text-slate-700">توقيع المسؤول المعتمد</h3>
                  <div className="mt-2 flex h-[26mm] w-full items-center justify-center">
                    {company.signature ? (
                      <img
                        src={company.signature}
                        alt="توقيع المسؤول المعتمد"
                        className="max-h-[20mm] max-w-[60mm] object-contain"
                      />
                    ) : (
                      <span className="h-[22mm] w-[55mm] rounded-lg border-b border-dashed border-slate-300" />
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3 text-center text-xs font-medium text-slate-500">
                شكرًا لتعاملكم معنا
              </div>
            </article>
          </section>
        </div>

        <section className="no-print grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <span className="text-2xl">🔒</span>
            <h2 className="mt-3 font-bold text-white">خصوصيتك أولًا</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              تُنشأ الفاتورة داخل متصفحك. لا تُرفع بيانات المؤسسة أو العميل أو الشعار أو الختم أو التوقيع إلى خوادمنا.
              لا تُحفظ بيانات المؤسسة وصورها محليًا إلا عند تفعيل خيار الحفظ.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <span className="text-2xl">🪄</span>
            <h2 className="mt-3 font-bold text-white">خطوات الاستخدام</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm leading-6 text-slate-400">
              <li>أدخل بيانات المؤسسة والعميل.</li>
              <li>أضف البنود والكمية والسعر والخصم.</li>
              <li>أرفق شعار المؤسسة وختمها وتوقيع المسؤول عند الحاجة.</li>
              <li>فعّل الضريبة عند الحاجة، ثم راجع المعاينة.</li>
              <li>اضغط تنزيل الفاتورة PDF لحفظ نسخة A4.</li>
            </ol>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <span className="text-2xl">💡</span>
            <h2 className="mt-3 font-bold text-white">أسئلة شائعة</h2>
            <details className="mt-3 border-b border-slate-800 pb-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">هل تُحفظ بيانات الفاتورة؟</summary>
              <p className="mt-2 text-sm leading-6 text-slate-400">لا. بيانات الفاتورة الحالية تبقى في الصفحة ولا تُرسل إلى الخادم.</p>
            </details>
            <details className="mt-3 border-b border-slate-800 pb-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">ماذا يحدث عند إلغاء الحفظ المحلي؟</summary>
              <p className="mt-2 text-sm leading-6 text-slate-400">تُمسح بيانات المؤسسة المحفوظة، بما فيها الشعار والختم والتوقيع، من التخزين المحلي لهذا المتصفح.</p>
            </details>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">كيف أحفظ الفاتورة بصيغة PDF؟</summary>
              <p className="mt-2 text-sm leading-6 text-slate-400">اضغط زر تنزيل الفاتورة PDF، وسيبدأ تنزيل الملف مباشرة.</p>
            </details>
          </article>
        </section>
      </div>
    </main>
  );
  /* eslint-enable @next/next/no-img-element */
}
