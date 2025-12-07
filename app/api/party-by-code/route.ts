import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const partyCode = searchParams.get('code');

  if (!partyCode) {
    return NextResponse.json({ error: 'Missing party code' }, { status: 400 });
  }

  const { data: party, error } = await supabase
    .from('parties')
    .select('slug')
    .eq('party_code', partyCode.toUpperCase())
    .maybeSingle();

  if (error || !party) {
    return NextResponse.json({ error: 'Party not found' }, { status: 404 });
  }

  return NextResponse.json({ party });
}

