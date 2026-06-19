import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { maxAttachmentBytes } from '@/lib/plans';
import { sanitizeFileName } from '@/lib/url-security';
import { getTaskWorkspaceId } from '@/lib/task-workspace';

export async function POST(
  request: Request,
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const maxBytes = maxAttachmentBytes(profile?.plan || 'free');
    if (maxBytes === 0) {
      return NextResponse.json(
        { error: 'Gli allegati richiedono il piano Pro o Business.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 });
    }

    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File troppo grande. Max ${Math.round(maxBytes / 1024 / 1024)} MB.` },
        { status: 400 }
      );
    }

    const taskWorkspaceId = await getTaskWorkspaceId(supabase, params.id);
    if (!taskWorkspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    const safeName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${params.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: params.id,
        uploaded_by: user.id,
        file_name: safeName,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore upload' },
      { status: 500 }
    );
  }
}
