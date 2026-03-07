import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface DoctorSignatureInfo {
  name?: string | null;
  matricula?: string | null;
  especialidad?: string | null;
  firmaDigital?: string | null;
}

interface GenerateInformePDFOptions {
  patientName: string;
  patientPhone: string;
  date: string;
  content: string;
  consentAt?: string | null;
  doctor?: DoctorSignatureInfo | null;
}

function sanitizeForPdf(text: string): string {
  return text.replace(/[^\x00-\xFF]/g, "").replace(/\s+/g, " ").trim();
}

export async function generateInformePDF({
  patientName,
  patientPhone,
  date,
  content,
  consentAt,
  doctor,
}: GenerateInformePDFOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  patientName = sanitizeForPdf(patientName);
  patientPhone = sanitizeForPdf(patientPhone);
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

  const wrapText = (text: string, maxWidth: number, font: typeof helvetica, size: number): string[] => {
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
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const primaryColor = rgb(0.08, 0.35, 0.65);
  const lightGray = rgb(0.95, 0.95, 0.97);

  page.drawRectangle({
    x: 0,
    y: pageHeight - 90,
    width: pageWidth,
    height: 90,
    color: primaryColor,
  });

  drawText("IMI", margin, pageHeight - 40, helveticaBold, 22, rgb(1, 1, 1));
  drawText("Informe Médico", margin, pageHeight - 60, helvetica, 12, rgb(0.85, 0.9, 1));
  drawText(date, pageWidth - margin - 80, pageHeight - 50, helvetica, 10, rgb(0.85, 0.9, 1));

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

  drawText("Paciente:", margin + 12, y - 18, helveticaBold, 10, rgb(0.4, 0.4, 0.5));
  drawText(patientName, margin + 12, y - 32, helveticaBold, 13, rgb(0.08, 0.08, 0.12));
  drawText(`Tel: ${patientPhone}`, margin + 12, y - 44, helvetica, 9, rgb(0.5, 0.5, 0.6));

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

  if (consentAt) {
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

    drawText("Consentimiento del paciente", margin + 10, y - 14, helveticaBold, 9, consentGreen);
    const consentLine1 = sanitizeForPdf(
      `Yo, ${patientName}, confirmo haber leido la transcripcion de la consulta medica`
    );
    const consentLine2 = sanitizeForPdf(
      `y doy mi consentimiento de que el contenido es correcto y refleja lo conversado.`
    );
    drawText(consentLine1, margin + 10, y - 27, helvetica, 8, rgb(0.15, 0.15, 0.15));
    drawText(consentLine2, margin + 10, y - 38, helvetica, 8, rgb(0.15, 0.15, 0.15));
    const consentDateClean = sanitizeForPdf(`Fecha de consentimiento: ${consentAt}`);
    drawText(consentDateClean, margin + 10, y - 50, helvetica, 7.5, rgb(0.4, 0.4, 0.45));

    y -= 74;
  }

  const sigBlockHeight = doctor ? 110 : 50;
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
    "Este informe fue generado automaticamente por IMI.",
    margin,
    y,
    helvetica,
    8,
    rgb(0.6, 0.6, 0.65)
  );
  y -= 12;
  drawText(
    "Ante cualquier duda, consulte a su medico.",
    margin,
    y,
    helvetica,
    8,
    rgb(0.6, 0.6, 0.65)
  );

  if (doctor) {
    const sigBoxWidth = 190;
    const sigBoxX = pageWidth - margin - sigBoxWidth;
    const sigImgHeight = 44;
    const sigImgWidth = sigBoxWidth - 16;

    let infoY = separatorY - 6;

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
        color: rgb(0.1, 0.1, 0.15),
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
        color: rgb(0.35, 0.35, 0.4),
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
        color: rgb(0.35, 0.35, 0.4),
      });
      infoY -= 10;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

interface GenerateCertificadoPDFOptions {
  patientName: string;
  patientDni?: string | null;
  patientDob?: string | null;
  date: string;
  diagnosis?: string | null;
  daysOff?: number | null;
  observations?: string | null;
  doctor?: DoctorSignatureInfo | null;
}

export async function generateCertificadoPDF({
  patientName,
  patientDni,
  patientDob,
  date,
  diagnosis,
  daysOff,
  observations,
  doctor,
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

  const primaryColor = rgb(0.08, 0.35, 0.65);
  const lightGray = rgb(0.95, 0.95, 0.97);
  const darkText = rgb(0.08, 0.08, 0.12);
  const mutedText = rgb(0.4, 0.4, 0.5);

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

  const wrapText = (text: string, maxWidth: number, font: typeof helvetica, size: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, size) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  page.drawRectangle({
    x: 0,
    y: pageHeight - 80,
    width: pageWidth,
    height: 80,
    color: primaryColor,
  });

  drawText("IMI", margin, pageHeight - 32, helveticaBold, 20, rgb(1, 1, 1));
  drawText("Certificado Médico", margin, pageHeight - 50, helvetica, 11, rgb(0.85, 0.9, 1));
  drawText(date, pageWidth - margin - 80, pageHeight - 46, helvetica, 9, rgb(0.85, 0.9, 1));

  y = pageHeight - 100;

  const titleText = "CERTIFICADO MÉDICO";
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 16);
  drawText(titleText, (pageWidth - titleWidth) / 2, y, helveticaBold, 16, primaryColor);

  y -= 8;
  page.drawLine({
    start: { x: margin + 40, y },
    end: { x: pageWidth - margin - 40, y },
    thickness: 1,
    color: primaryColor,
  });

  y -= 30;

  page.drawRectangle({
    x: margin,
    y: y - 52,
    width: contentWidth,
    height: 52,
    color: lightGray,
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1,
  });

  drawText("DATOS DEL PACIENTE", margin + 12, y - 14, helveticaBold, 8, mutedText);
  drawText(patientName, margin + 12, y - 27, helveticaBold, 13, darkText);
  let patientInfoY = y - 39;
  if (patientDni) {
    const dniClean = sanitizeForPdf(`DNI: ${patientDni}`);
    drawText(dniClean, margin + 12, patientInfoY, helvetica, 9, mutedText);
    patientInfoY -= 12;
  }
  if (patientDob) {
    const dobClean = sanitizeForPdf(`Fecha de nacimiento: ${patientDob}`);
    drawText(dobClean, margin + 12, patientInfoY, helvetica, 9, mutedText);
  }

  y -= 72;

  const bodyText = (() => {
    const doctorName = doctor?.name ? sanitizeForPdf(doctor.name) : "el/la profesional firmante";
    let text = `El/la suscripto/a, ${doctorName}`;
    if (doctor?.matricula) text += `, Mat. ${sanitizeForPdf(doctor.matricula)}`;
    if (doctor?.especialidad) text += `, ${sanitizeForPdf(doctor.especialidad)}`;
    text += `, certifica que el/la paciente ${patientName} ha sido atendido/a en consulta medica con fecha ${date}.`;
    return text;
  })();

  const bodyLines = wrapText(bodyText, contentWidth, helvetica, 11);
  for (const line of bodyLines) {
    drawText(line, margin, y, helvetica, 11, darkText);
    y -= 17;
  }

  y -= 10;

  if (daysOff && daysOff > 0) {
    page.drawRectangle({
      x: margin,
      y: y - 48,
      width: contentWidth,
      height: 48,
      color: rgb(0.9, 0.94, 0.99),
      borderColor: primaryColor,
      borderWidth: 0.8,
    });

    const daysText = daysOff === 1
      ? sanitizeForPdf(`Por tal motivo, se indica reposo domiciliario por 1 (un) dia a partir de la fecha indicada.`)
      : sanitizeForPdf(`Por tal motivo, se indica reposo domiciliario por ${daysOff} (${daysOff}) dias a partir de la fecha indicada.`);

    const daysLines = wrapText(daysText, contentWidth - 24, helvetica, 10);
    let daysY = y - 16;
    for (const line of daysLines) {
      drawText(line, margin + 12, daysY, helvetica, 10, primaryColor);
      daysY -= 14;
    }

    y -= 66;
  }

  if (diagnosis) {
    y -= 4;
    const diagClean = sanitizeForPdf(diagnosis.replace(/[^\x00-\xFF]/g, " "));
    drawText("Diagnostico:", margin, y, helveticaBold, 10, darkText);
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
    drawText("Observaciones:", margin, y, helveticaBold, 10, darkText);
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
    "Este certificado fue emitido a pedido del/la interesado/a para ser presentado ante quien corresponda.",
    margin,
    y,
    helvetica,
    7.5,
    mutedText
  );

  if (doctor) {
    const sigBoxWidth = 180;
    const sigBoxX = pageWidth - margin - sigBoxWidth;
    const sigImgHeight = 50;
    const sigImgWidth = sigBoxWidth - 16;

    let infoY = sigBlockY - 8;

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
        color: darkText,
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
        color: mutedText,
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
        color: mutedText,
      });
      infoY -= 10;
    }
  }

  const certBytes = await pdfDoc.save();
  return certBytes;
}
