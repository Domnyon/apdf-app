import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  ExportOCRLocale,
  ExportPDFJob,
  ExportPDFParams,
  ExportPDFResult,
  ExportPDFTargetFormat,
  MimeType,
  PDFServices,
  ServicePrincipalCredentials,
} from "@adobe/pdfservices-node-sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function sanitizeFileName(name: string): string {
  const baseName = name
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .trim()
    .slice(0, 120);
  return `${baseName || "converted"}.docx`;
}

function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function validateDocx(buffer: Buffer): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);
  const contentTypes = zip.file("[Content_Types].xml");
  const documentXml = zip.file("word/document.xml");

  if (!contentTypes || !documentXml) {
    throw new Error("Adobe returned an incomplete DOCX package.");
  }

  const [contentTypesXml, documentXmlContent] = await Promise.all([
    contentTypes.async("string"),
    documentXml.async("string"),
  ]);

  if (!contentTypesXml.trim() || !documentXmlContent.trim()) {
    throw new Error("Adobe returned an empty DOCX document.");
  }
}

export async function POST(request: NextRequest) {
  const clientId = process.env.PDF_SERVICES_CLIENT_ID;
  const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "خدمة تحويل PDF إلى Word غير مهيأة على الخادم." },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { error: "يرجى إرفاق ملف PDF صالح." },
        { status: 400 }
      );
    }

    if (
      uploadedFile.type !== "application/pdf" &&
      !uploadedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "الملف المرفق ليس بصيغة PDF." },
        { status: 415 }
      );
    }

    const pdfBuffer = Buffer.from(await uploadedFile.arrayBuffer());
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString() !== "%PDF-") {
      return NextResponse.json(
        { error: "تعذر التحقق من سلامة ملف PDF." },
        { status: 400 }
      );
    }

    const requestedLocale = formData.get("ocrLocale");
    const ocrLocale =
      typeof requestedLocale === "string"
        ? Object.values(ExportOCRLocale).find(
            (locale) => locale === requestedLocale
          )
        : undefined;

    if (typeof requestedLocale === "string" && !ocrLocale) {
      return NextResponse.json(
        { error: "لغة التعرف الضوئي المحددة غير مدعومة." },
        { status: 400 }
      );
    }

    const credentials = new ServicePrincipalCredentials({
      clientId,
      clientSecret,
    });
    const pdfServices = new PDFServices({ credentials });
    const inputAsset = await pdfServices.upload({
      readStream: Readable.from(pdfBuffer),
      mimeType: MimeType.PDF,
    });
    const params = new ExportPDFParams({
      targetFormat: ExportPDFTargetFormat.DOCX,
      ocrLocale: ocrLocale ?? ExportOCRLocale.EN_US,
    });
    const job = new ExportPDFJob({ inputAsset, params });
    const pollingURL = await pdfServices.submit({ job });
    const result = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExportPDFResult,
    });

    if (!result.result) {
      throw new Error("Adobe completed the export without a result asset.");
    }

    const streamAsset = await pdfServices.getContent({
      asset: result.result.asset,
    });
    const docxBuffer = await readStream(streamAsset.readStream);
    await validateDocx(docxBuffer);

    const fileName = sanitizeFileName(uploadedFile.name);
    const responseBuffer = new ArrayBuffer(docxBuffer.byteLength);
    new Uint8Array(responseBuffer).set(docxBuffer);

    return new Response(responseBuffer, {
      status: 200,
      headers: {
        "Content-Type": DOCX_CONTENT_TYPE,
        "Content-Length": String(docxBuffer.byteLength),
        "Content-Disposition": `attachment; filename="converted.docx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Adobe PDF to Word conversion failed:", error);
    return NextResponse.json(
      { error: "تعذر تحويل الملف بواسطة Adobe PDF Services. يرجى المحاولة مرة أخرى." },
      { status: 502 }
    );
  }
}
