import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('task_custom_values')
      .select('*, field:task_custom_fields(*)')
      .eq('task_id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ values: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as {
      fieldId?: string;
      value?: string | null;
    };

    if (!body.fieldId) {
      return NextResponse.json({ error: 'fieldId obbligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('task_custom_values')
      .upsert(
        {
          task_id: params.id,
          field_id: body.fieldId,
          value: body.value ?? null,
        },
        { onConflict: 'task_id,field_id' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ value: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
