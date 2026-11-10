"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  LoaderCircle,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  PageViewport,
  RenderTask,
} from "pdfjs-dist";

const MAX_PAGE_WIDTH = 840;
const ARABIC_TEXT = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;

type PdfField = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  value: string;
};

type PdfEditorPage = {
  number: number;
  page: PDFPageProxy;
  viewport: PageViewport;
  fields: PdfField[];
};

type PdfJsModule = typeof import("pdfjs-dist");

function multiplyTransforms(
  first: number[],
  second: number[],
): number[] {
  return [
    first[0] * second[0] + first[2] * second[1],
    first[1] * second[0] + first[3] * second[1],
    first[0] * second[2] + first[2] * second[3],
    first[1] * second[2] + first[3] * second[3],
    first[0] * second[4] + first[2] * second[5] + first[4],
    first[1] * second[4] + first[3] * second[5] + first[5],
  ];
}

function transformPoint(
  transform: number[],
  x: number,
  y: number,
): [number, number] {
  return [
    transform[0] * x + transform[2] * y + transform[4],
    transform[1] * x + transform[3] * y + transform[5],
  ];
}

function detectFormRectangles(
  page: PDFPageProxy,
  viewport: PageViewport,
  operatorConstants: PdfJsModule["OPS"],
): Promise<PdfField[]> {
  const operatorListPromise = page.getOperatorList();

  return operatorListPromise.then((operatorList) => {
    const rectangles: PdfField[] = [];
    const seen = new Set<string>();
    const transforms = [[1, 0, 0, 1, 0, 0]];
    const argumentCounts = new Map<number, number>([
      [operatorConstants.moveTo, 2],
      [operatorConstants.lineTo, 2],
      [operatorConstants.curveTo, 6],
      [operatorConstants.curveTo2, 4],
      [operatorConstants.curveTo3, 4],
      [operatorConstants.closePath, 0],
      [operatorConstants.rectangle, 4],
    ]);

    const addRectangle = (points: [number, number][]) => {
      const corners =
        points.length === 5 &&
        Math.hypot(
          points[0][0] - points[4][0],
          points[0][1] - points[4][1],
        ) < 0.01
          ? points.slice(0, 4)
          : points;
      if (corners.length !== 4) return;

      const edgeA = [
        corners[1][0] - corners[0][0],
        corners[1][1] - corners[0][1],
      ];
      const edgeB = [
        corners[2][0] - corners[1][0],
        corners[2][1] - corners[1][1],
      ];
      const edgeC = [
        corners[3][0] - corners[2][0],
        corners[3][1] - corners[2][1],
      ];
      const edgeD = [
        corners[0][0] - corners[3][0],
        corners[0][1] - corners[3][1],
      ];
      const edgeWidth = Math.hypot(edgeA[0], edgeA[1]);
      const edgeHeight = Math.hypot(edgeB[0], edgeB[1]);
      const oppositeWidth = Math.hypot(edgeC[0], edgeC[1]);
      const oppositeHeight = Math.hypot(edgeD[0], edgeD[1]);
      const perpendicular =
        Math.abs(edgeA[0] * edgeB[0] + edgeA[1] * edgeB[1]) <=
        edgeWidth * edgeHeight * 0.02;

      if (
        !perpendicular ||
        Math.abs(edgeWidth - oppositeWidth) > 0.5 ||
        Math.abs(edgeHeight - oppositeHeight) > 0.5
      ) {
        return;
      }

      const pdfWidth = Math.max(edgeWidth, edgeHeight);
      const pdfHeight = Math.min(edgeWidth, edgeHeight);
      if (
        pdfWidth < 50 ||
        pdfWidth > 520 ||
        pdfHeight < 12 ||
        pdfHeight > 50
      ) {
        return;
      }

      const viewportPoints = corners.map(([pointX, pointY]) =>
        viewport.convertToViewportPoint(pointX, pointY),
      );
      const left = Math.min(...viewportPoints.map(([pointX]) => pointX));
      const top = Math.min(...viewportPoints.map(([, pointY]) => pointY));
      const right = Math.max(...viewportPoints.map(([pointX]) => pointX));
      const bottom = Math.max(...viewportPoints.map(([, pointY]) => pointY));
      const pdfPoints = viewportPoints.map(([pointX, pointY]) =>
        viewport.convertToPdfPoint(pointX, pointY),
      );
      const pdfXs = pdfPoints.map(([pointX]) => pointX);
      const pdfYs = pdfPoints.map(([, pointY]) => pointY);
      const pdfX = Math.min(...pdfXs);
      const pdfY = Math.min(...pdfYs);
      const pdfRight = Math.max(...pdfXs);
      const pdfTop = Math.max(...pdfYs);
      const key = [
        pdfX.toFixed(2),
        pdfY.toFixed(2),
        pdfRight.toFixed(2),
        pdfTop.toFixed(2),
      ].join(":");

      if (seen.has(key)) return;
      seen.add(key);
      rectangles.push({
        id: key,
        left,
        top,
        width: right - left,
        height: bottom - top,
        pdfX,
        pdfY,
        pdfWidth: pdfRight - pdfX,
        pdfHeight: pdfTop - pdfY,
        value: "",
      });
    };

    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      const operation = operatorList.fnArray[index];
      const args = operatorList.argsArray[index];

      if (operation === operatorConstants.save) {
        transforms.push([...transforms[transforms.length - 1]]);
      } else if (operation === operatorConstants.restore) {
        if (transforms.length > 1) transforms.pop();
      } else if (
        operation === operatorConstants.transform &&
        Array.isArray(args) &&
        args.length >= 6
      ) {
        const current = transforms[transforms.length - 1];
        transforms[transforms.length - 1] = multiplyTransforms(
          current,
          args.slice(0, 6) as number[],
        );
      } else if (
        operation === operatorConstants.constructPath &&
        Array.isArray(args) &&
        Array.isArray(args[0]) &&
        Array.isArray(args[1])
      ) {
        const pathOperations = args[0] as number[];
        const pathArguments = args[1] as number[];
        const transform = transforms[transforms.length - 1];
        let argumentIndex = 0;
        let pathPoints: [number, number][] = [];
        let pathIsRectangular = true;

        for (const pathOperation of pathOperations) {
          const argumentCount = argumentCounts.get(pathOperation);
          if (argumentCount === undefined) break;

          if (pathOperation === operatorConstants.rectangle) {
            const [x, y, width, height] = pathArguments.slice(
              argumentIndex,
              argumentIndex + 4,
            );
            argumentIndex += 4;
            if (
              Number.isFinite(x) &&
              Number.isFinite(y) &&
              Number.isFinite(width) &&
              Number.isFinite(height)
            ) {
              addRectangle([
                transformPoint(transform, x, y),
                transformPoint(transform, x + width, y),
                transformPoint(transform, x + width, y + height),
                transformPoint(transform, x, y + height),
              ]);
            }
            pathPoints = [];
            pathIsRectangular = true;
            continue;
          }

          if (pathOperation === operatorConstants.moveTo) {
            const [x, y] = pathArguments.slice(
              argumentIndex,
              argumentIndex + 2,
            );
            pathPoints = [transformPoint(transform, x, y)];
            pathIsRectangular = true;
          } else if (pathOperation === operatorConstants.lineTo) {
            const [x, y] = pathArguments.slice(
              argumentIndex,
              argumentIndex + 2,
            );
            if (pathPoints.length > 0) {
              pathPoints.push(transformPoint(transform, x, y));
            }
          } else if (pathOperation === operatorConstants.closePath) {
            if (pathIsRectangular) addRectangle(pathPoints);
            pathPoints = [];
          } else {
            pathIsRectangular = false;
          }

          argumentIndex += argumentCount;
        }
      }
    }

    return rectangles;
  });
}

function drawArabicText(
  text: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("تعذر تجهيز النص العربي للملف.");
  }

  context.scale(scale, scale);
  context.font = `${Math.max(8, Math.min(20, height * 0.68))}px Arial, sans-serif`;
  context.fillStyle = "#000000";
  context.textBaseline = "middle";
  context.direction = ARABIC_TEXT.test(text) ? "rtl" : "ltr";
  context.textAlign = context.direction === "rtl" ? "right" : "left";
  context.fillText(
    text,
    context.direction === "rtl" ? width - 3 : 3,
    height / 2,
    Math.max(1, width - 6),
  );

  return canvas;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "حدث خطأ أثناء معالجة ملف PDF.";
}

export default function PdfEditorPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<RenderTask[]>([]);
  const pagesRef = useRef<PdfEditorPage[]>([]);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const uploadIdRef = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfEditorPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFields, setShowFields] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      uploadIdRef.current += 1;
      void pdfDocumentRef.current?.destroy();
    },
    [],
  );

  useEffect(() => {
    renderTasksRef.current.forEach((task) => task.cancel());
    const renderTasks: RenderTask[] = [];

    pagesRef.current.forEach((pageInfo, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const deviceScale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.ceil(pageInfo.viewport.width * deviceScale);
      canvas.height = Math.ceil(pageInfo.viewport.height * deviceScale);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      const context = canvas.getContext("2d");
      if (!context) {
        setErrorMessage("تعذر إنشاء مساحة معاينة صفحات PDF.");
        return;
      }

      const task = pageInfo.page.render({
        canvasContext: context,
        viewport: pageInfo.viewport,
        transform: [deviceScale, 0, 0, deviceScale, 0, 0],
      });
      renderTasks.push(task);
      void task.promise.catch((error: unknown) => {
        if (
          error instanceof Error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }
        setErrorMessage(getErrorMessage(error));
      });
    });

    renderTasksRef.current = renderTasks;
    return () => renderTasks.forEach((task) => task.cancel());
  }, [pages.length]);

  const updateField = (
    pageNumber: number,
    fieldId: string,
    value: string,
  ) => {
    setPages((currentPages) => {
      const updatedPages = currentPages.map((page) =>
        page.number !== pageNumber
          ? page
          : {
              ...page,
              fields: page.fields.map((field) =>
                field.id === fieldId ? { ...field, value } : field,
              ),
            },
      );
      pagesRef.current = updatedPages;
      return updatedPages;
    });
  };

  const loadPdf = async (selectedFile: File) => {
    const currentUploadId = ++uploadIdRef.current;
    setFile(selectedFile);
    pagesRef.current = [];
    setPages([]);
    setErrorMessage(null);
    setStatusMessage(null);
    setIsLoading(true);
    setShowFields(true);

    try {
      await pdfDocumentRef.current?.destroy();
      pdfDocumentRef.current = null;

      const sourceBytes = await selectedFile.arrayBuffer();
      if (
        new TextDecoder().decode(sourceBytes.slice(0, 5)) !== "%PDF-"
      ) {
        throw new Error("الملف المحدد ليس ملف PDF صالحاً.");
      }

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(sourceBytes),
      });
      const pdf = await loadingTask.promise;

      if (currentUploadId !== uploadIdRef.current) {
        await pdf.destroy();
        return;
      }

      pdfDocumentRef.current = pdf;
      const loadedPages: PdfEditorPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1, MAX_PAGE_WIDTH / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const fields = await detectFormRectangles(page, viewport, pdfjs.OPS);

        if (currentUploadId !== uploadIdRef.current) return;

        loadedPages.push({ number: pageNumber, page, viewport, fields });
        const nextPages = [...loadedPages];
        pagesRef.current = nextPages;
        setPages(nextPages);
      }
    } catch (error) {
      if (currentUploadId === uploadIdRef.current) {
        pagesRef.current = [];
        setPages([]);
        setErrorMessage(getErrorMessage(error));
      }
    } finally {
      if (currentUploadId === uploadIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setErrorMessage("يرجى اختيار ملف PDF صالح.");
      return;
    }

    void loadPdf(selectedFile);
  };

  const downloadFilledPdf = async () => {
    if (!file || pages.length === 0) return;

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const pdfBytes = await file.arrayBuffer();
      const outputPdf = await PDFDocument.load(pdfBytes);
      outputPdf.registerFontkit(fontkit);

      if (outputPdf.getPageCount() !== pages.length) {
        throw new Error("تغير عدد صفحات الملف أثناء المعالجة.");
      }

      const standardFont = await outputPdf.embedFont(StandardFonts.Helvetica);
      const outputPages = outputPdf.getPages();

      for (const pageInfo of pages) {
        const outputPage = outputPages[pageInfo.number - 1];

        for (const field of pageInfo.fields) {
          const text = field.value.trim();
          if (!text) continue;

          const fontSize = Math.max(7, Math.min(18, field.pdfHeight * 0.68));
          let canUseStandardFont = true;
          try {
            standardFont.encodeText(text);
          } catch {
            canUseStandardFont = false;
          }

          if (canUseStandardFont) {
            outputPage.drawText(text, {
              x: field.pdfX + 3,
              y: field.pdfY + (field.pdfHeight - fontSize) / 2,
              size: fontSize,
              font: standardFont,
              color: rgb(0, 0, 0),
              maxWidth: Math.max(1, field.pdfWidth - 6),
            });
          } else {
            const textCanvas = drawArabicText(
              text,
              field.pdfWidth,
              field.pdfHeight,
            );
            const textImage = await outputPdf.embedPng(
              textCanvas.toDataURL("image/png"),
            );
            outputPage.drawImage(textImage, {
              x: field.pdfX,
              y: field.pdfY,
              width: field.pdfWidth,
              height: field.pdfHeight,
            });
          }
        }
      }

      const savedPdf = await outputPdf.save();
      if (outputPdf.getPageCount() !== pages.length) {
        throw new Error("تعذر الحفاظ على عدد صفحات الملف الأصلي.");
      }

      const downloadUrl = URL.createObjectURL(
        new Blob([new Uint8Array(savedPdf).buffer], {
          type: "application/pdf",
        }),
      );
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${file.name.replace(/\.pdf$/i, "")}_filled.pdf`;
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(downloadUrl);
      }, 1000);
      setStatusMessage("تم تنزيل الملف مع الحفاظ على صفحاته الأصلية.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const reset = async () => {
    uploadIdRef.current += 1;
    await pdfDocumentRef.current?.destroy();
    pdfDocumentRef.current = null;
    setFile(null);
    pagesRef.current = [];
    setPages([]);
    setIsLoading(false);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  return (
    <main
      className="min-h-screen bg-[#070b12] px-4 py-8 text-slate-100 sm:py-12"
      dir="rtl"
    >
      <section className="mx-auto w-full max-w-5xl">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
            <FileText aria-hidden="true" className="h-4 w-4" />
            تعبئة نماذج PDF
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            تعديل PDF
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            ارفع ملفك، واكتب مباشرةً في مربعات النموذج المكتشفة. تبقى صفحات
            المستند وأبعادها الأصلية كما هي.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isExporting}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud aria-hidden="true" className="h-5 w-5" />
            )}
            {file ? "اختيار ملف آخر" : "اختر ملف PDF"}
          </button>

          {pages.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowFields((shown) => !shown)}
                className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  showFields
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                {showFields ? "إخفاء مربعات الكتابة" : "تفعيل مربعات الكتابة تلقائياً"}
              </button>
              <button
                type="button"
                onClick={() => void downloadFilledPdf()}
                disabled={isExporting || isLoading}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <Download aria-hidden="true" className="h-5 w-5" />
                )}
                تحميل الملف النهائي
              </button>
              <button
                type="button"
                onClick={() => void reset()}
                disabled={isExporting}
                aria-label="إزالة الملف"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                إعادة ضبط
              </button>
            </>
          )}
        </div>

        {file && (
          <p className="mb-4 text-center text-xs text-slate-400">
            {file.name}
            {pages.length > 0 && ` · ${pages.length} صفحات`}
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200"
          >
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200"
          >
            {statusMessage}
          </p>
        )}

        {!file && !isLoading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 text-center transition hover:border-blue-500/60 hover:bg-slate-900"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
              <UploadCloud aria-hidden="true" className="h-7 w-7" />
            </span>
            <span className="text-sm font-bold text-slate-200">
              اضغط لاختيار ملف PDF
            </span>
            <span className="text-xs text-slate-500">
              تُجرى المعالجة محلياً في متصفحك
            </span>
          </button>
        )}

        {isLoading && pages.length === 0 && (
          <div
            role="status"
            className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-400"
          >
            <LoaderCircle
              aria-hidden="true"
              className="h-5 w-5 animate-spin text-blue-400"
            />
            جارٍ قراءة صفحات المستند...
          </div>
        )}

        <div className="space-y-8">
          {pages.map((pageInfo, index) => (
            <section
              key={pageInfo.number}
              aria-label={`الصفحة ${pageInfo.number}`}
              className="mx-auto w-full max-w-[840px] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl"
            >
              <div
                className="relative mx-auto overflow-hidden bg-white"
                style={{
                  aspectRatio: `${pageInfo.viewport.width} / ${pageInfo.viewport.height}`,
                }}
              >
                <canvas
                  ref={(element) => {
                    canvasRefs.current[index] = element;
                  }}
                  className="pointer-events-none"
                  aria-label={`معاينة الصفحة ${pageInfo.number}`}
                />
                {showFields && (
                  <div className="pointer-events-auto absolute inset-0 z-20">
                    {pageInfo.fields.map((field) => (
                    <input
                      key={field.id}
                      type="text"
                      value={field.value}
                      dir="auto"
                      lang="ar"
                      disabled={false}
                      readOnly={false}
                      tabIndex={0}
                      aria-label={`حقل كتابة في الصفحة ${pageInfo.number}`}
                      onClick={(event) => event.currentTarget.focus()}
                      onChange={(event) =>
                        updateField(
                          pageInfo.number,
                          field.id,
                          event.target.value,
                        )
                      }
                      className="absolute box-border cursor-text rounded-sm border border-transparent bg-white/80 px-1 text-[11px] leading-none text-black outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/60 hover:border-blue-400/70"
                      style={{
                        left: `${(field.left / pageInfo.viewport.width) * 100}%`,
                        top: `${(field.top / pageInfo.viewport.height) * 100}%`,
                        width: `${(field.width / pageInfo.viewport.width) * 100}%`,
                        height: `${(field.height / pageInfo.viewport.height) * 100}%`,
                        fontSize: `max(8px, min(16px, ${field.height * 0.65}px))`,
                        fontFamily: "Arial, Tahoma, sans-serif",
                        textAlign: "start",
                      }}
                    />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between px-1 pt-2 text-[11px] text-slate-400">
                <span>صفحة {pageInfo.number}</span>
                <span>
                  {showFields
                    ? `${pageInfo.fields.length} مربعات مكتشفة`
                    : "اكتمل عرض الصفحة"}
                </span>
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
