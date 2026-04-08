jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } }));
});
jest.mock("@/lib/transcribe", () => ({ transcribeAudio: jest.fn() }));

import {
  extractTextFromContent,
  parseDoctorResponse,
  parsePatientResponse,
  resolveTranscript,
} from "@/app/api/process-informe/helpers";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { transcribeAudio } = require("@/lib/transcribe") as {
  transcribeAudio: jest.Mock;
};

function makeBlob(data = new Uint8Array([1, 2, 3, 4])): Blob {
  return {
    size: data.byteLength,
    type: "audio/webm",
    arrayBuffer: async () => data.buffer,
  } as unknown as Blob;
}

describe("resolveTranscript", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns browser transcript when audioFile is null", async () => {
    const result = await resolveTranscript(null, "browser said this", "es");
    expect(result).toEqual({ transcript: "browser said this", assemblyAISucceeded: false });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("returns browser transcript when audioFile.size is 0", async () => {
    const empty = { size: 0, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as Blob;
    const result = await resolveTranscript(empty, "browser fallback", "es");
    expect(result).toEqual({ transcript: "browser fallback", assemblyAISucceeded: false });
  });

  it("returns AssemblyAI transcript when transcription succeeds", async () => {
    transcribeAudio.mockResolvedValueOnce({ text: "from assembly", utterances: null });
    const result = await resolveTranscript(makeBlob(), "browser said this", "es");
    expect(result).toEqual({ transcript: "from assembly", assemblyAISucceeded: true });
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), "es");
  });

  it("uses 'en' lang code when language is en", async () => {
    transcribeAudio.mockResolvedValueOnce({ text: "english out", utterances: null });
    await resolveTranscript(makeBlob(), "browser", "en");
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), "en");
  });

  it("falls back to browser transcript when AssemblyAI returns empty", async () => {
    transcribeAudio.mockResolvedValueOnce({ text: "  ", utterances: null });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = await resolveTranscript(makeBlob(), "browser fallback", "es");
    expect(result).toEqual({ transcript: "browser fallback", assemblyAISucceeded: false });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("falls back to browser transcript when AssemblyAI throws", async () => {
    transcribeAudio.mockRejectedValueOnce(new Error("boom"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = await resolveTranscript(makeBlob(), "browser fallback", "es");
    expect(result).toEqual({ transcript: "browser fallback", assemblyAISucceeded: false });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("parseDoctorResponse", () => {
  it("parses a valid JSON wrapper response", () => {
    const text = JSON.stringify({
      valid_medical_content: true,
      informe_doctor: "**S**\nMotivo: dolor",
    });
    expect(parseDoctorResponse(text)).toEqual({
      informeDoctor: "**S**\nMotivo: dolor",
      validMedicalContent: true,
    });
  });

  it("returns validMedicalContent=false when flagged", () => {
    const text = JSON.stringify({ valid_medical_content: false, informe_doctor: "" });
    const result = parseDoctorResponse(text);
    expect(result.validMedicalContent).toBe(false);
    expect(result.informeDoctor).toBe("");
  });

  it("renders structured clinical JSON to markdown when wrapper missing", () => {
    const text = JSON.stringify({
      datos_del_encuentro: { tipo: "Control" },
      objetivo: {
        motivo: "tos",
        sintomas: ["fiebre", "tos"],
        // nested object with multiple keys → its rendered form contains "\n",
        // exercising the multiline branch in renderValueAsMarkdown.
        antecedentes: { personales: "ninguno", familiares: "asma" },
      },
      plan: [{ accion: "reposo" }, { accion: "líquidos" }],
      empty_field: null,
    });
    const result = parseDoctorResponse(text);
    expect(result.informeDoctor).toContain("DATOS DEL ENCUENTRO");
    expect(result.informeDoctor).toContain("OBJETIVO");
    expect(result.informeDoctor).toContain("fiebre, tos");
    expect(result.informeDoctor).toContain("Accion");
    expect(result.informeDoctor).toContain("Antecedentes");
    expect(result.informeDoctor).toContain("Personales");
    expect(result.informeDoctor).toContain("Familiares");
  });

  it("coerces number/boolean informe_doctor to string", () => {
    const text = JSON.stringify({ valid_medical_content: true, informe_doctor: 123 });
    expect(parseDoctorResponse(text).informeDoctor).toBe("123");
  });

  it("returns empty array values inline as empty markdown", () => {
    // exercises the items.length === 0 branch and the !rendered.trim() continue branch
    const text = JSON.stringify({
      objetivo: {
        sintomas: [],
        notas: "",
        motivo: "Dolor abdominal",
      },
    });
    const result = parseDoctorResponse(text);
    expect(result.informeDoctor).toContain("Motivo");
    expect(result.informeDoctor).toContain("Dolor abdominal");
    // Empty array & empty string fields should not produce labels
    expect(result.informeDoctor).not.toContain("Sintomas");
    expect(result.informeDoctor).not.toContain("Notas");
  });

  it("renders an array informe_doctor as a bulleted markdown list", () => {
    // Exercises Array.isArray branch in renderObjectAsMarkdown.
    const text = JSON.stringify({
      valid_medical_content: true,
      informe_doctor: [{ paso: "uno" }, { paso: "dos" }],
    });
    const result = parseDoctorResponse(text);
    expect(result.informeDoctor).toContain("uno");
    expect(result.informeDoctor).toContain("dos");
  });

  it("renders numeric and boolean values inside structured clinical JSON", () => {
    const text = JSON.stringify({
      objetivo: {
        edad: 45,
        fumador: true,
      },
    });
    const result = parseDoctorResponse(text);
    expect(result.informeDoctor).toContain("45");
    expect(result.informeDoctor).toContain("true");
  });

  it("coerces null informe_doctor to empty string", () => {
    const text = JSON.stringify({ valid_medical_content: true, informe_doctor: null });
    expect(parseDoctorResponse(text).informeDoctor).toBe("");
  });

  it("renders an object informe_doctor as markdown", () => {
    const text = JSON.stringify({
      valid_medical_content: true,
      informe_doctor: { objetivo: "TA 120/80", evaluacion: "estable" },
    });
    const result = parseDoctorResponse(text);
    expect(result.informeDoctor).toContain("OBJETIVO");
    expect(result.informeDoctor).toContain("TA 120/80");
  });

  it("falls back to extractJsonStringField when JSON is truncated", () => {
    // Truncated JSON with informe_doctor field still extractable
    const text =
      '{"valid_medical_content": true, "informe_doctor": "Line one\\nLine two with \\"quote\\" and \\\\backslash and \\t tab and \\r return and \\/ slash and \\u00e9 unicode';
    const result = parseDoctorResponse(text);
    expect(result.informeDoctor).toContain("Line one");
    expect(result.informeDoctor).toContain("Line two");
    expect(result.informeDoctor).toContain('"quote"');
    expect(result.validMedicalContent).toBe(true);
  });

  it("extractJsonStringField terminates on closing quote (break path)", () => {
    // Closed string but malformed surrounding JSON forces fallback path
    const text =
      'PREAMBLE {"valid_medical_content": true, "informe_doctor": "Closed string content"} TRAILER';
    // This is actually parseable, so use a clearly broken outer structure
    const broken =
      '{"valid_medical_content": true, "informe_doctor": "fully closed value", BROKEN}}}';
    const result = parseDoctorResponse(broken);
    expect(result.informeDoctor).toBe("fully closed value");
    // sanity for the well-formed text variant
    expect(parseDoctorResponse(text).informeDoctor).toContain("Closed string content");
  });

  it("flags valid_medical_content=false in fallback path", () => {
    const text =
      '{"valid_medical_content": false, "informe_doctor": "partial content here that is long enough';
    const result = parseDoctorResponse(text);
    expect(result.validMedicalContent).toBe(false);
    expect(result.informeDoctor).toContain("partial content here");
  });

  it("returns plain text when not JSON and long enough", () => {
    const plain =
      "Paciente de 45 años que consulta por cefalea de 3 días de evolución. Examen físico sin alteraciones.";
    expect(parseDoctorResponse(plain).informeDoctor).toBe(plain);
  });

  it("returns empty informe when extraction fails and text is short", () => {
    expect(parseDoctorResponse("nope").informeDoctor).toBe("");
  });
});

describe("parsePatientResponse", () => {
  it("parses a valid JSON wrapper response", () => {
    const text = JSON.stringify({ informe_paciente: "Hola paciente" });
    expect(parsePatientResponse(text)).toBe("Hola paciente");
  });

  it("falls back to extractJsonStringField on truncated JSON", () => {
    const text = '{"informe_paciente": "Truncated patient text without closing';
    expect(parsePatientResponse(text)).toContain("Truncated patient text");
  });

  it("returns plain text when not JSON and long enough", () => {
    const plain =
      "Estimado paciente, este es un informe de su consulta médica con suficiente texto para pasar.";
    expect(parsePatientResponse(plain)).toBe(plain);
  });

  it("returns empty when nothing extractable", () => {
    expect(parsePatientResponse("oops")).toBe("");
  });
});

describe("extractTextFromContent", () => {
  it("returns text when content[0].type is text and text is defined", () => {
    expect(
      extractTextFromContent({
        content: [{ type: "text", text: "hello" }],
      }),
    ).toBe("hello");
  });

  it('returns "{}" when content[0].type is text but text is undefined', () => {
    expect(
      extractTextFromContent({
        content: [{ type: "text" }],
      }),
    ).toBe("{}");
  });

  it('returns "{}" when content[0].type is not text', () => {
    expect(
      extractTextFromContent({
        content: [{ type: "image", text: "ignored" }],
      }),
    ).toBe("{}");
  });
});
