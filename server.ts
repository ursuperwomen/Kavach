import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  AnalyzeRequestPayload,
  AppLanguage,
  AssetType,
  CaseStatus,
  ChannelType,
  CommunityCategory,
} from './src/types/forensics';
import {
  analyzeSubmission,
  extractFromImageWithGemini,
  synthesizeSpeechWithGemini,
  transcribeAudioWithGemini,
} from './server/analyzer';
import { authStore } from './server/auth';
import { communityStore } from './server/community';
import { caseStore } from './server/store';
import type { AuthUser } from './src/types/forensics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_ASSET_TYPES = new Set<AssetType>(['message', 'url', 'apk', 'website']);
const VALID_CHANNELS = new Set<ChannelType>([
  'SMS',
  'WhatsApp',
  'Email',
  'Social Media',
  'Web Browser',
  'Android APK / Store',
  'Citizen Bot',
]);
const VALID_STATUSES = new Set<CaseStatus>([
  'Open',
  'Under Review',
  'Escalated to LEA',
  'Closed / Benign',
]);
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

function inferAssetType(content: string, url?: string, hasApk?: boolean): AssetType {
  if (hasApk || /\.apk\b/i.test(`${content} ${url || ''}`)) return 'apk';
  const trimmed = content.trim();
  const singleUrl = /^https?:\/\/\S+$/i.test(trimmed);
  if (singleUrl || (url && !trimmed)) return 'url';
  if (/(roi|daily\s+profit|betting|aviator|color\s+prediction|vip\s+level)/i.test(trimmed)) {
    return 'website';
  }
  return 'message';
}

async function startServer() {
  await caseStore.init();

  const app = express();
  app.use(express.json({ limit: '12mb' }));

  const extractBearerToken = (req: express.Request): string | undefined => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    return authHeader.slice(7).trim() || undefined;
  };

  const getRequestUser = (req: express.Request): AuthUser | null => {
    return authStore.getUserFromToken(extractBearerToken(req));
  };

  const requireInvestigator: express.RequestHandler = (req, res, next) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Investigator sign-in required. Create or sign in with a verified Officer ID.',
      });
      return;
    }
    if (user.role !== 'investigator' || !user.idProofVerified) {
      res.status(403).json({
        error: 'Access restricted to verified Cyber Cell Investigators only.',
      });
      return;
    }
    res.locals.user = user;
    next();
  };

  // --- Authentication Routes (Optional for Citizens; ID-Card Verified for Investigators) ---
  app.get('/api/auth/me', (req, res) => {
    const user = getRequestUser(req);
    res.json({ user });
  });

  app.post('/api/auth/register-investigator', (req, res) => {
    const { fullName, email, password, badgeId, department, idCardDataUrl } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      badgeId?: string;
      department?: string;
      idCardDataUrl?: string;
    };

    const result = authStore.registerInvestigator({
      fullName: typeof fullName === 'string' ? fullName : '',
      email: typeof email === 'string' ? email : '',
      password: typeof password === 'string' ? password : '',
      badgeId: typeof badgeId === 'string' ? badgeId : '',
      department: typeof department === 'string' ? department : '',
      idCardDataUrl: typeof idCardDataUrl === 'string' ? idCardDataUrl : '',
    });

    if (result.error || !result.token || !result.user) {
      res.status(400).json({ error: result.error || 'Investigator registration failed.' });
      return;
    }
    res.status(201).json({ token: result.token, user: result.user });
  });

  app.post('/api/auth/register-citizen', (req, res) => {
    const { fullName, email, password } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
    };

    const result = authStore.registerCitizen({
      fullName: typeof fullName === 'string' ? fullName : '',
      email: typeof email === 'string' ? email : '',
      password: typeof password === 'string' ? password : '',
    });

    if (result.error || !result.token || !result.user) {
      res.status(400).json({ error: result.error || 'Citizen registration failed.' });
      return;
    }
    res.status(201).json({ token: result.token, user: result.user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const result = authStore.login(
      typeof email === 'string' ? email : '',
      typeof password === 'string' ? password : ''
    );
    if (result.error || !result.token || !result.user) {
      res.status(401).json({ error: result.error || 'Invalid credentials.' });
      return;
    }
    res.json({ token: result.token, user: result.user });
  });

  app.post('/api/auth/logout', (req, res) => {
    authStore.logout(extractBearerToken(req));
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body as { email?: string };
    const result = authStore.requestPasswordReset(typeof email === 'string' ? email : '');
    if (result.error || !result.sent) {
      res.status(404).json({ error: result.error || 'Could not initiate password reset.' });
      return;
    }
    res.json({
      sent: true,
      demoResetCode: result.demoResetCode,
      expiresInMinutes: result.expiresInMinutes,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };
    const result = authStore.resetPassword(
      typeof email === 'string' ? email : '',
      typeof code === 'string' ? code : '',
      typeof newPassword === 'string' ? newPassword : ''
    );
    if (result.error || !result.ok) {
      res.status(400).json({ error: result.error || 'Could not reset password.' });
      return;
    }
    res.json({ ok: true, role: result.role });
  });

  // List cases with search & filter (INVESTIGATOR ONLY)
  app.get('/api/cases', requireInvestigator, (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const risk = typeof req.query.risk === 'string' ? req.query.risk.toUpperCase() : '';
    const assetType = typeof req.query.assetType === 'string' ? req.query.assetType.toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';

    let results = caseStore.getAllCases();

    if (risk && risk !== 'ALL') {
      results = results.filter((c) => c.riskLevel === risk);
    }
    if (assetType && assetType !== 'all') {
      results = results.filter((c) => c.assetType === assetType);
    }
    if (status && status !== 'ALL') {
      results = results.filter((c) => c.status === status);
    }
    if (q) {
      results = results.filter((c) => {
        const haystack = [
          c.caseId,
          c.title,
          c.threatCategory,
          c.channel,
          c.rawInput,
          c.senderInfo || '',
          ...c.identifiers.domains,
          ...c.identifiers.phoneNumbers,
          ...c.identifiers.upiIds,
          ...c.identifiers.packageNames,
          ...c.identifiers.cryptoWallets,
          ...c.identifiers.bankAccounts,
          ...c.identifiers.ipAddresses,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    res.json({ cases: results, total: results.length });
  });

  // Get single case (INVESTIGATOR ONLY)
  app.get('/api/cases/:caseId', requireInvestigator, (req, res) => {
    const found = caseStore.getCaseById(req.params.caseId);
    if (!found) {
      res.status(404).json({ error: 'Case record not found.' });
      return;
    }
    res.json({ caseRecord: found });
  });

  // Analyze suspicious message, URL, APK metadata, or website
  app.post('/api/analyze', async (req, res) => {
    try {
      const body = req.body as Partial<AnalyzeRequestPayload>;

      const content = typeof body.content === 'string' ? body.content.trim().slice(0, 12000) : '';
      const url = typeof body.url === 'string' ? body.url.trim().slice(0, 2000) : undefined;
      const assetType: AssetType =
        body.assetType && VALID_ASSET_TYPES.has(body.assetType)
          ? body.assetType
          : inferAssetType(content, url, Boolean(body.apkMetadata));
      const channel: ChannelType =
        body.channel && VALID_CHANNELS.has(body.channel) ? body.channel : 'SMS';
      const lang: AppLanguage = body.lang === 'hi' ? 'hi' : 'en';
      const senderInfo =
        typeof body.senderInfo === 'string' ? body.senderInfo.trim().slice(0, 200) : undefined;
      const submittedBy =
        typeof body.submittedBy === 'string' ? body.submittedBy.trim().slice(0, 120) : undefined;

      if (!content && !url && !body.apkMetadata?.packageName && !body.apkMetadata?.appName) {
        res.status(400).json({
          error:
            lang === 'hi'
              ? 'कृपया जांच के लिए कोई लिंक, मैसेज, या ऐप की जानकारी डालें।'
              : 'Please paste a link, message, website text, or Android APK details to check.',
        });
        return;
      }

      const reqUser = getRequestUser(req);
      const defaultSubmitter = reqUser
        ? reqUser.role === 'investigator'
          ? `Officer ${reqUser.fullName} (${reqUser.badgeId})`
          : `Citizen ${reqUser.fullName}`
        : undefined;

      const payload: AnalyzeRequestPayload = {
        assetType,
        channel,
        content: content || url || body.apkMetadata?.appName || 'APK inspection submission',
        url: url || (/^https?:\/\/\S+$/i.test(content) ? content : undefined),
        senderInfo,
        submittedBy: submittedBy || defaultSubmitter,
        lang,
        apkMetadata: body.apkMetadata,
        saveToLedger: body.saveToLedger !== false,
      };

      const nextCaseId = caseStore.getNextCaseId();
      const record = await analyzeSubmission(payload, caseStore.getAllCases(), nextCaseId);

      if (payload.saveToLedger) {
        caseStore.addCase(record);
      }

      res.status(201).json({ caseRecord: record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected analysis error';
      res.status(500).json({ error: message });
    }
  });

  // Camera / Photo Screenshot Scam Analysis
  app.post('/api/analyze-image', async (req, res) => {
    try {
      const { imageBase64, mimeType, lang, saveToLedger } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        lang?: AppLanguage;
        saveToLedger?: boolean;
      };

      const safeLang: AppLanguage = lang === 'hi' ? 'hi' : 'en';
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Please capture or upload a photo first.' });
        return;
      }
      const cleanMime = typeof mimeType === 'string' ? mimeType.toLowerCase() : '';
      if (!ALLOWED_IMAGE_MIMES.has(cleanMime)) {
        res.status(400).json({ error: 'Unsupported image format. Please use JPG, PNG, or WebP.' });
        return;
      }
      if (imageBase64.length > 9_000_000) {
        res.status(413).json({ error: 'Image is too large. Please use a photo under 6 MB.' });
        return;
      }

      const vision = await extractFromImageWithGemini(imageBase64, cleanMime, safeLang);
      if (vision.error) {
        res.status(502).json({ error: vision.error });
        return;
      }

      const combinedText = [
        vision.extractedText || '',
        vision.visualClues ? `\n[Photo Visual Clues]: ${vision.visualClues}` : '',
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      if (!combinedText) {
        res.status(422).json({
          error:
            safeLang === 'hi'
              ? 'फोटो में कोई लिंक या टेक्स्ट साफ दिखाई नहीं दिया। कृपया थोड़ी साफ फोटो लें।'
              : 'No readable link or text was found in the photo. Please take a clearer picture.',
        });
        return;
      }

      const detectedUrl = vision.detectedUrl?.trim() || undefined;
      const assetType = inferAssetType(combinedText, detectedUrl, false);
      const nextCaseId = caseStore.getNextCaseId();

      const record = await analyzeSubmission(
        {
          assetType,
          channel: 'Social Media',
          content: combinedText,
          url: detectedUrl,
          submittedBy: 'Kavach Camera / Photo Scanner',
          lang: safeLang,
          saveToLedger: saveToLedger !== false,
        },
        caseStore.getAllCases(),
        nextCaseId
      );

      if (saveToLedger !== false) {
        caseStore.addCase(record);
      }

      res.status(201).json({
        caseRecord: record,
        extractedText: vision.extractedText,
        visualClues: vision.visualClues,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Photo analysis failed.';
      res.status(500).json({ error: message });
    }
  });

  // Voice / Audio Transcription + Automatic Scam Check
  app.post('/api/transcribe-audio', async (req, res) => {
    try {
      const { audioBase64, mimeType, lang, autoAnalyze } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        lang?: AppLanguage;
        autoAnalyze?: boolean;
      };

      const safeLang: AppLanguage = lang === 'hi' ? 'hi' : 'en';
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'No audio recording provided.' });
        return;
      }
      const cleanMime = (typeof mimeType === 'string' ? mimeType.split(';')[0] : '').toLowerCase();
      if (!ALLOWED_AUDIO_MIMES.has(cleanMime)) {
        res.status(400).json({ error: 'Unsupported audio format. Use WebM, WAV, MP3, or OGG.' });
        return;
      }
      if (audioBase64.length > 10_000_000) {
        res.status(413).json({ error: 'Audio clip is too large (max ~7 MB).' });
        return;
      }

      const result = await transcribeAudioWithGemini(audioBase64, cleanMime);
      if (result.error || !result.transcript) {
        res.status(502).json({ error: result.error || 'Could not transcribe audio.' });
        return;
      }

      if (autoAnalyze) {
        const nextCaseId = caseStore.getNextCaseId();
        const record = await analyzeSubmission(
          {
            assetType: inferAssetType(result.transcript, undefined, false),
            channel: 'Citizen Bot',
            content: result.transcript,
            submittedBy: 'Kavach Voice Scanner',
            lang: safeLang,
            saveToLedger: true,
          },
          caseStore.getAllCases(),
          nextCaseId
        );
        caseStore.addCase(record);
        res.status(201).json({ transcript: result.transcript, caseRecord: record });
        return;
      }

      res.json({ transcript: result.transcript });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio processing failed.';
      res.status(500).json({ error: message });
    }
  });

  // Spoken Audio Verdict (Gemini 3.8 Flash Lite TTS)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, lang } = req.body as { text?: string; lang?: AppLanguage };
      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text is required for audio playback.' });
        return;
      }
      const safeLang: AppLanguage = lang === 'hi' ? 'hi' : 'en';
      const tts = await synthesizeSpeechWithGemini(text.trim(), safeLang);
      if (tts.error || !tts.audioBase64) {
        res.status(502).json({ error: tts.error || 'TTS failed.' });
        return;
      }
      res.json({ audioBase64: tts.audioBase64, mimeType: tts.mimeType || 'audio/wav' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio playback error.';
      res.status(500).json({ error: message });
    }
  });

  // Direct Citizen Report to Cyber Police
  app.post('/api/report-police', (req, res) => {
    const { caseId, reporterName, city, moneyLost, amountInr, extraDetails } = req.body as {
      caseId?: string;
      reporterName?: string;
      city?: string;
      moneyLost?: boolean;
      amountInr?: string;
      extraDetails?: string;
    };

    if (!caseId || typeof caseId !== 'string') {
      res.status(400).json({ error: 'Valid Case ID is required to file a Cyber Police report.' });
      return;
    }

    const filed = caseStore.filePoliceReport(caseId, {
      reporterName: typeof reporterName === 'string' ? reporterName.slice(0, 100) : undefined,
      city: typeof city === 'string' ? city.slice(0, 80) : 'India',
      moneyLost: Boolean(moneyLost),
      amountInr: typeof amountInr === 'string' ? amountInr.slice(0, 30) : undefined,
      extraDetails: typeof extraDetails === 'string' ? extraDetails.slice(0, 1000) : undefined,
    });

    if (!filed) {
      res.status(404).json({ error: 'Case record not found.' });
      return;
    }

    res.status(201).json(filed);
  });

  // Update case status / append investigator log note (INVESTIGATOR ONLY)
  app.patch('/api/cases/:caseId', requireInvestigator, (req, res) => {
    const { status, note, actor } = req.body as {
      status?: CaseStatus;
      note?: string;
      actor?: string;
    };

    if (status && !VALID_STATUSES.has(status)) {
      res.status(400).json({ error: 'Invalid case status value.' });
      return;
    }

    const officer = res.locals.user as AuthUser;
    const verifiedActor = `${officer.fullName} (${officer.badgeId || 'Investigator'})`;

    const updated = caseStore.updateCase(req.params.caseId, {
      status,
      note: typeof note === 'string' ? note.slice(0, 2000) : undefined,
      actor: typeof actor === 'string' && actor.trim() ? actor.slice(0, 100) : verifiedActor,
    });

    if (!updated) {
      res.status(404).json({ error: 'Case record not found.' });
      return;
    }

    res.json({ caseRecord: updated });
  });

  // Heat-list & cross-campaign entity clusters (INVESTIGATOR ONLY)
  app.get('/api/heatlist', requireInvestigator, (_req, res) => {
    res.json(caseStore.getHeatList());
  });

  // Anonymous Community Wall — list posts
  app.get('/api/community', (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : 'ALL';
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const posts = communityStore.getAllPosts(category, q);
    res.json({ posts });
  });

  // Anonymous Community Wall — create post (story + optional link + optional screenshot photo)
  app.post('/api/community', (req, res) => {
    const { story, city, category, suspiciousLink, imageDataUrl } = req.body as {
      story?: string;
      city?: string;
      category?: CommunityCategory;
      suspiciousLink?: string;
      imageDataUrl?: string;
    };

    const cleanStory = typeof story === 'string' ? story.trim() : '';
    const cleanLink = typeof suspiciousLink === 'string' ? suspiciousLink.trim() : '';

    if (!cleanStory && !cleanLink && !imageDataUrl) {
      res.status(400).json({ error: 'Please write your scam story, paste a link, or attach a photo.' });
      return;
    }

    let validatedImage: string | undefined;
    if (imageDataUrl && typeof imageDataUrl === 'string') {
      const validPrefix = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
      if (!validPrefix.test(imageDataUrl)) {
        res.status(400).json({ error: 'Only JPG, PNG, or WebP images are allowed.' });
        return;
      }
      if (imageDataUrl.length > 5_500_000) {
        res.status(413).json({ error: 'Image is too large. Please upload a photo under 4 MB.' });
        return;
      }
      validatedImage = imageDataUrl;
    }

    const post = communityStore.addPost({
      story: cleanStory || 'Shared suspicious link / screenshot to warn the community.',
      city,
      category,
      suspiciousLink: cleanLink || undefined,
      imageDataUrl: validatedImage,
    });

    res.status(201).json({ post });
  });

  // Anonymous Community Wall — add anonymous reply
  app.post('/api/community/:postId/reply', (req, res) => {
    const { message } = req.body as { message?: string };
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Reply cannot be empty.' });
      return;
    }
    const updated = communityStore.addReply(req.params.postId, message);
    if (!updated) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    res.status(201).json({ post: updated });
  });

  // Anonymous Community Wall — mark helpful
  app.post('/api/community/:postId/helpful', (req, res) => {
    const updated = communityStore.incrementHelpful(req.params.postId);
    if (!updated) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    res.json({ post: updated });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kavach server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
