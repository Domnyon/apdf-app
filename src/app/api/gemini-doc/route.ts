import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// رفع مدة تنفيذ الدالة في Vercel لتجنب قطع الاتصال
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "مفتاح GEMINI_API_KEY غير معرّف في Vercel." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customPrompt = (formData.get("prompt") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "لم يتم استلام أي ملف." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
أنت أداة متخصصة في تحويل مستندات PDF إلى Word. 
المطلوب: استخراج كامل محتوى المستند بدقة بصيغة HTML جاهزة للعرض داخل ملف Word.
- أنشئ جداول <table> واضحة ومغلقة.
- حافظ على العناوين <h1> و <h2> والفقرات <p>.
- اجعل الاتجاه من اليمين لليسار (RTL) للنصوص العربية.
- لا تضع وسوم <html> أو <body>، فقط المحتوى الداخلي المباشر، ولا تضع علامات ماركداون.
${customPrompt ? `ملاحظة: ${customPrompt}` : ""}
`;

    // طلب مباشر وسريع دون دوران معقد لتجنب التايم آوت
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

    let htmlOutput = response.text || "";
    htmlOutput = htmlOutput.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();

    if (!htmlOutput) {
      return NextResponse.json(
        { error: "لم يتمكن النموذج من استخراج نصوص من الملف." },
        { status: 500 }
      );
    }

    return NextResponse.json({ docHtml: htmlOutput });
  } catch (error: any) {
    console.error("Gemini Route Error:", error);
    // إرجاع رسالة الخطأ الحقيقية القادمة من جوجل لمعرفة سبب التعطل فوراً
    return NextResponse.json(
      { error: error?.message || error?.toString() || "حدث خطأ أثناء معالجة المستند." },
      { status: 500 }
    );
  }
}
