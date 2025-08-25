import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const payload = await GET_RAW();
  return NextResponse.json(payload);
}

export async function GET_RAW() {
  const services: Record<string, string> = {};
  try {
    if (process.env.NODE_ENV === 'test') {
      services.supabase = 'skipped';
    } else {
      const supabase = createServerClient();
      // Lightweight query to verify connectivity
      const { error } = await supabase.from('users').select('id').limit(1);
      services.supabase = error ? 'error' : 'ok';
    }
  } catch (e) {
    services.supabase = 'error';
  }

  return { status: 'ok', services };
}
