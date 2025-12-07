export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${randomSuffix}`;
}

export function generatePartyCode(): string {
  // Generate a 6-character uppercase alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getStoredMember(partyId: string): { partyMemberId: string; displayName: string } | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(`partyMember:${partyId}`);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredMember(partyId: string, memberId: string, displayName: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    `partyMember:${partyId}`,
    JSON.stringify({ partyMemberId: memberId, displayName, partyId })
  );
}

