import sharp from "sharp";
import fs from "fs";
import path from "path";

// Load and base64-encode fonts at module level for embedding in SVGs
const fontsDir = path.join(process.cwd(), "public", "assets", "fonts");
let interRegularB64 = "";
let interBoldB64 = "";
try {
  interRegularB64 = fs.readFileSync(path.join(fontsDir, "Inter-Regular.ttf")).toString("base64");
  interBoldB64 = fs.readFileSync(path.join(fontsDir, "Inter-Bold.ttf")).toString("base64");
} catch {
  // Fonts will be missing only in test environments
}

function fontStyleBlock(): string {
  if (!interRegularB64 || !interBoldB64) return "";
  return `<defs><style type="text/css">
    @font-face {
      font-family: 'Inter';
      font-weight: 400;
      src: url('data:font/truetype;base64,${interRegularB64}') format('truetype');
    }
    @font-face {
      font-family: 'Inter';
      font-weight: 700;
      src: url('data:font/truetype;base64,${interBoldB64}') format('truetype');
    }
  </style></defs>`;
}

const FONT_FAMILY = "Inter,Arial,Helvetica,sans-serif";

function stripEmoji(str: string): string {
  return str.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    ""
  );
}

function escapeXml(str: string): string {
  return stripEmoji(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface WrappedLine {
  text: string;
  isHeader: boolean;
}

function wrapLines(text: string, maxChars: number): WrappedLine[] {
  const rawLines = text.split("\n");
  const result: WrappedLine[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      result.push({ text: "", isHeader: false });
      continue;
    }

    const clean = trimmed
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "");

    const isHeader =
      (clean === clean.toUpperCase() && clean.length > 3) ||
      trimmed.startsWith("#") ||
      /^\*\*[^*]+\*\*:?\s*$/.test(trimmed);

    if (clean.length <= maxChars) {
      result.push({ text: clean, isHeader });
    } else {
      const words = clean.split(" ");
      let current = "";
      let first = true;
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length > maxChars && current) {
          result.push({ text: current, isHeader: first ? isHeader : false });
          current = word;
          first = false;
        } else {
          current = test;
        }
      }
      if (current) result.push({ text: current, isHeader: false });
    }
  }
  return result;
}

// ─── Informe Image ───────────────────────────────────────────────

interface DoctorImageInfo {
  name?: string | null;
  matricula?: string | null;
  especialidad?: string | null;
  firmaDigital?: string | null;
}

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

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${fontStyleBlock()}
  <rect width="100%" height="100%" fill="white"/>
  <rect x="0" y="0" width="${width}" height="${headerH}" fill="#145A9E"/>
  <text x="${margin}" y="35" font-family="${FONT_FAMILY}" font-size="24" fill="white" font-weight="bold">IMI Health</text>
  <text x="${margin}" y="55" font-family="${FONT_FAMILY}" font-size="12" fill="#D9E6F7">Informe Medico</text>
  <text x="${width - margin}" y="48" font-family="${FONT_FAMILY}" font-size="10" fill="#D9E6F7" text-anchor="end">${escapeXml(date)}</text>
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

// ─── Certificado Image ───────────────────────────────────────────

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
  ${fontStyleBlock()}
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
