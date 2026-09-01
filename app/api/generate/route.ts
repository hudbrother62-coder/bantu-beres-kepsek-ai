import { createHash } from 'node:crypto';
import { z } from 'zod';
import { generateDocumentWithFallback } from '@/lib/ai';
import { getDocumentDefinition } from '@/lib/document-catalog';
import { documentSystemInstruction, buildDocumentPrompt } from '@/lib/prompts';
import { createClient } from '@/lib/supabase/server';
import type {
  KepsekGenerationGroup,
  KepsekProfile,
  KepsekSchool,
} from '@/lib/types';

export const maxDuration = 120;

const requestSchema = z
  .object({
    documentType: z.string().max(50).optional(),
    groupId: z.uuid().optional(),
    additionalInstruction: z.string().trim().max(3000).default(''),
    sourceText: z.string().max(24_000).default(''),
    sourceName: z.string().trim().max(220).default(''),
  })
  .refine((value) => Boolean(value.groupId || value.documentType), {
    message: 'Jenis dokumen atau grup regenerasi wajib dipilih.',
  });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null;
  if (claimsError || !userId) {
    return Response.json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 });
  }

  let payload: z.infer<typeof requestSchema>;
  try {
    payload = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: 'Permintaan generator belum valid.' }, { status: 400 });
  }

  const [schoolResult, profileResult] = await Promise.all([
    supabase.from('kepsek_schools').select('*').eq('owner_user_id', userId).single(),
    supabase.from('kepsek_profiles').select('*').eq('user_id', userId).single(),
  ]);
  if (schoolResult.error || profileResult.error || !schoolResult.data || !profileResult.data) {
    return Response.json({ error: 'Lengkapi profil sekolah sebelum membuat dokumen.' }, { status: 422 });
  }

  const school = schoolResult.data as KepsekSchool;
  const profile = profileResult.data as KepsekProfile;
  let group: KepsekGenerationGroup | null = null;
  let documentType = payload.documentType || '';
  let additionalInstruction = payload.additionalInstruction;
  let sourceText = payload.sourceText;
  let sourceName = payload.sourceName;

  if (payload.groupId) {
    const groupResult = await supabase
      .from('kepsek_generation_groups')
      .select('*')
      .eq('id', payload.groupId)
      .eq('user_id', userId)
      .single();
    if (groupResult.error || !groupResult.data) {
      return Response.json({ error: 'Grup dokumen tidak ditemukan.' }, { status: 404 });
    }
    group = groupResult.data as KepsekGenerationGroup;
    documentType = group.document_type;
    additionalInstruction = group.additional_instruction || '';
    sourceText = typeof group.settings?.source_text === 'string' ? group.settings.source_text : '';
    sourceName = typeof group.settings?.source_name === 'string' ? group.settings.source_name : '';
  }

  if (!getDocumentDefinition(documentType)) {
    return Response.json({ error: 'Jenis dokumen tidak dikenali.' }, { status: 400 });
  }

  const prompt = buildDocumentPrompt({
    documentType,
    school,
    principalName: profile.principal_name,
    additionalInstruction,
    sourceText,
  });
  const promptHash = createHash('sha256').update(prompt).digest('hex');

  if (!group) {
    const insertGroup = await supabase
      .from('kepsek_generation_groups')
      .insert({
        user_id: userId,
        school_id: school.id,
        document_type: documentType,
        additional_instruction: additionalInstruction,
        settings: {
          source_text: sourceText,
          source_name: sourceName,
          generated_from_profile_updated_at: school.updated_at,
        },
        prompt_hash: promptHash,
      })
      .select('*')
      .single();
    if (insertGroup.error || !insertGroup.data) {
      return Response.json({ error: 'Riwayat dokumen belum dapat dibuat.' }, { status: 500 });
    }
    group = insertGroup.data as KepsekGenerationGroup;
  }

  const latestVariant = await supabase
    .from('kepsek_generations')
    .select('variant_number')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .order('variant_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const variantNumber = (latestVariant.data?.variant_number ?? 0) + 1;

  const pending = await supabase
    .from('kepsek_generations')
    .insert({
      group_id: group.id,
      user_id: userId,
      school_id: school.id,
      variant_number: variantNumber,
      status: 'pending',
    })
    .select('id')
    .single();
  if (pending.error || !pending.data) {
    return Response.json({ error: 'Versi dokumen belum dapat disiapkan.' }, { status: 500 });
  }

  try {
    const generated = await generateDocumentWithFallback({
      prompt,
      systemInstruction: documentSystemInstruction,
      documentType,
      school,
      principalName: profile.principal_name,
      additionalInstruction,
    });

    const completion = await supabase
      .from('kepsek_generations')
      .update({
        status: 'completed',
        model: generated.model,
        key_slot: generated.keySlot,
        content: generated.content,
        input_tokens: generated.inputTokens,
        output_tokens: generated.outputTokens,
        completed_at: new Date().toISOString(),
        error_code: null,
      })
      .eq('id', pending.data.id)
      .eq('user_id', userId);
    if (completion.error) throw new Error('Hasil belum dapat disimpan.');

    return Response.json({
      groupId: group.id,
      generationId: pending.data.id,
      variantNumber,
      documentType,
      model: generated.model,
      mode: generated.mode,
      content: generated.content,
    });
  } catch (error) {
    await supabase
      .from('kepsek_generations')
      .update({
        status: 'error',
        error_code: 'GENERATION_FAILED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', pending.data.id)
      .eq('user_id', userId);

    return Response.json(
      { error: error instanceof Error ? error.message : 'Generator belum dapat menyelesaikan dokumen.' },
      { status: 502 },
    );
  }
}
