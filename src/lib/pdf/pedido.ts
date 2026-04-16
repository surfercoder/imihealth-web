import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { drawDoctorBlock, drawLogoHeader, GeneratePedidoPDFOptions, pdfColors, sanitizeForPdf, wrapText } from "./helpers";

export async function generatePedidoPDF({
  patientName, obraSocial, nroAfiliado, plan, date, item, diagnostico, doctor,
}: GeneratePedidoPDFOptions): Promise<Uint8Array> {
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

  const { lightGray, darkText, mutedText } = pdfColors;

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

  // Header
  await drawLogoHeader({
    pdfDoc,
    page,
    pageWidth,
    pageHeight,
    subtitle: "Pedido Medico",
    date,
    font: helvetica,
    margin,
  });

  y = pageHeight - 100;

  y -= 20;

  // Patient data box
  const hasObraSocial = obraSocial || nroAfiliado || plan;
  const boxHeight = hasObraSocial ? 76 : 50;
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: contentWidth,
    height: boxHeight,
    color: lightGray,
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1,
  });

  drawText("DATOS DEL PACIENTE", margin + 12, y - 14, helveticaBold, 8, mutedText);
  drawText(patientName, margin + 12, y - 27, helveticaBold, 13, darkText);

  let infoY = y - 39;
  if (obraSocial) {
    const osClean = sanitizeForPdf(`Obra Social: ${obraSocial}`);
    drawText(osClean, margin + 12, infoY, helvetica, 9, mutedText);
    if (nroAfiliado) {
      const nroClean = sanitizeForPdf(`- Nro. Afiliado: ${nroAfiliado}`);
      const osWidth = helvetica.widthOfTextAtSize(osClean, 9);
      drawText(nroClean, margin + 12 + osWidth + 8, infoY, helvetica, 9, mutedText);
    }
    infoY -= 12;
  } else if (nroAfiliado) {
    const nroClean = sanitizeForPdf(`Nro. Afiliado: ${nroAfiliado}`);
    drawText(nroClean, margin + 12, infoY, helvetica, 9, mutedText);
    infoY -= 12;
  }
  if (plan) {
    const planClean = sanitizeForPdf(`Plan: ${plan}`);
    drawText(planClean, margin + 12, infoY, helvetica, 9, mutedText);
  }

  y -= boxHeight + 20;

  // "Solicito:" label
  drawText("Solicito:", margin, y, helveticaBold, 12, darkText);
  y -= 22;

  // Item content
  const itemClean = sanitizeForPdf(item);
  const itemLines = wrapText(itemClean, contentWidth, helvetica, 11);
  for (const line of itemLines) {
    drawText(line, margin, y, helvetica, 11, darkText);
    y -= 17;
  }

  // Diagnóstico section
  if (diagnostico) {
    y -= 10;

    drawText("Diagnostico:", margin, y, helveticaBold, 12, darkText);
    y -= 22;

    const diagClean = sanitizeForPdf(diagnostico);
    const diagLines = wrapText(diagClean, contentWidth, helvetica, 11);
    for (const line of diagLines) {
      drawText(line, margin, y, helvetica, 11, darkText);
      y -= 17;
    }
  }

  // Separator and footer
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
    "Este pedido fue emitido por el/la profesional firmante.",
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

  return await pdfDoc.save();
}
