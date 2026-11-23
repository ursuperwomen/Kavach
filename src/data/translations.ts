import type { AppLanguage, ScamNewsItem } from '../types/forensics';

export const TRENDING_SCAM_NEWS: ScamNewsItem[] = [
  {
    id: 'news-1',
    date: 'Active Alert · Nov 2026',
    severity: 'HIGH',
    tagEn: 'Bank KYC Fraud',
    tagHi: 'बैंक KYC धोखाधड़ी',
    titleEn: 'Fake "SBI YONO KYC Expired" SMS spreading on WhatsApp & SMS',
    titleHi: 'नकली "SBI YONO KYC बंद होने" वाला SMS और लिंक तेजी से फैल रहा है',
    summaryEn:
      'Fraudsters send look-alike .xyz links threatening 2-hour account block and asking for Rs 1 UPI verification.',
    summaryHi:
      'ठग 2 घंटे में खाता बंद होने का डर दिखाकर .xyz लिंक और ₹1 UPI भेजने को कहते हैं।',
    sampleTriggerText:
      'URGENT ALERT: Your SB1 YONO KYC has EXPIRED today. Account will be BLOCKED in 2 hours. Update at http://sbi-kyc-verify-portal.xyz/pan-update or pay Rs 1 to fastpay.verify@ybl',
    sampleUrl: 'http://sbi-kyc-verify-portal.xyz/pan-update',
  },
  {
    id: 'news-2',
    date: 'Active Alert · Nov 2026',
    severity: 'HIGH',
    tagEn: 'Digital Arrest & Utility',
    tagHi: 'बिजली बिल / फर्जी कॉल',
    titleEn: 'Electricity Cutoff Tonight — Fake Officer Pushing Remote-Access APK',
    titleHi: '"आज रात 9:30 बजे बिजली कट जाएगी" — फर्जी अधिकारी APK ऐप डाउनलोड करवा रहे हैं',
    summaryEn:
      'Scammers pose as electricity officers and send QuickSupport .apk links on WhatsApp to take over victim phones.',
    summaryHi:
      'ठग बिजली विभाग के नाम पर व्हाट्सऐप पर .apk फाइल भेजते हैं जिससे पूरा फोन हैक हो जाता है।',
    sampleTriggerText:
      'FINAL NOTICE: Electricity supply will be DISCONNECTED tonight at 9:30 PM. Call +91-98710-44219 or install http://ebill-desk-pay.top/support.apk and pay Rs 12 to powerdesk.help@okaxis.',
    sampleUrl: 'http://ebill-desk-pay.top/support.apk',
  },
  {
    id: 'news-3',
    date: 'Active Alert · Nov 2026',
    severity: 'HIGH',
    tagEn: 'Ponzi / Investment',
    tagHi: 'फर्जी निवेश / दोगुना पैसा',
    titleEn: '"300% Monthly AI Trading" WhatsApp Groups Stealing Senior Savings',
    titleHi: '"महीने में 300% पक्का मुनाफा" — फर्जी WhatsApp निवेश ग्रुप से बचें',
    summaryEn:
      'Fake VIP trading portals show fabricated profits, collect money via mule UPI & USDT wallets, and block withdrawals.',
    summaryHi:
      'नकली वेबसाइट पर झूठा मुनाफा दिखाकर UPI और क्रिप्टो से पैसे जमा करवाए जाते हैं और फिर निकासी रोक दी जाती है।',
    sampleTriggerText:
      'APEXWEALTH AI TRADING — 100% GUARANTEED 300% Monthly ROI! Deposit via UPI apexwealth.pool@paytm or TRC20 TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE. Join https://apexwealth-vip-returns.vip/join',
    sampleUrl: 'https://apexwealth-vip-returns.vip/join',
  },
  {
    id: 'news-4',
    date: 'Advisory · Nov 2026',
    severity: 'MEDIUM',
    tagEn: 'Job & Task Scam',
    tagHi: 'पार्ट-टाइम जॉब स्कैम',
    titleEn: 'YouTube Video Like Task Offers Turning Into Prepaid Deposit Traps',
    titleHi: 'YouTube वीडियो लाइक करके रोज ₹5,000 कमाने का झांसा',
    summaryEn:
      'Initially pays Rs 150 to build trust, then traps victims into depositing thousands in Telegram prepaid tasks.',
    summaryHi:
      'पहले ₹150 देकर भरोसा जीतते हैं, फिर टेलीग्राम पर "प्रीपेड टास्क" के नाम पर हजारों रुपये ठग लेते हैं।',
    sampleTriggerText:
      'HR Priya: Earn Rs 5,000 daily from home by liking YouTube videos and prepaid tasks! Click https://bit.ly/yt-task-bonus-2026 or message +91-81204-77310.',
    sampleUrl: 'https://bit.ly/yt-task-bonus-2026',
  },
];

export interface SpotTheScamQuizItem {
  id: string;
  promptEn: string;
  promptHi: string;
  isScam: boolean;
  explainEn: string;
  explainHi: string;
}

export const SPOT_THE_SCAM_QUIZ: SpotTheScamQuizItem[] = [
  {
    id: 'q1',
    promptEn: '"Your bank account will close in 1 hour! Click http://sbi-kyc-fast.xyz to verify PAN now."',
    promptHi: '"आपका बैंक खाता 1 घंटे में बंद हो जाएगा! अभी http://sbi-kyc-fast.xyz पर PAN डालें।"',
    isScam: true,
    explainEn: 'FAKE SCAM! Real banks never use .xyz links or threaten 1-hour shutdown via SMS.',
    explainHi: 'यह स्कैम है! असली बैंक कभी .xyz लिंक नहीं भेजते और न 1 घंटे में खाता बंद करने की धमकी देते हैं।',
  },
  {
    id: 'q2',
    promptEn: '"India Post: Speed Post EM482910442IN dispatched. Track at https://www.indiapost.gov.in. We never ask for OTP."',
    promptHi: '"इंडिया पोस्ट: आपका पार्सल रवाना हो गया है। https://www.indiapost.gov.in पर देखें। हम कभी OTP नहीं मांगते।"',
    isScam: false,
    explainEn: 'REAL & SAFE! Official .gov.in government website with HTTPS and no money or OTP demand.',
    explainHi: 'असली और सुरक्षित! यह सरकारी .gov.in वेबसाइट है और इसमें कोई पैसा या OTP नहीं मांगा गया है।',
  },
  {
    id: 'q3',
    promptEn: '"Congratulations! You won a Rs 25 Lakh Lottery! Just scan this QR code and enter your UPI PIN to receive money."',
    promptHi: '"बधाई हो! आपकी ₹25 लाख की लॉटरी लगी है! पैसे लेने के लिए QR कोड स्कैन करके UPI PIN डालें।"',
    isScam: true,
    explainEn: 'FAKE SCAM! Remember the golden rule: You NEVER enter your UPI PIN to RECEIVE money—PIN only SENDS money.',
    explainHi: 'पक्का स्कैम! हमेशा याद रखें: पैसे लेने के लिए कभी UPI PIN नहीं डालना पड़ता — PIN डालने से पैसे कटते हैं।',
  },
];

export const UI_COPY: Record<
  AppLanguage,
  {
    brand: string;
    brandSub: string;
    navCheck: string;
    navNews: string;
    navCases: string;
    navHeat: string;
    navReportCta: string;
    heroTitle: string;
    heroSub: string;
    inputPlaceholder: string;
    checkBtn: string;
    checkingBtn: string;
    cameraBtn: string;
    photoUploadBtn: string;
    voiceBtn: string;
    voiceStopBtn: string;
    audioUploadBtn: string;
    apkAdvancedToggle: string;
    trendingHeading: string;
    trendingSub: string;
    checkThisBtn: string;
    shareWaBtn: string;
    copyWaBtn: string;
    copiedWaBtn: string;
    listenBtn: string;
    listeningBtn: string;
    reportPoliceTitle: string;
    reportPoliceSub: string;
    reportPoliceBtn: string;
    emergencyBannerTitle: string;
    emergencyStep1: string;
    emergencyStep2: string;
    emergencyStep3: string;
    verdictHigh: string;
    verdictMed: string;
    verdictLow: string;
    whatIsItLabel: string;
    whyFlaggedLabel: string;
    whatToDoLabel: string;
  }
> = {
  en: {
    brand: 'Kavach',
    brandSub: 'कवच',
    navCheck: 'Check Link',
    navNews: 'Trending Scams',
    navCases: 'Community',
    navHeat: 'Heat-List',
    navReportCta: 'Emergency 1930',
    heroTitle: 'Check if it is a scam?',
    heroSub: '',
    inputPlaceholder:
      'Paste any link, SMS, WhatsApp message, phone, or UPI ID...',
    checkBtn: 'Check Now',
    checkingBtn: 'Checking…',
    cameraBtn: 'Take Photo',
    photoUploadBtn: 'Upload Photo',
    voiceBtn: 'Speak',
    voiceStopBtn: 'Stop & Check',
    audioUploadBtn: 'Audio File',
    apkAdvancedToggle: 'Check an Android .APK file or App Store link',
    trendingHeading: 'Trending Scam Links & Cyber Alerts',
    trendingSub: 'Latest frauds reported across India today — tap to inspect or warn family on WhatsApp.',
    checkThisBtn: 'Check This',
    shareWaBtn: 'Share Alert on WhatsApp',
    copyWaBtn: 'Copy Warning for WhatsApp',
    copiedWaBtn: 'Copied!',
    listenBtn: 'Listen in Audio',
    listeningBtn: 'Playing Audio…',
    reportPoliceTitle: 'Report This Scam to Cyber Police',
    reportPoliceSub:
      'Submit directly to the Cyber Cell Investigation Ledger & get an official evidence receipt.',
    reportPoliceBtn: 'Submit Police Report',
    emergencyBannerTitle: 'Already clicked or lost money? Do these 3 steps immediately:',
    emergencyStep1: 'Call 1930 right away (National Cybercrime Helpline — Golden Hour freeze).',
    emergencyStep2: 'Freeze your bank card / UPI app and never share any new OTP.',
    emergencyStep3: 'Submit the Police Report below and download the Evidence Sheet.',
    verdictHigh: 'DANGER — SCAM / FAKE',
    verdictMed: 'BE CAREFUL — SUSPICIOUS',
    verdictLow: 'SAFE — LOOKS REAL',
    whatIsItLabel: 'What is this link / message?',
    whyFlaggedLabel: 'Why Kavach gave this result',
    whatToDoLabel: 'What you should do now',
  },
  hi: {
    brand: 'कवच',
    brandSub: 'Kavach',
    navCheck: 'जांच करें',
    navNews: 'ट्रेंडिंग स्कैम',
    navCases: 'गुमनाम मंच',
    navHeat: 'हीट-लिस्ट',
    navReportCta: 'हेल्पलाइन 1930',
    heroTitle: 'जांचें — क्या यह स्कैम है?',
    heroSub: '',
    inputPlaceholder:
      'यहाँ कोई भी लिंक, SMS, WhatsApp मैसेज, नंबर या UPI डालें...',
    checkBtn: 'अभी जांचें',
    checkingBtn: 'जांच हो रही है…',
    cameraBtn: 'कैमरा से फोटो',
    photoUploadBtn: 'फोटो चुनें',
    voiceBtn: 'बोलकर पूछें',
    voiceStopBtn: 'रुकें व जांचें',
    audioUploadBtn: 'ऑडियो फाइल',
    apkAdvancedToggle: 'एंड्रॉइड .APK फाइल या ऐप की जांच करें',
    trendingHeading: 'आज के ट्रेंडिंग स्कैम लिंक और साइबर खबरें',
    trendingSub: 'देश में फैल रहे नए धोखे — परिवार को बचाने के लिए WhatsApp पर चेतावनी भेजें।',
    checkThisBtn: 'जांचें',
    shareWaBtn: 'WhatsApp पर शेयर करें',
    copyWaBtn: 'WhatsApp मैसेज कॉपी करें',
    copiedWaBtn: 'कॉपी हो गया!',
    listenBtn: 'आवाज़ में सुनें',
    listeningBtn: 'आवाज़ चल रही है…',
    reportPoliceTitle: 'साइबर पुलिस को रिपोर्ट करें',
    reportPoliceSub:
      'सीधे साइबर सेल डैशबोर्ड में शिकायत दर्ज करें और सबूत की रसीद डाउनलोड करें।',
    reportPoliceBtn: 'पुलिस रिपोर्ट दर्ज करें',
    emergencyBannerTitle: 'क्या पैसे कट गए या लिंक पर क्लिक हो गया? तुरंत ये 3 काम करें:',
    emergencyStep1: 'तुरंत 1930 पर कॉल करें (राष्ट्रीय साइबर हेल्पलाइन — पैसा फ्रीज करने के लिए)।',
    emergencyStep2: 'अपना बैंक कार्ड / UPI बंद करें और कोई भी नया OTP किसी को न बताएं।',
    emergencyStep3: 'नीचे पुलिस को रिपोर्ट करें और सबूत की रिपोर्ट डाउनलोड करें।',
    verdictHigh: 'खतरा — यह स्कैम / नकली है',
    verdictMed: 'सावधान — यह संदिग्ध है',
    verdictLow: 'सुरक्षित — यह असली लगता है',
    whatIsItLabel: 'यह लिंक / मैसेज किसका है?',
    whyFlaggedLabel: 'कवच ने यह नतीजा क्यों दिया',
    whatToDoLabel: 'अब आपको क्या करना चाहिए',
  },
};
