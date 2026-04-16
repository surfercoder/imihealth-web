import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { PDFDocument, PDFFont, PDFPage, rgb, RGB } from "pdf-lib";

export interface DoctorSignatureInfo {
  name?: string | null;
  matricula?: string | null;
  especialidad?: string | null;
  firmaDigital?: string | null;
}

export interface GenerateInformePDFOptions {
  patientName: string;
  patientPhone: string | null;
  date: string;
  content: string;
  doctor?: DoctorSignatureInfo | null;
}

export interface GenerateCertificadoPDFOptions {
  patientName: string;
  patientDni?: string | null;
  patientDob?: string | null;
  date: string;
  diagnosis?: string | null;
  daysOff?: number | null;
  observations?: string | null;
  doctor?: DoctorSignatureInfo | null;
}

export interface GeneratePedidoPDFOptions {
  patientName: string;
  obraSocial?: string | null;
  nroAfiliado?: string | null;
  plan?: string | null;
  date: string;
  item: string;
  diagnostico?: string | null;
  doctor?: DoctorSignatureInfo | null;
}

export function sanitizeForPdf(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[^\x00-\xFF]/g, "").replace(/\s+/g, " ").trim();
}

export function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

interface DoctorBlockOptions {
  pdfDoc: PDFDocument;
  page: PDFPage;
  doctor: DoctorSignatureInfo;
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  pageWidth: number;
  margin: number;
  separatorY: number;
  sigBoxWidth: number;
  sigImgHeight: number;
  initialInfoYOffset: number;
  nameColor: RGB;
  mutedColor: RGB;
}

export async function drawDoctorBlock({
  pdfDoc,
  page,
  doctor,
  helvetica,
  helveticaBold,
  pageWidth,
  margin,
  separatorY,
  sigBoxWidth,
  sigImgHeight,
  initialInfoYOffset,
  nameColor,
  mutedColor,
}: DoctorBlockOptions): Promise<void> {
  const sigBoxX = pageWidth - margin - sigBoxWidth;
  const sigImgWidth = sigBoxWidth - 16;

  let infoY = separatorY + initialInfoYOffset;

  if (doctor.firmaDigital) {
    try {
      const dataUrl = doctor.firmaDigital;
      const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const buf = Buffer.from(base64Data, "base64");
      const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      const sigImage = await pdfDoc.embedPng(bytes);
      const sigDims = sigImage.scaleToFit(sigImgWidth, sigImgHeight);
      const sigDrawX = sigBoxX + 8 + (sigImgWidth - sigDims.width) / 2;
      page.drawImage(sigImage, {
        x: sigDrawX,
        y: infoY - sigDims.height,
        width: sigDims.width,
        height: sigDims.height,
      });
      infoY -= sigDims.height + 8;
    } catch {
      infoY -= 0;
    }
  }

  if (doctor.name) {
    const cleanName = sanitizeForPdf(doctor.name);
    const nameWidth = helveticaBold.widthOfTextAtSize(cleanName, 9);
    page.drawText(cleanName, {
      x: sigBoxX + (sigBoxWidth - nameWidth) / 2,
      y: infoY,
      font: helveticaBold,
      size: 9,
      color: nameColor,
    });
    infoY -= 12;
  }
  if (doctor.especialidad) {
    const cleanEsp = sanitizeForPdf(doctor.especialidad);
    const espWidth = helvetica.widthOfTextAtSize(cleanEsp, 8);
    page.drawText(cleanEsp, {
      x: sigBoxX + (sigBoxWidth - espWidth) / 2,
      y: infoY,
      font: helvetica,
      size: 8,
      color: mutedColor,
    });
    infoY -= 11;
  }
  if (doctor.matricula) {
    const cleanMatricula = sanitizeForPdf(`Mat. ${doctor.matricula}`);
    const matWidth = helvetica.widthOfTextAtSize(cleanMatricula, 8);
    page.drawText(cleanMatricula, {
      x: sigBoxX + (sigBoxWidth - matWidth) / 2,
      y: infoY,
      font: helvetica,
      size: 8,
      color: mutedColor,
    });
    infoY -= 10;
  }
}

export const pdfColors = {
  primary: rgb(0.08, 0.35, 0.65),
  lightGray: rgb(0.95, 0.95, 0.97),
  darkText: rgb(0.08, 0.08, 0.12),
  mutedText: rgb(0.4, 0.4, 0.5),
};

async function loadLogoPng(): Promise<Uint8Array> {
  const logoPath = join(process.cwd(), "public", "assets", "images", "imihealth-logo.webp");
  const webpBuffer = await readFile(logoPath);
  const pngBuffer = await sharp(webpBuffer).png().toBuffer();
  return new Uint8Array(pngBuffer.buffer, pngBuffer.byteOffset, pngBuffer.byteLength);
}

interface DrawLogoHeaderOptions {
  pdfDoc: PDFDocument;
  page: PDFPage;
  pageWidth: number;
  pageHeight: number;
  subtitle: string;
  date: string;
  font: PDFFont;
  margin: number;
}

export async function drawLogoHeader({
  pdfDoc,
  page,
  pageWidth,
  pageHeight,
  subtitle,
  date,
  font,
  margin,
}: DrawLogoHeaderOptions): Promise<void> {
  const logoPng = await loadLogoPng();
  const logoImage = await pdfDoc.embedPng(logoPng);
  const logoHeight = 50;
  const logoDims = logoImage.scaleToFit(pageWidth * 0.5, logoHeight);
  const logoX = (pageWidth - logoDims.width) / 2;
  const logoY = pageHeight - margin - logoDims.height + 20;

  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoDims.width,
    height: logoDims.height,
  });

  const subtitleY = logoY - 14;
  const subtitleWidth = font.widthOfTextAtSize(subtitle, 11);
  page.drawText(subtitle, {
    x: (pageWidth - subtitleWidth) / 2,
    y: subtitleY,
    font,
    size: 11,
    color: pdfColors.mutedText,
  });

  page.drawText(date, {
    x: pageWidth - margin - font.widthOfTextAtSize(date, 9),
    y: subtitleY,
    font,
    size: 9,
    color: pdfColors.mutedText,
  });
}
