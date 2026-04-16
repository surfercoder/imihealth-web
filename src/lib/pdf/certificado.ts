import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { drawDoctorBlock, drawLogoHeader, GenerateCertificadoPDFOptions, pdfColors, sanitizeForPdf, wrapText } from "./helpers";

export async function generateCertificadoPDF({
  patientName, patientDni, patientDob, date, diagnosis, daysOff, observations, doctor,
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
    subtitle: "Certificado Medico",
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

  y -= 84;

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
    const daysText = daysOff === 1
      ? sanitizeForPdf(`Por tal motivo, se indica reposo domiciliario por 1 (un) dia a partir de la fecha indicada.`)
      : sanitizeForPdf(`Por tal motivo, se indica reposo domiciliario por ${daysOff} (${daysOff}) dias a partir de la fecha indicada.`);

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
    await drawDoctorBlock({
      pdfDoc, page, doctor, helvetica, helveticaBold, pageWidth, margin,
      separatorY: sigBlockY, sigBoxWidth: 180, sigImgHeight: 50,
      initialInfoYOffset: -36, nameColor: darkText, mutedColor: mutedText,
    });
  }

  const certBytes = await pdfDoc.save();
  return certBytes;
}
