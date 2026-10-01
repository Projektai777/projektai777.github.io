import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'security', 'public-data-allowlist.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const allowedEmails = new Set((manifest.publicEmails || []).map(v => v.toLowerCase()));
const allowedPhones = new Set((manifest.publicPhones || []).map(v => String(v).replace(/\D/g, '')));
const approvedFiles = manifest.approvedPublicFiles || {};
const failures = new Map();
const report = (file, category) => {
  if (!failures.has(file)) failures.set(file, new Set());
  failures.get(file).add(category);
};

const git = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' });
if (git.status !== 0) {
  console.error('public-repo-safety: unable to enumerate repository files');
  process.exit(2);
}
const files = git.stdout.split('\0').filter(Boolean).map(v => v.replace(/\\/g, '/'));
const protectedExt = /\.(?:pdf|docx?|xlsx?|pptx?|od[tp]|rtf|pages|numbers|keynote|exe|msi|dmg|pkg|appx|deb|rpm)$/i;
const binaryExt = /\.(?:pdf|docx?|xlsx?|pptx?|od[tp]|rtf|exe|msi|dmg|pkg|appx|deb|rpm|png|jpe?g|webp|gif|ico|mp[34]|mov|avi|mkv|wav|flac)$/i;
const forbiddenName = /(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?|\.npmrc|\.pypirc|\.netrc|secrets?|credentials?|id_(?:rsa|dsa|ecdsa|ed25519))(?:\/|$)|(?:^|\/)[^/]*(?:secret|credential|private[_-]?key)[^/]*$/i;
const forbiddenExt = /\.(?:pem|key|p12|pfx|jks|keystore|cer|crt|db|sqlite3?|dump|sql|csv|tsv|zip|7z|rar|tar|tgz|gz|log|bak|backup)$/i;
const tokenRules = [
  /AKIA[0-9A-Z]{16}/g,
  /ASIA[0-9A-Z]{16}/g,
  /gh[oprsu]_[A-Za-z0-9]{36,255}/g,
  /github_pat_[A-Za-z0-9_]{50,255}/g,
  /sk-(?:live|test|proj)-[A-Za-z0-9_-]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]{20,}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|https?):\/\/[^\s/:@]+:[^\s/@]+@[^\s]+/gi
];
const emailRe = /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Z0-9-]+(?:\.[A-Z0-9-]+)+)\b/gi;
const phoneRe = /(?:\+|00)370[\s().-]*\d(?:[\s().-]*\d){7,8}\b/g;
const ibanRe = /\bLT\d{18}\b/gi;
const personalCodeRe = /(?<!\d)[1-6]\d{10}(?!\d)/g;
const validPersonalCode = value => {
  const century = { 1: 18, 2: 18, 3: 19, 4: 19, 5: 20, 6: 20 }[value[0]];
  const year = century * 100 + Number(value.slice(1, 3));
  const month = Number(value.slice(3, 5));
  const day = Number(value.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  const digits = [...value].map(Number);
  let check = digits.slice(0, 10).reduce((sum, digit, i) => sum + digit * [1,2,3,4,5,6,7,8,9,1][i], 0) % 11;
  if (check === 10) check = digits.slice(0, 10).reduce((sum, digit, i) => sum + digit * [3,4,5,6,7,8,9,1,2,3][i], 0) % 11;
  if (check === 10) check = 0;
  return check === digits[10];
};
const uuidRe = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

for (const file of files) {
  if (file === 'scripts/check-public-repo.mjs' || file === 'security/public-data-allowlist.json') continue;
  const full = path.join(root, ...file.split('/'));
  let info;
  try { info = await stat(full); } catch { continue; }
  if (!info.isFile()) continue;
  const isExampleEnv = /(^|\/)\.env\.example$/i.test(file);
  if ((forbiddenName.test(file) && !isExampleEnv) || forbiddenExt.test(file)) report(file, 'forbidden sensitive filename or extension');
  const data = await readFile(full);
  if (protectedExt.test(file)) {
    const expected = approvedFiles[file];
    const actual = createHash('sha256').update(data).digest('hex');
    if (!expected || expected.toLowerCase() !== actual) report(file, 'unapproved or modified public document/executable');
  }
  if (binaryExt.test(file)) {
    const rawLatin = data.toString('latin1');
    const rawUtf16 = data.toString('utf16le');
    const metadataRule = /(?:GPSLatitude|GPSLongitude|GPSPosition|XPAuthor|XPComment|UserComment|\/Author\s*\(|C:\\Users\\[^\\\s]+|\/Users\/[^/\s]+)/i;
    if (metadataRule.test(rawLatin) || metadataRule.test(rawUtf16)) report(file, 'sensitive binary/media metadata');
    continue;
  }
  if (data.includes(0)) continue;
  const text = data.toString('utf8');
  for (const rule of tokenRules) {
    rule.lastIndex = 0;
    if (rule.test(text)) report(file, 'credential or private key');
  }
  for (const match of text.matchAll(emailRe)) {
    const address = match[0].toLowerCase();
    const domain = match[1].toLowerCase();
    if (!domain.endsWith('.example') && !['example.com', 'example.net', 'example.org'].includes(domain) && !allowedEmails.has(address)) report(file, 'unapproved email address');
  }
  for (const match of text.matchAll(phoneRe)) {
    const digits = match[0].replace(/\D/g, '');
    const normalized = digits.startsWith('00') ? digits.slice(2) : digits;
    if (!allowedPhones.has(normalized)) report(file, 'unapproved +370 phone number');
  }
  ibanRe.lastIndex = 0;
  if (ibanRe.test(text)) report(file, 'literal Lithuanian IBAN');
  if ([...text.matchAll(personalCodeRe)].some(match => validPersonalCode(match[0]))) report(file, 'Lithuanian personal code');
  uuidRe.lastIndex = 0;
  if (uuidRe.test(text)) report(file, 'UUID');
}

if (files.includes('tenants.js')) {
  try {
    const tenantSource = await readFile(path.join(root, 'tenants.js'), 'utf8');
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(tenantSource).toString('base64')}`;
    const imported = await import(moduleUrl);
    const tenants = imported.default || imported.TENANTS || imported.tenants;
    if (!tenants || typeof tenants !== 'object') throw new Error('invalid export');
    for (const [name, tenant] of Object.entries(tenants)) {
      if (!tenant || typeof tenant !== 'object') continue;
      const hasSensitive = Boolean(tenant.staff_secret || tenant.staff_pass_hash);
      const demo = name.toLowerCase().includes('demo') || tenant.preview === true;
      if (hasSensitive && (!demo || tenant.server === true)) report('tenants.js', 'unsafe tenant staff credential fields');
    }
  } catch {
    report('tenants.js', 'unable to safely parse tenant configuration');
  }
}

if (failures.size) {
  console.error('Public repository safety check failed:');
  for (const [file, categories] of [...failures].sort()) console.error(`- ${file}: ${[...categories].sort().join(', ')}`);
  process.exit(1);
}
console.log(`Public repository safety check passed (${files.length} files scanned).`);
