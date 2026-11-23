import JSZip from 'jszip';

export interface ParsedApkSummary {
  fileName: string;
  fileSizeKb: number;
  archiveEntriesCount: number;
  hasAndroidManifest: boolean;
  hasClassesDex: boolean;
  hasSignatureBlock: boolean;
  detectedPackageName?: string;
  detectedPermissions: string[];
  embeddedUrls: string[];
  embeddedStrings: string[];
}

const KNOWN_PERMISSIONS = [
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.READ_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.SEND_SMS',
  'android.permission.READ_CALL_LOG',
  'android.permission.CAMERA',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.BIND_ACCESSIBILITY_SERVICE',
  'android.permission.INTERNET',
  'android.permission.RECORD_AUDIO',
];

function extractPrintableAsciiAndUtf16(bytes: Uint8Array, maxBytes = 400000): string {
  const limit = Math.min(bytes.length, maxBytes);
  let ascii = '';
  for (let i = 0; i < limit; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) {
      ascii += String.fromCharCode(b);
    } else if (b === 0) {
      // Android binary XML often stores UTF-16LE strings (char + 0x00)
      continue;
    } else {
      ascii += ' ';
    }
  }
  return ascii;
}

export async function inspectApkArchive(file: File): Promise<ParsedApkSummary> {
  const zip = await JSZip.loadAsync(file);
  const entryNames = Object.keys(zip.files);

  const hasAndroidManifest = entryNames.some((n) => n === 'AndroidManifest.xml');
  const hasClassesDex = entryNames.some((n) => /^classes\d*\.dex$/i.test(n));
  const hasSignatureBlock = entryNames.some((n) => /^META-INF\/.*\.(RSA|DSA|EC)$/i.test(n));

  let combinedStrings = '';

  // Inspect manifest, config text/json/xml files, and first dex slice safely
  const interestingEntries = entryNames
    .filter(
      (n) =>
        n === 'AndroidManifest.xml' ||
        n.endsWith('.json') ||
        n.endsWith('.xml') ||
        n.endsWith('.txt') ||
        n.endsWith('.properties') ||
        n === 'classes.dex'
    )
    .slice(0, 18);

  for (const name of interestingEntries) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    try {
      const bytes = await entry.async('uint8array');
      combinedStrings += '\n' + extractPrintableAsciiAndUtf16(bytes, name === 'classes.dex' ? 250000 : 120000);
    } catch {
      // ignore unreadable archive entry
    }
  }

  const detectedPermissions = KNOWN_PERMISSIONS.filter((perm) => combinedStrings.includes(perm));
  const urlMatches = combinedStrings.match(/https?:\/\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]+/g) || [];
  const ipMatches =
    combinedStrings.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g) || [];
  const upiMatches =
    combinedStrings.match(/\b[a-zA-Z0-9._-]{2,40}@(?:ybl|okaxis|okicici|oksbi|okhdfcbank|paytm|ibl|axl|upi)\b/gi) || [];
  const pkgMatches =
    combinedStrings.match(/\b(?:com|in|org)\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,3}\b/g) || [];

  const filteredPkg = pkgMatches.find(
    (p) => !p.startsWith('com.android.') && !p.startsWith('com.google.') && !p.startsWith('org.apache.')
  );

  const uniqueUrls = Array.from(new Set(urlMatches)).slice(0, 15);
  const embeddedStrings = Array.from(new Set([...uniqueUrls, ...ipMatches, ...upiMatches])).slice(0, 20);

  return {
    fileName: file.name,
    fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
    archiveEntriesCount: entryNames.length,
    hasAndroidManifest,
    hasClassesDex,
    hasSignatureBlock,
    detectedPackageName: filteredPkg,
    detectedPermissions,
    embeddedUrls: uniqueUrls,
    embeddedStrings,
  };
}

/**
 * Generates a completely safe synthetic test APK archive (ZIP) in-browser
 * so hackathon judges/evaluators can test real file upload + JSZip manifest extraction!
 */
export async function createSafeTestApkFile(): Promise<File> {
  const zip = new JSZip();
  zip.file(
    'AndroidManifest.xml',
    `<manifest package="com.fastcash.instantloan.test" versionName="3.1.0">
      <uses-permission android:name="android.permission.READ_CONTACTS"/>
      <uses-permission android:name="android.permission.READ_SMS"/>
      <uses-permission android:name="android.permission.RECEIVE_SMS"/>
      <uses-permission android:name="android.permission.READ_CALL_LOG"/>
      <uses-permission android:name="android.permission.CAMERA"/>
      <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
      <uses-permission android:name="android.permission.INTERNET"/>
    </manifest>`
  );
  zip.file(
    'assets/config.json',
    JSON.stringify(
      {
        appName: 'FastCash Instant Loan (R4C Safe Test Sample)',
        c2UploadEndpoint: 'http://185.224.128.44:8080/api/v2/upload_contacts',
        collectionPortal: 'http://verify-kyc-secure.xyz/repay',
        supportPhone: '+91-98710-44219',
        collectionUpi: 'fastpay.verify@ybl',
        note: 'Synthetic harmless test fixture for R4C forensic scanner demo only.',
      },
      null,
      2
    )
  );
  zip.file('META-INF/TESTKEY.RSA', 'SYNTHETIC_SELF_SIGNED_DEBUG_CERT_DEMO_ONLY');

  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'FastCash_InstantLoan_R4C_SafeSample.apk', {
    type: 'application/vnd.android.package-archive',
  });
}
