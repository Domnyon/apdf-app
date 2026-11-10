import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تعديل PDF وملء النماذج أونلاين | APDF",
  description:
    "اكتشف مربعات النماذج في ملفات PDF، واكتب بالعربية أو بأي لغة، ثم نزّل المستند مع الحفاظ على صفحاته الأصلية.",
};

export default function PdfEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
