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
  onCheckInKavach: (text: string, url?: string) => void;
}

const CATEGORIES: Array<{ id: CommunityCategory; en: string; hi: string }> = [
  { id: 'Fake Link', en: 'Fake Link', hi: 'नकली लिंक' },
  { id: 'Bank / UPI', en: 'Bank / UPI', hi: 'बैंक / UPI' },
  { id: 'Fake Loan App', en: 'Loan App', hi: 'लोन ऐप' },
  { id: 'Job / WhatsApp', en: 'Job', hi: 'जॉब' },
  { id: 'Investment / Betting', en: 'Investment', hi: 'निवेश' },
  { id: 'Other', en: 'Other', hi: 'अन्य' },
];

export function CommunityWallView({ lang, onCheckInKavach }: CommunityWallViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filterCategory, setFilterCategory] = useState<'ALL' | CommunityCategory>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [story, setStory] = useState('');
  const [suspiciousLink, setSuspiciousLink] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('Fake Link');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
      setFormError(lang === 'hi' ? 'JPG, PNG या WebP चुनें।' : 'Use JPG, PNG, or WebP.');
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
      setFormError(lang === 'hi' ? 'कहानी, लिंक या फोटो जोड़ें।' : 'Add a story, link, or photo.');
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
      if (!res.ok) throw new Error(data.error || 'Could not post.');

      setPosts((prev) => [data.post as CommunityPost, ...prev]);
      setStory('');
      setSuspiciousLink('');
      setCity('');
      setImageDataUrl(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Post failed.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleHelpful = async (postId: string) => {
    if (upvotedIds[postId]) return;
    setUpvotedIds((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/community/${encodeURIComponent(postId)}/helpful`, { method: 'POST' });
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
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[22px] sm:text-[30px] md:text-[34px] font-extrabold tracking-[-0.02em] text-[#0F172A] leading-tight">
          {lang === 'hi' ? 'गुमनाम मंच' : 'Anonymous Community'}
        </h1>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#166534] bg-[#F0FDF4] border border-[#86EFAC] rounded-md px-2.5 py-1">
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          {lang === 'hi' ? '100% गुमनाम' : '100% Anonymous'}
        </span>
      </div>

      {/* Composer */}
      <section className="card-resting rounded-lg p-4 sm:p-5">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <textarea
            rows={2}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={lang === 'hi' ? 'अपने साथ हुआ स्कैम लिखें...' : 'Share what scam happened...'}
            className="w-full p-3.5 rounded-lg bg-white border border-[#94A3B8] text-sm sm:text-base text-[#0F172A] placeholder:text-[#64748B]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              aria-label="Scam Type"
              value={category}
              onChange={(e) => setCategory(e.target.value as CommunityCategory)}
              className="w-full min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'hi' ? c.hi : c.en}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={suspiciousLink}
              onChange={(e) => setSuspiciousLink(e.target.value)}
              placeholder={lang === 'hi' ? 'लिंक या UPI (वैकल्पिक)' : 'Link / UPI (optional)'}
              className="w-full min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] font-mono text-sm text-[#0F172A]"
            />

            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={lang === 'hi' ? 'शहर (वैकल्पिक)' : 'City (optional)'}
              className="w-full min-h-[42px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
            />
          </div>

          {imageDataUrl && (
            <div className="relative inline-block rounded border border-[#CBD5E1] p-1.5 bg-[#F8FAFC]">
              <img src={imageDataUrl} alt="Preview" className="max-h-32 rounded object-contain" />
              <button
                type="button"
                onClick={() => setImageDataUrl(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {formError && <p className="text-xs sm:text-sm font-semibold text-[#991B1B]">{formError}</p>}

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isPosting}
              className="col-span-2 sm:col-span-1 min-h-[44px] px-5 rounded-lg bg-[#0F172A] text-white text-sm font-bold hover:bg-[#1E293B] disabled:opacity-60 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {lang === 'hi' ? 'पोस्ट करें' : 'Post'}
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
              className="min-h-[44px] px-3.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>{lang === 'hi' ? 'फोटो' : 'Photo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="min-h-[44px] px-3.5 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-semibold hover:bg-[#F1F5F9] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>{lang === 'hi' ? 'कैमरा' : 'Camera'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Scrollable Category Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap">
        <button
          type="button"
          onClick={() => setFilterCategory('ALL')}
          className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 ${
            filterCategory === 'ALL'
              ? 'bg-[#0F172A] text-white'
              : 'bg-white border border-[#CBD5E1] text-[#334155]'
          }`}
        >
          {lang === 'hi' ? 'सभी' : 'All'} ({posts.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilterCategory(c.id)}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 ${
              filterCategory === c.id
                ? 'bg-[#0F172A] text-white'
                : 'bg-white border border-[#CBD5E1] text-[#334155]'
            }`}
          >
            {lang === 'hi' ? c.hi : c.en}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="card-resting rounded-lg p-6 text-center text-sm text-[#475569]">
            {lang === 'hi' ? 'लोड हो रहा है…' : 'Loading…'}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="card-resting rounded-lg p-6 text-center text-sm text-[#475569]">
            {lang === 'hi' ? 'कोई पोस्ट नहीं।' : 'No stories yet.'}
          </div>
        ) : (
          visiblePosts.map((post) => {
            const isRepliesOpen = expandedReplies[post.id] ?? post.replies.length > 0;
            const waText = encodeURIComponent(
              `⚠️ Kavach Community (${getCategoryLabel(post.category)}): "${post.story.slice(0, 180)}"${
                post.suspiciousLink ? ` | ${defangUrl(post.suspiciousLink)}` : ''
              } | 1930`
            );

            return (
              <article key={post.id} className="card-resting rounded-lg p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F1F5F9] text-xs text-[#475569]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-[#0F172A]">{post.alias}</span>
                    <span>·</span>
                    <span>{post.city}</span>
                    <span>·</span>
                    <span className="font-semibold text-[#991B1B]">{getCategoryLabel(post.category)}</span>
                  </div>
                  <span className="tabular-nums">{formatTimestamp(post.createdAt)}</span>
                </div>

                <p className="text-sm sm:text-base leading-relaxed text-[#0F172A] whitespace-pre-wrap break-words">
                  {post.story}
                </p>

                {post.suspiciousLink && (
                  <div className="rounded bg-[#FEF2F2] border border-[#FCA5A5] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[#991B1B] break-all">
                      {defangUrl(post.suspiciousLink)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onCheckInKavach(
                          `${post.story}\n${post.suspiciousLink}`,
                          /^https?:\/\//i.test(post.suspiciousLink || '') ? post.suspiciousLink : undefined
                        )
                      }
                      className="px-2.5 py-1 rounded bg-[#0F172A] text-white text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {lang === 'hi' ? 'जांचें' : 'Check'}
                    </button>
                  </div>
                )}

                {post.imageDataUrl && (
                  <div className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                    <img
                      src={post.imageDataUrl}
                      alt="Shared screenshot"
                      className="max-h-72 rounded object-contain mx-auto"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleHelpful(post.id)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1 tabular-nums ${
                        upvotedIds[post.id]
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A]'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {post.helpfulCount}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReplies((prev) => ({ ...prev, [post.id]: !isRepliesOpen }))
                      }
                      className="px-3 py-1.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] inline-flex items-center gap-1 tabular-nums"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {post.replies.length}
                    </button>
                  </div>

                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </div>

                {isRepliesOpen && (
                  <div className="pt-2 space-y-2 border-t border-[#F1F5F9]">
                    {post.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-xs sm:text-sm space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-[#475569]">
                          <span className="font-bold text-[#0F172A]">{rep.alias}</span>
                          <span className="tabular-nums">{formatTimestamp(rep.createdAt)}</span>
                        </div>
                        <p className="text-[#334155]">{rep.message}</p>
                      </div>
                    ))}

                    <form onSubmit={(e) => handleSendReply(e, post.id)} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyDrafts[post.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder={lang === 'hi' ? 'जवाब लिखें...' : 'Write a reply...'}
                        className="flex-1 min-w-0 min-h-[40px] px-3 rounded-lg bg-white border border-[#94A3B8] text-sm text-[#0F172A]"
                      />
                      <button
                        type="submit"
                        className="min-h-[40px] px-3.5 rounded-lg bg-[#0F172A] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0"
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
