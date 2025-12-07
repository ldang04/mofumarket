import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const partyId = searchParams.get('partyId');

  if (!id || !partyId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from('party_members')
    .select('*')
    .eq('id', id)
    .eq('party_id', partyId)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return NextResponse.json({ member });
}

