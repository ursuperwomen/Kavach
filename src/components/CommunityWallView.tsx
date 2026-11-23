import {
  Camera,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Send,
  Share2,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppLanguage, CommunityCategory, CommunityPost } from '../types/forensics';
import { defangUrl, formatTimestamp } from '../utils/reportExport';
import { CameraCaptureModal } from './CameraCaptureModal';

interface CommunityWallViewProps {
  lang: AppLanguage;
  onLangChange: (lang: AppLanguage) => void;
  onCheckInKavach: (text: string, url?: string) => void;
}

const CATEGORIES: Array<{ id: CommunityCategory; en: string; hi: string }> = [
  { id: 'Fake Link', en: 'Fake Link', hi: 'नकली लिंक' },
  { id: 'Bank / UPI', en: 'Bank / UPI', hi: 'बैंक / UPI' },
  { id: 'Fake Loan App', en: 'Fake Loan App', hi: 'नकली लोन ऐप' },
  { id: 'Job / WhatsApp', en: 'Job / WhatsApp', hi: 'जॉब / WhatsApp' },
  { id: 'Investment / Betting', en: 'Investment / Betting', hi: 'निवेश / सट्टा' },
  { id: 'Other', en: 'Other', hi: 'अन्य' },
];

export function CommunityWallView({
  lang,
  onLangChange,
  onCheckInKavach,
}: CommunityWallViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filterCategory, setFilterCategory] = useState<'ALL' | CommunityCategory>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Anonymous composer state
  const [story, setStory] = useState('');
  const [suspiciousLink, setSuspiciousLink] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('Fake Link');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Per-post replies & upvotes
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/community');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError(
        lang === 'hi'
          ? 'कृपया केवल JPG, PNG या WebP फोटो चुनें।'
          : 'Please choose a JPG, PNG, or WebP photo.'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!story.trim() && !suspiciousLink.trim() && !imageDataUrl) {
      setFormError(
        lang === 'hi'
          ? 'कृपया अपनी कहानी लिखें, लिंक डालें या फोटो अपलोड करें।'
          : 'Please write what happened, paste the link, or upload a photo.'
      );
      return;
    }

    setIsPosting(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: story.trim(),
          suspiciousLink: suspiciousLink.trim() || undefined,
          city: city.trim() || undefined,
          category,
          imageDataUrl: imageDataUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not publish story.');

      setPosts((prev) => [data.post as CommunityPost, ...prev]);
      setStory('');
      setSuspiciousLink('');
      setCity('');
      setImageDataUrl(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to post right now.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleHelpful = async (postId: string) => {
    if (upvotedIds[postId]) return;
    setUpvotedIds((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/helpful`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === postId ? (data.post as CommunityPost) : p)));
      }
    } catch {
      // ignore
    }
  };

  const handleSendReply = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const msg = (replyDrafts[postId] || '').trim();
    if (!msg) return;
    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === postId ? (data.post as CommunityPost) : p)));
        setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
        setExpandedReplies((prev) => ({ ...prev, [postId]: true }));
      }
    } catch {
      // ignore
    }
  };

  const visiblePosts =
    filterCategory === 'ALL' ? posts : posts.filter((p) => p.category === filterCategory);

  const getCategoryLabel = (cat: CommunityCategory) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? (lang === 'hi' ? found.hi : found.en) : cat;
  };

  return (
    <div className="space-y-8">
      {/* Header + Language Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-[24px] sm:text-[30px] md:text-[36px] font-extrabold tracking-[-0.02em] text-[#0F172A] leading-tight">
            {lang === 'hi' ? 'गुमनाम मंच — दूसरों को स्कैम से बचाएं' : 'Anonymous Community — Warn Others'}
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[#475569]">
            {lang === 'hi'
              ? 'बिना नाम बताए अपने साथ हुआ स्कैम, नकली लिंक या फोटो शेयर करें और एक-दूसरे की मदद करें।'
              : 'Stay 100% anonymous. Share a scam story, suspicious link, or screenshot photo to protect others.'}
          </p>
        </div>

        <div
          className="inline-flex items-center p-1 bg-white border border-[#CBD5E1] rounded-lg shrink-0 self-start"
          role="group"
          aria-label="Language switch"
        >
          <button
            type="button"
            onClick={() => onLangChange('hi')}
            className={`min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 rounded-md text-sm sm:text-[15px] font-bold whitespace-nowrap ${
              lang === 'hi' ? 'bg-[#0F172A] text-white' : 'text-[#334155] hover:text-[#0F172A]'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={`min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4 rounded-md text-sm sm:text-[15px] font-bold whitespace-nowrap ${
              lang === 'en' ? 'bg-[#0F172A] text-white' : 'text-[#334155] hover:text-[#0F172A]'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Anonymous Story / Photo / Link Share Composer */}
      <section className="card-resting rounded-lg p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] rounded-md px-4 py-2.5">
          <UserCheck className="w-5 h-5 shrink-0" />
          <span>
            {lang === 'hi'
              ? 'आपका नाम या फोन नंबर कभी नहीं दिखेगा — पोस्ट "Anonymous Citizen" नाम से शेयर होगी।'
              : 'Your identity stays hidden — your post is published anonymously as "Anonymous Citizen".'}
          </span>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label
              htmlFor="community-story"
              className="block text-[16px] font-bold text-[#0F172A] mb-2"
            >
              {lang === 'hi' ? 'आपके साथ कौन-सा स्कैम हुआ? (दूसरों को बताएं)' : 'What scam happened to you? (Warn others)'}
            </label>
            <textarea
              id="community-story"
              rows={3}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'जैसे: मुझे बिजली कटने का नकली WhatsApp मैसेज आया और APK डाउनलोड करने को कहा...'
                  : 'e.g. I received a fake bank KYC SMS asking for Rs 1 via UPI...'
              }
              className="w-full p-4 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[17px] leading-[26px] text-[#0F172A] placeholder:text-[#64748B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="community-category"
                className="block text-sm font-semibold text-[#0F172A] mb-1.5"
              >
                {lang === 'hi' ? 'स्कैम का प्रकार' : 'Scam Type'}
              </label>
              <select
                id="community-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunityCategory)}
                className="w-full min-h-[48px] px-3.5 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[15px] text-[#0F172A]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'hi' ? c.hi : c.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="community-link"
                className="block text-sm font-semibold text-[#0F172A] mb-1.5"
              >
                {lang === 'hi' ? 'संदिग्ध लिंक या UPI (वैकल्पिक)' : 'Suspicious Link or UPI (Optional)'}
              </label>
              <input
                id="community-link"
                type="text"
                value={suspiciousLink}
                onChange={(e) => setSuspiciousLink(e.target.value)}
                placeholder="http://... or fraud@ybl"
                className="w-full min-h-[48px] px-3.5 rounded-lg bg-white border-[1.5px] border-[#94A3B8] font-mono text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label
                htmlFor="community-city"
                className="block text-sm font-semibold text-[#0F172A] mb-1.5"
              >
                {lang === 'hi' ? 'शहर (वैकल्पिक)' : 'City (Optional)'}
              </label>
              <input
                id="community-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={lang === 'hi' ? 'जैसे: दिल्ली, इंदौर' : 'e.g. Delhi, Mumbai'}
                className="w-full min-h-[48px] px-3.5 rounded-lg bg-white border-[1.5px] border-[#94A3B8] text-[15px] text-[#0F172A]"
              />
            </div>
          </div>

          {imageDataUrl && (
            <div className="relative inline-block rounded-lg border border-[#CBD5E1] p-2 bg-[#F8FAFC]">
              <img
                src={imageDataUrl}
                alt="Attached scam screenshot preview"
                className="max-h-40 rounded object-contain"
              />
              <button
                type="button"
                onClick={() => setImageDataUrl(null)}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {formError && (
            <p className="text-sm font-semibold text-[#991B1B]">{formError}</p>
          )}

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
            <button
              type="submit"
              disabled={isPosting}
              className="col-span-2 sm:col-span-1 min-h-[52px] px-5 sm:px-6 py-3 rounded-lg bg-[#0F172A] text-white text-[16px] font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {lang === 'hi' ? 'गुमनाम पोस्ट करें' : 'Post Anonymously'}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoFile}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[48px] sm:min-h-[52px] px-3 sm:px-4 py-2.5 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{lang === 'hi' ? 'फोटो जोड़ें' : 'Upload Photo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="min-h-[48px] sm:min-h-[52px] px-3 sm:px-4 py-2.5 rounded-lg bg-white border-2 border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">{lang === 'hi' ? 'कैमरा फोटो' : 'Take Photo'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Category Filter Strip */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterCategory('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
            filterCategory === 'ALL'
              ? 'bg-[#0F172A] text-white'
              : 'bg-white border border-[#CBD5E1] text-[#334155] hover:border-[#0F172A]'
          }`}
        >
          {lang === 'hi' ? 'सभी कहानियाँ' : 'All Stories'} ({posts.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilterCategory(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              filterCategory === c.id
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-[#CBD5E1] text-[#334155] hover:border-[#0F172A]'
            }`}
          >
            {lang === 'hi' ? c.hi : c.en}
          </button>
        ))}
      </div>

      {/* Community Stories Feed */}
      <div className="space-y-5">
        {isLoading ? (
          <div className="card-resting rounded-lg p-8 text-center text-[#475569]">
            {lang === 'hi' ? 'समुदाय की पोस्ट लोड हो रही हैं…' : 'Loading community stories…'}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="card-resting rounded-lg p-8 text-center text-[#475569] text-[16px]">
            {lang === 'hi'
              ? 'इस श्रेणी में अभी कोई पोस्ट नहीं है। पहली गुमनाम चेतावनी आप शेयर करें!'
              : 'No stories in this category yet. Be the first to warn others!'}
          </div>
        ) : (
          visiblePosts.map((post) => {
            const isRepliesOpen = expandedReplies[post.id] ?? post.replies.length > 0;
            const waText = encodeURIComponent(
              lang === 'hi'
                ? `⚠️ *कवच समुदाय चेतावनी (${getCategoryLabel(post.category)})*\n\n"${post.story.slice(
                    0,
                    220
                  )}"${
                    post.suspiciousLink
                      ? `\nसंदिग्ध लिंक (क्लिक न करें): ${defangUrl(post.suspiciousLink)}`
                      : ''
                  }\n\nसावधान रहें · हेल्पलाइन 1930`
                : `⚠️ *Kavach Community Warning (${post.category})*\n\n"${post.story.slice(
                    0,
                    220
                  )}"${
                    post.suspiciousLink
                      ? `\nSuspicious link (DO NOT CLICK): ${defangUrl(post.suspiciousLink)}`
                      : ''
                  }\n\nStay alert · Cyber Helpline 1930`
            );

            return (
              <article key={post.id} className="card-resting rounded-lg p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#475569]">
                    <span className="font-bold text-[#0F172A]">{post.alias}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.city}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#991B1B]">
                      {getCategoryLabel(post.category)}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] tabular-nums">
                    {formatTimestamp(post.createdAt)}
                  </span>
                </div>

                <p className="text-[16px] sm:text-[18px] leading-[26px] sm:leading-[28px] text-[#0F172A] whitespace-pre-wrap break-words">
                  {post.story}
                </p>

                {post.suspiciousLink && (
                  <div className="rounded-md bg-[#FEF2F2] border border-[#FCA5A5] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#991B1B] block">
                        {lang === 'hi' ? 'साझा किया गया संदिग्ध लिंक (क्लिक न करें)' : 'Reported Link / Handle (Defanged)'}
                      </span>
                      <span className="font-mono text-sm font-semibold text-[#0F172A] break-all">
                        {defangUrl(post.suspiciousLink)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onCheckInKavach(
                          `${post.story}\n${post.suspiciousLink}`,
                          /^https?:\/\//i.test(post.suspiciousLink || '')
                            ? post.suspiciousLink
                            : undefined
                        )
                      }
                      className="px-3.5 py-2 rounded-md bg-[#0F172A] text-white text-xs font-bold hover:bg-[#1E293B] inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {lang === 'hi' ? 'कवच पर जांचें' : 'Check in Kavach'}
                    </button>
                  </div>
                )}

                {post.imageDataUrl && (
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <img
                      src={post.imageDataUrl}
                      alt="Community shared scam evidence screenshot"
                      className="max-h-80 rounded object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Action Bar: Helpful | Replies | Check Story | WhatsApp Share */}
                <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleHelpful(post.id)}
                      className={`px-3.5 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-1.5 tabular-nums ${
                        upvotedIds[post.id]
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] hover:border-[#0F172A]'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>
                        {lang === 'hi' ? 'मददगार' : 'Helpful'} ({post.helpfulCount})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReplies((prev) => ({ ...prev, [post.id]: !isRepliesOpen }))
                      }
                      className="px-3.5 py-2 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] text-sm font-semibold text-[#0F172A] hover:border-[#0F172A] inline-flex items-center gap-1.5 tabular-nums"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        {lang === 'hi' ? 'जवाब' : 'Replies'} ({post.replies.length})
                      </span>
                    </button>
                  </div>

                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-sm font-semibold hover:bg-[#DCFCE7] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Share2 className="w-4 h-4" />
                    {lang === 'hi' ? 'WhatsApp पर चेतावनी भेजें' : 'Share on WhatsApp'}
                  </a>
                </div>

                {/* Anonymous Replies Thread */}
                {isRepliesOpen && (
                  <div className="pt-3 space-y-3 border-t border-[#F1F5F9]">
                    {post.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                          <span className="font-bold text-[#0F172A]">{rep.alias}</span>
                          <span className="tabular-nums">{formatTimestamp(rep.createdAt)}</span>
                        </div>
                        <p className="text-[15px] leading-[24px] text-[#334155]">{rep.message}</p>
                      </div>
                    ))}

                    <form
                      onSubmit={(e) => handleSendReply(e, post.id)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={replyDrafts[post.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder={
                          lang === 'hi'
                            ? 'गुमनाम जवाब या सलाह लिखें...'
                            : 'Write an anonymous reply or safety tip...'
                        }
                        className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-lg bg-white border border-[#94A3B8] text-[15px] text-[#0F172A]"
                      />
                      <button
                        type="submit"
                        className="min-h-[44px] px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] whitespace-nowrap shrink-0"
                      >
                        {lang === 'hi' ? 'भेजें' : 'Reply'}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {showCamera && (
        <CameraCaptureModal
          lang={lang}
          onCapture={(base64, mime) => {
            setImageDataUrl(`data:${mime};base64,${base64}`);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
