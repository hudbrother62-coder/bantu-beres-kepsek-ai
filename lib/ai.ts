import { GoogleGenAI, Type } from '@google/genai';
import { getDocumentDefinition } from '@/lib/document-catalog';
import type { GenerationContent, KepsekSchool } from '@/lib/types';

interface AiResult {
  content: GenerationContent;
  model: string;
  keySlot: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  mode: 'ai' | 'template';
}

function apiKeys() {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ]
    .map((value, index) => ({ value: value?.trim(), slot: index + 1 }))
    .filter((item): item is { value: string; slot: number } => Boolean(item.value));
}

function parseResponse(text: string): GenerationContent {
  const parsed = JSON.parse(text) as Partial<GenerationContent>;
  if (!parsed.title || !parsed.body) throw new Error('Respons AI tidak memiliki isi dokumen.');
  return {
    title: String(parsed.title),
    summary: String(parsed.summary || ''),
    body: String(parsed.body),
    qualityChecks: Array.isArray(parsed.qualityChecks)
      ? parsed.qualityChecks.map(String).slice(0, 12)
      : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 12) : [],
    mode: 'ai',
  };
}

function templateFallback({
  documentType,
  school,
  principalName,
  additionalInstruction,
}: {
  documentType: string;
  school: KepsekSchool;
  principalName: string;
  additionalInstruction: string;
}): AiResult {
  const definition = getDocumentDefinition(documentType);
  if (!definition) throw new Error('Jenis dokumen tidak dikenali.');

  const body = `# ${definition.title}

## Identitas Dokumen

| Komponen | Keterangan |
|---|---|
| Satuan pendidikan | ${school.name} |
| NPSN | ${school.npsn || '[PERLU DILENGKAPI]'} |
| Jenjang/status | ${school.level} / ${school.status} |
| Tahun pelajaran | ${school.academic_year} |
| Kepala sekolah | ${principalName} |

## Latar Belakang

Dokumen ini disusun sebagai draf kerja ${school.name} berdasarkan profil dan prioritas sekolah. Lengkapi bagian yang masih bertanda **[PERLU DILENGKAPI]** sebelum dokumen ditetapkan.

${definition.sections
  .map(
    (section, index) => `## ${index + 1}. ${section}

[PERLU DILENGKAPI berdasarkan data, hasil rapat, dan bukti sekolah.]

### Rencana Operasional

| Sasaran/aktivitas | Indikator | Waktu | Penanggung jawab | Bukti dukung |
|---|---|---|---|---|
| [Isi sasaran] | [Isi indikator terukur] | [Isi waktu] | [Isi PIC] | [Isi bukti] |`,
  )
  .join('\n\n')}

## Instruksi Khusus Kepala Sekolah

${additionalInstruction || 'Tidak ada instruksi tambahan.'}

## Pengesahan

Ditetapkan di: [PERLU DILENGKAPI]  
Tanggal: [PERLU DILENGKAPI]

Kepala Sekolah,  
  
  
${principalName}  
NIP. [PERLU DILENGKAPI]`;

  return {
    content: {
      title: `${definition.shortTitle} — ${school.name}`,
      summary: 'Draf dasar dibuat dengan mesin template karena API Gemini belum dikonfigurasi.',
      body,
      qualityChecks: [
        'Lengkapi seluruh penanda [PERLU DILENGKAPI].',
        'Verifikasi konsistensi data dengan profil sekolah.',
        'Periksa dasar kebijakan sebelum penetapan.',
      ],
      warnings: ['Mode template aktif; hasil belum diperkaya oleh Gemini AI.'],
      mode: 'template',
    },
    model: 'template-engine-v1',
    keySlot: null,
    inputTokens: null,
    outputTokens: null,
    mode: 'template',
  };
}

export async function generateDocumentWithFallback({
  prompt,
  systemInstruction,
  documentType,
  school,
  principalName,
  additionalInstruction,
}: {
  prompt: string;
  systemInstruction: string;
  documentType: string;
  school: KepsekSchool;
  principalName: string;
  additionalInstruction: string;
}): Promise<AiResult> {
  const keys = apiKeys();
  if (keys.length === 0) {
    return templateFallback({ documentType, school, principalName, additionalInstruction });
  }

  const models = Array.from(
    new Set([
      process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.7-flash',
      process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite',
    ]),
  );
  const failures: string[] = [];

  for (const model of models) {
    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key.value });
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.25,
            maxOutputTokens: 16_000,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['title', 'summary', 'body', 'qualityChecks', 'warnings'],
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                body: { type: Type.STRING },
                qualityChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
        });

        if (!response.text) throw new Error('Respons AI kosong.');
        const content = parseResponse(response.text);
        return {
          content,
          model,
          keySlot: key.slot,
          inputTokens: response.usageMetadata?.promptTokenCount ?? null,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
          mode: 'ai',
        };
      } catch (error) {
        failures.push(`${model}/slot-${key.slot}:${error instanceof Error ? error.name : 'error'}`);
      }
    }
  }

  const fallback = templateFallback({ documentType, school, principalName, additionalInstruction });
  fallback.content.warnings.unshift(
    'Gemini tidak dapat dihubungi setelah mencoba seluruh model dan slot kunci; mode template digunakan.',
  );
  if (failures.length === 0) fallback.content.warnings.push('Tidak ada detail kegagalan yang tersedia.');
  return fallback;
}
