import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  drawDoctorBlock,
  drawLogoHeader,
  GenerateInformePDFOptions,
  sanitizeForPdf,
  wrapText,
} from "./helpers";

export async function generateInformePDF({
  patientName,
  date,
  content,
  doctor,
  labels,
}: GenerateInformePDFOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  patientName = sanitizeForPdf(patientName);
  content = content.replace(/[^\x00-\xFF]/g, " ");

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawText = (
    text: string,
    x: number,
    currentY: number,
    font: typeof helvetica,
    size: number,
    color = rgb(0.1, 0.1, 0.1)
  ) => {
    page.drawText(text, { x, y: currentY, font, size, color });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const lightGray = rgb(0.95, 0.95, 0.97);

  await drawLogoHeader({
    pdfDoc,
    page,
    pageWidth,
    pageHeight,
    subtitle: labels.subtitle,
    date,
    font: helvetica,
    margin,
  });

  y = pageHeight - 110;

  page.drawRectangle({
    x: margin,
    y: y - 50,
    width: contentWidth,
    height: 50,
    color: lightGray,
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1,
  });

  drawText(labels.patient, margin + 12, y - 18, helveticaBold, 10, rgb(0.4, 0.4, 0.5));
  drawText(patientName, margin + 12, y - 32, helveticaBold, 13, rgb(0.08, 0.08, 0.12));
  drawText(sanitizeForPdf(labels.phoneLine), margin + 12, y - 44, helvetica, 9, rgb(0.5, 0.5, 0.6));

  y -= 70;

  const rawLines = content.split("\n");

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      y -= 10;
      continue;
    }

    const cleanLine = rawLine
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trimEnd();

    const wrappedLines = wrapText(cleanLine, contentWidth, helvetica, 10);
    for (const line of wrappedLines) {
      ensureSpace(14);
      drawText(line, margin, y, helvetica, 10);
      y -= 14;
    }
  }

  y -= 20;

  ensureSpace(80);
  const consentGreen = rgb(0.22, 0.6, 0.56);
  const consentBg = rgb(0.92, 0.98, 0.97);

  page.drawRectangle({
    x: margin,
    y: y - 54,
    width: contentWidth,
    height: 54,
    color: consentBg,
    borderColor: consentGreen,
    borderWidth: 0.8,
  });

  drawText(labels.consentTitle, margin + 10, y - 14, helveticaBold, 9, consentGreen);
  const consentLine1 = sanitizeForPdf(labels.consentLine1);
  const consentLine2 = sanitizeForPdf(labels.consentLine2);
  drawText(consentLine1, margin + 10, y - 27, helvetica, 8, rgb(0.15, 0.15, 0.15));
  drawText(consentLine2, margin + 10, y - 38, helvetica, 8, rgb(0.15, 0.15, 0.15));
  const consentDateClean = sanitizeForPdf(labels.consentDate);
  drawText(consentDateClean, margin + 10, y - 50, helvetica, 7.5, rgb(0.4, 0.4, 0.45));

  y -= 74;

  const sigBlockHeight = doctor ? 140 : 50;
  ensureSpace(sigBlockHeight);

  const separatorY = y;

  page.drawLine({
    start: { x: margin, y: separatorY },
    end: { x: pageWidth - margin, y: separatorY },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.85),
  });

  y -= 20;
  drawText(
    labels.footerGenerated,
    margin,
    y,
    helvetica,
    8,
    rgb(0.6, 0.6, 0.65)
  );
  y -= 12;
  drawText(
    labels.footerAdvice,
    margin,
    y,
    helvetica,
    8,
    rgb(0.6, 0.6, 0.65)
  );

  if (doctor) {
    await drawDoctorBlock({
      pdfDoc,
      page,
      doctor,
      helvetica,
      helveticaBold,
      pageWidth,
      margin,
      separatorY,
      sigBoxWidth: 190,
      sigImgHeight: 44,
      initialInfoYOffset: -6,
      nameColor: rgb(0.1, 0.1, 0.15),
      mutedColor: rgb(0.35, 0.35, 0.4),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
