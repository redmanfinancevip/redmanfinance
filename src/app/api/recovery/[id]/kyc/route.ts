import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest, context: any) {
  try {
    const params = await context.params;
    const id = params?.id as string;
    // Support multipart/form-data uploads
    const form = await req.formData();

    const full_name = form.get('full_name')?.toString() || '';
    const tax_country = form.get('tax_country')?.toString() || '';
    const residential_address = form.get('residential_address')?.toString() || '';
    const code = form.get('code')?.toString() || '';

    const uploadResults: any = {};

    try {
      // Attempt uploads if storage is configured
      if ((supabaseServer as any).storage && typeof (supabaseServer as any).storage.from === 'function') {
        const bucket = 'kyc-uploads';
        const front = form.get('front_id') as any | null;
        const back = form.get('back_id') as any | null;
        const selfie = form.get('selfie') as any | null;

        if (front && front instanceof File) {
          const frontPath = `kyc/${id}/front_${Date.now()}_${front.name}`;
          const { error } = await (supabaseServer as any).storage.from(bucket).upload(frontPath, front);
          if (error) uploadResults.frontError = error;
          else uploadResults.frontPath = frontPath;
        }
        if (back && back instanceof File) {
          const backPath = `kyc/${id}/back_${Date.now()}_${back.name}`;
          const { error } = await (supabaseServer as any).storage.from(bucket).upload(backPath, back);
          if (error) uploadResults.backError = error;
          else uploadResults.backPath = backPath;
        }
        if (selfie && selfie instanceof File) {
          const selfiePath = `kyc/${id}/selfie_${Date.now()}_${selfie.name}`;
          const { error } = await (supabaseServer as any).storage.from(bucket).upload(selfiePath, selfie);
          if (error) uploadResults.selfieError = error;
          else uploadResults.selfiePath = selfiePath;
        }
      }
    } catch (e) {
      console.error('Upload attempt failed:', e);
    }

    const updatePayload: any = {
      status: 'kyc_review',
      kyc_full_name: full_name,
      kyc_tax_country: tax_country,
      kyc_residential_address: residential_address,
      kyc_code: code,
      kyc_files: uploadResults,
    };

    const { data, error } = await supabaseServer
      .from('asset_recoveries')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error('KYC route error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
