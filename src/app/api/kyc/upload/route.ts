import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

// Using supabaseServer (service role) for server-side uploads
const supabase = supabaseServer;

// Zod schema for validating multipart/form-data fields
const UploadSchema = z.object({
  // The file field name expected from the client
  file: z.instanceof(File),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type and size (example: max 10MB, allow PDF/JPG/PNG)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File exceeds size limit of 10MB' }, { status: 400 });
    }

    // Assume authenticated user via Supabase auth; retrieve user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? 'anonymous';
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}_${file.name}`;

    // Upload to Supabase storage bucket 'kyc-uploads'
    const { data, error } = await supabase.storage
      .from('kyc-uploads')
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Return public URL (or signed URL for private bucket)
    const { data: publicUrlData } = supabase.storage
      .from('kyc-uploads')
      .getPublicUrl(filePath);

    return NextResponse.json({
      message: 'File uploaded successfully',
      path: data.path,
      publicUrl: publicUrlData?.publicUrl,
    });
  } catch (e) {
    console.error('Unexpected error in KYC upload:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
