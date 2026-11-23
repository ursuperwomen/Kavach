import { jsPDF } from 'jspdf';
import type { CaseRecord, HeatListPayload } from '../types/forensics';

export function defangUrl(url: string): string {
  return url
    .replace(/^https:\/\//i, 'hxxps://')
    .replace(/^http:\/\//i, 'hxxp://')
    .replace(/\./g, '[.]');
}

export function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type RgbTuple = [number, number, number];

function hasNonAscii(text: string): boolean {
  return /[^\x20-\x7E\r\n\t]/.test(text);
}

/**
 * Renders Unicode (e.g. Hindi Devanagari or ₹) wrapped text cleanly onto a high-DPI
 * offscreen canvas so jsPDF displays non-Latin scripts crisply without garbled glyphs.
 */
function renderUnicodeParagraphToCanvas(
  text: string,
  widthMm: number,
  fontSizePt: number,
  bold: boolean,
  color: RgbTuple
): { dataUrl: string; heightMm: number } | null {
  if (typeof document === 'undefined') return null;
  const pxPerMm = 7.5; // ~190 DPI crisp print rendering
  const canvasWidth = Math.max(120, Math.round(widthMm * pxPerMm));
  const fontSizePx = Math.round((fontSizePt * 0.352778) * pxPerMm);
  const lineHeightPx = Math.round(fontSizePx * 1.45);

  const probe = document.createElement('canvas');
  const pCtx = probe.getContext('2d');
  if (!pCtx) return null;

  const fontSpec = `${bold ? '700' : '400'} ${fontSizePx}px "Noto Sans Devanagari", "Inter", system-ui, sans-serif`;
  pCtx.font = fontSpec;

  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (pCtx.measureText(candidate).width <= canvasWidth - 4) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  const canvasHeight = Math.max(lineHeightPx, lines.length * lineHeightPx + 6);
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.font = fontSpec;
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.textBaseline = 'top';

  lines.forEach((line, idx) => {
    ctx.fillText(line, 0, idx * lineHeightPx + 2);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    heightMm: canvasHeight / pxPerMm,
  };
}

class PdfReportWriter {
  public doc: jsPDF;
  public y = 16;
  public readonly pageWidth = 210;
  public readonly pageHeight = 297;
  public readonly margin = 14;
  public readonly contentWidth = 182;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  }

  ensureSpace(neededMm: number): void {
    if (this.y + neededMm > this.pageHeight - 16) {
      this.doc.addPage();
      this.y = 16;
    }
  }

  addBanner(title: string, subtitle: string, badgeText: string, badgeBg: RgbTuple): void {
    this.doc.setFillColor(15, 23, 42); // Slate 900
    this.doc.rect(0, 0, this.pageWidth, 34, 'F');

    this.doc.setTextColor(148, 163, 184);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.text('KAVACH · CITIZEN CYBER TRUST — OFFICIAL EVIDENCE DOSSIER', this.margin, 11);

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    const safeTitle = title.replace(/[^\x20-\x7E]/g, ' ').trim().slice(0, 62);
    this.doc.text(safeTitle || 'Cybercrime Forensic Evidence Report', this.margin, 19);

    this.doc.setTextColor(203, 213, 225);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.text(subtitle.replace(/[^\x20-\x7E]/g, ' ').slice(0, 95), this.margin, 26.5);

    // Risk badge pill on top right
    this.doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
    this.doc.roundedRect(this.pageWidth - this.margin - 44, 10, 44, 10, 2, 2, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.text(badgeText, this.pageWidth - this.margin - 22, 16.5, { align: 'center' });

    this.y = 42;
  }

  addSectionHeading(heading: string): void {
    this.ensureSpace(12);
    this.y += 2;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(heading.toUpperCase(), this.margin, this.y);
    this.y += 2;
    this.doc.setDrawColor(203, 213, 225);
    this.doc.setLineWidth(0.35);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 5;
  }

  addKeyValueRow(label: string, value: string, mono = false): void {
    const cleanVal = value || 'N/A';
    if (hasNonAscii(cleanVal)) {
      this.ensureSpace(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(71, 85, 105);
      this.doc.text(`${label}:`, this.margin, this.y);
      this.y += 4;
      this.addParagraph(cleanVal, 9.5, false, [15, 23, 42]);
      return;
    }

    this.doc.setFont(mono ? 'courier' : 'helvetica', 'normal');
    this.doc.setFontSize(9);
    const wrapped = this.doc.splitTextToSize(cleanVal, this.contentWidth - 44) as string[];
    const needed = Math.max(6, wrapped.length * 4.5 + 1.5);
    this.ensureSpace(needed);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(`${label}:`, this.margin, this.y);

    this.doc.setFont(mono ? 'courier' : 'helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(wrapped, this.margin + 44, this.y);
    this.y += needed;
  }

  addParagraph(
    text: string,
    fontSize = 9.5,
    bold = false,
    color: RgbTuple = [30, 41, 59],
    mono = false
  ): void {
    const cleaned = text.trim();
    if (!cleaned) return;

    if (hasNonAscii(cleaned)) {
      const rendered = renderUnicodeParagraphToCanvas(
        cleaned,
        this.contentWidth,
        fontSize,
        bold,
        color
      );
      if (rendered) {
        this.ensureSpace(rendered.heightMm + 2);
        this.doc.addImage(
          rendered.dataUrl,
          'PNG',
          this.margin,
          this.y - 2,
          this.contentWidth,
          rendered.heightMm
        );
        this.y += rendered.heightMm + 2.5;
        return;
      }
    }

    this.doc.setFont(mono ? 'courier' : 'helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(color[0], color[1], color[2]);
    const lines = this.doc.splitTextToSize(cleaned, this.contentWidth) as string[];
    const lineH = fontSize * 0.46;

    for (const line of lines) {
      this.ensureSpace(lineH + 1);
      this.doc.text(line, this.margin, this.y);
      this.y += lineH;
    }
    this.y += 2;
  }

  addMonospaceBox(text: string): void {
    const cleaned = text.trim() || '(empty)';
    if (hasNonAscii(cleaned)) {
      const rendered = renderUnicodeParagraphToCanvas(
        cleaned.slice(0, 2400),
        this.contentWidth - 6,
        9,
        false,
        [15, 23, 42]
      );
      if (rendered) {
        const boxH = Math.min(rendered.heightMm + 6, 120);
        this.ensureSpace(boxH + 4);
        this.doc.setFillColor(248, 250, 252);
        this.doc.setDrawColor(203, 213, 225);
        this.doc.roundedRect(this.margin, this.y - 2, this.contentWidth, boxH, 1.5, 1.5, 'FD');
        this.doc.addImage(
          rendered.dataUrl,
          'PNG',
          this.margin + 3,
          this.y + 1,
          this.contentWidth - 6,
          Math.min(rendered.heightMm, 114)
        );
        this.y += boxH + 4;
        return;
      }
    }

    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(8.5);
    const lines = this.doc.splitTextToSize(cleaned.slice(0, 3200), this.contentWidth - 6) as string[];
    const lineH = 4.2;
    const chunkSize = 36;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const boxH = chunk.length * lineH + 5;
      this.ensureSpace(boxH + 3);
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(203, 213, 225);
      this.doc.roundedRect(this.margin, this.y - 2, this.contentWidth, boxH, 1.5, 1.5, 'FD');
      this.doc.setTextColor(15, 23, 42);
      this.doc.text(chunk, this.margin + 3, this.y + 2.5);
      this.y += boxH + 3;
    }
  }

  addPageFooters(footerNote: string): void {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.25);
      this.doc.line(this.margin, this.pageHeight - 12, this.pageWidth - this.margin, this.pageHeight - 12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(footerNote, this.margin, this.pageHeight - 7);
      this.doc.text(`Page ${p} of ${total}`, this.pageWidth - this.margin, this.pageHeight - 7, {
        align: 'right',
      });
    }
  }
}

export function downloadPdfEvidenceReport(record: CaseRecord): void {
  const writer = new PdfReportWriter();

  const riskBadgeBg: RgbTuple =
    record.riskLevel === 'HIGH'
      ? [220, 38, 38]
      : record.riskLevel === 'MEDIUM'
      ? [217, 119, 6]
      : [22, 163, 74];

  writer.addBanner(
    `Case ${record.caseId} — ${record.threatCategory}`,
    `Generated: ${formatTimestamp(new Date().toISOString())}  |  Channel: ${record.channel}  |  Status: ${record.status}`,
    `${record.riskLevel} RISK (${record.riskScore}/100)`,
    riskBadgeBg
  );

  // Case Metadata
  writer.addSectionHeading('1. Case Overview & Chain-of-Custody');
  writer.addKeyValueRow('Case ID', record.caseId, true);
  writer.addKeyValueRow('Title', record.title);
  writer.addKeyValueRow('Threat Category', record.threatCategory);
  writer.addKeyValueRow('Asset Type / Channel', `${record.assetType.toUpperCase()} / ${record.channel}`);
  writer.addKeyValueRow('Submitted By', `${record.submittedBy} (${formatTimestamp(record.createdAt)})`);
  writer.addKeyValueRow('Current Status', record.status);
  if (record.policeReport) {
    writer.addKeyValueRow(
      'Cyber Police Receipt',
      `${record.policeReport.complaintNumber} | City: ${record.policeReport.city}${
        record.policeReport.moneyLost
          ? ` | Financial Loss: INR ${record.policeReport.amountInr || 'Unspecified'}`
          : ''
      }`,
      true
    );
  }
  writer.addKeyValueRow('SHA-256 Digest', record.evidenceHash, true);

  // Executive & Investigator Summary
  if (record.aiBrief) {
    writer.addSectionHeading('2. Plain-Language & Investigator Assessment');
    if (record.aiBrief.whatIsThisLink) {
      writer.addParagraph('What Is This Link / Submission:', 9.5, true, [15, 23, 42]);
      writer.addParagraph(record.aiBrief.whatIsThisLink, 9.5, false, [30, 41, 59]);
    }
    writer.addParagraph('Citizen Safety Advisory:', 9.5, true, [15, 23, 42]);
    writer.addParagraph(record.aiBrief.citizenWarning, 9.5, false, [30, 41, 59]);
    writer.addParagraph('Law Enforcement Triage Notes:', 9.5, true, [15, 23, 42]);
    writer.addParagraph(record.aiBrief.investigatorNotes, 9.5, false, [30, 41, 59]);
  }

  // Triggered Risk Indicators
  writer.addSectionHeading(`3. Explainable Risk Indicators (${record.indicators.length})`);
  for (const ind of record.indicators) {
    writer.ensureSpace(16);
    const sevColor: RgbTuple =
      ind.severity === 'HIGH'
        ? [185, 28, 28]
        : ind.severity === 'MEDIUM'
        ? [180, 83, 9]
        : [22, 101, 52];
    writer.addParagraph(`[${ind.severity}] ${ind.id} — ${ind.title} (${ind.category})`, 9.5, true, sevColor);
    writer.addParagraph(ind.explanation, 9, false, [51, 65, 85]);
    if (ind.evidenceSnippet) {
      writer.addParagraph(`Matched Evidence: ${defangUrl(ind.evidenceSnippet)}`, 8.5, false, [71, 85, 105], true);
    }
  }

  // Extracted Actionable Identifiers (IOCs — Defanged)
  const allIdRows: Array<[string, string[]]> = [
    ['Domains (Defanged)', record.identifiers.domains.map((d) => d.replace(/\./g, '[.]'))],
    ['URLs (Defanged)', record.identifiers.urls.map(defangUrl)],
    ['Phone Numbers', record.identifiers.phoneNumbers],
    ['UPI Payment IDs', record.identifiers.upiIds],
    ['Bank Accounts', record.identifiers.bankAccounts],
    ['IFSC Codes', record.identifiers.ifscCodes],
    ['Crypto Wallets', record.identifiers.cryptoWallets],
    ['Android Packages', record.identifiers.packageNames],
    ['IP Addresses', record.identifiers.ipAddresses],
    ['Email Addresses', record.identifiers.emails],
  ];
  const idRows = allIdRows.filter(([, list]) => list.length > 0);

  writer.addSectionHeading('4. Extracted Actionable Identifiers (IOCs — Defanged)');
  if (idRows.length === 0) {
    writer.addParagraph('No external domains, phone numbers, UPI handles, or wallets extracted.', 9, false, [71, 85, 105]);
  } else {
    for (const [label, values] of idRows) {
      writer.addKeyValueRow(label, values.join(', '), true);
    }
  }

  // Android APK Static Audit (if present)
  if (record.technical.apkInfo) {
    writer.addSectionHeading('5. Android APK Static Package Audit');
    writer.addKeyValueRow('App / Package', `${record.technical.apkInfo.appName} (${record.technical.apkInfo.packageName})`, true);
    writer.addKeyValueRow('Distribution Source', record.technical.apkInfo.source);
    writer.addKeyValueRow('Signer Certificate', record.technical.apkInfo.signerFingerprint || 'Unverified');
    if (record.technical.apkInfo.dangerousPermissions.length > 0) {
      writer.addKeyValueRow(
        'High-Risk Permissions',
        record.technical.apkInfo.dangerousPermissions.join(', '),
        true
      );
    }
  }

  // Cross-Linked Investigation Cases & Repeat-Content Similarity
  if (record.linkedCases.length > 0) {
    writer.addSectionHeading(`Cross-Linked Cases & Similarity (${record.linkedCases.length})`);
    for (const lc of record.linkedCases) {
      writer.addParagraph(
        `${lc.caseId} [${lc.riskLevel}] — ${lc.title} (${lc.similarityScore}% content similarity)`,
        9,
        true,
        [15, 23, 42]
      );
      if (lc.sharedIdentifiers.length > 0) {
        writer.addParagraph(`Shared IOCs: ${lc.sharedIdentifiers.join(' | ')}`, 8.5, false, [153, 27, 27], true);
      }
    }
  }

  // Immutable Raw Evidence Snapshot (defanging active URLs inside raw snapshot too for safety)
  writer.addSectionHeading('Preserved Raw Evidence Snapshot (URLs Defanged)');
  const safeRawSnapshot = record.rawInput.replace(/https?:\/\/[^\s"'<>()]+/gi, (u) => defangUrl(u));
  writer.addMonospaceBox(safeRawSnapshot);

  // Audit Timeline
  writer.addSectionHeading(`Investigator Audit Timeline (${record.timeline.length})`);
  for (const entry of record.timeline) {
    writer.addParagraph(
      `${formatTimestamp(entry.timestamp)}  |  ${entry.action}  (${entry.actor})`,
      9,
      true,
      [15, 23, 42]
    );
    writer.addParagraph(entry.detail, 8.5, false, [51, 65, 85]);
  }

  writer.addPageFooters(
    'Kavach (Citizen Cyber Trust) · All suspicious URLs defanged (hxxp / [.]) for safe officer handling · Helpline 1930'
  );

  writer.doc.save(`${record.caseId}_Evidence_Report.pdf`);
}

export function downloadHeatListPdfReport(payload: HeatListPayload, officerLabel: string): void {
  const writer = new PdfReportWriter();
  writer.addBanner(
    'Investigator Threat Heat-List & Syndicate Report',
    `Exported: ${formatTimestamp(new Date().toISOString())}  |  Officer: ${officerLabel}`,
    `${payload.stats.uniqueRiskyIdentifiers} FLAGGED IOCs`,
    [220, 38, 38]
  );

  writer.addSectionHeading('1. Executive Intelligence Summary');
  writer.addKeyValueRow('Total Cases Analyzed', String(payload.stats.totalCases));
  writer.addKeyValueRow('High Risk Cases', String(payload.stats.highRiskCount));
  writer.addKeyValueRow('Cross-Linked Cases', String(payload.stats.linkedCasesCount));
  writer.addKeyValueRow('Unique Flagged IOCs', String(payload.stats.uniqueRiskyIdentifiers));
  writer.addKeyValueRow('Detected Clusters', String(payload.clusters.length));

  if (payload.clusters.length > 0) {
    writer.addSectionHeading(`2. Cross-Campaign Syndicate Clusters (${payload.clusters.length})`);
    for (const c of payload.clusters) {
      writer.addParagraph(`${c.id} [${c.riskLevel}] — ${c.name}`, 9.5, true, [153, 27, 27]);
      writer.addParagraph(c.summary, 9, false, [51, 65, 85]);
      writer.addParagraph(`Reused IOCs: ${c.sharedEntities.join(' | ')}`, 8.5, false, [15, 23, 42], true);
      writer.addParagraph(`Linked Cases: ${c.caseIds.join(', ')}`, 8.5, false, [37, 99, 235], true);
    }
  }

  writer.addSectionHeading(`3. Ranked Threat Identifier Heat-List (${payload.items.length})`);
  payload.items.forEach((item, idx) => {
    const safeVal = item.type === 'domain' ? item.value.replace(/\./g, '[.]') : item.value;
    writer.addParagraph(
      `#${idx + 1} [${item.riskLevel}] ${safeVal}  (${item.type.toUpperCase()} · ${item.reportCount} report(s))`,
      9,
      true,
      [15, 23, 42]
    );
    writer.addParagraph(
      `Categories: ${item.associatedCategories.join(', ')}  |  Cases: ${item.caseIds.join(', ')}`,
      8.5,
      false,
      [71, 85, 105]
    );
  });

  writer.addPageFooters(
    'Kavach Investigator-Only Heat-List · Synthetic Hackathon Dataset · Restricted to Verified Cyber Cell Officers'
  );

  writer.doc.save(`Kavach_Investigator_HeatList_${Date.now()}.pdf`);
}

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJsonEvidenceBundle(record: CaseRecord): void {
  const bundle = {
    schema: 'citizen-cyber-trust.evidence.v1',
    exportedAt: new Date().toISOString(),
    caseRecord: record,
  };
  triggerDownload(
    `${record.caseId}_Evidence_Bundle.json`,
    JSON.stringify(bundle, null, 2),
    'application/json;charset=utf-8'
  );
}
