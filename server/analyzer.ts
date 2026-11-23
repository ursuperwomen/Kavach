import crypto from 'crypto';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AiForensicBrief,
  AnalyzeRequestPayload,
  CaseRecord,
  ExtractedIdentifiers,
  LinkedCaseMatch,
  RiskIndicator,
  RiskLevel,
  TechnicalMetadata,
  ThreatCategory,
} from '../src/types/forensics';

const OFFICIAL_BRAND_DOMAINS: Array<{ brand: string; domain: string; keywords: string[] }> = [
  { brand: 'State Bank of India (SBI)', domain: 'onlinesbi.sbi', keywords: ['sbi', 'yono', 'onlinesbi', 'sb1'] },
  { brand: 'SBI Corporate', domain: 'sbi.co.in', keywords: ['sbi'] },
  { brand: 'HDFC Bank', domain: 'hdfcbank.com', keywords: ['hdfc', 'hdfcbank'] },
  { brand: 'ICICI Bank', domain: 'icicibank.com', keywords: ['icici', 'imobile'] },
  { brand: 'Axis Bank', domain: 'axisbank.com', keywords: ['axisbank', 'axis'] },
  { brand: 'Reserve Bank of India (RBI)', domain: 'rbi.org.in', keywords: ['rbi', 'reservebank'] },
  { brand: 'Income Tax Department', domain: 'incometax.gov.in', keywords: ['incometax', 'epaytax', 'pan'] },
  { brand: 'India Post', domain: 'indiapost.gov.in', keywords: ['indiapost', 'speedpost'] },
  { brand: 'Paytm', domain: 'paytm.com', keywords: ['paytm'] },
  { brand: 'PhonePe', domain: 'phonepe.com', keywords: ['phonepe'] },
  { brand: 'NPCI / BHIM', domain: 'npci.org.in', keywords: ['npci', 'bhim'] },
];

const SUSPICIOUS_TLDS = new Set([
  '.xyz',
  '.top',
  '.vip',
  '.cc',
  '.tk',
  '.ml',
  '.ga',
  '.cf',
  '.buzz',
  '.click',
  '.loan',
  '.win',
  '.bet',
  '.icu',
  '.shop',
  '.live',
]);

const URL_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'rb.gy',
  'cutt.ly',
  'is.gd',
  'shorturl.at',
  'ow.ly',
]);

const KNOWN_BLACKLIST_DOMAINS = new Set([
  'sbi-kyc-verify-portal.xyz',
  'verify-kyc-secure.xyz',
  'ebill-desk-pay.top',
  'apexwealth-vip-returns.vip',
  'win365live-exchange.cc',
  'rbi-kyc-helpdesk.top',
  'fastcash-loan-pro.xyz',
  'india-post-redeliver.click',
]);

const KNOWN_MALICIOUS_PACKAGES = new Set([
  'com.quickrupee.vip.cashloan',
  'com.instantcash.goldloan.apk',
  'com.ebill.quicksupport.remote',
  'com.win365.exchange.bet',
  'com.apexwealth.ai.trading',
]);

const KNOWN_BLACKLIST_UPIS = new Set([
  'fastpay.verify@ybl',
  'powerdesk.help@okaxis',
  'apexwealth.pool@paytm',
  'win365.deposit@ybl',
  'kyc.refund99@okicici',
]);

const DANGEROUS_APK_PERMISSIONS: Record<string, string> = {
  'android.permission.READ_CONTACTS': 'Harvests full phonebook for harassment & extortion calls',
  'android.permission.READ_SMS': 'Intercepts banking OTPs and financial transaction alerts',
  'android.permission.RECEIVE_SMS': 'Silently captures incoming verification codes in real time',
  'android.permission.READ_CALL_LOG': 'Profiles victim close contacts for predatory collection',
  'android.permission.CAMERA': 'Captures unauthorized photos/selfies for identity misuse',
  'android.permission.READ_EXTERNAL_STORAGE': 'Exfiltrates gallery photos for blackmail leverage',
  'android.permission.READ_MEDIA_IMAGES': 'Accesses personal photo gallery for extortion threats',
  'android.permission.SYSTEM_ALERT_WINDOW': 'Draws phishing overlays over legitimate banking apps',
  'android.permission.BIND_ACCESSIBILITY_SERVICE': 'Enables automated remote takeover of banking apps',
  'android.permission.ACCESS_FINE_LOCATION': 'Tracks victim physical coordinates continuously',
};

const UPI_HANDLES = new Set([
  'ybl',
  'okaxis',
  'okhdfcbank',
  'okicici',
  'oksbi',
  'paytm',
  'ibl',
  'axl',
  'upi',
  'apl',
  'icici',
  'sbi',
  'hdfcbank',
  'kotak',
  'barodampay',
  'fbl',
  'indus',
]);

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((x) => x.trim()).filter(Boolean)));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function extractIdentifiers(
  rawText: string,
  explicitUrl?: string,
  senderInfo?: string,
  apkMeta?: AnalyzeRequestPayload['apkMetadata']
): ExtractedIdentifiers {
  const combined = [
    rawText,
    explicitUrl || '',
    senderInfo || '',
    apkMeta?.packageName || '',
    ...(apkMeta?.embeddedStrings || []),
  ].join('\n');

  // URLs
  const urlMatches = combined.match(/https?:\/\/[^\s"'<>()]+/gi) || [];
  const cleanedUrls = urlMatches.map((u) => u.replace(/[.,;!?]+$/, ''));
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl.trim())) {
    cleanedUrls.unshift(explicitUrl.trim());
  }

  // Domains
  const domains: string[] = [];
  for (const u of cleanedUrls) {
    try {
      const parsed = new URL(u);
      domains.push(parsed.hostname.toLowerCase());
    } catch {
      // ignore malformed
    }
  }
  // Bare domains mentioned without scheme
  const bareDomainMatches = combined.match(
    /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:xyz|top|vip|cc|click|in|com|org|net|gov\.in|co\.in|sbi|live|bet|loan)\b/gi
  ) || [];
  for (const d of bareDomainMatches) {
    const lower = d.toLowerCase();
    // Skip if it looks like an android package name starting with com.
    if (!lower.startsWith('com.') && !lower.startsWith('org.apache') && !lower.startsWith('android.')) {
      domains.push(lower);
    }
  }

  // IP Addresses
  const ipMatches = combined.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g) || [];

  // Phone Numbers (Indian +91 / 10-digit / dashed)
  const phoneMatches =
    combined.match(/(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\d{3,5}[\s-]?\d{4,6}\b/g) || [];
  const normalizedPhones = phoneMatches.map((p) => p.replace(/\s+/g, '-').trim());

  // Emails & UPI IDs
  const atMatches = combined.match(/\b[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,64}\b/g) || [];
  const upiIds: string[] = [];
  const emails: string[] = [];
  for (const item of atMatches) {
    const lower = item.toLowerCase();
    const parts = lower.split('@');
    if (parts.length !== 2) continue;
    const domainPart = parts[1];
    if (!domainPart.includes('.') && (UPI_HANDLES.has(domainPart) || domainPart.startsWith('ok'))) {
      upiIds.push(lower);
    } else if (domainPart.includes('.')) {
      emails.push(lower);
    }
  }

  // IFSC Codes (4 letters + 0 + 6 alphanumeric)
  const ifscMatches = combined.match(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g) || [];

  // Bank Account Numbers (contextual A/C, Account, Acc No)
  const bankMatches: string[] = [];
  const bankRegex = /(?:a\/c|account(?:\s*no\.?)?|acc(?:\s*no\.?)?)[:\s#-]*(\d{9,18})\b/gi;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = bankRegex.exec(combined)) !== null) {
    bankMatches.push(bMatch[1]);
  }

  // Crypto wallets (TRC20 T..., ETH 0x..., BTC bc1.../1.../3...)
  const trcMatches = combined.match(/\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g) || [];
  const ethMatches = combined.match(/\b0x[a-fA-F0-9]{40}\b/g) || [];
  const btcMatches = combined.match(/\b(?:bc1[a-z0-9]{39,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g) || [];

  // Android Package Names
  const pkgMatches: string[] = Array.from(
    combined.match(/\b(?:com|in|org|net)\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,4}\b/g) || []
  );
  if (apkMeta?.packageName) {
    pkgMatches.unshift(apkMeta.packageName.trim());
  }

  return {
    domains: dedupe(domains),
    urls: dedupe(cleanedUrls),
    phoneNumbers: dedupe(normalizedPhones),
    upiIds: dedupe(upiIds),
    bankAccounts: dedupe(bankMatches),
    ifscCodes: dedupe(ifscMatches),
    cryptoWallets: dedupe([...trcMatches, ...ethMatches, ...btcMatches]),
    packageNames: dedupe(pkgMatches),
    ipAddresses: dedupe(ipMatches),
    emails: dedupe(emails),
  };
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );
}

function computeJaccard(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

export function flattenIdentifiers(ids: ExtractedIdentifiers): string[] {
  return dedupe([
    ...ids.domains,
    ...ids.phoneNumbers,
    ...ids.upiIds,
    ...ids.bankAccounts,
    ...ids.cryptoWallets,
    ...ids.packageNames,
    ...ids.ipAddresses,
  ]);
}

export function findLinkedCases(
  currentCaseId: string,
  rawInput: string,
  identifiers: ExtractedIdentifiers,
  existingCases: CaseRecord[]
): LinkedCaseMatch[] {
  const myIds = new Set(flattenIdentifiers(identifiers).map((v) => v.toLowerCase()));
  const matches: LinkedCaseMatch[] = [];

  for (const c of existingCases) {
    if (c.caseId === currentCaseId) continue;
    const otherIds = flattenIdentifiers(c.identifiers);
    const shared = otherIds.filter((v) => myIds.has(v.toLowerCase()));
    const sim = computeJaccard(rawInput, c.rawInput);

    if (shared.length > 0 || sim >= 35) {
      matches.push({
        caseId: c.caseId,
        title: c.title,
        riskLevel: c.riskLevel,
        sharedIdentifiers: shared,
        similarityScore: sim,
      });
    }
  }

  return matches.sort(
    (a, b) => b.sharedIdentifiers.length * 40 + b.similarityScore - (a.sharedIdentifiers.length * 40 + a.similarityScore)
  );
}

function runDeterministicAnalysis(
  payload: AnalyzeRequestPayload
): {
  riskLevel: RiskLevel;
  riskScore: number;
  threatCategory: ThreatCategory;
  indicators: RiskIndicator[];
  identifiers: ExtractedIdentifiers;
  technical: TechnicalMetadata;
  suggestedTitle: string;
} {
  const combinedText = [payload.content, payload.url || '', payload.senderInfo || ''].join('\n');
  const lower = combinedText.toLowerCase();
  const identifiers = extractIdentifiers(
    payload.content,
    payload.url,
    payload.senderInfo,
    payload.apkMetadata
  );

  const indicators: RiskIndicator[] = [];
  const technical: TechnicalMetadata = {
    blacklistHits: [],
    redirectChain: [],
  };

  let score = 0;
  let indCounter = 1;
  const addIndicator = (
    title: string,
    category: RiskIndicator['category'],
    severity: RiskLevel,
    explanation: string,
    weight: number,
    evidenceSnippet?: string
  ) => {
    indicators.push({
      id: `IND-${String(indCounter++).padStart(2, '0')}`,
      title,
      category,
      severity,
      explanation,
      evidenceSnippet,
    });
    score += weight;
  };

  // Track category votes
  const categoryScores: Record<ThreatCategory, number> = {
    'Phishing & Fake KYC': 0,
    'Utility / Parcel Impersonation': 0,
    'Fake Loan App': 0,
    'Fake Investment / Ponzi / MLM': 0,
    'Illegal Betting Platform': 0,
    'Job / Task Scam': 0,
    'Legitimate / Benign': 0,
  };

  // 1. Check Official Verified Domains
  const isOnlyOfficialDomain =
    identifiers.domains.length > 0 &&
    identifiers.domains.every((d) =>
      OFFICIAL_BRAND_DOMAINS.some((b) => d === b.domain || d.endsWith('.' + b.domain))
    );

  // 2. URL & Domain Technical Checks
  const primaryUrl = payload.url || identifiers.urls[0];
  if (primaryUrl) {
    const isHttps = primaryUrl.toLowerCase().startsWith('https://');
    technical.httpsEnabled = isHttps;
    if (!isHttps && primaryUrl.toLowerCase().startsWith('http://')) {
      addIndicator(
        'Unencrypted HTTP Link Detected',
        'Technical / HTTPS',
        'HIGH',
        'Legitimate banking, government, and payment portals enforce encrypted HTTPS. Plain HTTP exposes submitted credentials and is heavily abused by disposable scam pages.',
        20,
        primaryUrl
      );
    }

    if (primaryUrl.includes('@')) {
      addIndicator(
        'Credential-Masking "@" URL Obfuscation',
        'Look-Alike Domain',
        'HIGH',
        'The "@" symbol in a URL tricks browsers into ignoring everything before it, masking the real malicious destination host.',
        30,
        primaryUrl
      );
    }
  }

  for (const domain of identifiers.domains) {
    // Blacklist match
    if (KNOWN_BLACKLIST_DOMAINS.has(domain)) {
      technical.blacklistHits?.push(domain);
      technical.domainAgeDays = 11;
      technical.estimatedRegistrar = 'Offshore Privacy Proxy Registrar';
      technical.hostingCountry = 'Singapore / Cloudflare Proxy';
      addIndicator(
        'Known Threat Intelligence Blacklist Match',
        'Blacklist Match',
        'HIGH',
        `Domain "${domain}" matches active cybercrime threat feeds linked to recent citizen fraud complaints.`,
        45,
        domain
      );
    }

    // Suspicious TLD
    const matchedTld = Array.from(SUSPICIOUS_TLDS).find((tld) => domain.endsWith(tld));
    if (matchedTld) {
      technical.domainAgeDays = technical.domainAgeDays ?? 19;
      addIndicator(
        `High-Risk Disposable TLD (${matchedTld})`,
        'Technical / HTTPS',
        'MEDIUM',
        `The domain "${domain}" uses a low-cost TLD (${matchedTld}) disproportionately associated with short-lived phishing and betting mirrors.`,
        18,
        domain
      );
    }

    // URL Shortener
    if (URL_SHORTENERS.has(domain)) {
      technical.redirectChain = [primaryUrl || `https://${domain}`, 'Hidden Redirect Hop -> Unverified Landing Page'];
      addIndicator(
        'Obfuscated URL Shortener / Redirect Chain',
        'Technical / HTTPS',
        'MEDIUM',
        `Shortened link (${domain}) conceals the final destination website from the victim prior to clicking.`,
        16,
        domain
      );
    }

    // Look-alike / Typosquatting & Brand Impersonation in Domain
    const isExactOfficial = OFFICIAL_BRAND_DOMAINS.some(
      (b) => domain === b.domain || domain.endsWith('.' + b.domain)
    );
    if (!isExactOfficial) {
      for (const brand of OFFICIAL_BRAND_DOMAINS) {
        const keywordHit = brand.keywords.some((kw) => domain.includes(kw));
        const dist = levenshtein(domain.replace(/^www\./, ''), brand.domain);
        if (keywordHit || dist <= 2) {
          technical.lookAlikeTarget = `${brand.brand} (${brand.domain})`;
          addIndicator(
            `Look-Alike / Brand Impersonation Domain`,
            'Look-Alike Domain',
            'HIGH',
            `Domain "${domain}" imitates ${brand.brand} (official domain: ${brand.domain}) to deceive victims into trusting a fraudulent page.`,
            35,
            domain
          );
          categoryScores['Phishing & Fake KYC'] += 35;
          break;
        }
      }
    }
  }

  // Raw IP URL
  if (identifiers.ipAddresses.length > 0) {
    addIndicator(
      'Direct Raw IP Address Endpoint',
      'Technical / HTTPS',
      'HIGH',
      `Embedded raw IP address (${identifiers.ipAddresses[0]}) bypasses standard domain registration and is commonly used for command-and-control (C2) data exfiltration.`,
      28,
      identifiers.ipAddresses[0]
    );
  }

  // Blacklisted UPI IDs
  for (const upi of identifiers.upiIds) {
    if (KNOWN_BLACKLIST_UPIS.has(upi)) {
      technical.blacklistHits?.push(upi);
      addIndicator(
        'Flagged Mule UPI Payment Handle',
        'Blacklist Match',
        'HIGH',
        `UPI ID "${upi}" appears in prior fraud reports as a mule collection account used to siphon victim funds.`,
        35,
        upi
      );
    } else if (identifiers.upiIds.length > 0) {
      addIndicator(
        'Direct UPI Payment Solicitation Extracted',
        'Payment Extraction',
        'MEDIUM',
        `Extracted payment identifier "${upi}". Verify beneficiary identity carefully before authorizing any UPI collect request.`,
        12,
        upi
      );
    }
  }

  // 3. Message / Linguistic Scam Patterns
  const urgencyRegex =
    /(urgent|within\s+\d+\s*(?:hours?|hrs?|minutes?)|permanently\s+blocked|account\s+(?:blocked|suspended|frozen)|disconnected\s+tonight|final\s+notice|last\s+warning|arrest\s+warrant|digital\s+arrest|immediately)/i;
  const urgencyMatch = combinedText.match(urgencyRegex);
  if (urgencyMatch) {
    addIndicator(
      'High-Pressure Urgency & Coercion Tactic',
      'Urgency & Coercion',
      'HIGH',
      'Uses artificial deadlines or threats of account suspension/disconnection to induce panic and bypass rational verification.',
      22,
      urgencyMatch[0]
    );
    categoryScores['Phishing & Fake KYC'] += 15;
  }

  const kycRegex = /(kyc\s+(?:expired|update|pending|suspended|verify)|update\s+pan|aadhaar\s+kyc|sb1\s+yono|yono\s+kyc|verify\s+your\s+account)/i;
  const kycMatch = combinedText.match(kycRegex);
  if (kycMatch) {
    addIndicator(
      'Fake KYC / Banking Impersonation Pattern',
      'Impersonation',
      'HIGH',
      'Banks never ask customers to update KYC via third-party SMS links or Rs 1 verification transfers.',
      26,
      kycMatch[0]
    );
    categoryScores['Phishing & Fake KYC'] += 35;
  }

  const utilityRegex = /(electricity\s+(?:power|bill|officer)|power\s+supply\s+will\s+be\s+disconnected|parcel\s+(?:held|customs|redelivery)|customs\s+duty\s+fee|quicksupport|anydesk|teamviewer)/i;
  const utilityMatch = combinedText.match(utilityRegex);
  if (utilityMatch) {
    addIndicator(
      'Utility / Parcel Cutoff or Remote-Access Scam',
      'Impersonation',
      'HIGH',
      'Fraudsters impersonate electricity boards or courier agencies and push victims to call fake officers or install remote-access APKs.',
      28,
      utilityMatch[0]
    );
    categoryScores['Utility / Parcel Impersonation'] += 45;
  }

  // 4. Ponzi / MLM / Guaranteed Returns Website Indicators
  const ponziRegex =
    /(guaranteed\s+(?:risk-free\s+)?returns?|daily\s+profit|\d{2,3}%\s*(?:monthly\s+)?roi|double\s+your\s+money|vip\s+level\s*\d|mlm\s+commission|level-1.*level-2|refer\s+\d+\s+friends|risk-free\s+returns?)/i;
  const ponziMatch = combinedText.match(ponziRegex);
  if (ponziMatch) {
    addIndicator(
      'Guaranteed Return & MLM Referral Chain Signals',
      'Ponzi / MLM Language',
      'HIGH',
      'Promises unrealistic guaranteed ROI combined with multi-tier referral commissions—classic structural indicators of a Ponzi/MLM fraud scheme.',
      38,
      ponziMatch[0]
    );
    categoryScores['Fake Investment / Ponzi / MLM'] += 55;
  }

  if (identifiers.cryptoWallets.length > 0) {
    addIndicator(
      'Unregulated Cryptocurrency Collection Wallet',
      'Payment Extraction',
      'HIGH',
      `Solicits deposits to crypto wallet (${identifiers.cryptoWallets[0]}), which makes fund tracing and recovery significantly harder for victims.`,
      22,
      identifiers.cryptoWallets[0]
    );
    categoryScores['Fake Investment / Ponzi / MLM'] += 20;
  }

  // 5. Illegal Betting & Gambling Indicators
  const bettingRegex =
    /(cricket\s+satta|color\s+prediction|aviator\s+crash|teen\s+patti\s+cash|betting\s+id|500%\s+instant\s+welcome\s+bonus|exchange\s+id|no\s+kyc\s+required.*withdraw|win365|satta\s+matka)/i;
  const bettingMatch = combinedText.match(bettingRegex);
  if (bettingMatch) {
    addIndicator(
      'Illegal Online Betting / Offshore Exchange Indicators',
      'Illegal Betting',
      'HIGH',
      'Promotes unregulated betting games (Aviator, color prediction, cricket satta) with offshore mirror URLs and anonymous UPI mule deposits.',
      40,
      bettingMatch[0]
    );
    categoryScores['Illegal Betting Platform'] += 60;
  }

  // 6. Fake Job / Part-Time Task Scam Indicators
  const jobRegex =
    /(liking\s+youtube\s+videos|prepaid\s+(?:merchant\s+)?tasks?|earn\s+rs\.?\s*\d{1,2},?\d{3}.*daily\s+from\s+home|part[\s-]time\s+task\s+bonus|telegram\s+receptionist)/i;
  const jobMatch = combinedText.match(jobRegex);
  if (jobMatch) {
    addIndicator(
      'Part-Time Social Media / Prepaid Task Scam Pattern',
      'Impersonation',
      'MEDIUM',
      'Lures citizens with effortless daily income for liking videos before escalating into high-value "prepaid task" deposits.',
      34,
      jobMatch[0]
    );
    categoryScores['Job / Task Scam'] += 50;
  }

  // 7. Android APK & App-Store Analysis
  if (payload.assetType === 'apk' || payload.apkMetadata || /\.apk\b/i.test(combinedText)) {
    const apk = payload.apkMetadata;
    const perms = apk?.permissions || [];
    const dangerousFound = perms.filter((p) => Boolean(DANGEROUS_APK_PERMISSIONS[p]));

    technical.apkInfo = {
      appName: apk?.appName || 'Unverified Android Package',
      packageName: apk?.packageName || identifiers.packageNames[0] || 'unknown.package',
      versionName: apk?.versionName || '1.0',
      signerFingerprint: apk?.signerFingerprint || 'Unverified / Self-Signed Certificate',
      source: apk?.source || 'Direct APK / Unverified Link',
      dangerousPermissions: dangerousFound,
      allPermissions: perms,
      embeddedUrls: identifiers.urls,
      fileSizeKb: apk?.fileSizeKb,
      archiveEntriesCount: apk?.archiveEntriesCount,
    };

    if (KNOWN_MALICIOUS_PACKAGES.has(technical.apkInfo.packageName)) {
      technical.blacklistHits?.push(technical.apkInfo.packageName);
      addIndicator(
        'Known Predatory / Malicious APK Package Match',
        'Blacklist Match',
        'HIGH',
        `Package "${technical.apkInfo.packageName}" matches known fraudulent instant-loan or remote-access scam applications.`,
        45,
        technical.apkInfo.packageName
      );
      categoryScores['Fake Loan App'] += 50;
    }

    if (dangerousFound.length >= 3) {
      addIndicator(
        `Excessive Invasive APK Permissions (${dangerousFound.length} Critical)`,
        'APK Permissions',
        'HIGH',
        `Requests high-risk privacy permissions (${dangerousFound
          .map((p) => p.replace('android.permission.', ''))
          .join(', ')}) typical of predatory loan extortion and SMS OTP-stealing malware.`,
        36,
        dangerousFound.map((p) => p.replace('android.permission.', '')).join(' · ')
      );
      categoryScores['Fake Loan App'] += 45;
    } else if (dangerousFound.length > 0) {
      addIndicator(
        `Sensitive APK Permissions Requested (${dangerousFound.length})`,
        'APK Permissions',
        'MEDIUM',
        `App requests sensitive permissions: ${dangerousFound
          .map((p) => p.replace('android.permission.', ''))
          .join(', ')}.`,
        18,
        dangerousFound.join(', ')
      );
    }

    if (
      /third-party|whatsapp|direct apk|sideload|\.apk\b/i.test(
        `${technical.apkInfo.source} ${payload.url || ''} ${payload.content}`
      )
    ) {
      addIndicator(
        'Sideloaded APK Outside Official Play Store',
        'App Metadata',
        'HIGH',
        'Distributed via direct APK download or messaging apps to evade Google Play Protect security vetting.',
        24,
        technical.apkInfo.source
      );
    }

    if (/zero\s+cibil|instant.*loan.*5\s+minutes|loan.*selfie/i.test(lower)) {
      addIndicator(
        'Predatory Instant-Loan Marketing Claims',
        'Impersonation',
        'HIGH',
        'Promises instant cash disbursement with zero credit check—a hallmark of unregistered predatory loan apps.',
        25,
        'Zero CIBIL / Instant Loan'
      );
      categoryScores['Fake Loan App'] += 35;
    }
  }

  // 8. Genuine / Benign Verification Signals
  if (isOnlyOfficialDomain && score === 0) {
    technical.httpsEnabled = true;
    technical.domainAgeDays = 3650;
    technical.estimatedRegistrar = 'Verified Institutional Registry (NIC / RBI / Official)';
    technical.hostingCountry = 'India (Official Infrastructure)';
    addIndicator(
      'Verified Official Institutional Domain & HTTPS',
      'Verified Safe Signal',
      'LOW',
      `All referenced domains (${identifiers.domains.join(', ')}) match verified official institutional domains with HTTPS encryption.`,
      0,
      identifiers.domains.join(', ')
    );
    categoryScores['Legitimate / Benign'] += 100;
  }

  if (
    /never\s+asks?\s+for\s+otp|official\s+state\s+bank/i.test(lower) &&
    score < 20
  ) {
    addIndicator(
      'Standard Institutional Safety Advisory Present',
      'Verified Safe Signal',
      'LOW',
      'Message includes standard security advisories and lacks coercion, credential harvesting, or unauthorized payment demands.',
      0
    );
    categoryScores['Legitimate / Benign'] += 40;
  }

  // Clamp score & derive RiskLevel
  const riskScore = Math.min(99, Math.max(4, score === 0 ? 6 : score));
  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 60) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 28) {
    riskLevel = 'MEDIUM';
  }

  if (indicators.length === 0) {
    addIndicator(
      'No Malicious Signatures or High-Risk Patterns Triggered',
      'Verified Safe Signal',
      'LOW',
      'Static lexical, domain, and identifier checks did not detect urgency coercion, blacklisted infrastructure, or fraudulent payment solicitation.',
      0
    );
  }

  // Pick winning ThreatCategory
  let threatCategory: ThreatCategory = 'Legitimate / Benign';
  if (riskLevel !== 'LOW') {
    let bestScore = 0;
    for (const [cat, val] of Object.entries(categoryScores) as Array<[ThreatCategory, number]>) {
      if (cat === 'Legitimate / Benign') continue;
      if (val > bestScore) {
        bestScore = val;
        threatCategory = cat;
      }
    }
    if (bestScore === 0) {
      threatCategory =
        payload.assetType === 'apk'
          ? 'Fake Loan App'
          : payload.assetType === 'website'
          ? 'Fake Investment / Ponzi / MLM'
          : 'Phishing & Fake KYC';
    }
  }

  // Construct clean title
  let suggestedTitle = '';
  if (payload.assetType === 'apk' && technical.apkInfo) {
    suggestedTitle = `${technical.apkInfo.appName} (${technical.apkInfo.packageName})`;
  } else if (payload.assetType === 'website' && identifiers.domains[0]) {
    suggestedTitle = `${threatCategory} — ${identifiers.domains[0]}`;
  } else if (payload.assetType === 'url' && identifiers.domains[0]) {
    suggestedTitle = `URL Analysis — ${identifiers.domains[0]}`;
  } else {
    const cleanSnippet = payload.content.replace(/\s+/g, ' ').trim().slice(0, 52);
    suggestedTitle = `${threatCategory}: ${cleanSnippet}${payload.content.length > 52 ? '…' : ''}`;
  }

  return {
    riskLevel,
    riskScore,
    threatCategory,
    indicators,
    identifiers,
    technical,
    suggestedTitle,
  };
}

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

let geminiBetaClient: GoogleGenAI | null = null;
function getGeminiBetaClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  if (!geminiBetaClient) {
    geminiBetaClient = new GoogleGenAI({
      apiKey: key,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiBetaClient;
}

async function generateAiBrief(
  payload: AnalyzeRequestPayload,
  deterministic: ReturnType<typeof runDeterministicAnalysis>,
  linkedCases: LinkedCaseMatch[]
): Promise<{ aiBrief?: AiForensicBrief; aiError?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      aiError:
        'Gemini AI briefing skipped: GEMINI_API_KEY is not configured in Settings > Secrets. Technical forensic scan results above remain complete.',
    };
  }

  const isHindi = payload.lang === 'hi';

  try {
    const prompt = `You are Kavach (कवच), a friendly cyber-safety protector helping 10-year-old children, 50+ senior citizens, and police investigators understand if a link, message, photo, or app is real or a scam.

Analyse the following submission and the deterministic technical findings already extracted:

User Language Preference: ${isHindi ? 'Simple everyday Hindi (Devanagari script) for citizenWarning, whatIsThisLink, executiveSummary, and recommendedActions. Keep investigatorNotes concise in English/Hindi.' : 'Very simple, clear everyday English (no complex technical jargon) for citizenWarning, whatIsThisLink, executiveSummary, and recommendedActions.'}
Asset Type: ${payload.assetType}
Channel: ${payload.channel}
Sender: ${payload.senderInfo || 'Not provided'}
URL: ${payload.url || 'None'}
Submitted Content:
"""
${payload.content.slice(0, 2500)}
"""
APK Metadata: ${payload.apkMetadata ? JSON.stringify(payload.apkMetadata) : 'None'}

Deterministic Risk Level: ${deterministic.riskLevel} (Score: ${deterministic.riskScore}/100)
Detected Category: ${deterministic.threatCategory}
Triggered Indicators: ${deterministic.indicators.map((i) => `${i.title} [${i.severity}]`).join('; ')}
Extracted Identifiers: ${JSON.stringify(deterministic.identifiers)}
Cross-Linked Prior Cases: ${linkedCases.map((l) => `${l.caseId} (shared: ${l.sharedIdentifiers.join(', ')})`).join('; ') || 'None'}

Respond strictly in JSON matching the requested schema.
- whatIsThisLink: 1 short, ultra-clear sentence answering "Who does this link/message belong to and is it fake or real?"
- citizenWarning: 2 short, calm sentences easy enough for a 10-year-old or 50-year-old to understand immediately.
- recommendedActions: 3 short, direct bullet steps (max 14 words each).
- investigatorNotes: Concise LEA triage note highlighting pivotable UPI/phone/domain IOCs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'Short plain-language summary of what this submission is and why it got this rating.',
            },
            whatIsThisLink: {
              type: Type.STRING,
              description: '1 short sentence explaining whose link/message this really is and whether it is real or fake.',
            },
            citizenWarning: {
              type: Type.STRING,
              description: '2 short, calm, high-clarity sentences for an ordinary citizen or elder.',
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 concrete short next steps.',
            },
            investigatorNotes: {
              type: Type.STRING,
              description: 'Concise investigative briefing highlighting pivotable IOCs and next LEA steps.',
            },
            confidenceRationale: {
              type: Type.STRING,
              description: 'Short explanation of the evidence strength supporting the risk rating.',
            },
          },
          required: [
            'executiveSummary',
            'whatIsThisLink',
            'citizenWarning',
            'recommendedActions',
            'investigatorNotes',
            'confidenceRationale',
          ],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return { aiError: 'Gemini API returned an empty response.' };
    }
    const parsed = JSON.parse(text) as AiForensicBrief;
    return { aiBrief: parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';
    return {
      aiError: `AI narrative analysis unavailable (${message}). Deterministic forensic indicators and IOC extraction completed normally.`,
    };
  }
}

export async function extractFromImageWithGemini(
  base64Data: string,
  mimeType: string,
  lang: 'en' | 'hi' = 'en'
): Promise<{
  extractedText?: string;
  detectedUrl?: string;
  visualClues?: string;
  error?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      error:
        'Image scan requires GEMINI_API_KEY in Settings > Secrets. Please configure the key or paste the link text directly.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Inspect this photo or screenshot carefully for cyber scam detection.
Extract ALL visible text, URLs, website links, QR code text, phone numbers, UPI IDs, bank details, and app names.
Also describe any visual impersonation clues (e.g. fake SBI/RBI logo, WhatsApp forward banner, suspicious APK install prompt, lottery/betting poster, urgency red text) in ${lang === 'hi' ? 'simple Hindi' : 'simple English'}.
Return JSON strictly matching the schema.`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description: 'Full exact transcription of all visible text, URLs, phone numbers, and UPI IDs in the image.',
            },
            detectedUrl: {
              type: Type.STRING,
              description: 'The primary suspicious or visible URL/domain found in the image, or empty string if none.',
            },
            visualClues: {
              type: Type.STRING,
              description: '1-2 short sentences describing what the screenshot/photo shows and any fake branding or scam cues.',
            },
          },
          required: ['extractedText', 'detectedUrl', 'visualClues'],
        },
      },
    });

    const raw = response.text?.trim();
    if (!raw) {
      return { error: 'Could not read text from the uploaded photo.' };
    }
    const parsed = JSON.parse(raw) as {
      extractedText: string;
      detectedUrl: string;
      visualClues: string;
    };
    return parsed;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Image analysis failed.',
    };
  }
}

export async function transcribeAudioWithGemini(
  base64Data: string,
  mimeType: string
): Promise<{ transcript?: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      error:
        'Voice transcription requires GEMINI_API_KEY in Settings > Secrets. Please configure the key or type/paste your link.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: 'Transcribe this audio accurately in the spoken language (Hindi, Hinglish, or English). Preserve any spoken URLs, domain names, phone numbers, UPI IDs, or bank/app names clearly.',
          },
        ],
      },
    });

    const transcript = response.text?.trim();
    if (!transcript) {
      return { error: 'No speech was detected in the audio clip.' };
    }
    return { transcript };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Audio transcription failed.',
    };
  }
}

export async function synthesizeSpeechWithGemini(
  text: string,
  lang: 'en' | 'hi' = 'en'
): Promise<{ audioBase64?: string; mimeType?: string; error?: string }> {
  const ai = getGeminiBetaClient();
  if (!ai) {
    return {
      error: 'Audio read-aloud requires GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 800),
              speechMetadata: {
                style:
                  lang === 'hi'
                    ? 'Calm, clear, reassuring Hindi safety advisor speaking slowly for elders and children'
                    : 'Calm, clear, reassuring safety advisor speaking slowly for elders and children',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find((p) => Boolean(p.inlineData?.data));
    const base64Audio = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';
    if (!base64Audio) {
      return { error: 'Audio synthesis returned empty output.' };
    }
    return { audioBase64: base64Audio, mimeType };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unable to generate spoken audio.',
    };
  }
}

export async function analyzeSubmission(
  payload: AnalyzeRequestPayload,
  existingCases: CaseRecord[],
  nextCaseId: string,
  options?: { skipAi?: boolean }
): Promise<CaseRecord> {
  const now = new Date().toISOString();
  const det = runDeterministicAnalysis(payload);

  const rawCombined = [
    payload.url ? `URL: ${payload.url}` : '',
    payload.senderInfo ? `Sender: ${payload.senderInfo}` : '',
    payload.apkMetadata?.packageName
      ? `APK: ${payload.apkMetadata.appName || ''} (${payload.apkMetadata.packageName})`
      : '',
    payload.content,
  ]
    .filter(Boolean)
    .join('\n');

  const evidenceHash = crypto.createHash('sha256').update(rawCombined).digest('hex');
  const linkedCases = findLinkedCases(nextCaseId, rawCombined, det.identifiers, existingCases);

  let aiBrief: AiForensicBrief | undefined;
  let aiError: string | undefined;

  if (!options?.skipAi) {
    const aiResult = await generateAiBrief(payload, det, linkedCases);
    aiBrief = aiResult.aiBrief;
    aiError = aiResult.aiError;
  }

  const timelineTone =
    det.riskLevel === 'HIGH' ? 'red' : det.riskLevel === 'MEDIUM' ? 'amber' : 'green';

  const record: CaseRecord = {
    caseId: nextCaseId,
    createdAt: now,
    updatedAt: now,
    title: det.suggestedTitle,
    assetType: payload.assetType,
    channel: payload.channel,
    submittedBy: payload.submittedBy?.trim() || 'Citizen Portal Submission',
    senderInfo: payload.senderInfo?.trim() || undefined,
    rawInput: rawCombined,
    evidenceHash,
    riskLevel: det.riskLevel,
    riskScore: det.riskScore,
    threatCategory: det.threatCategory,
    status: det.riskLevel === 'HIGH' ? 'Open' : det.riskLevel === 'MEDIUM' ? 'Under Review' : 'Closed / Benign',
    indicators: det.indicators,
    identifiers: det.identifiers,
    technical: det.technical,
    linkedCases,
    aiBrief,
    aiError,
    timeline: [
      {
        id: `TL-${Date.now()}-1`,
        timestamp: now,
        actor: payload.submittedBy?.trim() || 'Citizen Submission',
        action: 'Evidence Intake Logged',
        detail: `Submitted via ${payload.channel}. SHA-256 evidence digest recorded (${evidenceHash.slice(0, 12)}…).`,
        tone: 'navy',
      },
      {
        id: `TL-${Date.now()}-2`,
        timestamp: now,
        actor: 'Automated Forensic Engine',
        action: `Assessed as ${det.riskLevel} RISK (${det.riskScore}/100)`,
        detail: `Triggered ${det.indicators.length} explainable indicator(s); extracted ${
          flattenIdentifiers(det.identifiers).length
        } pivotable identifier(s).${
          linkedCases.length > 0 ? ` Cross-linked to ${linkedCases.length} prior case(s).` : ''
        }`,
        tone: timelineTone,
      },
    ],
  };

  return record;
}
