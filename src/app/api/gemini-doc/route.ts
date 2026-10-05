import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "إعدادات الربط غير مكتملة." },
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

    const systemInstruction = `
أنت خبير فائق الدقة في قراءة المستندات واستخراجها وتحويلها إلى مستندات Word احترافية.
المهمة:
قم بتحويل مستند الـ PDF المرفق إلى كود HTML نظيف مخصص للعرض في Microsoft Word مع الحفاظ الكامل على التنسيقات:
1. الجداول: أنشئ وسوم <table> مع حدود واضحة (border="1" style="border-collapse: collapse; width: 100%;") وتنسيق الخلايا <th> و <td>.
2. العناوين: استخدم <h1> و <h2> و <h3> بنفس تسلسل الـ PDF.
3. التنسيقات: حافظ على الكلمات العريضة <b>، والمائلة <i>، والقوائم <ul> و <ol>.
4. الفقرات: استخدم <p> مع اتجاه الكتابة من اليمين لليسار (RTL) للنصوص العربية.

أخرج فقط وسوم محتوى الـ HTML الداخلي دون وسوم <html> أو <body> أو علامات ماركداون.
${customPrompt ? `تعليمات المستخدم: ${customPrompt}` : ""}
`;

    // استخدام النماذج المعتمدة الحالية من جوجل بالترتيب
    // نبدأ بـ gemini-3.5-flash-lite لأنه الأسرع استجابة والأقل ازدحاماً
    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash"
    ];

    let htmlOutput = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      let attempts = 0;
      const maxRetries = 2;

      while (attempts < maxRetries) {
        try {
          attempts++;
          const response = await ai.models.generateContent({
            model: modelName,
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

          if (response.text) {
            htmlOutput = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          // إذا كان خطأ ازدحام ننتظر ثانية ونجرب
          if (err?.status === 503 || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE")) {
            await delay(1200);
          } else {
            // إذا كان الخطأ عدم توفر النموذج نتجاوزه فوراً
            break;
          }
        }
      }

      if (htmlOutput) {
        break; // نجحت العملية، نخرج فوراً
      }
    }

    if (!htmlOutput) {
      throw lastError || new Error("الخوادم تشهد ضغطاً مؤقتاً.");
    }

    htmlOutput = htmlOutput.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();

    return NextResponse.json({ docHtml: htmlOutput });
  } catch (error: any) {
    console.error("Gemini Conversion Error:", error);
    return NextResponse.json(
      { error: "تعذر معالجة الملف، يرجى إعادة المحاولة." },
      { status: 500 }
    );
  }
}
