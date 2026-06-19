import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('task_custom_fields')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at');

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ fields: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as {
      name?: string;
      field_type?: 'text' | 'number' | 'select';
      options?: string[];
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_custom_fields')
      .insert({
        workspace_id: params.id,
        name: body.name.trim(),
        field_type: body.field_type || 'text',
        options: body.options || [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ field: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
