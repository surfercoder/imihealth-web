import sharp from "sharp";
import { FONT_FAMILY } from "./fontconfig";
import { buildLogoHeaderSvg } from "./logo";
import { escapeXml, wrapLines, DoctorImageInfo } from "./text-utils";

interface InformeImageOptions {
  patientName: string;
  patientPhone: string | null;
  date: string;
  content: string;
  doctor?: DoctorImageInfo | null;
}

export async function generateInformeImage({
  patientName,
  patientPhone,
  date,
  content,
  doctor,
}: InformeImageOptions): Promise<Buffer> {
  const width = 800;
  const margin = 50;
  const contentWidth = width - margin * 2;
  const maxChars = 85;
  const lineHeight = 18;
  const fontSize = 13;
  const headerH = 80;
  const patientBoxH = 60;

  const lines = wrapLines(content, maxChars);

  // Calculate dynamic height
  let y = headerH + patientBoxH + 30;
  for (const line of lines) {
    if (!line.text) {
      y += 8;
    } else {
      if (line.isHeader) y += 8;
      y += lineHeight;
    }
  }

  const consentH = 70;

  // Build text elements
  y = headerH + patientBoxH + 30;
  const textEls: string[] = [];

  for (const line of lines) {
    if (!line.text) {
      y += 8;
      continue;
    }
    if (line.isHeader) y += 8;
    const weight = line.isHeader ? ' font-weight="bold"' : "";
    textEls.push(
      `<text x="${margin}" y="${y}" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="#333"${weight}>${escapeXml(line.text)}</text>`
    );
    y += lineHeight;
  }

  y += 20;
  const consentY = y;

  // Doctor signature block (centered like a rubber stamp, matching PDF layout)
  const sigBoxWidth = 190;
  const sigBoxCenterX = width - margin - sigBoxWidth / 2;
  const doctorEls: string[] = [];
  let sigH = 0;
  if (doctor) {
    let offset = 0;
    if (doctor.firmaDigital) {
      const sigData = doctor.firmaDigital.includes(",")
        ? doctor.firmaDigital
        : `data:image/png;base64,${doctor.firmaDigital}`;
      doctorEls.push(
        `<image x="${sigBoxCenterX - 50}" y="${consentY + consentH + 20 + offset}" width="100" height="50" href="${sigData}" preserveAspectRatio="xMidYMid meet"/>`
      );
      offset += 56;
    }
    if (doctor.name) {
      doctorEls.push(
        `<text x="${sigBoxCenterX}" y="${consentY + consentH + 20 + offset}" font-family="${FONT_FAMILY}" font-size="12" fill="#222" font-weight="bold" text-anchor="middle">${escapeXml(doctor.name)}</text>`
      );
      offset += 16;
    }
    if (doctor.especialidad) {
      doctorEls.push(
        `<text x="${sigBoxCenterX}" y="${consentY + consentH + 20 + offset}" font-family="${FONT_FAMILY}" font-size="10" fill="#666" text-anchor="middle">${escapeXml(doctor.especialidad)}</text>`
      );
      offset += 14;
    }
    if (doctor.matricula) {
      doctorEls.push(
        `<text x="${sigBoxCenterX}" y="${consentY + consentH + 20 + offset}" font-family="${FONT_FAMILY}" font-size="10" fill="#666" text-anchor="middle">Mat. ${escapeXml(doctor.matricula)}</text>`
      );
      offset += 14;
    }
    sigH = offset;
  }

  const doctorBlockH = doctor ? sigH + 20 : 0;
  const footerH = 60;
  const height = Math.max(consentY + consentH + doctorBlockH + footerH + 10, 600);

  const logoHeader = await buildLogoHeaderSvg({ width, headerH, margin, subtitle: "Informe Medico", date });

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="100%" height="100%" fill="white"/>
  ${logoHeader}
  <rect x="${margin}" y="${headerH + 10}" width="${contentWidth}" height="${patientBoxH}" fill="#F2F2F5" stroke="#DDDDE0" stroke-width="1" rx="4"/>
  <text x="${margin + 12}" y="${headerH + 30}" font-family="${FONT_FAMILY}" font-size="10" fill="#666">Paciente:</text>
  <text x="${margin + 12}" y="${headerH + 46}" font-family="${FONT_FAMILY}" font-size="14" fill="#141420" font-weight="bold">${escapeXml(patientName)}</text>
  <text x="${margin + 12}" y="${headerH + 60}" font-family="${FONT_FAMILY}" font-size="9" fill="#888">Tel: ${escapeXml(patientPhone || "")}</text>
  ${textEls.join("\n  ")}
  <rect x="${margin}" y="${consentY}" width="${contentWidth}" height="${consentH}" fill="#EBF5F4" stroke="#38998F" stroke-width="0.8" rx="4"/>
  <text x="${margin + 10}" y="${consentY + 16}" font-family="${FONT_FAMILY}" font-size="10" fill="#38998F" font-weight="bold">Consentimiento informado</text>
  <text x="${margin + 10}" y="${consentY + 32}" font-family="${FONT_FAMILY}" font-size="8" fill="#333">${escapeXml(`El/la paciente ${patientName} ha sido informado/a previamente sobre el uso del sistema IMI Health`)}</text>
  <text x="${margin + 10}" y="${consentY + 44}" font-family="${FONT_FAMILY}" font-size="8" fill="#333">y ha prestado su consentimiento para el registro y procesamiento de la consulta medica.</text>
  <text x="${margin + 10}" y="${consentY + 58}" font-family="${FONT_FAMILY}" font-size="8" fill="#666">Fecha de consulta: ${escapeXml(date)}</text>
  <line x1="${margin}" y1="${height - 50}" x2="${width - margin}" y2="${height - 50}" stroke="#CCC" stroke-width="0.5"/>
  <text x="${margin}" y="${height - 35}" font-family="${FONT_FAMILY}" font-size="8" fill="#999">Este informe fue generado automaticamente por IMI Health.</text>
  <text x="${margin}" y="${height - 23}" font-family="${FONT_FAMILY}" font-size="8" fill="#999">Ante cualquier duda, consulte a su medico.</text>
  ${doctorEls.join("\n  ")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
