import crypto from 'crypto';
import type { AuthUser, UserRole } from '../src/types/forensics';

interface StoredAccount {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  badgeId?: string;
  department?: string;
  idProofVerified?: boolean;
  idProofHash?: string;
  idProofPreview?: string;
  createdAt: string;
}

interface ActiveSession {
  token: string;
  userId: string;
  expiresAt: number;
}

interface PasswordResetRecord {
  email: string;
  codeHash: string;
  codeSalt: string;
  expiresAt: number;
  attempts: number;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_ATTEMPTS = 5;

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHex: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function validateImageDataUrl(dataUrl: string): {
  valid: boolean;
  error?: string;
  sha256?: string;
} {
  if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
    return { valid: false, error: 'Official Investigator ID Card image is required.' };
  }
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    return { valid: false, error: 'ID Card proof must be a valid JPG, PNG, or WebP image.' };
  }
  if (dataUrl.length > 5_500_000) {
    return { valid: false, error: 'ID Card image must be smaller than 4 MB.' };
  }

  const format = match[1];
  const rawBuffer = Buffer.from(match[2], 'base64');
  if (rawBuffer.length < 64) {
    return { valid: false, error: 'Uploaded ID Card image is too small or unreadable.' };
  }

  // Verify binary magic bytes match declared MIME type
  const isJpeg = format === 'jpeg' && rawBuffer[0] === 0xff && rawBuffer[1] === 0xd8 && rawBuffer[2] === 0xff;
  const isPng =
    format === 'png' &&
    rawBuffer[0] === 0x89 &&
    rawBuffer[1] === 0x50 &&
    rawBuffer[2] === 0x4e &&
    rawBuffer[3] === 0x47;
  const isWebp =
    format === 'webp' &&
    rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    rawBuffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    return { valid: false, error: 'Uploaded file header does not match a valid JPG, PNG, or WebP image.' };
  }

  const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
  return { valid: true, sha256 };
}

function toPublicUser(account: StoredAccount): AuthUser {
  return {
    id: account.id,
    role: account.role,
    fullName: account.fullName,
    email: account.email,
    badgeId: account.badgeId,
    department: account.department,
    idProofVerified: account.idProofVerified,
    idProofHash: account.idProofHash,
    idProofPreview: account.idProofPreview,
    createdAt: account.createdAt,
  };
}

class AuthStore {
  private accountsByEmail = new Map<string, StoredAccount>();
  private accountsById = new Map<string, StoredAccount>();
  private sessions = new Map<string, ActiveSession>();
  private resetRequests = new Map<string, PasswordResetRecord>();

  private createSessionFor(account: StoredAccount): { token: string; user: AuthUser } {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, {
      token,
      userId: account.id,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return { token, user: toPublicUser(account) };
  }

  registerInvestigator(input: {
    fullName: string;
    email: string;
    password: string;
    badgeId: string;
    department: string;
    idCardDataUrl: string;
  }): { token?: string; user?: AuthUser; error?: string } {
    const fullName = input.fullName.trim().slice(0, 100);
    const email = input.email.trim().toLowerCase().slice(0, 120);
    const badgeId = input.badgeId.trim().toUpperCase().slice(0, 40);
    const department = input.department.trim().slice(0, 100);
    const password = input.password;

    if (fullName.length < 2) {
      return { error: 'Please enter the officer full name.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Please enter a valid official email address.' };
    }
    if (badgeId.length < 3) {
      return { error: 'Please enter an official Badge / Service ID (at least 3 characters).' };
    }
    if (department.length < 2) {
      return { error: 'Please enter your Cyber Cell / Law Enforcement unit.' };
    }
    if (typeof password !== 'string' || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }
    if (this.accountsByEmail.has(email)) {
      return { error: 'An account with this email already exists. Please sign in instead.' };
    }

    const imgCheck = validateImageDataUrl(input.idCardDataUrl);
    if (!imgCheck.valid || !imgCheck.sha256) {
      return { error: imgCheck.error || 'Valid Investigator ID Card upload is mandatory.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const account: StoredAccount = {
      id: `INV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      role: 'investigator',
      fullName,
      email,
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      badgeId,
      department,
      idProofVerified: true,
      idProofHash: imgCheck.sha256,
      idProofPreview: input.idCardDataUrl.trim(),
      createdAt: new Date().toISOString(),
    };

    this.accountsByEmail.set(email, account);
    this.accountsById.set(account.id, account);
    return this.createSessionFor(account);
  }

  registerCitizen(input: {
    fullName: string;
    email: string;
    password: string;
  }): { token?: string; user?: AuthUser; error?: string } {
    const fullName = input.fullName.trim().slice(0, 100);
    const email = input.email.trim().toLowerCase().slice(0, 120);
    const password = input.password;

    if (fullName.length < 2) {
      return { error: 'Please enter your name.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (typeof password !== 'string' || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }
    if (this.accountsByEmail.has(email)) {
      return { error: 'An account with this email already exists. Please sign in instead.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const account: StoredAccount = {
      id: `CIT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      role: 'citizen',
      fullName,
      email,
      passwordSalt: salt,
      passwordHash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };

    this.accountsByEmail.set(email, account);
    this.accountsById.set(account.id, account);
    return this.createSessionFor(account);
  }

  login(emailInput: string, password: string): { token?: string; user?: AuthUser; error?: string } {
    const email = (emailInput || '').trim().toLowerCase();
    const account = this.accountsByEmail.get(email);
    if (!account || typeof password !== 'string' || !verifyPassword(password, account.passwordSalt, account.passwordHash)) {
      return { error: 'Invalid email or password.' };
    }
    return this.createSessionFor(account);
  }

  requestPasswordReset(emailInput: string): {
    sent?: boolean;
    demoResetCode?: string;
    expiresInMinutes?: number;
    error?: string;
  } {
    const email = (emailInput || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Please enter a valid registered email address.' };
    }
    const account = this.accountsByEmail.get(email);
    if (!account) {
      return { error: 'No registered account was found with this email address.' };
    }

    const code = String(crypto.randomInt(100000, 999999));
    const codeSalt = crypto.randomBytes(16).toString('hex');
    const codeHash = hashPassword(code, codeSalt);

    this.resetRequests.set(email, {
      email,
      codeHash,
      codeSalt,
      expiresAt: Date.now() + RESET_TTL_MS,
      attempts: 0,
    });

    return {
      sent: true,
      demoResetCode: code,
      expiresInMinutes: 15,
    };
  }

  resetPassword(
    emailInput: string,
    codeInput: string,
    newPassword: string
  ): { ok?: boolean; role?: UserRole; error?: string } {
    const email = (emailInput || '').trim().toLowerCase();
    const code = (codeInput || '').trim();

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return { error: 'New password must be at least 6 characters long.' };
    }

    const req = this.resetRequests.get(email);
    if (!req) {
      return { error: 'No active password reset request found. Please request a new code.' };
    }
    if (Date.now() > req.expiresAt) {
      this.resetRequests.delete(email);
      return { error: 'This reset code has expired. Please request a new code.' };
    }
    if (req.attempts >= MAX_RESET_ATTEMPTS) {
      this.resetRequests.delete(email);
      return { error: 'Too many invalid attempts. Please request a new reset code.' };
    }

    req.attempts += 1;
    if (!verifyPassword(code, req.codeSalt, req.codeHash)) {
      return { error: 'Invalid verification code. Please check the 6-digit code and try again.' };
    }

    const account = this.accountsByEmail.get(email);
    if (!account) {
      this.resetRequests.delete(email);
      return { error: 'Account not found.' };
    }

    // Rotate salt & password hash, revoke existing sessions, clear single-use reset code
    const newSalt = crypto.randomBytes(16).toString('hex');
    account.passwordSalt = newSalt;
    account.passwordHash = hashPassword(newPassword, newSalt);
    this.resetRequests.delete(email);

    for (const [tok, sess] of this.sessions.entries()) {
      if (sess.userId === account.id) {
        this.sessions.delete(tok);
      }
    }

    return { ok: true, role: account.role };
  }

  getUserFromToken(token?: string): AuthUser | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    const account = this.accountsById.get(session.userId);
    if (!account) return null;
    return toPublicUser(account);
  }

  logout(token?: string): void {
    if (token) {
      this.sessions.delete(token);
    }
  }
}

export const authStore = new AuthStore();
