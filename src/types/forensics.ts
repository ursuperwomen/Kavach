export type AssetType = 'message' | 'url' | 'apk' | 'website';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ThreatCategory =
  | 'Phishing & Fake KYC'
  | 'Utility / Parcel Impersonation'
  | 'Fake Loan App'
  | 'Fake Investment / Ponzi / MLM'
  | 'Illegal Betting Platform'
  | 'Job / Task Scam'
  | 'Legitimate / Benign';

export type CaseStatus =
  | 'Open'
  | 'Under Review'
  | 'Escalated to LEA'
  | 'Closed / Benign';

export type ChannelType =
  | 'SMS'
  | 'WhatsApp'
  | 'Email'
  | 'Social Media'
  | 'Web Browser'
  | 'Android APK / Store'
  | 'Citizen Bot';

export interface RiskIndicator {
  id: string;
  title: string;
  category:
    | 'Urgency & Coercion'
    | 'Impersonation'
    | 'Look-Alike Domain'
    | 'Technical / HTTPS'
    | 'Blacklist Match'
    | 'APK Permissions'
    | 'App Metadata'
    | 'Ponzi / MLM Language'
    | 'Illegal Betting'
    | 'Payment Extraction'
    | 'Verified Safe Signal';
  severity: RiskLevel;
  explanation: string;
  evidenceSnippet?: string;
}

export interface ExtractedIdentifiers {
  domains: string[];
  urls: string[];
  phoneNumbers: string[];
  upiIds: string[];
  bankAccounts: string[];
  ifscCodes: string[];
  cryptoWallets: string[];
  packageNames: string[];
  ipAddresses: string[];
  emails: string[];
}

export interface TechnicalMetadata {
  httpsEnabled?: boolean;
  domainAgeDays?: number;
  estimatedRegistrar?: string;
  hostingCountry?: string;
  redirectChain?: string[];
  lookAlikeTarget?: string;
  blacklistHits?: string[];
  apkInfo?: {
    appName: string;
    packageName: string;
    versionName?: string;
    signerFingerprint?: string;
    source: string;
    dangerousPermissions: string[];
    allPermissions: string[];
    embeddedUrls: string[];
    fileSizeKb?: number;
    archiveEntriesCount?: number;
  };
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
  tone: 'navy' | 'red' | 'amber' | 'green';
}

export interface LinkedCaseMatch {
  caseId: string;
  title: string;
  riskLevel: RiskLevel;
  sharedIdentifiers: string[];
  similarityScore: number; // 0 to 100
}

export type AppLanguage = 'en' | 'hi';

export interface AiForensicBrief {
  executiveSummary: string;
  whatIsThisLink?: string;
  citizenWarning: string;
  recommendedActions: string[];
  investigatorNotes: string;
  confidenceRationale: string;
}

export interface PoliceReportReceipt {
  complaintNumber: string;
  caseId: string;
  filedAt: string;
  city: string;
  moneyLost: boolean;
  amountInr?: string;
  status: string;
}

export interface CaseRecord {
  caseId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  assetType: AssetType;
  channel: ChannelType;
  submittedBy: string;
  senderInfo?: string;
  rawInput: string;
  evidenceHash: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0 - 100
  threatCategory: ThreatCategory;
  status: CaseStatus;
  indicators: RiskIndicator[];
  identifiers: ExtractedIdentifiers;
  technical: TechnicalMetadata;
  linkedCases: LinkedCaseMatch[];
  aiBrief?: AiForensicBrief;
  aiError?: string;
  policeReport?: PoliceReportReceipt;
  timeline: TimelineEntry[];
}

export interface AnalyzeRequestPayload {
  assetType: AssetType;
  channel: ChannelType;
  content: string;
  url?: string;
  senderInfo?: string;
  submittedBy?: string;
  lang?: AppLanguage;
  apkMetadata?: {
    appName?: string;
    packageName?: string;
    versionName?: string;
    source?: string;
    permissions?: string[];
    embeddedStrings?: string[];
    fileSizeKb?: number;
    archiveEntriesCount?: number;
    signerFingerprint?: string;
  };
  saveToLedger?: boolean;
}

export interface HeatListItem {
  value: string;
  type: 'domain' | 'phone' | 'upi' | 'package' | 'crypto';
  reportCount: number;
  riskLevel: RiskLevel;
  associatedCategories: ThreatCategory[];
  caseIds: string[];
  lastSeen: string;
}

export interface SampleCasePreset {
  id: string;
  label: string;
  labelHi?: string;
  shortDesc: string;
  shortDescHi?: string;
  expectedRisk: RiskLevel;
  assetType: AssetType;
  channel: ChannelType;
  senderInfo?: string;
  url?: string;
  content: string;
  apkMetadata?: AnalyzeRequestPayload['apkMetadata'];
}

export interface ScamNewsItem {
  id: string;
  date: string;
  severity: RiskLevel;
  tagEn: string;
  tagHi: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  sampleTriggerText: string;
  sampleUrl?: string;
}

export type CommunityCategory =
  | 'Fake Link'
  | 'Bank / UPI'
  | 'Fake Loan App'
  | 'Job / WhatsApp'
  | 'Investment / Betting'
  | 'Other';

export interface CommunityReply {
  id: string;
  alias: string;
  createdAt: string;
  message: string;
}

export interface CommunityPost {
  id: string;
  alias: string;
  city: string;
  category: CommunityCategory;
  createdAt: string;
  story: string;
  suspiciousLink?: string;
  imageDataUrl?: string;
  helpfulCount: number;
  replies: CommunityReply[];
}

export type UserRole = 'citizen' | 'investigator';

export interface AuthUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  badgeId?: string;
  department?: string;
  idProofVerified?: boolean;
  idProofHash?: string;
  idProofPreview?: string;
  createdAt: string;
}

export interface CampaignCluster {
  id: string;
  name: string;
  sharedEntities: string[];
  caseIds: string[];
  riskLevel: RiskLevel;
  channels: string[];
  summary: string;
}

export interface HeatListPayload {
  items: HeatListItem[];
  clusters: CampaignCluster[];
  stats: {
    totalCases: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    linkedCasesCount: number;
    uniqueRiskyIdentifiers: number;
  };
}
