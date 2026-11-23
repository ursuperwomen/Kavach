import type { CommunityCategory, CommunityPost, CommunityReply } from '../src/types/forensics';

const VALID_CATEGORIES = new Set<CommunityCategory>([
  'Fake Link',
  'Bank / UPI',
  'Fake Loan App',
  'Job / WhatsApp',
  'Investment / Betting',
  'Other',
]);

class CommunityStore {
  private posts: CommunityPost[] = [];
  private seq = 410;

  constructor() {
    const now = Date.now();
    this.posts = [
      {
        id: 'POST-401',
        alias: 'Anonymous Citizen #401',
        city: 'Jaipur',
        category: 'Bank / UPI',
        createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
        story:
          'मेरे पापा के फोन पर SMS आया कि SBI YONO KYC आज बंद हो जाएगा और 2 घंटे में खाता ब्लॉक होगा। लिंक http://sbi-kyc-verify-portal.xyz पर ₹1 भेजने को कहा। शुक्र है हमने पहले Kavach पर जांच ली और पापा बच गए। कृपया अपने घर के बड़ों को सावधान करें!',
        suspiciousLink: 'http://sbi-kyc-verify-portal.xyz/pan-update',
        helpfulCount: 28,
        replies: [
          {
            id: 'REP-1',
            alias: 'Anonymous Citizen #219',
            createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
            message:
              'बिल्कुल यही मैसेज कल मेरी मम्मी को भी आया था! असली बैंक कभी .xyz लिंक नहीं भेजता। शेयर करने के लिए शुक्रिया।',
          },
          {
            id: 'REP-2',
            alias: 'Anonymous Citizen #305',
            createdAt: new Date(now - 1 * 3600 * 1000).toISOString(),
            message: 'Also report that sender number on 1930 so others stay safe!',
          },
        ],
      },
      {
        id: 'POST-402',
        alias: 'Anonymous Citizen #402',
        city: 'Pune',
        category: 'Job / WhatsApp',
        createdAt: new Date(now - 7 * 3600 * 1000).toISOString(),
        story:
          'I got a WhatsApp message offering ₹5,000 daily just for liking YouTube videos. They actually sent me ₹150 first to win my trust, then added me to a Telegram group asking for ₹5,000 "prepaid merchant task". When I refused, they blocked me. Never pay money to get a job!',
        suspiciousLink: 'https://bit.ly/yt-task-bonus-2026',
        helpfulCount: 41,
        replies: [
          {
            id: 'REP-3',
            alias: 'Anonymous Citizen #118',
            createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
            message:
              'Same thing happened to my cousin. They pay ₹150–₹300 initially only as bait. Good thing you stopped before paying!',
          },
        ],
      },
      {
        id: 'POST-403',
        alias: 'Anonymous Citizen #403',
        city: 'Lucknow',
        category: 'Fake Loan App',
        createdAt: new Date(now - 14 * 3600 * 1000).toISOString(),
        story:
          'किसी ने WhatsApp पर QuickRupee VIP नाम का .apk फाइल भेजा — "बिना CIBIL 5 मिनट में लोन"। इंस्टॉल करते ही उसने Contacts और Photos की परमिशन ले ली। तुरंत अनइंस्टॉल कर दिया। कभी भी Play Store के बाहर से कोई लोन ऐप डाउनलोड न करें।',
        suspiciousLink: 'http://verify-kyc-secure.xyz/downloads/QuickRupee_VIP_v4.2.apk',
        helpfulCount: 34,
        replies: [
          {
            id: 'REP-4',
            alias: 'Anonymous Citizen #512',
            createdAt: new Date(now - 11 * 3600 * 1000).toISOString(),
            message:
              'Good warning! Fake loan APKs steal contacts to harass family members. Always check RBI NBFC list first.',
          },
        ],
      },
      {
        id: 'POST-404',
        alias: 'Anonymous Citizen #404',
        city: 'Bengaluru',
        category: 'Fake Link',
        createdAt: new Date(now - 22 * 3600 * 1000).toISOString(),
        story:
          'Received a WhatsApp notice saying electricity will be cut off at 9:30 PM tonight and asking to install an APK from ebill-desk-pay.top and pay ₹12 to powerdesk.help@okaxis. Checked my official BESCOM app — bill was already paid! Total scam.',
        suspiciousLink: 'http://ebill-desk-pay.top/support.apk',
        helpfulCount: 19,
        replies: [],
      },
    ];
  }

  private randomAlias(): string {
    const num = Math.floor(100 + Math.random() * 899);
    return `Anonymous Citizen #${num}`;
  }

  getAllPosts(category?: string, query?: string): CommunityPost[] {
    let list = this.posts;
    if (category && category !== 'ALL') {
      list = list.filter((p) => p.category === category);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) =>
        [p.story, p.city, p.category, p.suspiciousLink || '', p.alias]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }

  addPost(input: {
    story: string;
    city?: string;
    category?: CommunityCategory;
    suspiciousLink?: string;
    imageDataUrl?: string;
  }): CommunityPost {
    const safeCategory: CommunityCategory =
      input.category && VALID_CATEGORIES.has(input.category) ? input.category : 'Other';

    const post: CommunityPost = {
      id: `POST-${this.seq++}`,
      alias: this.randomAlias(),
      city: input.city?.trim().slice(0, 60) || 'India',
      category: safeCategory,
      createdAt: new Date().toISOString(),
      story: input.story.trim().slice(0, 2000),
      suspiciousLink: input.suspiciousLink?.trim().slice(0, 500) || undefined,
      imageDataUrl: input.imageDataUrl,
      helpfulCount: 1,
      replies: [],
    };

    this.posts.unshift(post);
    return post;
  }

  addReply(postId: string, message: string): CommunityPost | undefined {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return undefined;

    const reply: CommunityReply = {
      id: `REP-${Date.now()}`,
      alias: this.randomAlias(),
      createdAt: new Date().toISOString(),
      message: message.trim().slice(0, 800),
    };
    post.replies.push(reply);
    return post;
  }

  incrementHelpful(postId: string): CommunityPost | undefined {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return undefined;
    post.helpfulCount += 1;
    return post;
  }
}

export const communityStore = new CommunityStore();
