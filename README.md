# 🛡️ Kavach (कवच) — Check If It Is a Scam?

**Kavach (कवच)** is a bilingual (**Hindi + English**), mobile-friendly cyber safety web app designed to be simple enough for both a **10-year-old child** and a **50-year-old elder** to use in seconds.

Paste a suspicious link or message, snap a photo of a screenshot, speak a message aloud, or upload an Android `.apk` — Kavach gives an instant **LOW / MEDIUM / HIGH** risk verdict with plain-language reasons, WhatsApp family warning sharing, and investigation-ready police reports.

---

## 🚨 Problem Statement

Citizens regularly receive fraudulent KYC, electricity-bill, parcel, job, instant-loan, Ponzi/MLM, and illegal betting scams across SMS, WhatsApp, email, and Android APKs. These campaigns reuse the same domains, phone numbers, UPI IDs, and app packages, yet victims often have no simple way to verify a link before clicking or to generate structured evidence for reporting.

---

## ✨ Key Features

- **Universal Scam Checker (`Check Link / जांच करें`)**
  - Inspects URLs, SMS, WhatsApp forwards, phone numbers, UPI IDs, and website content.
  - Detects urgency tactics, impersonation, fake KYC/electricity/job lures, look-alike domains, missing HTTPS, suspicious TLDs, guaranteed-return/MLM/betting language, and known scam patterns.
  - Returns an explainable **LOW / MEDIUM / HIGH** risk verdict with extracted indicators (URLs, domains, phones, UPI IDs, crypto wallets) and **defanged URLs** (`hxxp://`, `[.]`) plus a pre-click safety warning modal.
- **Photo & Camera Scan**
  - Capture a live photo or upload a screenshot/poster to extract text and links and check them automatically.
- **Voice Input & Audio Verdict Read-Aloud**
  - Speak or upload an audio clip describing a suspicious call/message, and listen to the verdict read aloud in **Hindi or English**.
- **Static Android `.APK` Inspector**
  - Inspects `.apk` archives in-browser for risky permissions (`READ_CONTACTS`, `READ_SMS`, `RECEIVE_SMS`, `READ_CALL_LOG`, `CAMERA`, `SYSTEM_ALERT_WINDOW`), package names, and embedded URLs/IPs — includes a one-tap **Safe Test APK** generator for demos.
- **Trending Scams & Safety Practice (`Trending Scams / ट्रेंडिंग स्कैम`)**
  - Live filterable feed of the most reported fake links, UPI IDs, phone numbers, and fake apps.
  - Latest Hindi/English scam news alerts with one-tap **Check** and **WhatsApp Share**.
  - Interactive **1-Minute "Spot Real vs Fake"** practice cards for kids and elders.
- **Anonymous Community Wall (`Community / गुमनाम मंच`)**
  - Open, 100% anonymous space (`Anonymous Citizen`) where people share scam stories, defanged links, and screenshots, reply with advice, upvote helpful warnings, or scan shared links directly in Kavach.
- **WhatsApp Warning Share & Police Evidence Reporting**
  - One-tap formatted **WhatsApp Alert** to warn family groups.
  - Inline **Report to Cyber Police** flow generating a reference receipt (`KVC-LEA-...`) and downloadable **HTML / JSON police evidence reports**.
  - Dedicated **1930 Emergency Helpline** golden-hour action checklist.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, JSZip (client-side static APK inspection)
- **Backend:** Node.js, Express (`server.ts`), TypeScript (`tsx`)
- **AI & Multimodal Analysis:** Server-side Gemini API integration (bilingual plain-language verdicts, screenshot OCR/vision analysis, audio transcription, and text-to-speech)

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
   Copy `.env.example` to `.env` and add your API key:
   ```bash
   cp .env.example .env
   ```
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app runs on `http://localhost:3000`.

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

---

## 🔒 Safety & Scope Notes

- **Static Analysis Only:** APKs and links are never executed in a live sandbox; all suspicious links are automatically defanged before display and export.
- **Demo / Synthetic Data:** Built-in sample scams, trending heat-list entries, and community seed posts use safe synthetic data only — no real personal data is stored or exposed.
- **Emergency Support (India):** For financial cyber fraud, call **1930** or report at [cybercrime.gov.in](https://cybercrime.gov.in).

---

## 📄 License

This project is licensed under the Apache-2.0 License.
