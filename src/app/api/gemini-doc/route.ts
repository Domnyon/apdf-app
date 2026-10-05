import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "مفتاح GEMINI_API_KEY غير موجود في متغيرات بيئة Vercel. يرجى إضافته في إعدادات المشروع ثم عمل Redeploy." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prompt = (formData.get("prompt") as string) || "استخرج كامل النص بدقة وحوله إلى تنسيق وورد متناسق ومضبوط باللغة العربية";

    if (!file) {
      return NextResponse.json(
        { error: "لم يتم تزويد أي ملف" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction =
      "أنت خبير استخراج وتنسيق مستندات PDF. المطلوب منك استخراج وقراءة النصوص بدقة تامة من المستند المرفق، مع مراعاة اللغة العربية وترتيب الفقرات والعناوين، وتنفيذ التعديل أو الطلب المطلوب من المستخدم حرفياً. أرجع فقط النص النهائي المرتب دون مقدمات أو حشو.";

    // استخدام النموذج المحدث والموصى به من جوجل
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemInstruction}\n\nطلب المستخدم: ${prompt}` },
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

    return NextResponse.json({ resultText: response.text });
  } catch (error: any) {
    console.error("Gemini Doc Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ أثناء معالجة المستند عبر Gemini" },
      { status: 500 }
    );
  }
}
