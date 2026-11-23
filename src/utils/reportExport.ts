import type { CaseRecord } from '../types/forensics';

export function defangUrl(url: string): string {
  return url
    .replace(/^https:\/\//i, 'hxxps://')
    .replace(/^http:\/\//i, 'hxxp://')
    .replace(/\./g, '[.]');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export function buildInvestigationHtmlReport(record: CaseRecord): string {
  const riskColor =
    record.riskLevel === 'HIGH'
      ? '#DC2626'
      : record.riskLevel === 'MEDIUM'
      ? '#D97706'
      : '#16A34A';
  const riskBg =
    record.riskLevel === 'HIGH'
      ? '#FEF2F2'
      : record.riskLevel === 'MEDIUM'
      ? '#FFFBEB'
      : '#F0FDF4';

  const allIdRows: Array<[string, string[]]> = [
    ['Domains', record.identifiers.domains.map((d) => d.replace(/\./g, '[.]'))],
    ['Defanged URLs', record.identifiers.urls.map(defangUrl)],
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

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Cybercrime Investigation Evidence Report — ${escapeHtml(record.caseId)}</title>
<style>
  body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: #0F172A; background: #FFFFFF; margin: 0; padding: 32px; line-height: 1.55; }
  .header { border-bottom: 2px solid #0F172A; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .title { font-size: 22px; font-weight: 800; margin: 0 0 6px 0; }
  .sub { font-size: 13px; color: #475569; margin: 0; }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; letter-spacing: 0.05em; color: ${riskColor}; background: ${riskBg}; border: 1px solid ${riskColor}; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin: 24px 0 12px 0; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px; }
  .box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; background: #F8FAFC; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  th { background: #F8FAFC; font-weight: 600; color: #334155; width: 28%; }
  .evidence { white-space: pre-wrap; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 14px; font-family: ui-monospace, monospace; font-size: 13px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <p class="sub">CITIZEN CYBER TRUST · OFFICIAL FORENSIC EVIDENCE DOSSIER</p>
      <h1 class="title">Case ${escapeHtml(record.caseId)} — ${escapeHtml(record.title)}</h1>
      <p class="sub">Generated: ${escapeHtml(formatTimestamp(new Date().toISOString()))} · Channel: ${escapeHtml(record.channel)} · Status: ${escapeHtml(record.status)}</p>
    </div>
    <span class="badge">${escapeHtml(record.riskLevel)} RISK (${record.riskScore}/100)</span>
  </div>

  <div class="grid">
    <div class="box">
      <strong>Threat Classification</strong><br/>${escapeHtml(record.threatCategory)}
    </div>
    <div class="box">
      <strong>Submitted By / Intake</strong><br/>${escapeHtml(record.submittedBy)} (${escapeHtml(formatTimestamp(record.createdAt))})
    </div>
    <div class="box" style="grid-column: span 2;">
      <strong>Chain-of-Custody Evidence SHA-256 Digest</strong><br/>
      <span class="mono">${escapeHtml(record.evidenceHash)}</span>
    </div>
  </div>

  ${
    record.aiBrief
      ? `<h2>1. Executive &amp; Investigator Assessment</h2>
         <p><strong>Summary:</strong> ${escapeHtml(record.aiBrief.executiveSummary)}</p>
         <p><strong>Citizen Advisory:</strong> ${escapeHtml(record.aiBrief.citizenWarning)}</p>
         <p><strong>Law Enforcement Triage Notes:</strong> ${escapeHtml(record.aiBrief.investigatorNotes)}</p>`
      : ''
  }

  <h2>2. Explainable Risk Indicators (${record.indicators.length})</h2>
  <table>
    <thead>
      <tr><th>Indicator</th><th>Severity &amp; Category</th><th>Forensic Explanation</th></tr>
    </thead>
    <tbody>
      ${record.indicators
        .map(
          (ind) => `<tr>
            <td><strong>${escapeHtml(ind.title)}</strong>${
              ind.evidenceSnippet ? `<div class="mono" style="margin-top:4px;color:#475569;">Match: ${escapeHtml(ind.evidenceSnippet)}</div>` : ''
            }</td>
            <td>${escapeHtml(ind.severity)} · ${escapeHtml(ind.category)}</td>
            <td>${escapeHtml(ind.explanation)}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>3. Extracted Actionable Identifiers (IOCs — Defanged)</h2>
  ${
    idRows.length === 0
      ? '<p>No external identifiers extracted.</p>'
      : `<table><tbody>${idRows
          .map(
            ([label, values]) =>
              `<tr><th>${escapeHtml(label)}</th><td class="mono">${values.map(escapeHtml).join('<br/>')}</td></tr>`
          )
          .join('')}</tbody></table>`
  }

  ${
    record.linkedCases.length > 0
      ? `<h2>4. Cross-Linked Investigation Cases (${record.linkedCases.length})</h2>
         <table><thead><tr><th>Case ID</th><th>Shared Identifiers / Similarity</th><th>Risk</th></tr></thead><tbody>
         ${record.linkedCases
           .map(
             (lc) => `<tr>
               <td class="mono">${escapeHtml(lc.caseId)}</td>
               <td>${escapeHtml(lc.sharedIdentifiers.join(', ') || 'Content similarity match')} (${lc.similarityScore}% text similarity)</td>
               <td>${escapeHtml(lc.riskLevel)}</td>
             </tr>`
           )
           .join('')}
         </tbody></table>`
      : ''
  }

  <h2>5. Preserved Raw Evidence Snapshot</h2>
  <div class="evidence">${escapeHtml(record.rawInput)}</div>

  <h2>6. Investigator Audit Timeline</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Actor &amp; Action</th><th>Details</th></tr></thead>
    <tbody>
      ${record.timeline
        .map(
          (t) => `<tr>
            <td>${escapeHtml(formatTimestamp(t.timestamp))}</td>
            <td><strong>${escapeHtml(t.action)}</strong><br/>${escapeHtml(t.actor)}</td>
            <td>${escapeHtml(t.detail)}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    Citizen Cyber Trust Unified Fraud &amp; Phishing Forensic Portal · All malicious URLs are defanged (hxxp / [.]) for safe officer handling.
  </div>
</body>
</html>`;
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

export function downloadHtmlEvidenceReport(record: CaseRecord): void {
  const html = buildInvestigationHtmlReport(record);
  triggerDownload(`${record.caseId}_Evidence_Report.html`, html, 'text/html;charset=utf-8');
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
