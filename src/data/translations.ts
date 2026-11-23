import type { AppLanguage, ScamNewsItem } from '../types/forensics';

export const TRENDING_SCAM_NEWS: ScamNewsItem[] = [
  {
    id: 'news-1',
    date: 'Nov 2026',
    severity: 'HIGH',
    tagEn: 'Bank KYC',
    tagHi: 'बैंक KYC',
    titleEn: 'Fake "SBI YONO KYC Expired" SMS Link',
    titleHi: 'नकली "SBI YONO KYC बंद" SMS लिंक',
    summaryEn: 'Uses .xyz links and Rs 1 UPI demand to steal bank logins.',
    summaryHi: '.xyz लिंक व ₹1 UPI मांगकर बैंक खाता खाली किया जाता है।',
    sampleTriggerText:
      'URGENT ALERT: Your SB1 YONO KYC has EXPIRED today. Account will be BLOCKED in 2 hours. Update at http://sbi-kyc-verify-portal.xyz/pan-update or pay Rs 1 to fastpay.verify@ybl',
    sampleUrl: 'http://sbi-kyc-verify-portal.xyz/pan-update',
  },
  {
    id: 'news-2',
    date: 'Nov 2026',
    severity: 'HIGH',
    tagEn: 'Utility APK',
    tagHi: 'बिजली बिल APK',
    titleEn: 'Electricity Cutoff Tonight — Fake Support APK',
    titleHi: 'रात 9:30 बिजली कटने का फर्जी APK लिंक',
    summaryEn: 'Pushes remote-access .apk on WhatsApp to hijack phones.',
    summaryHi: 'WhatsApp पर .apk भेजकर फोन हैक किया जाता है।',
    sampleTriggerText:
      'FINAL NOTICE: Electricity supply will be DISCONNECTED tonight at 9:30 PM. Call +91-98710-44219 or install http://ebill-desk-pay.top/support.apk and pay Rs 12 to powerdesk.help@okaxis.',
    sampleUrl: 'http://ebill-desk-pay.top/support.apk',
  },
  {
    id: 'news-3',
    date: 'Nov 2026',
    severity: 'HIGH',
    tagEn: 'Ponzi / Crypto',
    tagHi: 'फर्जी निवेश',
    titleEn: '"300% Monthly ROI" Fake Trading Groups',
    titleHi: '"300% मुनाफा" फर्जी WhatsApp निवेश ग्रुप',
    summaryEn: 'Collects deposits via UPI/USDT, then blocks withdrawals.',
    summaryHi: 'UPI/क्रिप्टो से पैसे लेकर निकासी बंद कर दी जाती है।',
    sampleTriggerText:
      'APEXWEALTH AI TRADING — 100% GUARANTEED 300% Monthly ROI! Deposit via UPI apexwealth.pool@paytm or TRC20 TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE. Join https://apexwealth-vip-returns.vip/join',
    sampleUrl: 'https://apexwealth-vip-returns.vip/join',
  },
  {
    id: 'news-4',
    date: 'Nov 2026',
    severity: 'MEDIUM',
    tagEn: 'Job Scam',
    tagHi: 'जॉब स्कैम',
    titleEn: 'YouTube Like Task → Prepaid Deposit Trap',
    titleHi: 'YouTube लाइक जॉब → प्रीपेड टास्क ठगी',
    summaryEn: 'Pays Rs 150 first, then traps users in paid Telegram tasks.',
    summaryHi: 'पहले ₹150 देकर फिर टेलीग्राम टास्क में हजारों ठगते हैं।',
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
    promptEn: '"Bank account closes in 1 hr! Verify PAN at http://sbi-kyc-fast.xyz"',
    promptHi: '"1 घंटे में खाता बंद! अभी http://sbi-kyc-fast.xyz पर PAN डालें।"',
    isScam: true,
    explainEn: 'Scam. Real banks never send .xyz links or 1-hour threats.',
    explainHi: 'स्कैम! असली बैंक कभी .xyz लिंक या ऐसी धमकी नहीं भेजते।',
  },
  {
    id: 'q2',
    promptEn: '"India Post: Parcel dispatched. Track at https://www.indiapost.gov.in"',
    promptHi: '"इंडिया पोस्ट: पार्सल रवाना। https://www.indiapost.gov.in पर देखें।"',
    isScam: false,
    explainEn: 'Safe. Official .gov.in link with HTTPS and no OTP request.',
    explainHi: 'सुरक्षित! आधिकारिक .gov.in वेबसाइट, कोई OTP नहीं मांगा।',
  },
  {
    id: 'q3',
    promptEn: '"You won Rs 25 Lakh! Scan QR and enter UPI PIN to receive money."',
    promptHi: '"₹25 लाख लॉटरी जीती! पैसे लेने के लिए QR स्कैन कर UPI PIN डालें।"',
    isScam: true,
    explainEn: 'Scam. You NEVER enter a UPI PIN to receive money.',
    explainHi: 'स्कैम! पैसे लेने के लिए कभी UPI PIN नहीं डालना पड़ता।',
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
    navReportCta: '1930 Help',
    heroTitle: 'Check if it is a scam?',
    heroSub: '',
    inputPlaceholder: 'Paste link, SMS, WhatsApp text, phone, or UPI ID...',
    checkBtn: 'Check Now',
    checkingBtn: 'Checking…',
    cameraBtn: 'Camera',
    photoUploadBtn: 'Photo',
    voiceBtn: 'Speak',
    voiceStopBtn: 'Stop',
    audioUploadBtn: 'Audio',
    apkAdvancedToggle: 'Scan Android .APK',
    trendingHeading: 'Trending Scams',
    trendingSub: '',
    checkThisBtn: 'Check',
    shareWaBtn: 'WhatsApp',
    copyWaBtn: 'Copy Alert',
    copiedWaBtn: 'Copied!',
    listenBtn: 'Listen',
    listeningBtn: 'Stop Audio',
    reportPoliceTitle: 'Report to Cyber Police',
    reportPoliceSub: 'Log evidence & get a PDF complaint receipt.',
    reportPoliceBtn: 'Submit Report',
    emergencyBannerTitle: 'Lost money or clicked a link? Act now:',
    emergencyStep1: 'Call 1930 immediately to freeze the transfer.',
    emergencyStep2: 'Block your card / UPI app. Never share any OTP.',
    emergencyStep3: 'Submit the police report & save the PDF evidence.',
    verdictHigh: 'SCAM / FAKE',
    verdictMed: 'SUSPICIOUS',
    verdictLow: 'LOOKS SAFE',
    whatIsItLabel: 'Summary',
    whyFlaggedLabel: 'Evidence & Reasons',
    whatToDoLabel: 'Next Steps',
  },
  hi: {
    brand: 'कवच',
    brandSub: 'Kavach',
    navCheck: 'जांच करें',
    navNews: 'ट्रेंडिंग स्कैम',
    navCases: 'गुमनाम मंच',
    navHeat: 'हीट-लिस्ट',
    navReportCta: 'हेल्प 1930',
    heroTitle: 'जांचें — क्या यह स्कैम है?',
    heroSub: '',
    inputPlaceholder: 'लिंक, SMS, WhatsApp मैसेज, नंबर या UPI पेस्ट करें...',
    checkBtn: 'अभी जांचें',
    checkingBtn: 'जांच जारी…',
    cameraBtn: 'कैमरा',
    photoUploadBtn: 'फोटो',
    voiceBtn: 'बोलें',
    voiceStopBtn: 'रुकें',
    audioUploadBtn: 'ऑडियो',
    apkAdvancedToggle: 'Android .APK जांचें',
    trendingHeading: 'ट्रेंडिंग स्कैम',
    trendingSub: '',
    checkThisBtn: 'जांचें',
    shareWaBtn: 'WhatsApp शेयर',
    copyWaBtn: 'मैसेज कॉपी',
    copiedWaBtn: 'कॉपी हो गया!',
    listenBtn: 'आवाज़ में सुनें',
    listeningBtn: 'रोकें',
    reportPoliceTitle: 'साइबर पुलिस को रिपोर्ट करें',
    reportPoliceSub: 'शिकायत दर्ज करें और PDF रसीद पाएं।',
    reportPoliceBtn: 'रिपोर्ट दर्ज करें',
    emergencyBannerTitle: 'पैसे कटे या लिंक खुला? तुरंत करें:',
    emergencyStep1: 'तुरंत 1930 पर कॉल कर पैसा फ्रीज कराएं।',
    emergencyStep2: 'कार्ड / UPI ब्लॉक करें। कोई OTP न बताएं।',
    emergencyStep3: 'पुलिस रिपोर्ट दर्ज कर PDF सबूत सेव करें।',
    verdictHigh: 'खतरा — स्कैम / नकली',
    verdictMed: 'सावधान — संदिग्ध',
    verdictLow: 'सुरक्षित लगता है',
    whatIsItLabel: 'संक्षिप्त जानकारी',
    whyFlaggedLabel: 'कारण और सबूत',
    whatToDoLabel: 'अभी क्या करें',
  },
};
