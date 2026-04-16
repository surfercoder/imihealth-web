import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { FONT_FAMILY } from "./fontconfig";
import { escapeXml } from "./text-utils";

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const logoPath = join(process.cwd(), "public", "assets", "images", "imihealth-logo.webp");
  const webpBuffer = await readFile(logoPath);
  const pngBuffer = await sharp(webpBuffer).png().toBuffer();
  cachedLogoDataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  return cachedLogoDataUri;
}

interface LogoHeaderOptions {
  width: number;
  headerH: number;
  margin: number;
  subtitle: string;
  date: string;
}

export async function buildLogoHeaderSvg({
  width,
  headerH,
  margin,
  subtitle,
  date,
}: LogoHeaderOptions): Promise<string> {
  const logoDataUri = await getLogoDataUri();
  const logoImgWidth = width * 0.45;
  const logoImgHeight = headerH - 20;
  const logoX = (width - logoImgWidth) / 2;
  const subtitleY = headerH - 6;

  return [
    `<image x="${logoX}" y="6" width="${logoImgWidth}" height="${logoImgHeight}" href="${logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`,
    `<text x="${width / 2}" y="${subtitleY}" font-family="${FONT_FAMILY}" font-size="11" fill="#666680" text-anchor="middle">${escapeXml(subtitle)}</text>`,
    `<text x="${width - margin}" y="${subtitleY}" font-family="${FONT_FAMILY}" font-size="9" fill="#666680" text-anchor="end">${escapeXml(date)}</text>`,
  ].join("\n  ");
}
