import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .select('file_path, file_name')
      .eq('id', params.id)
      .single();

    if (error || !attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(attachment.file_path, 3600);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: signError?.message || 'URL non generato' }, { status: 400 });
    }

    return NextResponse.json({
      url: signed.signedUrl,
      fileName: attachment.file_name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore download' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .select('file_path, uploaded_by')
      .eq('id', params.id)
      .single();

    if (error || !attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 });
    }

    if (attachment.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 });
    }

    await supabase.storage.from('task-attachments').remove([attachment.file_path]);
    await supabase.from('task_attachments').delete().eq('id', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore eliminazione' },
      { status: 500 }
    );
  }
}
