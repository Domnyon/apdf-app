import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  EyeOff,
  FileCheck,
  HelpCircle,
  Lock,
  Mail,
  Server,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | apdf.app",
  description:
    "تعرف على سياسة الخصوصية ومعايير حماية البيانات والملفات في منصة apdf.app",
};

const sections = [
  {
    icon: Lock,
    title: "معالجة الملفات والاحتفاظ بها",
    content: (
      <>
        <p>
          صُممت أدوات كثيرة في apdf.app، مثل الدمج والتقسيم والضغط والتدوير والطباعة،
          لمعالجة ملفات PDF والصور محلياً داخل متصفحك. عند استخدام هذه الأدوات
          المحلية، لا تُرفع الملفات إلى خوادمنا.
        </p>
        <p>
          بعض الميزات، مثل التحويل إلى Word أو المعالجة التي تعتمد على خدمة خارجية،
          تتطلب إرسال الملف إلى خادم المعالجة أو مزود الخدمة لإتمام طلبك. لا تحتفظ
          apdf.app بنسخ ملفاتك في تخزين دائم أو قواعد بيانات، وتُستخدم الملفات
          مؤقتاً لتنفيذ الطلب وإرجاع النتيجة، ثم تُزال من سياق المعالجة بعد انتهائه.
          قد يحتفظ مزود الخدمة الخارجي بالبيانات مؤقتاً وفق سياساته وشروطه الخاصة.
        </p>
        <p>
          لا نبيع ملفاتك ولا نستخدم محتواها لأغراض إعلانية. ننصح بعدم استخدام
          الخدمات لإرسال مستندات شديدة الحساسية إلا بعد مراجعة شروط مزود الخدمة
          المرتبط بالميزة التي تستخدمها.
        </p>
      </>
    ),
  },
  {
    icon: Server,
    title: "الاتصال بالخدمات الخارجية",
    content: (
      <>
        <p>
          عند استخدام تحويل PDF إلى Word، يُنقل الملف إلى Adobe PDF Services
          لتنفيذ التحويل، وتتم الاتصالات بين المتصفح وخوادم المعالجة ومزود الخدمة
          عبر HTTPS/TLS المشفر. لا نرسل الملف إلى Adobe عند استخدام الأدوات التي
          تعمل محلياً فقط.
        </p>
        <p>
          قد ترسل ميزات التحويل المعتمدة على الذكاء الاصطناعي محتوى الملف إلى
          Google Gemini لمعالجته. يخضع هذا النقل ومعالجة البيانات لشروط وسياسة
          الخصوصية الخاصة بـ Google، إضافة إلى طريقة استخدام الميزة داخل الموقع.
        </p>
        <p>
          لا تتحكم apdf.app في ممارسات الاحتفاظ لدى الجهات الخارجية؛ يرجى مراجعة
          سياسات Adobe وGoogle قبل استخدام الميزات التي تعتمد عليها.
        </p>
      </>
    ),
  },
  {
    icon: EyeOff,
    title: "Google AdSense وملفات تعريف الارتباط",
    content: (
      <>
        <p>
          قد يعرض الموقع إعلانات مقدمة من Google AdSense. قد تستخدم Google
          ومورّدو الإعلانات الآخرون ملفات تعريف الارتباط أو تقنيات مشابهة لجمع
          معلومات عن زيارتك لهذا الموقع ومواقع أخرى، وقياس الإعلانات أو تخصيصها
          وفق إعداداتك وموافقتك والمنطقة التي تتصفح منها.
        </p>
        <p>
          قد تتضمن تقنيات الإعلانات ملفات تعريف ارتباط تابعة لجهات خارجية، وقد
          تشير بعض المواد إلى ملف Google DART أو تقنيات إعلانية مماثلة. يختلف
          استخدام هذه التقنيات بحسب منتجات Google وإعدادات الإعلانات والمنطقة؛
          لا تستخدمها apdf.app لقراءة محتوى ملفات PDF أو الصور التي تعالجها.
        </p>
        <p>
          يمكنك مراجعة إعدادات الإعلانات أو تعطيل تخصيص الإعلانات من{" "}
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-purple-300 underline decoration-purple-500/50 underline-offset-4 hover:text-purple-200"
          >
            إعدادات إعلانات Google
          </a>
          . كما يمكنك إدارة ملفات تعريف الارتباط من إعدادات المتصفح. قد تستمر
          الإعلانات غير المخصصة أو بعض ملفات الارتباط الضرورية بعد إيقاف التخصيص.
        </p>
      </>
    ),
  },
  {
    icon: FileCheck,
    title: "البيانات التقنية والأمان",
    content: (
      <>
        <p>
          قد يعالج مزود الاستضافة بيانات تقنية أساسية لازمة لتقديم الموقع وحمايته،
          مثل عنوان IP ومعلومات المتصفح ووقت الطلب وسجلات الأعطال. لا تتضمن هذه
          البيانات عادةً محتوى المستند نفسه، ونستخدمها لتشغيل الخدمة وتشخيص
          المشكلات والحد من إساءة الاستخدام.
        </p>
        <p>
          نستخدم اتصالات HTTPS حيثما كانت متاحة، ونسعى إلى تقليل البيانات
          المرسلة والاحتفاظ بها. لا توجد وسيلة نقل أو تخزين عبر الإنترنت تضمن
          الأمان المطلق، لذلك يرجى حماية جهازك وحساباتك وعدم مشاركة روابط ملفاتك
          مع أشخاص غير مخولين.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "حقوقك وخياراتك",
    content: (
      <>
        <p>
          بحسب الأنظمة المطبقة في منطقتك، قد يحق لك طلب معرفة البيانات الشخصية
          التي نعالجها أو تصحيحها أو حذفها، والاعتراض على بعض أوجه استخدامها أو
          سحب موافقتك حيث ينطبق ذلك. يمكنك أيضاً استخدام إعدادات المتصفح وGoogle
          لإدارة ملفات تعريف الارتباط والإعلانات المخصصة.
        </p>
        <p>
          ملفات المعالجة التي لا نحتفظ بها تخزيناً دائماً لا يمكن استعادتها
          أو حذف نسخة دائمة منها من حسابك. للاستفسار عن البيانات التقنية أو
          تقديم طلب متعلق بالخصوصية، تواصل معنا عبر البريد المذكور أدناه.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div
      className="relative flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-slate-950 font-sans text-slate-100"
      dir="rtl"
    >
      <div className="pointer-events-none absolute right-1/4 top-0 h-72 w-[min(500px,100vw)] rounded-full bg-purple-600/10 blur-[130px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between border-b border-slate-800 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-purple-500/40 hover:text-white"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Link>
        <span className="text-lg font-black tracking-tight text-white">
          apdf<span className="text-purple-400">.app</span>
        </span>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-10 sm:py-14">
        <div className="space-y-4 border-b border-slate-800 pb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300">
            <ShieldCheck className="h-4 w-4" />
            خصوصيتك وأمان ملفاتك
          </div>
          <h1 className="text-2xl font-black leading-relaxed text-white sm:text-4xl">
            سياسة الخصوصية والأمان - apdf.app
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            توضح هذه السياسة كيفية تعاملنا مع الملفات والبيانات عند استخدام
            أدواتنا، ومتى تتم الاستعانة بخدمات خارجية.
          </p>
          <p className="text-xs font-medium text-slate-500">
            آخر تحديث: 19 أكتوبر 2026
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 sm:p-6">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-white">
            <Lock className="h-5 w-5 text-indigo-300" />
            التزامنا باختصار
          </h2>
          <p className="text-sm leading-7 text-slate-300">
            لا تحتفظ apdf.app بملفات PDF والصور المرفوعة في تخزين دائم. تعمل
            أدوات كثيرة محلياً على جهازك، بينما تتطلب بعض الميزات إرسالاً مؤقتاً
            إلى خوادمنا أو مزود خدمة خارجي لتنفيذ التحويل المطلوب. نوضح ذلك في
            الأقسام أدناه حتى تتمكن من اختيار الأداة المناسبة لمستندك.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map(({ icon: Icon, title, content }, index) => (
            <section
              key={title}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg shadow-black/10 sm:p-6"
            >
              <h2 className="mb-4 flex items-start gap-3 text-base font-bold leading-7 text-white sm:text-lg">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="me-1 text-purple-300">{index + 1}.</span>
                  {title}
                </span>
              </h2>
              <div className="space-y-3 ps-0 text-sm leading-7 text-slate-400 sm:ps-12">
                {content}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-white">
            <HelpCircle className="h-5 w-5 text-purple-300" />
            تغييرات على سياسة الخصوصية
          </h2>
          <p className="text-sm leading-7 text-slate-400">
            قد نحدّث هذه السياسة عند إضافة ميزات أو تغيّر المتطلبات القانونية أو
            التقنية. سننشر النسخة المحدثة في هذه الصفحة مع تعديل تاريخ آخر تحديث.
            استمرارك في استخدام الموقع بعد نشر التغييرات يعني اطلاعك على السياسة
            بصيغتها الجديدة.
          </p>
        </section>

        <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 sm:p-6">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-white">
            <Mail className="h-5 w-5 text-purple-300" />
            التواصل بشأن الخصوصية
          </h2>
          <p className="text-sm leading-7 text-slate-400">
            للاستفسارات أو طلبات الخصوصية، راسلنا على{" "}
            <a
              href="mailto:apdfapp@gmail.com"
              className="font-semibold text-purple-300 underline decoration-purple-500/50 underline-offset-4 hover:text-purple-200"
              dir="ltr"
            >
              apdfapp@gmail.com
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 px-4 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
