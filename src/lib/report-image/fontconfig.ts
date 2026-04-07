import fs from "fs";
import path from "path";

// Configure fontconfig so sharp/librsvg can find our bundled Inter font.
// sharp does NOT support embedded SVG @font-face — it relies on fontconfig.
export function setupFontconfig(): void {
  const fontconfDir = "/tmp/fontconfig";

  // Only set up once
  if (process.env.FONTCONFIG_PATH === fontconfDir) return;

  const fontsDir = path.join(process.cwd(), "public", "assets", "fonts");

  const confContent = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>/tmp/fontconfig-cache</cachedir>
</fontconfig>`;

  try {
    if (!fs.existsSync(fontconfDir)) {
      fs.mkdirSync(fontconfDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fontconfDir, "fonts.conf"), confContent);
    process.env.FONTCONFIG_PATH = fontconfDir;
  } catch (err) {
    console.warn("[report-image] Failed to set up fontconfig:", err);
  }
}

// Font family for SVG text elements — fontconfig resolves "Inter" to the bundled .ttf files.
export const FONT_FAMILY = "Inter,Arial,Helvetica,sans-serif";
