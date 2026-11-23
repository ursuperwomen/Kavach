# 🛡️ Kavach (कवच) — Scam Detection & Cyber Investigation Platform

**Kavach (कवच)** is a bilingual (**Hindi + English**), responsive cyber safety and fraud investigation web application built for both everyday citizens and verified cyber-crime investigators.

Citizens can use Kavach **without logging in** to check suspicious links, SMS/WhatsApp messages, screenshots, voice notes, or Android `.apk` files in seconds, listen to spoken verdicts, warn family on WhatsApp, report scams to Cyber Police, and download **PDF evidence reports**. Verified officers can sign in with an **ID card proof** to unlock the **Investigation Dashboard** and **Investigator Heat-List**.

---

## 🚨 Problem Statement

Citizens frequently receive fraudulent KYC, electricity-cutoff, parcel, job, fake instant-loan APK, Ponzi/MLM, and illegal betting scams across SMS, WhatsApp, email, and websites. Threat actors reuse the same domains, phone numbers, UPI IDs, crypto wallets, and Android packages across campaigns, yet incidents are reported in isolation without explainable risk checks or investigation-ready evidence.

---

## ✨ Complete Feature Set

### 1. Public Citizen Tools (No Login Required)
- **Universal Scam Checker (`Check Link / जांच करें`)**
  - Analyses URLs, SMS, WhatsApp messages, phone numbers, UPI IDs, bank accounts, crypto wallets, and promotional website text.
  - Detects urgency tactics, brand impersonation, look-alike domains, missing HTTPS, risky TLDs, fake KYC/utility/job lures, Ponzi/MLM returns, and betting indicators.
  - Returns an explainable **LOW / MEDIUM / HIGH** risk verdict, risk score, plain-language summary, extracted identifiers, **defanged URLs** (`hxxp://`, `[.]`), and a pre-click **Safe Link Warning Modal**.
- **Camera & Photo Scan**
  - Capture a live photo or upload a screenshot/poster to extract text/links and scan automatically.
- **Voice Input & Spoken Audio Verdict**
  - Record voice or upload an audio clip describing a suspicious call/message for instant transcription and analysis.
  - One-tap **Listen (`आवाज़ में सुनें`)** button reads the verdict aloud in **Hindi or English**.
- **Static Android `.APK` Inspector**
  - Parses `.apk` archives statically in the browser (no installation or execution) to inspect package names, embedded endpoints, and risky permissions (`READ_CONTACTS`, `READ_SMS`, `RECEIVE_SMS`, `READ_CALL_LOG`, `CAMERA`, `SYSTEM_ALERT_WINDOW`).
  - Includes a one-tap **Test APK** generator for safe hackathon demos.
- **WhatsApp Alert Sharing, Cyber Police Reporting & 1930 Emergency Checklist**
  - One-tap formatted **WhatsApp Warning** share or copy for family groups.
  - Inline **Report to Cyber Police** form generating a complaint receipt (`KVC-LEA-...`) and downloadable **PDF** / JSON evidence reports.
  - Dedicated **1930 Emergency Helpline** golden-hour checklist modal.
- **Trending Scams & Practice (`Trending Scams / ट्रेंडिंग स्कैम`)**
  - Public Hindi/English scam news alerts with one-tap **Check** and **WhatsApp Share**.
  - Interactive **Spot Real vs Fake** practice cards designed for children and elders.
- **Anonymous Community Wall (`Community / गुमनाम मंच`)**
  - 100% anonymous (`Anonymous Citizen`) open wall where users share scam stories, defanged links, and screenshots, reply with safety tips, mark helpful posts, or check shared links directly in Kavach.

### 2. Optional Authentication & Officer ID Verification (`Login / Sign In`)
- **Citizen & Officer Role Selector**: Side-by-side **Citizen** (selected first) and **Officer** tabs, with a prominent **Continue without Login** button below.
- **Mandatory Officer ID Proof**: Creating an Investigator account requires uploading or camera-scanning an ID card image (JPG/PNG/WebP validated server-side with SHA-256 digest). Includes a **Demo ID** generator that renders a synthetic badge PNG so no real personal ID is ever needed.
- **Forgot Password Flow**: Two-step password reset for registered emails using a time-limited (15-minute), single-use 6-digit verification code (with an in-app hackathon demo preview banner) and automatic revocation of older sessions.

### 3. Investigator-Only Intelligence (Strictly Role-Gated)
Hidden from unauthenticated users and citizen accounts in both the UI and backend API (`401` / `403` enforced):
- **Investigation Dashboard (`Dashboard / डैशबोर्ड`)**
  - Searchable case ledger across Case ID, domain, phone number, UPI ID, crypto wallet, IP, and APK package.
  - Multi-facet filters by Risk Level (`HIGH` / `MEDIUM` / `LOW`), Asset Type (`message`, `url`, `apk`, `website`), and Case Status (`Open`, `Under Review`, `Escalated to LEA`, `Closed / Benign`).
  - **Immutable Evidence Snapshot** with SHA-256 integrity hash.
  - **Cross-Linked Cases & Repeat-Content Similarity** scoring across messages, websites, and APKs.
  - One-click **Pivot** on any extracted identifier to filter all linked cases.
  - Officer triage status updates, chain-of-custody notes, full **Audit Timeline**, and downloadable **PDF Investigation Reports** + JSON IOC bundles.
- **Investigator Heat-List (`Heat-List / हीट-लिस्ट`)**
  - Ranked tracker of the most frequently reported scam domains, phone numbers, UPI handles, fake APK packages, and crypto wallets.
  - **Cross-Channel Syndicate Clusters** automatically grouping separate reports that reuse the same identifiers, with one-click pivot into the Investigation Dashboard.
  - One-tap **PDF Heat-List Report** and **JSON Blocklist** exports.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Vite, Lucide Icons |
| **Client Utilities** | `jsPDF` (Unicode/Devanagari PDF report generation), `JSZip` (client-side static `.apk` archive inspection) |
| **Backend** | Node.js, Express (`server.ts`), TypeScript (`tsx`) |
| **Multimodal & Speech Analysis** | `@google/genai` server-side routes (bilingual risk summaries, screenshot OCR/vision, audio transcription, text-to-speech) |
| **Security & Auth** | Salted `scrypt` password & reset-code hashing, cryptographic Bearer sessions in memory, role-based access control (`requireInvestigator`), magic-byte image validation, URL defanging |

---

## 🔌 API Overview

### Public Endpoints
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/analyze` | Analyze text, URL, website, or APK metadata and return explainable risk verdict |
| `POST` | `/api/analyze-image` | Extract text/links from a photo or screenshot and run scam analysis |
| `POST` | `/api/transcribe-audio` | Transcribe voice recording/audio clip and optionally analyze |
| `POST` | `/api/tts` | Generate Hindi/English spoken audio (WAV) for a verdict |
| `POST` | `/api/report-police` | File a cyber police report against an analyzed case |
| `GET` / `POST` | `/api/community` | Read or publish anonymous community scam posts |
| `POST` | `/api/community/:postId/reply` | Add an anonymous reply to a community post |
| `POST` | `/api/community/:postId/helpful` | Upvote a helpful community warning |

### Authentication Endpoints
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register-citizen` | Optional citizen sign-up |
| `POST` | `/api/auth/register-investigator` | Investigator sign-up with mandatory ID card proof verification |
| `POST` | `/api/auth/login` | Sign in for Citizen or Officer |
| `POST` | `/api/auth/logout` | Invalidate active Bearer session |
| `GET` | `/api/auth/me` | Inspect current authenticated session |
| `POST` | `/api/auth/forgot-password` | Issue 6-digit password reset code for a registered email |
| `POST` | `/api/auth/reset-password` | Verify code, rotate password hash, and revoke prior sessions |

### Investigator-Only Endpoints (`Authorization: Bearer <token>`)
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/cases` | Search and filter full case history ledger |
| `GET` | `/api/cases/:caseId` | Fetch a single case record with linked cases and timeline |
| `PATCH` | `/api/cases/:caseId` | Update triage status and append chain-of-custody officer note |
| `GET` | `/api/heatlist` | Retrieve ranked threat IOC heat-list and cross-campaign clusters |

---

## 📂 Project Structure

```text
├── server.ts                          # Express API server + Vite middleware (port 3000)
├── server/
│   ├── analyzer.ts                    # Heuristic + AI risk engine, vision, transcription, TTS
│   ├── auth.ts                        # Citizen/Officer auth, ID card validation, password reset
│   ├── store.ts                       # Case ledger, identifier linking, similarity & heat-list
│   └── communityStore.ts              # Anonymous community stories, replies & upvotes
├── src/
│   ├── App.tsx                        # Responsive app shell, global हिं/EN toggle, RBAC routing
│   ├── components/
│   │   ├── ThreatScannerView.tsx      # Universal checker (text/link/photo/voice/APK)
│   │   ├── AnalysisResultPanel.tsx    # Verdict, Audio Read-Aloud, WhatsApp, Police Report, PDF
│   │   ├── NewsAndSafetyView.tsx      # Trending Scams alerts & Spot Real vs Fake quiz
│   │   ├── CommunityWallView.tsx      # Anonymous scam-sharing community wall
│   │   ├── InvestigationDashboardView.tsx  # Investigator-only case ledger & triage workspace
│   │   ├── InvestigatorHeatListView.tsx    # Investigator-only ranked IOCs & syndicate clusters
│   │   ├── AuthPortalModal.tsx        # Citizen / Officer modal, Continue without Login, Forgot PW
│   │   ├── CameraCaptureModal.tsx     # Live camera & gallery upload modal
│   │   ├── SafeLinkModal.tsx          # Pre-click risky URL warning interstitial
│   │   ├── Emergency1930Modal.tsx     # Golden-hour 1930 emergency action checklist
│   │   └── RiskBadge.tsx              # Accessible LOW / MEDIUM / HIGH risk indicator
│   ├── data/
│   │   ├── samples.ts                 # Synthetic hackathon demo presets
│   │   └── translations.ts            # Bilingual Hindi & English copy and scam alerts
│   ├── types/forensics.ts             # Shared TypeScript interfaces
│   └── utils/
│       ├── apkInspector.ts            # Client-side static .APK ZIP inspection + Test APK generator
│       └── reportExport.ts            # jsPDF Unicode PDF reports, JSON bundles, URL defanging
├── .env.example                       # Environment variable template
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation & Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Add your key to `.env`:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

4. **Run in development**
   ```bash
   npm run dev
   ```
   Opens on `http://localhost:3000`.

5. **Type-check & build for production**
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## 🔒 Safety, Privacy & Hackathon Scope

- **Synthetic Data Only**: All sample scams, seeded cases, heat-list entries, community posts, and demo officer badges use synthetic hackathon data — never use real personal data or real ID cards during demos.
- **Static Analysis Only**: Suspicious URLs and `.apk` files are never executed or auto-visited; all links are automatically defanged (`hxxp://`, `[.]`) across the UI and PDF/JSON exports.
- **Out of Scope**: Dynamic runtime malware sandboxing, automated app/website takedowns, and accessing private external accounts.
- **Emergency Cyber Helpline (India)**: Call **1930** or file an official complaint at [cybercrime.gov.in](https://cybercrime.gov.in).

---

## 📄 License

Licensed under the Apache-2.0 License.
