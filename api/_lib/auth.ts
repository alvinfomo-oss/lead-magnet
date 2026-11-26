import crypto from 'node:crypto';
import process from 'node:process';
import {
  cleanStr,
  getSupabaseClient,
  type ApiRequest,
  type ApiResponse,
} from './submissions.js';

export type UserRole = 'super_admin' | 'admin' | 'worker';

export interface UserDbRow {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  phone: string;
  password_hash: string;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  phone: string;
  createdAt: string;
}

export interface SessionClaims {
  sub: number;
  email: string;
  role: UserRole;
  exp: number;
}

const VALID_ROLES = new Set<UserRole>(['super_admin', 'admin', 'worker']);
const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSessionSecret(): string {
  const configured = process.env.AUTH_SESSION_SECRET?.trim();
  if (configured) return configured;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) {
    return crypto
      .createHmac('sha256', serviceKey)
      .update('netpub-session-signing-key')
      .digest('hex');
  }

  return EPHEMERAL_SESSION_SECRET;
}

export function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && VALID_ROLES.has(value as UserRole);
}

export function mapPublicUser(row: UserDbRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    title: row.title,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;

  const expected = Buffer.from(hexDigest, 'hex');
  const actual = crypto.scryptSync(plainPassword, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function createSessionToken(user: {
  id: number;
  email: string;
  role: UserRole;
}): string {
  const claims: SessionClaims = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): SessionClaims | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<SessionClaims>;
    if (
      typeof parsed.sub !== 'number' ||
      typeof parsed.email !== 'string' ||
      !isValidRole(parsed.role) ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed as SessionClaims;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: ApiRequest & { headers?: Record<string, string | string[] | undefined> }): string | null {
  const rawAuth = req.headers?.authorization ?? req.headers?.Authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1].trim() : null;
}

export function buildSeedUserRecords(): Omit<UserDbRow, 'id' | 'created_at'>[] {
  const defaultDevPassword = process.env.SEED_DEFAULT_PASSWORD?.trim() || '1234';
  const passwordHash = () => hashPassword(defaultDevPassword);

  return [
    {
      name: 'Super Admin',
      email: 'superadmin@netpud.com',
      role: 'super_admin',
      title: 'Agency Director',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Admin One',
      email: 'admin1@netpud.com',
      role: 'admin',
      title: 'Operations Admin',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Admin Two',
      email: 'admin2@netpud.com',
      role: 'admin',
      title: 'Account Admin',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Admin Three',
      email: 'admin3@netpud.com',
      role: 'admin',
      title: 'Campaign Admin',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Worker One',
      email: 'worker1@netpud.com',
      role: 'worker',
      title: 'Social Media Specialist',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Worker Two',
      email: 'worker2@netpud.com',
      role: 'worker',
      title: 'Paid Ads Analyst',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Worker Three',
      email: 'worker3@netpud.com',
      role: 'worker',
      title: 'Page Setup Coordinator',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Worker Four',
      email: 'worker4@netpud.com',
      role: 'worker',
      title: 'Media Buyer',
      phone: '',
      password_hash: passwordHash(),
    },
    {
      name: 'Worker Five',
      email: 'worker5@netpud.com',
      role: 'worker',
      title: 'Client Onboarding Specialist',
      phone: '',
      password_hash: passwordHash(),
    },
  ];
}

export function normalizeEmail(val: unknown): string {
  return cleanStr(val, 160).toLowerCase();
}

export async function ensureSupabaseSeedUsers(): Promise<void> {
  const supabase = getSupabaseClient();
  const { count, error: countErr } = await supabase
    .from('agency_users')
    .select('id', { count: 'exact', head: true });

  if (countErr) {
    const msg = countErr.message || '';
    if (!msg || msg.includes('agency_users') || countErr.code === 'PGRST205') {
      throw new Error(
        'The agency_users table has not been created in Supabase yet. Please run supabase/schema.sql in your Supabase SQL Editor.',
      );
    }
    throw new Error(msg);
  }

  if ((count ?? 0) > 0) return;

  const seeds = buildSeedUserRecords().map((u) => ({
    ...u,
    created_at: new Date().toISOString(),
  }));

  const { error: insertErr } = await supabase
    .from('agency_users')
    .upsert(seeds, { onConflict: 'email', ignoreDuplicates: true });

  if (insertErr) {
    if (insertErr.message.includes('agency_users') || insertErr.code === 'PGRST205') {
      throw new Error(
        'The agency_users table has not been created in Supabase yet. Please run supabase/schema.sql in your Supabase SQL Editor.',
      );
    }
    throw new Error(insertErr.message);
  }
}

export async function supabaseFindUserByEmail(email: string): Promise<UserDbRow | null> {
  await ensureSupabaseSeedUsers();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserDbRow | null) ?? null;
}

export async function supabaseFindUserById(id: number): Promise<UserDbRow | null> {
  await ensureSupabaseSeedUsers();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserDbRow | null) ?? null;
}

export async function supabaseListUsers(): Promise<UserDbRow[]> {
  await ensureSupabaseSeedUsers();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as UserDbRow[];
}

export async function supabaseCreateUser(input: {
  name: string;
  email: string;
  role: UserRole;
  title: string;
  phone: string;
  passwordHash: string;
}): Promise<UserDbRow> {
  await ensureSupabaseSeedUsers();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .insert({
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      title: input.title,
      phone: input.phone,
      password_hash: input.passwordHash,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as UserDbRow;
}

export async function supabaseUpdateUserProfile(
  id: number,
  input: { name: string; email: string; title: string; phone: string },
): Promise<UserDbRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .update({
      name: input.name,
      email: input.email.toLowerCase(),
      title: input.title,
      phone: input.phone,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserDbRow | null) ?? null;
}

export async function supabaseUpdateUserPassword(
  id: number,
  passwordHash: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .update({ password_hash: passwordHash })
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function supabaseUpdateUserRole(
  id: number,
  role: UserRole,
): Promise<UserDbRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .update({ role })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserDbRow | null) ?? null;
}

export async function supabaseDeleteUser(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agency_users')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function authenticateSupabaseRequest(
  req: ApiRequest & { headers?: Record<string, string | string[] | undefined> },
  res: ApiResponse,
  allowedRoles?: UserRole[],
): Promise<UserDbRow | null> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return null;
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return null;
  }

  const user = await supabaseFindUserById(claims.sub);
  if (!user) {
    res.status(401).json({ error: 'User account no longer exists.' });
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    res.status(403).json({ error: 'You do not have permission for this action.' });
    return null;
  }

  return user;
}
