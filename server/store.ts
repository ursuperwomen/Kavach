import { R4C_SAMPLE_PRESETS } from '../src/data/samples';
import type {
  CaseRecord,
  CaseStatus,
  HeatListItem,
  RiskLevel,
  ThreatCategory,
} from '../src/types/forensics';
import { analyzeSubmission, findLinkedCases } from './analyzer';

class CaseLedgerStore {
  private cases: CaseRecord[] = [];
  private sequence = 101;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Seed with deterministic pre-analyzed synthetic R4C demo cases (no API calls at boot)
    const hoursAgo = [38, 31, 24, 18, 13, 9, 5, 2];
    const reporters = [
      'Citizen Report (Bengaluru)',
      'Citizen Report (Pune)',
      'Cyber Cell Triage Officer',
      'Citizen Report (Hyderabad)',
      'Citizen Report (Jaipur)',
      'Citizen Bot Forward',
      'Citizen Verification Check',
      'Citizen Verification Check',
    ];

    const seedBriefs: Record<
      string,
      {
        executiveSummary: string;
        citizenWarning: string;
        recommendedActions: string[];
        investigatorNotes: string;
        confidenceRationale: string;
      }
    > = {
      'sample-kyc-sms': {
        executiveSummary:
          'High-risk banking phishing SMS impersonating SBI YONO with a deceptive look-alike domain (sbi-kyc-verify-portal.xyz) and an artificial 2-hour account blockage threat.',
        citizenWarning:
          'Do not click the link or transfer Rs 1 to the listed UPI ID. Your bank will never ask you to verify KYC through an unverified .xyz link or personal phone number.',
        recommendedActions: [
          'Do not open the link or share any OTP, PAN, or debit card details.',
          'Block the sender number +91-98710-44219 and report as spam/phishing.',
          'If you already entered credentials, immediately call 1930 (National Cybercrime Helpline) and freeze your bank card.',
        ],
        investigatorNotes:
          'Cross-campaign pivot identified: sender +91-98710-44219 and mule UPI handle fastpay.verify@ybl recur across fake electricity notices and sideloaded loan APKs. Recommend NPCI lien request on fastpay.verify@ybl and CDR lookup.',
        confidenceRationale:
          'Multiple high-severity technical signals converged: blacklisted domain, unencrypted HTTP, look-alike brand spoofing, and flagged mule UPI.',
      },
      'sample-electricity-wa': {
        executiveSummary:
          'Coercive utility disconnection WhatsApp message threatening power cut tonight to pressure citizens into calling a scammer and installing a malicious APK.',
        citizenWarning:
          'This is a known electricity bill scam. Do not call the number in this message, do not install any .apk file, and check your bill only on your official utility website.',
        recommendedActions: [
          'Delete the WhatsApp message and block +91-98710-44219 immediately.',
          'Never install .apk files sent over WhatsApp claiming to be QuickSupport or bill helpers.',
          'Verify your real electricity account balance via your official state DISCOM portal.',
        ],
        investigatorNotes:
          'Direct entity overlap with fake SBI KYC campaign via +91-98710-44219. Secondary collection UPI powerdesk.help@okaxis and payload host ebill-desk-pay.top should be added to ISP blocklist advisory.',
        confidenceRationale:
          'Triggered utility coercion signature, blacklisted APK host, sideloading link, and known scam phone number.',
      },
      'sample-loan-apk': {
        executiveSummary:
          'Predatory sideloaded Android loan APK ("QuickRupee VIP Instant Cash") requesting 8 invasive privacy permissions including Contacts, SMS, Call Logs, and Camera while communicating with a raw IP endpoint.',
        citizenWarning:
          'Do not install this APK file. Predatory loan apps copy your phone contacts and photos to harass and blackmail borrowers with exorbitant hidden charges.',
        recommendedActions: [
          'Uninstall "QuickRupee VIP" immediately if already installed and revoke SMS/Contacts permissions.',
          'Run Google Play Protect scan and never install loan apps sent via WhatsApp or browser APK links.',
          'Check RBI registered NBFC lists before sharing Aadhaar/PAN with any lending app.',
        ],
        investigatorNotes:
          'Static package audit confirms self-signed debug certificate, embedded C2 IP 185.224.128.44:8080 (/api/v2/upload_contacts), and shared collection handle fastpay.verify@ybl. Recommend CERT-In takedown notice for verify-kyc-secure.xyz.',
        confidenceRationale:
          'Confirmed malicious package signature, excessive contact/SMS harvesting permissions, and embedded C2 exfiltration IP.',
      },
      'sample-ponzi-site': {
        executiveSummary:
          'Fraudulent high-yield investment (Ponzi/MLM) website promising guaranteed 300% monthly ROI and multi-level referral commissions via UPI, bank transfer, and TRC20 USDT.',
        citizenWarning:
          'No legitimate investment can guarantee 10% daily or 300% monthly risk-free returns. Do not deposit money or recruit friends into this scheme.',
        recommendedActions: [
          'Do not transfer funds to apexwealth.pool@paytm, the listed bank account, or the TRC20 crypto wallet.',
          'Verify investment platforms on the official SEBI registered intermediaries portal.',
          'Preserve transaction UTRs and report any loss immediately at cybercrime.gov.in or dial 1930.',
        ],
        investigatorNotes:
          'Extracted multi-rail payment infrastructure: UPI apexwealth.pool@paytm, Bank A/C 409281736455 (IFSC SBIN0004912), TRC20 TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE, and WhatsApp mentor +91-81204-77310 (also linked to YouTube task scam).',
        confidenceRationale:
          'Explicit guaranteed-ROI/MLM referral structure paired with disposable .vip domain and multi-channel unregulated fund collection.',
      },
      'sample-betting-site': {
        executiveSummary:
          'Illegal offshore betting and color-prediction exchange mirror (win365live-exchange.cc) soliciting anonymous deposits via flagged mule UPI accounts.',
        citizenWarning:
          'This is an unregulated offshore betting website. These sites frequently freeze withdrawals once you deposit larger amounts and expose your banking details to mule networks.',
        recommendedActions: [
          'Do not register or deposit funds into win365live-exchange.cc.',
          'Avoid sharing banking details or UPI PINs with Telegram/WhatsApp "Betting ID" agents.',
          'Report active betting mirror URLs to local cyber police.',
        ],
        investigatorNotes:
          'High-value financial pivot: betting site shares mule UPI handle fastpay.verify@ybl with the fake SBI KYC SMS and QuickRupee APK campaigns, indicating a shared money-laundering mule operator.',
        confidenceRationale:
          'Matched illegal betting taxonomy, offshore .cc mirror domain over unencrypted HTTP, and cross-case flagged mule UPI.',
      },
      'sample-job-task': {
        executiveSummary:
          'Suspicious unsolicited WhatsApp part-time job offer promising Rs 3,000–8,000 daily for liking YouTube videos and completing prepaid merchant tasks via a shortened URL.',
        citizenWarning:
          'Be cautious: "like videos to earn daily" messages typically pay small initial bonuses to build trust before demanding large "prepaid task" deposits that you cannot withdraw.',
        recommendedActions: [
          'Do not click the shortened bit.ly link or join unverified Telegram task groups.',
          'Never pay upfront fees or "prepaid merchant deposits" to unlock job earnings.',
          'Block sender +91-81204-77310.',
        ],
        investigatorNotes:
          'Sender +91-81204-77310 directly overlaps with the ApexWealth Ponzi website WhatsApp mentor, confirming organized syndicate reuse of recruitment lines.',
        confidenceRationale:
          'Matched prepaid task scam phrasing, hidden URL shortener redirect, and cross-case phone overlap.',
      },
      'sample-genuine-indiapost': {
        executiveSummary:
          'Legitimate official India Post tracking notification referencing the verified government domain indiapost.gov.in with no payment demand or coercion.',
        citizenWarning:
          'This message appears safe and consistent with genuine India Post notifications. Always verify tracking directly on https://www.indiapost.gov.in.',
        recommendedActions: [
          'No suspicious action required; you may track your parcel directly on indiapost.gov.in.',
          'Remember that India Post never requests OTPs or card payments through SMS links.',
        ],
        investigatorNotes:
          'Verified .gov.in infrastructure and official sender header AD-INPOST. Logged as benign baseline reference case.',
        confidenceRationale:
          'Verified official domain with HTTPS and zero triggered threat indicators.',
      },
      'sample-genuine-bank': {
        executiveSummary:
          'Verified official State Bank of India personal banking portal using encrypted HTTPS on the authentic .sbi brand top-level domain.',
        citizenWarning:
          'This is the authentic State Bank of India web address. Ensure the lock icon is visible in your browser address bar before signing in.',
        recommendedActions: [
          'Safe to access directly via your browser bookmark.',
          'Never share your login password or high-security OTP with anyone claiming to be bank support.',
        ],
        investigatorNotes:
          'Confirmed legitimate institutional TLD (.sbi) with no look-alike distortion or blacklist hits.',
        confidenceRationale:
          'Exact match against verified official institutional domain registry.',
      },
    };

    for (let i = 0; i < R4C_SAMPLE_PRESETS.length; i++) {
      const preset = R4C_SAMPLE_PRESETS[i];
      const caseId = `CCT-2026-${String(this.sequence++).padStart(4, '0')}`;
      const record = await analyzeSubmission(
        {
          assetType: preset.assetType,
          channel: preset.channel,
          content: preset.content,
          url: preset.url,
          senderInfo: preset.senderInfo,
          submittedBy: reporters[i] || 'R4C Sample Dataset',
          apkMetadata: preset.apkMetadata,
        },
        this.cases,
        caseId,
        { skipAi: true }
      );

      const pastDate = new Date(Date.now() - hoursAgo[i] * 3600 * 1000).toISOString();
      record.createdAt = pastDate;
      record.updatedAt = pastDate;
      record.aiBrief = seedBriefs[preset.id];
      record.timeline = record.timeline.map((t) => ({ ...t, timestamp: pastDate }));
      if (preset.id === 'sample-kyc-sms' || preset.id === 'sample-loan-apk') {
        record.status = 'Escalated to LEA';
        record.timeline.push({
          id: `TL-SEED-${i}-3`,
          timestamp: new Date(Date.now() - (hoursAgo[i] - 1) * 3600 * 1000).toISOString(),
          actor: 'Inspector R. Nair (Cyber Cell)',
          action: 'Escalated to LEA Financial Triage',
          detail:
            'Cross-linked mule UPI fastpay.verify@ybl and phone +91-98710-44219 bundled for NPCI/bank freeze notice.',
          tone: 'red',
        });
      }

      this.cases.unshift(record);
    }

    // Recompute reciprocal links across all seeded cases so every case sees all peers
    this.recomputeAllLinks();
  }

  private recomputeAllLinks(): void {
    for (const c of this.cases) {
      c.linkedCases = findLinkedCases(c.caseId, c.rawInput, c.identifiers, this.cases);
    }
  }

  getNextCaseId(): string {
    return `CCT-2026-${String(this.sequence++).padStart(4, '0')}`;
  }

  getAllCases(): CaseRecord[] {
    return this.cases;
  }

  getCaseById(caseId: string): CaseRecord | undefined {
    return this.cases.find((c) => c.caseId === caseId);
  }

  addCase(record: CaseRecord): CaseRecord {
    this.cases.unshift(record);
    this.recomputeAllLinks();
    return record;
  }

  updateCase(
    caseId: string,
    updates: { status?: CaseStatus; note?: string; actor?: string }
  ): CaseRecord | undefined {
    const existing = this.getCaseById(caseId);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    existing.updatedAt = now;

    if (updates.status && updates.status !== existing.status) {
      const prev = existing.status;
      existing.status = updates.status;
      const tone =
        updates.status === 'Escalated to LEA'
          ? 'red'
          : updates.status === 'Closed / Benign'
          ? 'green'
          : updates.status === 'Under Review'
          ? 'amber'
          : 'navy';
      existing.timeline.push({
        id: `TL-${Date.now()}-S`,
        timestamp: now,
        actor: updates.actor || 'Cyber Cell Investigator',
        action: `Status Changed: ${prev} → ${updates.status}`,
        detail: updates.note?.trim() || `Case triage status updated to ${updates.status}.`,
        tone,
      });
    } else if (updates.note?.trim()) {
      existing.timeline.push({
        id: `TL-${Date.now()}-N`,
        timestamp: now,
        actor: updates.actor || 'Cyber Cell Investigator',
        action: 'Investigator Note Appended',
        detail: updates.note.trim(),
        tone: 'navy',
      });
    }

    return existing;
  }

  filePoliceReport(
    caseId: string,
    report: {
      reporterName?: string;
      city: string;
      moneyLost: boolean;
      amountInr?: string;
      extraDetails?: string;
    }
  ): { caseRecord: CaseRecord; receipt: NonNullable<CaseRecord['policeReport']> } | undefined {
    const existing = this.getCaseById(caseId);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const complaintNumber = `KVC-LEA-2026-${String(Math.floor(10000 + Math.random() * 89999))}`;
    const receipt = {
      complaintNumber,
      caseId: existing.caseId,
      filedAt: now,
      city: report.city.trim() || 'India (Online Portal)',
      moneyLost: report.moneyLost,
      amountInr: report.moneyLost ? report.amountInr?.trim() || 'Not specified' : undefined,
      status: 'Escalated to Cyber Police Triage',
    };

    existing.policeReport = receipt;
    existing.status = 'Escalated to LEA';
    existing.updatedAt = now;
    existing.timeline.push({
      id: `TL-${Date.now()}-LEA`,
      timestamp: now,
      actor: report.reporterName?.trim() || 'Citizen Police Report (Kavach)',
      action: `Cyber Police Complaint Filed (${complaintNumber})`,
      detail: `City: ${receipt.city}. Financial loss: ${
        report.moneyLost ? `YES (₹${receipt.amountInr || 'Unspecified'})` : 'No'
      }.${report.extraDetails?.trim() ? ` Details: ${report.extraDetails.trim()}` : ''}`,
      tone: 'red',
    });

    return { caseRecord: existing, receipt };
  }

  getHeatList(): {
    items: HeatListItem[];
    clusters: Array<{
      id: string;
      name: string;
      sharedEntities: string[];
      caseIds: string[];
      riskLevel: RiskLevel;
      channels: string[];
      summary: string;
    }>;
    stats: {
      totalCases: number;
      highRiskCount: number;
      mediumRiskCount: number;
      lowRiskCount: number;
      linkedCasesCount: number;
      uniqueRiskyIdentifiers: number;
    };
  } {
    const map = new Map<
      string,
      {
        value: string;
        type: HeatListItem['type'];
        caseIds: Set<string>;
        categories: Set<ThreatCategory>;
        highestRisk: RiskLevel;
        lastSeen: string;
      }
    >();

    const riskRank: Record<RiskLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

    const recordId = (
      val: string,
      type: HeatListItem['type'],
      c: CaseRecord
    ) => {
      if (c.riskLevel === 'LOW') return; // Heat-list tracks suspicious/malicious identifiers
      const key = `${type}:${val.toLowerCase()}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          value: val,
          type,
          caseIds: new Set([c.caseId]),
          categories: new Set([c.threatCategory]),
          highestRisk: c.riskLevel,
          lastSeen: c.createdAt,
        });
      } else {
        cur.caseIds.add(c.caseId);
        cur.categories.add(c.threatCategory);
        if (riskRank[c.riskLevel] > riskRank[cur.highestRisk]) {
          cur.highestRisk = c.riskLevel;
        }
        if (c.createdAt > cur.lastSeen) {
          cur.lastSeen = c.createdAt;
        }
      }
    };

    for (const c of this.cases) {
      c.identifiers.domains.forEach((d) => recordId(d, 'domain', c));
      c.identifiers.phoneNumbers.forEach((p) => recordId(p, 'phone', c));
      c.identifiers.upiIds.forEach((u) => recordId(u, 'upi', c));
      c.identifiers.packageNames.forEach((pkg) => recordId(pkg, 'package', c));
      c.identifiers.cryptoWallets.forEach((w) => recordId(w, 'crypto', c));
    }

    const items: HeatListItem[] = Array.from(map.values())
      .map((entry) => ({
        value: entry.value,
        type: entry.type,
        reportCount: entry.caseIds.size,
        riskLevel: entry.highestRisk,
        associatedCategories: Array.from(entry.categories),
        caseIds: Array.from(entry.caseIds),
        lastSeen: entry.lastSeen,
      }))
      .sort((a, b) => b.reportCount - a.reportCount || riskRank[b.riskLevel] - riskRank[a.riskLevel]);

    // Build cross-campaign clusters dynamically from identifiers appearing in 2+ cases
    const multiCaseIds = items.filter((item) => item.reportCount >= 2);
    const clusters: Array<{
      id: string;
      name: string;
      sharedEntities: string[];
      caseIds: string[];
      riskLevel: RiskLevel;
      channels: string[];
      summary: string;
    }> = [];

    // Group connected cases via union-find over shared identifiers
    const visitedCases = new Set<string>();
    let clusterIdx = 1;
    for (const seed of multiCaseIds) {
      const unprocessed = seed.caseIds.filter((id) => !visitedCases.has(id));
      if (unprocessed.length === 0) continue;

      const clusterCases = new Set<string>(seed.caseIds);
      const clusterEntities = new Set<string>([seed.value]);

      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const item of multiCaseIds) {
          const overlaps = item.caseIds.some((id) => clusterCases.has(id));
          if (overlaps && !clusterEntities.has(item.value)) {
            clusterEntities.add(item.value);
            item.caseIds.forEach((id) => clusterCases.add(id));
            expanded = true;
          }
        }
      }

      clusterCases.forEach((id) => visitedCases.add(id));
      const caseObjs = Array.from(clusterCases)
        .map((id) => this.getCaseById(id))
        .filter((x): x is CaseRecord => Boolean(x));
      const channels = Array.from(new Set(caseObjs.map((c) => c.channel)));
      const categories = Array.from(new Set(caseObjs.map((c) => c.threatCategory)));

      clusters.push({
        id: `CMP-0${clusterIdx++}`,
        name:
          clusterIdx === 2
            ? 'Unified Mule UPI & Loan/KYC Syndicate'
            : `Coordinated ${categories[0]} Cluster`,
        sharedEntities: Array.from(clusterEntities),
        caseIds: Array.from(clusterCases),
        riskLevel: caseObjs.some((c) => c.riskLevel === 'HIGH') ? 'HIGH' : 'MEDIUM',
        channels,
        summary: `Links ${caseObjs.length} separate reports across ${channels.join(
          ', '
        )} reusing ${Array.from(clusterEntities).join(' & ')}.`,
      });
    }

    const highRiskCount = this.cases.filter((c) => c.riskLevel === 'HIGH').length;
    const mediumRiskCount = this.cases.filter((c) => c.riskLevel === 'MEDIUM').length;
    const lowRiskCount = this.cases.filter((c) => c.riskLevel === 'LOW').length;
    const linkedCasesCount = this.cases.filter((c) => c.linkedCases.length > 0).length;

    return {
      items,
      clusters,
      stats: {
        totalCases: this.cases.length,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        linkedCasesCount,
        uniqueRiskyIdentifiers: items.length,
      },
    };
  }
}

export const caseStore = new CaseLedgerStore();
