import sharp from "sharp";
import { FONT_FAMILY } from "./fontconfig";
import { escapeXml, wrapLines, DoctorImageInfo } from "./text-utils";

interface CertificadoImageOptions {
  patientName: string;
  patientDob?: string | null;
  date: string;
  diagnosis?: string | null;
  daysOff?: number | null;
  observations?: string | null;
  doctor?: DoctorImageInfo | null;
}

export async function generateCertificadoImage({
  patientName,
  patientDob,
  date,
  diagnosis,
  daysOff,
  observations,
  doctor,
}: CertificadoImageOptions): Promise<Buffer> {
  const width = 800;
  const margin = 60;
  const contentWidth = width - margin * 2;
  const headerH = 80;

  let y = headerH + 20;

  // Title
  y += 24;

  // Patient box
  y += 10;
  const patientBoxTop = y;
  y += 64 + 20;

  // Body text
  const bodyParts: string[] = [];
  const doctorName = doctor?.name || "el/la profesional firmante";
  let bodyText = `El/la suscripto/a, ${doctorName}`;
  if (doctor?.matricula) bodyText += `, Mat. ${doctor.matricula}`;
  if (doctor?.especialidad) bodyText += `, ${doctor.especialidad}`;
  bodyText += `, certifica que el/la paciente ${patientName} ha sido atendido/a en consulta medica con fecha ${date}.`;

  const bodyLines = wrapLines(bodyText, 80);
  for (const line of bodyLines) {
    bodyParts.push(
      `<text x="${margin}" y="${y}" font-family="${FONT_FAMILY}" font-size="12" fill="#141420">${escapeXml(line.text)}</text>`
    );
    y += 17;
  }
  y += 10;

  // Days off box
  const daysEls: string[] = [];
  if (daysOff && daysOff > 0) {
    const daysText =
      daysOff === 1
        ? `Por tal motivo, se indica reposo domiciliario por 1 (un) dia a partir de la fecha indicada.`
        : `Por tal motivo, se indica reposo domiciliario por ${daysOff} (${daysOff}) dias a partir de la fecha indicada.`;
    const daysLines = wrapLines(daysText, 75);
    const boxH = 16 + daysLines.length * 14 + 14;
    daysEls.push(
      `<rect x="${margin}" y="${y}" width="${contentWidth}" height="${boxH}" fill="#E6EDF7" stroke="#145A9E" stroke-width="0.8" rx="4"/>`
    );
    let daysY = y + 16;
    for (const line of daysLines) {
      daysEls.push(
        `<text x="${margin + 12}" y="${daysY}" font-family="${FONT_FAMILY}" font-size="11" fill="#145A9E">${escapeXml(line.text)}</text>`
      );
      daysY += 14;
    }
    y += boxH + 18;
  }

  // Diagnosis
  const diagEls: string[] = [];
  if (diagnosis) {
    diagEls.push(
      `<text x="${margin}" y="${y}" font-family="${FONT_FAMILY}" font-size="11" fill="#141420" font-weight="bold">Diagnostico:</text>`
    );
    y += 15;
    const diagLines = wrapLines(diagnosis, 80);
    for (const line of diagLines) {
      diagEls.push(
        `<text x="${margin}" y="${y}" font-family="${FONT_FAMILY}" font-size="11" fill="#333">${escapeXml(line.text)}</text>`
      );
      y += 14;
    }
    y += 10;
  }

  // Observations
  const obsEls: string[] = [];
  if (observations) {
    obsEls.push(
      `<text x="${margin}" y="${y}" font-family="${FONT_FAMILY}" font-size="11" fill="#141420" font-weight="bold">Observaciones:</text>`
    );
    y += 15;
    const obsLines = wrapLines(observations, 80);
    for (const line of obsLines) {
      obsEls.push(
        `<text x="${margin}" y="${y}" font-family="${FONT_FAMILY}" font-size="11" fill="#333">${escapeXml(line.text)}</text>`
      );
      y += 14;
    }
    y += 10;
  }

  // Doctor signature block (centered like a rubber stamp, matching PDF layout)
  y += 30;
  const certSigBoxWidth = 190;
  const certSigCenterX = width - margin - certSigBoxWidth / 2;
  const doctorEls: string[] = [];
  let certSigH = 0;
  if (doctor) {
    let offset = 0;
    if (doctor.firmaDigital) {
      const sigData = doctor.firmaDigital.includes(",")
        ? doctor.firmaDigital
        : `data:image/png;base64,${doctor.firmaDigital}`;
      doctorEls.push(
        `<image x="${certSigCenterX - 50}" y="${y + offset}" width="100" height="50" href="${sigData}" preserveAspectRatio="xMidYMid meet"/>`
      );
      offset += 56;
    }
    if (doctor.name) {
      doctorEls.push(
        `<text x="${certSigCenterX}" y="${y + offset}" font-family="${FONT_FAMILY}" font-size="12" fill="#222" font-weight="bold" text-anchor="middle">${escapeXml(doctor.name)}</text>`
      );
      offset += 16;
    }
    if (doctor.especialidad) {
      doctorEls.push(
        `<text x="${certSigCenterX}" y="${y + offset}" font-family="${FONT_FAMILY}" font-size="10" fill="#666" text-anchor="middle">${escapeXml(doctor.especialidad)}</text>`
      );
      offset += 14;
    }
    if (doctor.matricula) {
      doctorEls.push(
        `<text x="${certSigCenterX}" y="${y + offset}" font-family="${FONT_FAMILY}" font-size="10" fill="#666" text-anchor="middle">Mat. ${escapeXml(doctor.matricula)}</text>`
      );
      offset += 14;
    }
    certSigH = offset;
  }

  // Footer
  const certDoctorBlockH = doctor ? certSigH + 20 : 0;
  const height = Math.max(y + certDoctorBlockH + 60, 600);

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="100%" height="100%" fill="white"/>
  <rect x="0" y="0" width="${width}" height="${headerH}" fill="#145A9E"/>
  <text x="${margin}" y="35" font-family="${FONT_FAMILY}" font-size="22" fill="white" font-weight="bold">IMI Health</text>
  <text x="${margin}" y="55" font-family="${FONT_FAMILY}" font-size="11" fill="#D9E6F7">Certificado Medico</text>
  <text x="${width - margin}" y="48" font-family="${FONT_FAMILY}" font-size="10" fill="#D9E6F7" text-anchor="end">${escapeXml(date)}</text>
  <text x="${width / 2}" y="${headerH + 28}" font-family="${FONT_FAMILY}" font-size="18" fill="#145A9E" font-weight="bold" text-anchor="middle">CERTIFICADO MEDICO</text>
  <line x1="${margin + 40}" y1="${headerH + 34}" x2="${width - margin - 40}" y2="${headerH + 34}" stroke="#145A9E" stroke-width="1"/>
  <rect x="${margin}" y="${patientBoxTop}" width="${contentWidth}" height="64" fill="#F2F2F5" stroke="#DDDDE0" stroke-width="1" rx="4"/>
  <text x="${margin + 12}" y="${patientBoxTop + 14}" font-family="${FONT_FAMILY}" font-size="8" fill="#666">DATOS DEL PACIENTE</text>
  <text x="${margin + 12}" y="${patientBoxTop + 30}" font-family="${FONT_FAMILY}" font-size="14" fill="#141420" font-weight="bold">${escapeXml(patientName)}</text>
  ${patientDob ? `<text x="${margin + 12}" y="${patientBoxTop + 46}" font-family="${FONT_FAMILY}" font-size="9" fill="#666">Fecha de nacimiento: ${escapeXml(patientDob)}</text>` : ""}
  ${bodyParts.join("\n  ")}
  ${daysEls.join("\n  ")}
  ${diagEls.join("\n  ")}
  ${obsEls.join("\n  ")}
  <line x1="${margin}" y1="${height - 50}" x2="${width - margin}" y2="${height - 50}" stroke="#CCC" stroke-width="0.5"/>
  <text x="${margin}" y="${height - 35}" font-family="${FONT_FAMILY}" font-size="8" fill="#999">Este certificado fue emitido a pedido del/la interesado/a para ser presentado ante quien corresponda.</text>
  ${doctorEls.join("\n  ")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
