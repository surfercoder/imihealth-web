import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { drawDoctorBlock, drawLogoHeader, GenerateCertificadoPDFOptions, pdfColors, sanitizeForPdf, wrapText } from "./helpers";

export async function generateCertificadoPDF({
  patientName, date, diagnosis, observations, doctor, labels,
}: GenerateCertificadoPDFOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  patientName = sanitizeForPdf(patientName);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 60;
  const contentWidth = pageWidth - margin * 2;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const { primary: primaryColor, lightGray, darkText, mutedText } = pdfColors;

  const drawText = (
    text: string,
    x: number,
    currentY: number,
    font: typeof helvetica,
    size: number,
    color = darkText
  ) => {
    page.drawText(text, { x, y: currentY, font, size, color });
  };

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

  y = pageHeight - 100;

  y -= 20;

  page.drawRectangle({
    x: margin,
    y: y - 64,
    width: contentWidth,
    height: 64,
    color: lightGray,
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1,
  });

  drawText(labels.patientData, margin + 12, y - 14, helveticaBold, 8, mutedText);
  drawText(patientName, margin + 12, y - 27, helveticaBold, 13, darkText);
  let patientInfoY = y - 39;
  if (labels.dniLine) {
    drawText(sanitizeForPdf(labels.dniLine), margin + 12, patientInfoY, helvetica, 9, mutedText);
    patientInfoY -= 12;
  }
  if (labels.dobLine) {
    drawText(sanitizeForPdf(labels.dobLine), margin + 12, patientInfoY, helvetica, 9, mutedText);
  }

  y -= 84;

  const bodyLines = wrapText(sanitizeForPdf(labels.bodyText), contentWidth, helvetica, 11);
  for (const line of bodyLines) {
    drawText(line, margin, y, helvetica, 11, darkText);
    y -= 17;
  }

  y -= 10;

  if (labels.daysOffText) {
    const daysText = sanitizeForPdf(labels.daysOffText);
    const daysLines = wrapText(daysText, contentWidth - 24, helvetica, 10);
    const daysBoxHeight = 16 + daysLines.length * 14 + 14;
    page.drawRectangle({
      x: margin,
      y: y - daysBoxHeight,
      width: contentWidth,
      height: daysBoxHeight,
      color: rgb(0.9, 0.94, 0.99),
      borderColor: primaryColor,
      borderWidth: 0.8,
    });

    let daysY = y - 16;
    for (const line of daysLines) {
      drawText(line, margin + 12, daysY, helvetica, 10, primaryColor);
      daysY -= 14;
    }

    y -= daysBoxHeight + 18;
  }

  if (diagnosis) {
    y -= 4;
    const diagClean = sanitizeForPdf(diagnosis.replace(/[^\x00-\xFF]/g, " "));
    drawText(labels.diagnosis, margin, y, helveticaBold, 10, darkText);
    y -= 15;
    const diagLines = wrapText(diagClean, contentWidth, helvetica, 10);
    for (const line of diagLines) {
      drawText(line, margin, y, helvetica, 10, darkText);
      y -= 14;
    }
    y -= 6;
  }

  if (observations) {
    const obsClean = sanitizeForPdf(observations.replace(/[^\x00-\xFF]/g, " "));
    drawText(labels.observations, margin, y, helveticaBold, 10, darkText);
    y -= 15;
    const obsLines = wrapText(obsClean, contentWidth, helvetica, 10);
    for (const line of obsLines) {
      drawText(line, margin, y, helvetica, 10, darkText);
      y -= 14;
    }
    y -= 6;
  }

  y -= 40;

  const sigBlockY = y;
  page.drawLine({
    start: { x: margin, y: sigBlockY },
    end: { x: pageWidth - margin, y: sigBlockY },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.85),
  });

  y -= 16;
  drawText(
    labels.footer,
    margin,
    y,
    helvetica,
    7.5,
    mutedText
  );

  if (doctor) {
    await drawDoctorBlock({
      pdfDoc, page, doctor, helvetica, helveticaBold, pageWidth, margin,
      separatorY: sigBlockY, sigBoxWidth: 180, sigImgHeight: 50,
      initialInfoYOffset: -36, nameColor: darkText, mutedColor: mutedText,
    });
  }

  const certBytes = await pdfDoc.save();
  return certBytes;
}
