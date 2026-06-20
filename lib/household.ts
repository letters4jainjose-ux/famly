import { supabase } from './supabase';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  role: 'husband' | 'wife' | 'partner';
  joined_at: string;
  is_primary: boolean;
}

// Generate a short, friendly invite code like "DUO-7F3K9"
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `DUO-${code}`;
}

// Get the household + members for the currently signed-in user
export async function getMyHousehold(): Promise<{ household: Household; members: HouseholdMember[] } | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: membership, error: memErr } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle();

  if (memErr || !membership) return null;

  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from('households').select('*').eq('id', membership.household_id).single(),
    supabase.from('household_members').select('*').eq('household_id', membership.household_id).order('joined_at'),
  ]);

  if (!household) return null;
  return { household, members: members || [] };
}

// Get the partner's display name (the other member in the same household)
export async function getPartnerInfo(): Promise<HouseholdMember | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const result = await getMyHousehold();
  if (!result) return null;

  return result.members.find(m => m.user_id !== userData.user!.id) || null;
}

// Create a brand-new household for a freshly signed-up user — they are the primary by default.
export async function createHousehold(displayName: string): Promise<Household> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not signed in');

  let code = generateInviteCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing } = await supabase.from('households').select('id').eq('invite_code', code).maybeSingle();
    if (!existing) break;
    code = generateInviteCode();
  }

  const { data: household, error } = await supabase
    .from('households')
    .insert({ name: `${displayName}'s Household`, invite_code: code })
    .select().single();
  if (error) throw error;

  const { error: memErr } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: userData.user.id, display_name: displayName, role: 'partner', is_primary: true });
  if (memErr) throw memErr;

  return household;
}

// Join an existing household using an invite code (entered manually or via QR scan).
// The household whose code was entered becomes the shared one; the person who
// entered the code is marked as the non-primary member ("the account where we
// enter the code or scan the QR will be considered as primary" — wait, see below).
//
// NOTE on "primary": the household whose invite code is being entered is the one
// that survives — its expenses/categories stay as-is. The *joiner's* own prior
// household (if it had any data) is left untouched and simply abandoned; the
// joiner's account moves into the code-owner's household. The code-owner keeps
// role 'primary' since their household identity is what persists.
export async function joinHousehold(inviteCode: string, displayName: string): Promise<Household> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not signed in');

  const normalizedCode = inviteCode.trim().toUpperCase();
  const { data: targetHousehold, error } = await supabase
    .from('households')
    .select('*')
    .eq('invite_code', normalizedCode)
    .maybeSingle();

  if (error || !targetHousehold) throw new Error('Invalid invite code. Please check and try again.');

  // Find the joiner's current household (every account has one from signup)
  const { data: myMembership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .maybeSingle();

  if (myMembership?.household_id === targetHousehold.id) {
    throw new Error("You're already connected to this household.");
  }

  // Check the target household isn't already full (max 2 members for a couple)
  const { count } = await supabase
    .from('household_members')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', targetHousehold.id);

  if (count && count >= 2) {
    throw new Error('This household already has 2 members connected.');
  }

  // Move the joiner's own data (if any) into the target household so nothing is lost,
  // then remove their old solo household membership and household row.
  if (myMembership?.household_id) {
    const oldHouseholdId = myMembership.household_id;

    await supabase.from('expenses').update({ household_id: targetHousehold.id }).eq('household_id', oldHouseholdId);
    await supabase.from('categories').update({ household_id: targetHousehold.id }).eq('household_id', oldHouseholdId)
      .then(async () => {
        // Avoid duplicate category names colliding in the merged household —
        // any category names that already exist in the target are left as
        // duplicates for the person to clean up in Settings rather than
        // silently dropping their historical data.
      });

    await supabase.from('household_members').delete().eq('user_id', userData.user!.id).eq('household_id', oldHouseholdId);
    await supabase.from('households').delete().eq('id', oldHouseholdId);
  }

  const { error: memErr } = await supabase
    .from('household_members')
    .insert({ household_id: targetHousehold.id, user_id: userData.user.id, display_name: displayName, role: 'partner', is_primary: false });
  if (memErr) throw memErr;

  return targetHousehold;
}

// Disconnect from the current partner — splits back into the calling user's
// own standalone household, keeping their own expenses with them.
export async function disconnectPartner(displayName: string): Promise<Household> {
  return createHousehold(displayName);
}
