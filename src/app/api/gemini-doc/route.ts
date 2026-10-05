import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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

    // قائمة نماذج مرتبة حسب السرعة والاستقرار للتبديل الفوري بينها
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.5-pro",
      "gemini-3.8-flash"
    ];

    let htmlOutput = "";
    let lastError: any = null;

    // المرور السريع على النماذج فوراً في حال انشغال أي نموذج
    for (const modelName of candidateModels) {
      try {
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
          break; // نجح أحد النماذج، نخرج فوراً ونرسل النتيجة
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed or busy, switching to next model immediately...`);
        // الانتقال الفوري للنموذج التالي في جزء من الثانية دون أي تأخير
        continue;
      }
    }

    if (!htmlOutput) {
      throw lastError || new Error("جميع النماذج مشغولة حالياً.");
    }

    // تنظيف المخرجات من أي علامات كود
    htmlOutput = htmlOutput.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();

    return NextResponse.json({ docHtml: htmlOutput });
  } catch (error: any) {
    console.error("Gemini Conversion Error:", error);
    return NextResponse.json(
      { error: "تعذر معالجة الملف بسبب ضغط لحظي، يرجى النقر مرة أخرى." },
      { status: 500 }
    );
  }
}
