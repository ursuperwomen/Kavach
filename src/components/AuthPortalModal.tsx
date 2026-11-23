import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Shield,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { AppLanguage, AuthUser } from '../types/forensics';
import { CameraCaptureModal } from './CameraCaptureModal';

interface AuthPortalModalProps {
  lang: AppLanguage;
  onAuthenticated: (token: string, user: AuthUser) => void;
  onClose: () => void;
}

type RoleTab = 'citizen' | 'officer';
type AuthAction = 'signin' | 'signup' | 'forgot';

function generateSyntheticBadgePng(name: string, badgeId: string, dept: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 640, 96);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 96, 640, 284);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 636, 376);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CYBER CRIME INVESTIGATION UNIT', 28, 44);
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('SYNTHETIC HACKATHON DEMO ID', 28, 72);

  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(28, 126, 130, 154);
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(93, 178, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(93, 260, 44, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(name || 'Inspector A. Verma', 184, 160);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BADGE / SERVICE ID', 184, 200);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(badgeId || 'CYB-DEMO-2041', 184, 226);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('DEPARTMENT', 184, 262);
  ctx.fillStyle = '#0F172A';
  ctx.font = '18px sans-serif';
  ctx.fillText(dept || 'State Cyber Cell (Demo)', 184, 288);

  ctx.fillStyle = '#F0FDF4';
  ctx.fillRect(24, 314, 592, 42);
  ctx.strokeStyle = '#86EFAC';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 314, 592, 42);
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('DEMO SPECIMEN · KAVACH HACKATHON', 40, 340);

  return canvas.toDataURL('image/png');
}

export function AuthPortalModal({ lang, onAuthenticated, onClose }: AuthPortalModalProps) {
  const [roleTab, setRoleTab] = useState<RoleTab>('citizen');
  const [action, setAction] = useState<AuthAction>('signin');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [badgeId, setBadgeId] = useState('');
  const [department, setDepartment] = useState('');
  const [idCardDataUrl, setIdCardDataUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [demoResetCode, setDemoResetCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const switchRole = (nextRole: RoleTab) => {
    setRoleTab(nextRole);
    setAction(nextRole === 'officer' ? 'signup' : 'signin');
    setError(null);
    setSuccessMessage(null);
  };

  const openForgotPassword = () => {
    setAction('forgot');
    setResetStep('request');
    setResetEmail(email);
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setDemoResetCode(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(lang === 'hi' ? 'केवल JPG, PNG या WebP चुनें।' : 'Use JPG, PNG, or WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setIdCardDataUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateSyntheticId = () => {
    const demoName = fullName.trim() || 'Inspector A. Verma';
    const demoBadge = badgeId.trim().toUpperCase() || 'CYB-DEMO-2041';
    const demoDept = department.trim() || 'State Cyber Cell (Demo)';
    if (!fullName.trim()) setFullName(demoName);
    if (!badgeId.trim()) setBadgeId(demoBadge);
    if (!department.trim()) setDepartment(demoDept);
    if (!email.trim()) setEmail(`officer.${Date.now().toString().slice(-4)}@cybercell.demo`);
    setIdCardDataUrl(generateSyntheticBadgePng(demoName, demoBadge, demoDept));
    setError(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (roleTab === 'officer' && action === 'signup' && !idCardDataUrl) {
      setError(lang === 'hi' ? 'ID कार्ड फोटो अपलोड करें।' : 'Upload ID card photo.');
      return;
    }

    setIsSubmitting(true);
    try {
      let endpoint = '/api/auth/login';
      let payload: Record<string, unknown> = { email, password };

      if (action === 'signup' && roleTab === 'citizen') {
        endpoint = '/api/auth/register-citizen';
        payload = { fullName, email, password };
      } else if (action === 'signup' && roleTab === 'officer') {
        endpoint = '/api/auth/register-investigator';
        payload = { fullName, email, password, badgeId, department, idCardDataUrl };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.token || !data.user) throw new Error(data.error || 'Auth failed.');
      onAuthenticated(data.token as string, data.user as AuthUser);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.sent) throw new Error(data.error || 'Could not send code.');
      setDemoResetCode(data.demoResetCode || null);
      setResetStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmNewPassword) {
      setError(lang === 'hi' ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Reset failed.');
      setEmail(resetEmail);
      setPassword('');
      setRoleTab(data.role === 'investigator' ? 'officer' : 'citizen');
      setAction('signin');
      setSuccessMessage(
        lang === 'hi' ? 'पासवर्ड बदल गया! अब लॉगिन करें।' : 'Password updated! Sign in now.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-portal-title"
    >
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-lg bg-white border border-[#CBD5E1] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-[#0F172A] text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 shrink-0" />
            <h2 id="auth-portal-title" className="text-base sm:text-lg font-bold truncate">
              {action === 'forgot'
                ? lang === 'hi'
                  ? 'पासवर्ड रीसेट'
                  : 'Reset Password'
                : lang === 'hi'
                ? 'लॉगिन / साइन इन'
                : 'Login / Sign In'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side-by-Side Citizen & Officer Role Buttons */}
        {action !== 'forgot' && (
          <div className="px-4 pt-3.5 bg-white shrink-0">
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => switchRole('citizen')}
                className={`min-h-[44px] px-3 py-2 rounded-md text-sm font-bold inline-flex items-center justify-center gap-1.5 ${
                  roleTab === 'citizen'
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-[#334155] hover:bg-white'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>{lang === 'hi' ? 'नागरिक' : 'Citizen'}</span>
              </button>

              <button
                type="button"
                onClick={() => switchRole('officer')}
                className={`min-h-[44px] px-3 py-2 rounded-md text-sm font-bold inline-flex items-center justify-center gap-1.5 ${
                  roleTab === 'officer'
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-[#334155] hover:bg-white'
                }`}
              >
                <BadgeCheck className="w-4 h-4 shrink-0" />
                <span>{lang === 'hi' ? 'अधिकारी' : 'Officer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {action === 'forgot' ? (
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={() => {
                  setAction('signin');
                  setError(null);
                }}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#2563EB] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'hi' ? 'वापस जाएं' : 'Back'}
              </button>

              {resetStep === 'request' ? (
                <form onSubmit={handleRequestResetCode} className="space-y-3">
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={lang === 'hi' ? 'रजिस्टर्ड ईमेल पता' : 'Registered email'}
                    className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
                  />

                  {error && (
                    <div className="rounded border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-xs sm:text-sm font-semibold text-[#991B1B]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] px-4 rounded-lg bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {lang === 'hi' ? 'रीसेट कोड भेजें' : 'Send Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-3">
                  {demoResetCode && (
                    <div className="rounded border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2 text-xs text-[#166534] font-mono flex items-center justify-between gap-2">
                      <span>Demo Code ({resetEmail}):</span>
                      <strong className="text-sm tracking-widest text-[#0F172A]">{demoResetCode}</strong>
                    </div>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder={lang === 'hi' ? '6-अंकों का कोड' : '6-digit code'}
                    className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] font-mono text-sm tracking-widest text-[#0F172A]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={lang === 'hi' ? 'नया पासवर्ड' : 'New password'}
                      className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={lang === 'hi' ? 'पासवर्ड पुष्टि' : 'Confirm password'}
                      className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
                    />
                  </div>

                  {error && (
                    <div className="rounded border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-xs sm:text-sm font-semibold text-[#991B1B]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] px-4 rounded-lg bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    {lang === 'hi' ? 'पासवर्ड सेव करें' : 'Save Password'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {/* Compact Sign In / Sign Up Switcher */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#475569]">
                  {roleTab === 'citizen'
                    ? lang === 'hi'
                      ? 'वैकल्पिक लॉगिन'
                      : 'Optional'
                    : lang === 'hi'
                    ? 'ID कार्ड सत्यापित'
                    : 'ID Verified'}
                </span>
                <div className="inline-flex rounded-md bg-[#F1F5F9] p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAction('signin');
                      setError(null);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      action === 'signin' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#475569]'
                    }`}
                  >
                    {lang === 'hi' ? 'लॉगिन' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAction('signup');
                      setError(null);
                    }}
                    className={`px-2.5 py-1 rounded ${
                      action === 'signup' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#475569]'
                    }`}
                  >
                    {lang === 'hi' ? 'नया खाता' : 'Sign Up'}
                  </button>
                </div>
              </div>

              {successMessage && (
                <div className="rounded border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2 text-xs sm:text-sm font-semibold text-[#166534]">
                  {successMessage}
                </div>
              )}

              {action === 'signup' && (
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={roleTab === 'officer' ? 'Officer Name' : lang === 'hi' ? 'पूरा नाम' : 'Full Name'}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
                />
              )}

              {roleTab === 'officer' && action === 'signup' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    placeholder="Badge ID"
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#94A3B8] font-mono text-sm text-[#0F172A]"
                  />
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department"
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
                  />
                </div>
              )}

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleTab === 'officer' ? 'officer@cybercell.demo' : lang === 'hi' ? 'ईमेल' : 'Email'}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
              />

              <div className="space-y-1">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'hi' ? 'पासवर्ड (6+ अक्षर)' : 'Password (6+ chars)'}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#94A3B8] text-sm text-[#0F172A]"
                />
                {action === 'signin' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-xs font-bold text-[#2563EB] hover:underline"
                    >
                      {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                    </button>
                  </div>
                )}
              </div>

              {roleTab === 'officer' && action === 'signup' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0F172A]">
                      {lang === 'hi' ? 'ID कार्ड (अनिवार्य *)' : 'ID Card Proof *'}
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateSyntheticId}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === 'hi' ? 'डेमो ID बनाएं' : 'Demo ID'}
                    </button>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {idCardDataUrl ? (
                    <div className="rounded-lg border border-[#86EFAC] bg-[#F0FDF4] p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-[#166534]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {lang === 'hi' ? 'संलग्न' : 'Attached'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIdCardDataUrl(null)}
                          className="font-semibold text-[#991B1B] hover:underline"
                        >
                          {lang === 'hi' ? 'हटाएं' : 'Remove'}
                        </button>
                      </div>
                      <img
                        src={idCardDataUrl}
                        alt="ID proof"
                        className="max-h-28 rounded border border-[#CBD5E1] object-contain mx-auto bg-white"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="min-h-[42px] px-3 rounded-lg bg-white border-2 border-dashed border-[#94A3B8] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>{lang === 'hi' ? 'अपलोड' : 'Upload ID'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="min-h-[42px] px-3 rounded-lg bg-white border-2 border-dashed border-[#94A3B8] hover:border-[#0F172A] text-xs font-semibold text-[#0F172A] inline-flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-4 h-4 shrink-0" />
                        <span>{lang === 'hi' ? 'कैमरा' : 'Camera'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-xs sm:text-sm font-semibold text-[#991B1B]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[46px] px-5 rounded-lg bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {action === 'signin'
                  ? roleTab === 'officer'
                    ? lang === 'hi'
                      ? 'अधिकारी लॉगिन'
                      : 'Sign In as Officer'
                    : lang === 'hi'
                    ? 'नागरिक लॉगिन'
                    : 'Sign In as Citizen'
                  : roleTab === 'officer'
                  ? lang === 'hi'
                    ? 'ID सत्यापित कर खाता बनाएं'
                    : 'Verify ID & Sign Up'
                  : lang === 'hi'
                  ? 'नागरिक खाता बनाएं'
                  : 'Create Citizen Account'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] px-4 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-sm font-bold text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                {lang === 'hi' ? 'बिना लॉगिन के जारी रखें' : 'Continue without Login'}
              </button>
            </form>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraCaptureModal
          lang={lang}
          onCapture={(base64, mime) => {
            setIdCardDataUrl(`data:${mime};base64,${base64}`);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
