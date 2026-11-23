import type { SampleCasePreset } from '../types/forensics';

export const R4C_SAMPLE_PRESETS: SampleCasePreset[] = [
  {
    id: 'sample-kyc-sms',
    label: 'Fake Bank KYC Suspension SMS',
    shortDesc: 'Impersonates SBI with look-alike domain & urgent 2-hour cutoff',
    expectedRisk: 'HIGH',
    assetType: 'message',
    channel: 'SMS',
    senderInfo: '+91-98710-44219',
    content:
      'URGENT ALERT: Dear Customer, your SB1 YONO KYC has EXPIRED today. Your bank account will be PERMANENTLY BLOCKED within 2 hours. Update PAN immediately at http://sbi-kyc-verify-portal.xyz/pan-update or pay Rs 1 verification fee to fastpay.verify@ybl. Helpline: +91-98710-44219',
  },
  {
    id: 'sample-electricity-wa',
    label: 'Electricity Disconnection WhatsApp',
    shortDesc: 'Coercive bill cutoff threat directing victims to UPI & APK link',
    expectedRisk: 'HIGH',
    assetType: 'message',
    channel: 'WhatsApp',
    senderInfo: '+91-98710-44219',
    content:
      'FINAL NOTICE: Dear Consumer, your electricity power supply will be DISCONNECTED tonight at 9:30 PM because last month bill was not updated. Immediately call Electricity Officer Mr. Sharma at +91-98710-44219 or download QuickSupport app from http://ebill-desk-pay.top/support.apk and settle Rs 12 to powerdesk.help@okaxis.',
  },
  {
    id: 'sample-loan-apk',
    label: 'Fake Instant Loan APK ("QuickRupee VIP")',
    shortDesc: 'Sideloaded APK requesting Contacts, SMS, Call Logs & Camera access',
    expectedRisk: 'HIGH',
    assetType: 'apk',
    channel: 'Android APK / Store',
    url: 'http://verify-kyc-secure.xyz/downloads/QuickRupee_VIP_v4.2.apk',
    content:
      'Instant Rs 50,000 Cash Loan in 5 Minutes — Zero CIBIL Check! Approved instantly with Aadhaar & Selfie. Repay via fastpay.verify@ybl or contact support +91-98710-44219.',
    apkMetadata: {
      appName: 'QuickRupee VIP Instant Cash',
      packageName: 'com.quickrupee.vip.cashloan',
      versionName: '4.2.9-release',
      source: 'Third-party WhatsApp / Direct APK Download',
      signerFingerprint: 'SHA256:9F:44:C1:8B:E2:00:7A:19:DE:FA:41:2C (Self-Signed Debug Key)',
      fileSizeKb: 14820,
      archiveEntriesCount: 612,
      permissions: [
        'android.permission.READ_CONTACTS',
        'android.permission.READ_SMS',
        'android.permission.RECEIVE_SMS',
        'android.permission.READ_CALL_LOG',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.INTERNET',
      ],
      embeddedStrings: [
        'http://185.224.128.44:8080/api/v2/upload_contacts',
        'https://verify-kyc-secure.xyz/loan/harvest',
        'fastpay.verify@ybl',
        '+91-98710-44219',
      ],
    },
  },
  {
    id: 'sample-ponzi-site',
    label: 'Ponzi / MLM Crypto Doubler Website',
    shortDesc: 'Promises 300% guaranteed monthly returns with 5-tier referral bonuses',
    expectedRisk: 'HIGH',
    assetType: 'website',
    channel: 'Web Browser',
    url: 'https://apexwealth-vip-returns.vip/join?ref=VIP889',
    content:
      'APEXWEALTH GLOBAL AI TRADING — 100% GUARANTEED RISK-FREE RETURNS! Earn 10% DAILY PROFIT (300% Monthly ROI) automatically. Join VIP Level 3 by depositing Rs 25,000 via UPI: apexwealth.pool@paytm or USDT TRC20 Wallet: TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE. Refer 5 friends to unlock 25% Level-1 and 12% Level-2 MLM commission! Bank Transfer: A/C 409281736455 IFSC SBIN0004912. WhatsApp Mentor: +91-81204-77310.',
  },
  {
    id: 'sample-betting-site',
    label: 'Illegal Cricket & Color Betting Site',
    shortDesc: 'Offshore mirror domain promoting Aviator, color prediction & cricket satta',
    expectedRisk: 'HIGH',
    assetType: 'website',
    channel: 'Social Media',
    url: 'http://win365live-exchange.cc/register-bonus',
    content:
      'WIN365LIVE EXCHANGE — India No.1 Cricket Satta, Aviator Crash & Color Prediction Game! Get 500% Instant Welcome Bonus & 2-Minute Withdrawal. Deposit via UPI win365.deposit@ybl or fastpay.verify@ybl. Get your betting ID on Telegram / WhatsApp +91-70421-99812. No KYC required!',
  },
  {
    id: 'sample-job-task',
    label: 'Part-Time YouTube Task Scam',
    shortDesc: 'Unsolicited WhatsApp offer promising Rs 5,000/day for liking videos',
    expectedRisk: 'MEDIUM',
    assetType: 'message',
    channel: 'WhatsApp',
    senderInfo: '+91-81204-77310',
    content:
      'Hello! I am HR Priya from Digital Media Agency. Earn Rs 3,000 to Rs 8,000 daily from home by simply liking YouTube videos and completing prepaid merchant tasks. Instant Rs 150 bonus on Telegram! Click https://bit.ly/yt-task-bonus-2026 or message +91-81204-77310.',
  },
  {
    id: 'sample-genuine-indiapost',
    label: 'Genuine India Post Tracking SMS',
    shortDesc: 'Legitimate official parcel notification with verified .gov.in domain',
    expectedRisk: 'LOW',
    assetType: 'message',
    channel: 'SMS',
    senderInfo: 'AD-INPOST',
    content:
      'India Post: Your Speed Post article EM482910442IN has been dispatched from Bengaluru NSH and is scheduled for delivery tomorrow. Track status officially at https://www.indiapost.gov.in. India Post never asks for OTP or card payment over links.',
  },
  {
    id: 'sample-genuine-bank',
    label: 'Official Bank Portal URL (Legitimate)',
    shortDesc: 'Verified HTTPS banking domain with no suspicious patterns',
    expectedRisk: 'LOW',
    assetType: 'url',
    channel: 'Web Browser',
    url: 'https://www.onlinesbi.sbi/personal/login',
    content:
      'Official State Bank of India Online Banking login page over verified HTTPS on the .sbi top-level domain.',
  },
];
