import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 120;

const ADOBE_API_URL = "https://pdf-services.adobe.io";
const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_POLL_ATTEMPTS = 100;
const POLL_INTERVAL_MS = 1000;
const ADOBE_SERVICE_DOMAINS = ["adobe.io", "adobe.com"];
const ADOBE_STORAGE_DOMAINS = ["amazonaws.com", "windows.net"];

interface AdobeAsset {
  assetID?: string;
  downloadUri?: string;
}

interface AdobeJobStatus {
  status?: string;
  asset?: AdobeAsset;
  error?: { message?: string };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

async function getAdobeError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = asRecord(JSON.parse(body) as unknown);
    const detail =
      typeof parsed?.message === "string"
        ? parsed.message
        : typeof parsed?.error === "string"
          ? parsed.error
          : body;
    return `${response.status} ${detail.slice(0, 500)}`;
  } catch {
    return `${response.status} ${body.slice(0, 500)}`;
  }
}

function assertTrustedAdobeUrl(
  value: string,
  label: string,
  allowStorageHosts = false
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Adobe returned an invalid ${label} URL.`);
  }

  const trustedDomains = allowStorageHosts
    ? [...ADOBE_SERVICE_DOMAINS, ...ADOBE_STORAGE_DOMAINS]
    : ADOBE_SERVICE_DOMAINS;
  const isTrustedHost = trustedDomains.some(
    (domain) => url.hostname.endsWith(`.${domain}`)
  );
  if (
    url.protocol !== "https:" ||
    !isTrustedHost ||
    url.username.length > 0 ||
    url.password.length > 0
  ) {
    throw new Error(`Adobe returned an untrusted ${label} URL.`);
  }
  return url;
}

function sanitizeFileName(name: string): string {
  const baseName = name
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .trim()
    .slice(0, 120);
  return `${baseName || "converted"}.docx`;
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

    const tokenResponse = await fetch(`${ADOBE_API_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      throw new Error(`Adobe authentication failed: ${await getAdobeError(tokenResponse)}`);
    }

    const tokenPayload: unknown = await tokenResponse.json();
    const tokenRecord = asRecord(tokenPayload);
    const accessToken = tokenRecord?.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new Error("Adobe authentication returned no access token.");
    }

    const adobeHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": clientId,
    };

    const assetResponse = await fetch(`${ADOBE_API_URL}/assets`, {
      method: "POST",
      headers: {
        ...adobeHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mediaType: "application/pdf" }),
      cache: "no-store",
    });
    if (!assetResponse.ok) {
      throw new Error(`Adobe asset creation failed: ${await getAdobeError(assetResponse)}`);
    }

    const assetPayload: unknown = await assetResponse.json();
    const assetRecord = asRecord(assetPayload);
    const assetId = assetRecord?.assetID;
    const uploadUri = assetRecord?.uploadUri;
    if (typeof assetId !== "string" || typeof uploadUri !== "string") {
      throw new Error("Adobe returned incomplete upload details.");
    }

    const uploadUrl = assertTrustedAdobeUrl(uploadUri, "upload", true);
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: new Uint8Array(pdfBuffer),
      cache: "no-store",
    });
    if (!uploadResponse.ok) {
      throw new Error(`Adobe PDF upload failed: ${await getAdobeError(uploadResponse)}`);
    }

    const jobResponse = await fetch(`${ADOBE_API_URL}/operation/exportpdf`, {
      method: "POST",
      headers: {
        ...adobeHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assetID: assetId, targetFormat: "docx" }),
      cache: "no-store",
    });
    if (!jobResponse.ok) {
      throw new Error(`Adobe DOCX export failed: ${await getAdobeError(jobResponse)}`);
    }

    const locationHeader = jobResponse.headers.get("location");
    if (!locationHeader) {
      throw new Error("Adobe did not return an export job location.");
    }
    const jobUrl = assertTrustedAdobeUrl(
      new URL(locationHeader, ADOBE_API_URL).toString(),
      "job"
    );

    let completedJob: AdobeJobStatus | null = null;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      const statusResponse = await fetch(jobUrl, {
        headers: adobeHeaders,
        cache: "no-store",
      });
      if (!statusResponse.ok) {
        throw new Error(`Adobe export status failed: ${await getAdobeError(statusResponse)}`);
      }

      const statusPayload: unknown = await statusResponse.json();
      const statusRecord = asRecord(statusPayload);
      const status = statusRecord?.status;

      if (status === "done") {
        const resultAsset = asRecord(statusRecord?.asset) as AdobeAsset | null;
        if (!resultAsset || typeof resultAsset.downloadUri !== "string") {
          throw new Error("Adobe completed the export without a download asset.");
        }
        completedJob = { status: "done", asset: resultAsset };
        break;
      }

      if (status === "failed") {
        const jobError = asRecord(statusRecord?.error);
        const message =
          typeof jobError?.message === "string"
            ? jobError.message
            : "Adobe could not convert this PDF.";
        throw new Error(message);
      }

      if (status !== "in progress") {
        throw new Error("Adobe returned an unknown export job status.");
      }
    }

    if (!completedJob?.asset?.downloadUri) {
      throw new Error("Adobe DOCX export did not finish before the timeout.");
    }

    const downloadUrl = assertTrustedAdobeUrl(
      completedJob.asset.downloadUri,
      "download",
      true
    );
    const downloadResponse = await fetch(downloadUrl, { cache: "no-store" });
    if (!downloadResponse.ok) {
      throw new Error(`Adobe DOCX download failed: ${await getAdobeError(downloadResponse)}`);
    }

    const docxBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    await validateDocx(docxBuffer);

    const responseBuffer = new ArrayBuffer(docxBuffer.byteLength);
    new Uint8Array(responseBuffer).set(docxBuffer);
    return new Response(responseBuffer, {
      status: 200,
      headers: {
        "Content-Type": DOCX_CONTENT_TYPE,
        "Content-Length": String(docxBuffer.byteLength),
        "Content-Disposition": `attachment; filename="converted.docx"; filename*=UTF-8''${encodeURIComponent(sanitizeFileName(uploadedFile.name))}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Adobe PDF to Word conversion failed:", error);
    return NextResponse.json(
      { error: "تعذر تحويل الملف عبر Adobe PDF Services. يرجى المحاولة مرة أخرى." },
      { status: 502 }
    );
  }
}
