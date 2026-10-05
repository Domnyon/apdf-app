import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "إعدادات السيرفر غير مكتملة (مفتاح الربط غير متوفر)." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customPrompt = (formData.get("prompt") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "لم يتم تزويد أي مستند للمعالجة." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    const ai = new GoogleGenAI({ apiKey });

    // تعليمات صارمة للمحافظة على التنسيقات وهيكلية Word
    const systemInstruction = `
أنت خبير فائق الدقة في قراءة المستندات واستخراجها وتحويلها إلى مستندات Word احترافية.
المهمة:
قم بتحويل مستند الـ PDF المرفق إلى كود HTML نظيف مخصص للعرض في Microsoft Word مع الحفاظ الكامل والدقيق على التنسيقات التالية:
1. الجداول: إذا كان هناك جداول، أنشئ وسوم <table> مع حدود واضحة (border="1" style="border-collapse: collapse; width: 100%;") وتنسيق الخلايا <th> و <td>.
2. العناوين: استخدم <h1> و <h2> و <h3> بنفس تسلسل وأحجام العناوين في الـ PDF.
3. التنسيقات النصية: حافظ على الكلمات العريضة <b>/<strong>، والمائلة <i>، والقوائم النقطية <ul> والعددية <ol>.
4. الفقرات والمحاذاة: استخدم <p> مع محاذاة النص المناسبة لكل سطر، ومراعاة اتجاه الكتابة من اليمين لليسار (RTL) للنصوص العربية.
5. الفواصل: ضع وسوم <hr> أو مسافات مناسبة للفصل بين الأقسام.

ملاحظة حاسمة:
أخرج فقط وسوم محتوى الـ HTML الداخلي للوثيقة (دون وسوم <html> أو <body> أو \`\`\`html كود ماركداون)، ليتم تضمينها مباشرة في قالب الوورد.
${customPrompt ? `تعليمات إضافية من المستخدم: ${customPrompt}` : ""}
`;

    let htmlOutput = "";
    let attempts = 0;
    const maxAttempts = 5; // المحاولة حتى 5 مرات في الخلفية بصمت تام

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: systemInstruction },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        });

        htmlOutput = response.text || "";
        // تنظيف أي علامات كود تضاف من الذكاء الاصطناعي
        htmlOutput = htmlOutput.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();
        break; // نجاح المعالجة
      } catch (err: any) {
        // إذا كان خطأ ضغط خوادم أو خطأ مؤقت، انتظر وأعد المحاولة تلقائياً
        const isTemporaryError = 
          err?.status === 503 || 
          err?.status === 429 || 
          err?.message?.includes("high demand") || 
          err?.message?.includes("UNAVAILABLE");

        if (attempts < maxAttempts && isTemporaryError) {
          // انتظار تدريجي (1.5 ثانية، 3 ثواني...)
          await delay(attempts * 1500);
        } else {
          // إذا نفدت المحاولات أظهر رسالة عامة لطيفة دون تفاصيل تقنية مزعجة
          if (attempts >= maxAttempts) {
            return NextResponse.json(
              { error: "الخوادم تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد لحظات." },
              { status: 503 }
            );
          }
          throw err;
        }
      }
    }

    return NextResponse.json({ docHtml: htmlOutput });
  } catch (error: any) {
    console.error("Gemini Conversion Error:", error);
    return NextResponse.json(
      { error: "تعذر معالجة الملف حالياً، يرجى المحاولة مرة أخرى." },
      { status: 500 }
    );
  }
}
