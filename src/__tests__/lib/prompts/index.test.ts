import { getSpecialtyPrompt } from '@/lib/prompts/index';

// ─── Individual specialty modules ────────────────────────────────────────────
import { PROMPT as alergologia } from '@/lib/prompts/specialties/alergologia';
import { PROMPT as anatomiaPatologica } from '@/lib/prompts/specialties/anatomia-patologica';
import { PROMPT as anestesiologiaYReanimacion } from '@/lib/prompts/specialties/anestesiologia-y-reanimacion';
import { PROMPT as angiologiaYCirugiaVascular } from '@/lib/prompts/specialties/angiologia-y-cirugia-vascular';
import { PROMPT as bioquimicaClinica } from '@/lib/prompts/specialties/bioquimica-clinica';
import { PROMPT as cardiologia } from '@/lib/prompts/specialties/cardiologia';
import { PROMPT as cirugiaCardiovascular } from '@/lib/prompts/specialties/cirugia-cardiovascular';
import { PROMPT as cirugiaGeneralYDelAparatoDigestivo } from '@/lib/prompts/specialties/cirugia-general-y-del-aparato-digestivo';
import { PROMPT as cirugiaOralYMaxilofacial } from '@/lib/prompts/specialties/cirugia-oral-y-maxilofacial';
import { PROMPT as cirugiaOrtopedicaYTraumatologia } from '@/lib/prompts/specialties/cirugia-ortopedica-y-traumatologia';
import { PROMPT as cirugiaPediatrica } from '@/lib/prompts/specialties/cirugia-pediatrica';
import { PROMPT as cirugiaPlasticaEsteticaYReparadora } from '@/lib/prompts/specialties/cirugia-plastica-estetica-y-reparadora';
import { PROMPT as cirugiaToracica } from '@/lib/prompts/specialties/cirugia-toracica';
import { PROMPT as dermatologiaMedicoQuirurgicaYVenereologia } from '@/lib/prompts/specialties/dermatologia-medico-quirurgica-y-venereologia';
import { PROMPT as dermatologia } from '@/lib/prompts/specialties/dermatologia';
import { PROMPT as endocrinologiaYNutricion } from '@/lib/prompts/specialties/endocrinologia-y-nutricion';
import { PROMPT as farmacologiaClinica } from '@/lib/prompts/specialties/farmacologia-clinica';
import { PROMPT as geriatria } from '@/lib/prompts/specialties/geriatria';
import { PROMPT as hematologiaYHemoterapia } from '@/lib/prompts/specialties/hematologia-y-hemoterapia';
import { PROMPT as hidrologiaMedica } from '@/lib/prompts/specialties/hidrologia-medica';
import { PROMPT as infectologia } from '@/lib/prompts/specialties/infectologia';
import { PROMPT as inmunologia } from '@/lib/prompts/specialties/inmunologia';
import { PROMPT as medicinaAeroespacialMedicinaAeronautica } from '@/lib/prompts/specialties/medicina-aeroespacial-medicina-aeronautica';
import { PROMPT as medicinaCriticaIntensiva } from '@/lib/prompts/specialties/medicina-critica-intensiva';
import { PROMPT as medicinaDelDeporteMedicinaFisicaYRehabilitacion } from '@/lib/prompts/specialties/medicina-del-deporte-medicina-fisica-y-rehabilitacion';
import { PROMPT as medicinaDelTrabajo } from '@/lib/prompts/specialties/medicina-del-trabajo';
import { PROMPT as medicinaFamiliarYComunitaria } from '@/lib/prompts/specialties/medicina-familiar-y-comunitaria';
import { PROMPT as medicinaInterna } from '@/lib/prompts/specialties/medicina-interna';
import { PROMPT as medicinaLegalYForense } from '@/lib/prompts/specialties/medicina-legal-y-forense';
import { PROMPT as medicinaNuclear } from '@/lib/prompts/specialties/medicina-nuclear';
import { PROMPT as medicinaPaliativa } from '@/lib/prompts/specialties/medicina-paliativa';
import { PROMPT as medicinaPreventivaYSaludPublica } from '@/lib/prompts/specialties/medicina-preventiva-y-salud-publica';
import { PROMPT as medicinaTransfusionalYHemoterapia } from '@/lib/prompts/specialties/medicina-transfusional-y-hemoterapia';
import { PROMPT as microbiologiaYParasitologia } from '@/lib/prompts/specialties/microbiologia-y-parasitologia';
import { PROMPT as nefrologia } from '@/lib/prompts/specialties/nefrologia';
import { PROMPT as neumologia } from '@/lib/prompts/specialties/neumologia';
import { PROMPT as neurocirugia } from '@/lib/prompts/specialties/neurocirugia';
import { PROMPT as neurofisiologiaClinica } from '@/lib/prompts/specialties/neurofisiologia-clinica';
import { PROMPT as neurologia } from '@/lib/prompts/specialties/neurologia';
import { PROMPT as obstetriciaYGinecologia } from '@/lib/prompts/specialties/obstetricia-y-ginecologia';
import { PROMPT as oftalmologia } from '@/lib/prompts/specialties/oftalmologia';
import { PROMPT as oncologiaMedica } from '@/lib/prompts/specialties/oncologia-medica';
import { PROMPT as otorrinolaringologia } from '@/lib/prompts/specialties/otorrinolaringologia';
import { PROMPT as pediatria } from '@/lib/prompts/specialties/pediatria';
import { PROMPT as psiquiatria } from '@/lib/prompts/specialties/psiquiatria';
import { PROMPT as radiodiagnostico } from '@/lib/prompts/specialties/radiodiagnostico';
import { PROMPT as reumatologia } from '@/lib/prompts/specialties/reumatologia';
import { PROMPT as urologia } from '@/lib/prompts/specialties/urologia';

// ─── Specialty prompt map (mirrors SPECIALTY_PROMPTS in index.ts) ─────────────
const SPECIALTY_MAP: Record<string, string> = {
  'Alergología': alergologia,
  'Anatomía patológica': anatomiaPatologica,
  'Anestesiología y reanimación': anestesiologiaYReanimacion,
  'Angiología y cirugía vascular': angiologiaYCirugiaVascular,
  'Bioquímica clínica': bioquimicaClinica,
  'Cardiología': cardiologia,
  'Cirugía cardiovascular': cirugiaCardiovascular,
  'Cirugía general y del aparato digestivo': cirugiaGeneralYDelAparatoDigestivo,
  'Cirugía oral y maxilofacial': cirugiaOralYMaxilofacial,
  'Cirugía ortopédica y traumatología': cirugiaOrtopedicaYTraumatologia,
  'Cirugía pediátrica': cirugiaPediatrica,
  'Cirugía plástica, estética y reparadora': cirugiaPlasticaEsteticaYReparadora,
  'Cirugía torácica': cirugiaToracica,
  'Dermatología médico-quirúrgica y venereología': dermatologiaMedicoQuirurgicaYVenereologia,
  'Dermatología': dermatologia,
  'Endocrinología y nutrición': endocrinologiaYNutricion,
  'Farmacología clínica': farmacologiaClinica,
  'Geriatría': geriatria,
  'Hematología y hemoterapia': hematologiaYHemoterapia,
  'Hidrología médica': hidrologiaMedica,
  'Infectología': infectologia,
  'Inmunología': inmunologia,
  'Medicina aeroespacial / medicina aeronáutica': medicinaAeroespacialMedicinaAeronautica,
  'Medicina crítica / intensiva': medicinaCriticaIntensiva,
  'Medicina del deporte / medicina física y rehabilitación': medicinaDelDeporteMedicinaFisicaYRehabilitacion,
  'Medicina del trabajo': medicinaDelTrabajo,
  'Medicina familiar y comunitaria': medicinaFamiliarYComunitaria,
  'Medicina interna': medicinaInterna,
  'Medicina legal y forense': medicinaLegalYForense,
  'Medicina nuclear': medicinaNuclear,
  'Medicina paliativa': medicinaPaliativa,
  'Medicina preventiva y salud pública': medicinaPreventivaYSaludPublica,
  'Medicina transfusional y hemoterapia': medicinaTransfusionalYHemoterapia,
  'Microbiología y parasitología': microbiologiaYParasitologia,
  'Nefrología': nefrologia,
  'Neumología': neumologia,
  'Neurocirugía': neurocirugia,
  'Neurofisiología clínica': neurofisiologiaClinica,
  'Neurología': neurologia,
  'Obstetricia y ginecología': obstetriciaYGinecologia,
  'Oftalmología': oftalmologia,
  'Oncología médica': oncologiaMedica,
  'Otorrinolaringología': otorrinolaringologia,
  'Pediatría': pediatria,
  'Psiquiatría': psiquiatria,
  'Radiodiagnóstico': radiodiagnostico,
  'Reumatología': reumatologia,
  'Urología': urologia,
};

// ─── Specialty module shape ───────────────────────────────────────────────────

describe('Specialty prompt modules', () => {
  describe.each(Object.entries(SPECIALTY_MAP))(
    '%s',
    (specialtyName, prompt) => {
      it('exports PROMPT as a non-empty string', () => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });

      it('PROMPT contains medical content (Spanish text)', () => {
        // Every specialty file contains at least one Spanish medical term
        expect(prompt).toMatch(/médic|diagnós|tratamiento|paciente|clínic|especialista/i);
      });
    }
  );
});

// ─── getSpecialtyPrompt (index.ts) ────────────────────────────────────────────

describe('getSpecialtyPrompt', () => {
  describe('returns the specialty-specific prompt for known specialties', () => {
    it.each(Object.entries(SPECIALTY_MAP))(
      '%s → returns the correct prompt',
      (specialtyName, expectedPrompt) => {
        expect(getSpecialtyPrompt(specialtyName)).toBe(expectedPrompt);
      }
    );
  });

  describe('fallback to DEFAULT_PROMPT', () => {
    it('returns DEFAULT_PROMPT when called with null', () => {
      const result = getSpecialtyPrompt(null);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // The default prompt is the generic SOAP-format medical prompt
      expect(result).toContain('FORMATO DE SALIDA');
    });

    it('returns DEFAULT_PROMPT when called with undefined', () => {
      const result = getSpecialtyPrompt(undefined);
      expect(typeof result).toBe('string');
      expect(result).toContain('FORMATO DE SALIDA');
    });

    it('returns DEFAULT_PROMPT when called with an empty string', () => {
      const result = getSpecialtyPrompt('');
      expect(typeof result).toBe('string');
      expect(result).toContain('FORMATO DE SALIDA');
    });

    it('returns DEFAULT_PROMPT when called with an unknown specialty', () => {
      const result = getSpecialtyPrompt('Especialidad desconocida XYZ');
      expect(typeof result).toBe('string');
      expect(result).toContain('FORMATO DE SALIDA');
    });

    it('fallback prompt is the same object for all unknown inputs', () => {
      const a = getSpecialtyPrompt(null);
      const b = getSpecialtyPrompt(undefined);
      const c = getSpecialtyPrompt('');
      const d = getSpecialtyPrompt('Unknown');
      expect(a).toBe(b);
      expect(b).toBe(c);
      expect(c).toBe(d);
    });
  });

  describe('DEFAULT_PROMPT content', () => {
    const defaultPrompt = getSpecialtyPrompt(null);

    it('includes rules section', () => {
      expect(defaultPrompt).toContain('REGLAS');
    });

    it('includes output format section', () => {
      expect(defaultPrompt).toContain('FORMATO DE SALIDA');
    });

    it('includes the "No registrado" restriction', () => {
      expect(defaultPrompt).toContain('No registrado');
    });

    it('includes CIE-10 reference', () => {
      expect(defaultPrompt).toContain('CIE-10');
    });
  });
});
