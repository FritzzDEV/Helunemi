'use strict';

const http = require('node:http');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { promisify } = require('node:util');
const { createFileStorage } = require('./file-storage');
const { createSocialSystem, sniffMedia } = require('./social-system');
const DEFAULT_CONTENT = require('./site-defaults.json');
const { createShopSystem, countryCode } = require('./shop-system');
const {createFriendCardLibrary,validateFriendCardIdentity} = require('./friend-card-library');

const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const DATA_DIR = process.env.SOLARIS_DATA_DIR ? path.resolve(process.env.SOLARIS_DATA_DIR) : path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'accounts.json');
const PORT = Number(process.env.PORT) || 4173;
const HOST = '0.0.0.0';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PAUSE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BODY = 16 * 1024 * 1024;
const MAX_GAME_BUILD_BYTES = Math.min(4 * 1024 ** 3, Math.max(50 * 1024 ** 2, Number(process.env.SOLARIS_MAX_GAME_BUILD_BYTES) || 2 * 1024 ** 3));
const BUILT_IN_GAME_IDS = new Set(['gamma-frost', 'omiwo']);
const STATIC_FILES = new Set(['index.html', 'list.html', 'members.html', 'games.html', 'project.html', 'artwork.html', 'updates.html', 'account.html', 'arts.html', 'groups.html', 'download.html', 'shop.html', 'chat.html', 'publish.html', 'assets/hollow-shift-icon.webp', 'assets/gamma-frost-banner.webp', 'assets/golden-spiral-sun-icon.png', 'assets/namecard-ticket.png', 'assets/who-ticket.png', 'styles.css', 'app.js', 'profile-social.js', 'profile-social.css', 'storefront.js', 'create-post.html', 'shop-product.html', 'explore-ais.html', 'assets/menu-icon.png']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
const PRIMARY_ROLES = {
  assistant: { label: 'Assistant', explanation: 'Supports studio coordination and helps keep Helunemi projects moving.' },
  'ai-assistant': { label: 'AI Assistant', explanation: 'An AI contributor that helps with Helunemi work under human direction.' },
  developer: { label: 'Developer', explanation: 'Builds, tests, or maintains Helunemi projects.' },
  member: { label: 'Member', explanation: 'A member of the Helunemi community.' }
};
const PROJECT_TAGS = ['Gamma Frost', 'OmiWo: Collide'];
const FRIEND_CARD_STROKES = new Set(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge']);
const FRIEND_CARD_EFFECTS = new Set(['none', 'glow', 'lift', 'shine']);

let accounts = [];
let pausedAccounts = [];
const EMPTY_SITE_CONTENT = { games: [], arts: [], updates: [], downloads: [], gameBuilds: [], deletedBuiltins: [] };
let siteContent = { ...EMPTY_SITE_CONTENT };
let pool = null;
let firebaseAuth = null;
const sessions = new Map();
const attempts = new Map();
const communityPresence = new Map();
let writeQueue = Promise.resolve();
const fileStore = createFileStorage({ getPool: () => pool, dataDir: DATA_DIR });
const socialSystem = createSocialSystem({ getAccounts: () => accounts, getAccount, send, readBody, save: saveAccounts, files: fileStore, cleanFriendCard });
const shopSystem = createShopSystem({ getAccount, send, readBody, save: saveAccounts, privateProfile, cleanImage: siteContentImage });
const friendCardLibrary = createFriendCardLibrary({getAccount,send,readBody,save:saveAccounts,clean:cleanFriendCard,publishAssets:setFriendCardAssetsPublished,privateProfile});

function send(res, status, value, headers = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY) { reject(Object.assign(new Error('Request is too large.'), { status: 413 })); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(Object.assign(new Error('Please send valid form data.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === req.headers.host;
  } catch { return false; }
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split(/=(.*)/s).slice(0, 2)).filter(pair => pair.length === 2));
}
function sessionHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function firebaseCredentials() {
  let serviceAccount = null;
  let privateKeyFromFile = '';
  const secretFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.FIREBASE_PRIVATE_KEY_FILE || '';
  const candidates = [
    secretFile,
    '/etc/secrets/FIREBASE_PRIVATE_KEY',
    '/etc/secrets/firebase-service-account.json',
    path.join(ROOT, 'FIREBASE_PRIVATE_KEY'),
    path.join(ROOT, 'firebase-service-account.json')
  ].filter((value, index, values) => value && values.indexOf(value) === index);
  for (const candidate of candidates) {
    try {
      const contents = fsSync.readFileSync(candidate, 'utf8').trim();
      if (contents.startsWith('{')) serviceAccount = JSON.parse(contents);
      else if (candidate === secretFile || candidate.endsWith('FIREBASE_PRIVATE_KEY')) privateKeyFromFile = contents;
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'EISDIR') console.error('FIREBASE SECRET FILE ERROR:', error.message);
    }
  }
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || privateKeyFromFile || serviceAccount?.private_key || '';
  if (privateKey && !privateKey.includes('PRIVATE KEY') && fsSync.existsSync(privateKey)) {
    try { privateKey = fsSync.readFileSync(privateKey, 'utf8').trim(); }
    catch (error) { console.error('FIREBASE PRIVATE KEY FILE ERROR:', error.message); privateKey = ''; }
  }
  return {
    projectId: text(process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id, 200),
    clientEmail: text(process.env.FIREBASE_CLIENT_EMAIL || serviceAccount?.client_email, 300),
    storageBucket: text(process.env.FIREBASE_STORAGE_BUCKET || serviceAccount?.storage_bucket, 300),
    privateKey: String(privateKey).replace(/\\n/g, '\n')
  };
}
function firebaseStorageBucket() {
  const serviceAccount = firebaseCredentials();
  return text(process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.storageBucket, 300).replace(/^gs:\/\//, '').replace(/\/$/, '');
}
function firebaseWebConfig() {
  const credentials = firebaseCredentials();
  const projectId = text(process.env.FIREBASE_PROJECT_ID || credentials.projectId, 200);
  const config = {
    apiKey: text(process.env.FIREBASE_WEB_API_KEY, 300),
    authDomain: text(process.env.FIREBASE_AUTH_DOMAIN, 300),
    projectId,
    storageBucket: firebaseStorageBucket(),
    appId: text(process.env.FIREBASE_APP_ID, 300),
    messagingSenderId: text(process.env.FIREBASE_MESSAGING_SENDER_ID, 100)
  };
  const missingSettings = [];
  if (!projectId) missingSettings.push('FIREBASE_PROJECT_ID');
  if (!credentials.clientEmail) missingSettings.push('FIREBASE_CLIENT_EMAIL or a Firebase service-account file');
  if (!credentials.privateKey) missingSettings.push('FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_FILE');
  if (!config.apiKey) missingSettings.push('FIREBASE_WEB_API_KEY');
  if (!config.authDomain) missingSettings.push('FIREBASE_AUTH_DOMAIN');
  if (!config.appId) missingSettings.push('FIREBASE_APP_ID');
  return { enabled: missingSettings.length === 0, storageEnabled: Boolean(config.storageBucket && credentials.clientEmail && credentials.privateKey), config, missingSettings };
}
function getFirebaseAuth() {
  const setup = firebaseWebConfig();
  if (!setup.enabled) throw Object.assign(new Error('Firebase email sign-in has not been configured on the server yet.'), { status: 503 });
  if (firebaseAuth) return firebaseAuth;
  try {
    const credentials = firebaseCredentials();
    const { cert, getApps, initializeApp } = require('firebase-admin/app');
    const { getAuth } = require('firebase-admin/auth');
    const app = getApps().find(item => item.name === 'solaris-firebase') || initializeApp({
      credential: cert({
        projectId: credentials.projectId || setup.config.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey
      }),
      projectId: setup.config.projectId,
      storageBucket: setup.config.storageBucket || undefined
    }, 'solaris-firebase');
    firebaseAuth = getAuth(app);
    return firebaseAuth;
  } catch (error) {
    console.error('FIREBASE ADMIN SETUP ERROR:', error);
    throw Object.assign(new Error('Firebase server authentication could not be initialized. Check the Render environment settings and logs.'), { status: 503 });
  }
}
function getFirebaseStorageBucket() {
  const bucketName = firebaseStorageBucket();
  const credentials = firebaseCredentials();
  if (!bucketName || !credentials.projectId || !credentials.clientEmail || !credentials.privateKey) throw Object.assign(new Error('Firebase Storage is not configured. Set FIREBASE_STORAGE_BUCKET and the Firebase Admin credentials on Render.'), { status: 503 });
  try {
    const { cert, getApps, initializeApp } = require('firebase-admin/app');
    const { getStorage } = require('firebase-admin/storage');
    const app = getApps().find(item => item.name === 'solaris-storage') || initializeApp({ credential: cert({ projectId: credentials.projectId, clientEmail: credentials.clientEmail, privateKey: credentials.privateKey }), storageBucket: bucketName }, 'solaris-storage');
    return getStorage(app).bucket(bucketName);
  } catch (error) {
    console.error('FIREBASE STORAGE SETUP ERROR:', error);
    throw Object.assign(new Error('Firebase Storage could not be initialized. Check FIREBASE_STORAGE_BUCKET and the service-account permissions in Render.'), { status: 503 });
  }
}
async function verifyFirebaseToken(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 10000) throw Object.assign(new Error('Sign in with your verified email and try again.'), { status: 401 });
  try {
    const claims = await getFirebaseAuth().verifyIdToken(idToken, true);
    if (!claims.email || claims.email_verified !== true) throw Object.assign(new Error('Verify your email address before continuing.'), { status: 403 });
    return claims;
  } catch (error) {
    if (error.status) throw error;
    console.error('FIREBASE TOKEN VERIFICATION ERROR:', error);
    throw Object.assign(new Error('Firebase could not verify this sign-in. Please sign in again.'), { status: 401 });
  }
}
async function updatePasswordMirror(account, password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw Object.assign(new Error('Use a password between 10 and 200 characters.'), { status: 400 });
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = Buffer.from(await scrypt(password, salt, 64)).toString('hex');
  account.salt = salt;
  account.passwordHash = passwordHash;
}
async function confirmAccountActionPassword(account, input) {
  if (!account.firebaseUid) return passwordMatches(account, input.password);
  const claims = await verifyFirebaseToken(input.idToken);
  if (claims.uid !== account.firebaseUid || Date.now() / 1000 - Number(claims.auth_time || 0) > 5 * 60) return false;
  await updatePasswordMirror(account, input.password);
  return true;
}
async function getAccount(req) {
  const token = parseCookies(req.headers.cookie).solaris_session;
  if (!token) return null;
  let session = sessions.get(token);
  if ((!session || session.expires < Date.now()) && pool) {
    const result = await pool.query('SELECT account_id, expires_at FROM solaris_sessions WHERE token_hash = $1 AND expires_at > $2', [sessionHash(token), Date.now()]);
    const row = result.rows[0];
    session = row ? { accountId: row.account_id, expires: Number(row.expires_at) } : null;
    if (session) sessions.set(token, session);
  }
  if (!session || session.expires < Date.now()) { sessions.delete(token); return null; }
  return accounts.find(account => account.id === session.accountId) || null;
}
function isKnownGameId(gameId) {
  return BUILT_IN_GAME_IDS.has(gameId) || siteContent.games.some(game => game.id === gameId);
}
function gameBuildDisposition(fileName) {
  const fallback = fileName.replace(/[^A-Za-z0-9._ -]/g, '_').replace(/"/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
function canManageGame(user, gameId) {
  return Boolean(user && isKnownGameId(gameId) && isStudioStaff(user));
}
function canManagePost(user, section, post) {
  return Boolean(user && (user.role === 'owner' || section === 'games' && isStudioStaff(user) || post && post.authorId === user.id));
}
function gameSignature(fileName, buffer) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.exe')) return buffer.toString('ascii',0,2) === 'MZ';
  if (lower.endsWith('.msi')) return buffer.subarray(0,8).equals(Buffer.from([208,207,17,224,161,177,26,225]));
  if (/\.(apk|zip)$/.test(lower)) return buffer.toString('ascii',0,2) === 'PK';
  if (/\.(tgz|tar\.gz)$/.test(lower)) return buffer[0] === 31 && buffer[1] === 139;
  if (lower.endsWith('.7z')) return buffer.subarray(0,6).equals(Buffer.from([55,122,188,175,39,28]));
  if (lower.endsWith('.appimage')) return buffer.subarray(0,4).equals(Buffer.from([127,69,76,70]));
  if (lower.endsWith('.deb')) return buffer.toString('ascii',0,8) === '!<arch>\n';
  if (lower.endsWith('.rpm')) return buffer.subarray(0,4).equals(Buffer.from([237,171,238,219]));
  if (lower.endsWith('.tar.xz')) return buffer.subarray(0,6).equals(Buffer.from([253,55,122,88,90,0]));
  return lower.endsWith('.dmg'); // Disk images carry their identifying trailer at the end.
}
async function cleanupStoredGameBuilds(builds) {
  for (const build of builds || []) {
    try {
      if (build.fileKey && !siteContent.gameBuilds.some(item=>item.fileKey===build.fileKey)) await fileStore.remove(build.fileKey);
      if (build.storagePath && validGameBuildObjectPath(build.gameId,build.buildId,build.fileName,build.storagePath)) await getFirebaseStorageBucket().file(build.storagePath).delete({ignoreNotFound:true});
    } catch(error) { console.error('GAME BUILD CLEANUP ERROR:',error); }
  }
}
async function uploadGameBuild(req, res) {
  const user = await getAccount(req), gameId = text(req.headers['x-game-id'],100);
  if (!canManageGame(user,gameId)) return send(res,403,{error:'Only authorized studio developers can upload builds for this game.'});
  const buildId = text(req.headers['x-build-id'],100), platform = text(req.headers['x-game-platform'],16);
  if (!/^build-[a-f0-9-]{30,50}$/i.test(buildId) || !['windows','android','other'].includes(platform)) return send(res,400,{error:'Invalid build details.'});
  let rawName;
  try { rawName=decodeURIComponent(String(req.headers['x-file-name']||'')); } catch { return send(res,400,{error:'Invalid filename.'}); }
  const fileName=cleanGameBuildFilename(rawName,platform),size=Number(req.headers['content-length']);
  if(!fileName) return send(res,400,{error:'Choose a supported installer or game archive.'});
  if(!Number.isSafeInteger(size)||size<=0||Number(req.headers['x-upload-size'])!==size)return send(res,400,{error:'The upload needs a valid file size.'});
  const stored=await fileStore.save(req,{size,maxBytes:MAX_GAME_BUILD_BYTES,name:fileName,mime:'application/octet-stream',ownerId:user.id,prefix:'game-builds',validate:buffer=>gameSignature(fileName,buffer)});
  return send(res,201,{buildId,fileName,size,platform,fileKey:stored.key,sha256:stored.sha256});
}
async function downloadGameBuild(req,res,id) {
  const user=await getAccount(req);
  if(!user)return send(res,401,{error:'Log in to download game builds.'});
  const build=siteContent.gameBuilds.find(item=>item.id===id&&item.supported);
  if(!build)return send(res,404,{error:'That build is no longer available.'});
  if(build.downloadUrl){res.writeHead(302,{Location:build.downloadUrl,'Cache-Control':'no-store'});return res.end();}
  if(!build.fileKey)return send(res,503,{error:'This build is waiting to be moved to website storage. A studio developer can move existing files from Manage game downloads.'});
  return fileStore.serve(req,res,build.fileKey,{attachment:true});
}
let gameMigration = null;
async function migrateGameBuilds() {
  if(gameMigration)return gameMigration;
  gameMigration=(async()=>{
    await fileStore.ready();let moved=0;
    for(const old of [...siteContent.gameBuilds].filter(build=>build.storagePath&&!build.fileKey)){
      const source=getFirebaseStorageBucket().file(old.storagePath),[metadata]=await source.getMetadata(),size=Number(metadata.size);
      const stored=await fileStore.save(source.createReadStream(),{size,maxBytes:MAX_GAME_BUILD_BYTES,name:old.fileName,mime:'application/octet-stream',ownerId:'legacy-migration',validate:buffer=>gameSignature(old.fileName,buffer)});
      const current=siteContent.gameBuilds.find(build=>build.id===old.id);
      if(!current||current.storagePath!==old.storagePath){await fileStore.remove(stored.key);continue;}
      const before={...current};Object.assign(current,{fileKey:stored.key,sha256:stored.sha256,storagePath:''});
      try{await saveAccounts();}catch(error){Object.assign(current,before);await fileStore.remove(stored.key).catch(()=>{});throw error;}
      await source.delete({ignoreNotFound:true}).catch(error=>console.error('LEGACY BUILD CLEANUP ERROR:',error));moved++;
    }
    return moved;
  })();
  try{return await gameMigration;}finally{gameMigration=null;}
}
function publicProfile(account) {
  const { id, profile } = account;
  const friendCard = account.role !== 'owner' && profile.primaryRole === 'member' && profile.friendCard?.published === true
    ? cleanFriendCard(profile.friendCard, id)
    : emptyFriendCard();
  return { id, ...profile, friendCard, accountRole: account.role || 'member' };
}
function privateProfile(account) {
  const ownerUsername = text(process.env.SOLARIS_OWNER_USERNAME || 'Fritzz Xenon', 24);
  const ownerExists = accounts.some(item => item.role === 'owner') || pausedAccounts.some(item => item.account.role === 'owner');
  const canClaimOwner = Boolean(process.env.SOLARIS_OWNER_SETUP_TOKEN && !ownerExists && account.profile.username.toLowerCase() === ownerUsername.toLowerCase());
  return { ...publicProfile(account), friendCard: cleanFriendCard(account.profile.friendCard, account.id), tickets: account.tickets || { namecard: 0, who: 0 }, shopInventory: account.shopInventory || {}, canClaimOwner, authEmail: account.email || '', emailVerified: account.emailVerified === true, personalInfo: cleanPersonalInfo(account.personalInfo) };
}
function emptyCommunity() {
  return { friends: [], friendRequestsSent: [], friendRequestsReceived: [], messages: [], bugReports: [] };
}
function cleanCommunity(value, accountId) {
  const source = value && typeof value === 'object' ? value : {};
  const ids = key => [...new Set((Array.isArray(source[key]) ? source[key] : []).filter(id => typeof id === 'string' && id.length <= 100 && id !== accountId))].slice(0, 500);
  const messages = (Array.isArray(source.messages) ? source.messages : []).slice(-250).map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.senderId !== 'string' || typeof item.recipientId !== 'string') return null;
    const messageText = typeof item.text === 'string' ? item.text.trim().slice(0, 2000) : '';
    const type = ['text','image','gif','voice','sticker'].includes(item.type) ? item.type : 'text';
    const mediaUrl = typeof item.mediaUrl === 'string' && item.mediaUrl.startsWith('https://firebasestorage.googleapis.com/') ? item.mediaUrl.slice(0,1400) : '';
    const mediaPath = typeof item.mediaPath === 'string' ? item.mediaPath.slice(0,400) : '';
    if (type === 'text' && !messageText || type === 'sticker' && !messageText && !mediaUrl || ['image','gif','voice'].includes(type) && !mediaUrl) return null;
    return { id: item.id.slice(0, 100), senderId: item.senderId.slice(0, 100), recipientId: item.recipientId.slice(0, 100), type, text: messageText, ...(mediaUrl ? {mediaUrl,mediaPath} : {}), caption: typeof item.caption === 'string' ? item.caption.trim().slice(0,240) : '', createdAt: Math.max(0, Number(item.createdAt) || Date.now()) };
  }).filter(Boolean);
  const bugReports = (Array.isArray(source.bugReports) ? source.bugReports : []).slice(-100).map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string') return null;
    return { id: item.id.slice(0, 100), reporterId: String(item.reporterId || '').slice(0, 100), reporterName: text(item.reporterName, 40), title: text(item.title, 120), details: text(item.details, 4000), page: text(item.page, 300), createdAt: Math.max(0, Number(item.createdAt) || Date.now()), status: item.status === 'resolved' ? 'resolved' : 'open' };
  }).filter(Boolean);
  return { friends: ids('friends'), friendRequestsSent: ids('friendRequestsSent'), friendRequestsReceived: ids('friendRequestsReceived'), messages, bugReports };
}
function communityAccountSummary(account) {
  const seenAt = communityPresence.get(account.id) || 0;
  return { id: account.id, username: account.profile.username, avatarImage: account.profile.avatarImage || '', primaryRole: account.role === 'owner' ? 'owner' : account.profile.primaryRole || 'member', online: Date.now() - seenAt < 45000 };
}
function isStudioStaff(account) {
  return account.role === 'owner' || ['assistant','ai-assistant','developer'].includes(account.profile.primaryRole);
}
function communitySnapshot(account) {
  account.community = cleanCommunity(account.community, account.id);
  const lookup = id => accounts.find(candidate => candidate.id === id);
  const profiles = ids => ids.map(lookup).filter(Boolean).map(communityAccountSummary);
  return {
    friends: profiles(account.community.friends),
    friendRequestsSent: profiles(account.community.friendRequestsSent),
    friendRequestsReceived: profiles(account.community.friendRequestsReceived),
    bugReports: isStudioStaff(account) ? account.community.bugReports : []
  };
}
function normalizeAccount(account) {
  let changed = false;
  if (!account.role) { account.role = 'member'; changed = true; }
  if (!account.tickets || typeof account.tickets !== 'object') { account.tickets = { namecard: 0, who: 0 }; changed = true; }
  const personalInfo = cleanPersonalInfo(account.personalInfo);
  if (!account.personalInfo || JSON.stringify(personalInfo) !== JSON.stringify(account.personalInfo)) { account.personalInfo = personalInfo; changed = true; }
  for (const kind of ['namecard', 'who']) {
    const count = Math.min(99, Math.max(0, Math.floor(Number(account.tickets[kind]) || 0)));
    if (account.tickets[kind] !== count) { account.tickets[kind] = count; changed = true; }
  }
  if (!Object.hasOwn(PRIMARY_ROLES, account.profile.primaryRole)) {
    account.profile.primaryRole = account.profile.teamKey === 'assistant' ? 'assistant' : 'member';
    changed = true;
  }
  if (Object.hasOwn(account.profile, 'teamKey')) { delete account.profile.teamKey; changed = true; }
  const secondaryRoles = account.role === 'owner' || account.profile.primaryRole !== 'member' ? cleanSecondaryRoles(account.profile.secondaryRoles) : [];
  if (JSON.stringify(secondaryRoles) !== JSON.stringify(account.profile.secondaryRoles || [])) { account.profile.secondaryRoles = secondaryRoles; changed = true; }
  const friendCard = account.role !== 'owner' && account.profile.primaryRole === 'member' ? cleanFriendCard(account.profile.friendCard, account.id) : emptyFriendCard();
  if (!account.profile.friendCard || JSON.stringify(friendCard) !== JSON.stringify(account.profile.friendCard)) { account.profile.friendCard = friendCard; changed = true; }
  const community = cleanCommunity(account.community, account.id);
  if (!account.community || JSON.stringify(community) !== JSON.stringify(account.community)) { account.community = community; changed = true; }
  if (!Number(account.profile.usernameLastChangedAt)) { account.profile.usernameLastChangedAt = Date.now(); changed = true; }
  return changed;
}
function validUsername(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 24 && /^[A-Za-z0-9_. -]+$/.test(value) && !/\s{2,}/.test(value);
}
async function passwordMatches(account, password) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const expected = Buffer.from(account.passwordHash, 'hex');
  const candidate = Buffer.from(await scrypt(password, account.salt, 64));
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}
function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function setSession(res, accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_MS;
  sessions.set(token, { accountId, expires });
  if (pool) await pool.query('INSERT INTO solaris_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)', [sessionHash(token), accountId, expires]);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `solaris_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure}`);
}
async function clearSession(req, res) {
  const token = parseCookies(req.headers.cookie).solaris_session;
  if (token) sessions.delete(token);
  if (token && pool) await pool.query('DELETE FROM solaris_sessions WHERE token_hash = $1', [sessionHash(token)]);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `solaris_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
function allowAttempt(req) {
  const key = `${req.socket.remoteAddress || 'unknown'}:${req.url.split('?')[0]}`;
  const now = Date.now();
  const entry = attempts.get(key) || { start: now, count: 0 };
  if (now - entry.start > 15 * 60 * 1000) { entry.start = now; entry.count = 0; }
  entry.count++;
  attempts.set(key, entry);
  return entry.count <= 10;
}
function text(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function siteContentUrl(value, max = 1200) {
  const url = text(value, max);
  if (!url) return '';
  if (/^\/?assets\/[A-Za-z0-9_./-]+$/.test(url) && !url.split('/').includes('..')) return url;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? url : ''; }
  catch { return ''; }
}
function secureExternalDownloadUrl(value, max = 1200) {
  const url = text(value, max);
  if (!url) return '';
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? url : ''; }
  catch { return ''; }
}
function siteContentImage(value) {
  const image = text(value, 1_100_000);
  if (!image) return '';
  if (image.startsWith('data:image/')) return imageData(image, 950_000);
  return siteContentUrl(image, 1200);
}
function cleanGameBuildFilename(value, platform) {
  const raw = text(value, 240).replace(/\\/g, '/').split('/').pop() || '';
  const filename = raw.replace(/[^A-Za-z0-9._()+ -]/g, '_').replace(/\s+/g, ' ').replace(/^\.+/, '').trim().slice(-180);
  const lower = filename.toLowerCase();
  const allowed = platform === 'windows' ? /\.(?:exe|msi)$/i : platform === 'android' ? /\.apk$/i : /\.(?:zip|dmg|appimage|deb|rpm|7z|tgz|tar\.gz|tar\.xz)$/i;
  return filename && allowed.test(lower) ? filename : '';
}
function validGameBuildObjectPath(gameId, buildId, fileName, value) {
  return typeof value === 'string' && value === `game-builds/${gameId}/${buildId}/${fileName}`;
}
function cleanSitePost(section, value = {}) {
  const prefixes = { games: 'owner-game-', arts: 'owner-art-', updates: 'owner-update-', downloads: 'owner-download-', gameBuilds: 'owner-game-build-' };
  const prefix = prefixes[section];
  if (!prefix || !value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Choose a supported publishing section.'), { status: 400 });
  const id = text(value.id, 120) || `${prefix}${crypto.randomUUID()}`;
  if (!(id.startsWith(prefix) || (DEFAULT_CONTENT[section] || []).some(item => item.id === id)) || !/^[a-z0-9-]+$/.test(id)) throw Object.assign(new Error('This post has an invalid ID.'), { status: 400 });
  if (section === 'games') {
    const status = text(value.status, 32);
    if (!['In Development', 'Future project', 'Beta', 'Released'].includes(status)) throw Object.assign(new Error('Choose a valid game status.'), { status: 400 });
    const textContainers = (Array.isArray(value.textContainers) ? value.textContainers : []).slice(0, 30).map(item => ({ title: text(item?.title, 100), body: text(item?.body, 10000) })).filter(item => item.title && item.body);
    const game = { id, authorId:text(value.authorId,100), screenshots:(Array.isArray(value.screenshots)?value.screenshots:[]).slice(0,12).map(siteContentImage).filter(Boolean), name: text(value.name, 100), subtitle: text(value.subtitle, 100), genre: text(value.genre, 100), status, version: text(value.version, 40), cover: ['frost', 'collide'].includes(value.cover) ? value.cover : 'frost', icon: siteContentImage(value.icon), banner: siteContentImage(value.banner), blurb: text(value.blurb, 1200), details: text(value.details, 6000), worldIntro: text(value.worldIntro, 10000), playerIntro: text(value.playerIntro, 10000), releasePlan: text(value.releasePlan, 3000), textContainers };
    if (!game.name || !game.genre || !game.blurb || !game.details) throw Object.assign(new Error('Add the game name, genre, summary, and project details.'), { status: 400 });
    if ((value.icon && !game.icon) || (value.banner && !game.banner)) throw Object.assign(new Error('Choose valid imported game images.'), { status: 400 });
    return game;
  }
  if (section === 'arts') {
    const art = { id, authorId:text(value.authorId,100), credit:text(value.credit,300), description:text(value.description,6000), title: text(value.title, 120), image: siteContentImage(value.image), shape: ['icon', 'banner', 'square', 'circle'].includes(value.shape) ? value.shape : 'square', type: text(value.type, 80), projectId: /^[a-z0-9-]{1,100}$/.test(text(value.projectId, 100)) ? text(value.projectId, 100) : '', mainTag: text(value.mainTag, 80), tags: [...new Set((Array.isArray(value.tags) ? value.tags : []).map(tag => text(tag, 60)).filter(Boolean))].slice(0, 30) };
    if (!art.title || !art.image || !art.type || !art.mainTag) throw Object.assign(new Error('Add the artwork title, imported image, type, and main tag.'), { status: 400 });
    if (value.image && !art.image) throw Object.assign(new Error('Import a valid artwork image.'), { status: 400 });
    return art;
  }
  if (section === 'updates') {
    const updateTypes = ['Game', 'Website', 'Release', 'Beta', 'New game', 'Studio', 'Other'];
    const update = { id, authorId:text(value.authorId,100), title: text(value.title, 160), category: updateTypes.includes(value.category) ? value.category : 'Studio', content: text(value.content, 12000), gameId: /^[a-z0-9-]{1,100}$/.test(text(value.gameId, 100)) ? text(value.gameId, 100) : '', publishedAt: Number.isFinite(Number(value.publishedAt)) && Number(value.publishedAt) > 0 ? Number(value.publishedAt) : Date.now() };
    if (!update.title || !update.content) throw Object.assign(new Error('Add an update title and its content.'), { status: 400 });
    return update;
  }
  if (section === 'gameBuilds') {
    const gameId = text(value.gameId, 100);
    const platform = ['windows', 'android', 'other'].includes(value.platform) ? value.platform : '';
    const supported = value.supported !== false;
    const buildId = text(value.buildId, 100);
    const fileName = cleanGameBuildFilename(value.fileName, platform);
    const size = Number.isSafeInteger(Number(value.size)) ? Number(value.size) : 0;
    const requestedDownloadUrl = text(value.downloadUrl, 1200);
    const downloadUrl = supported ? secureExternalDownloadUrl(requestedDownloadUrl, 1200) : '';
    const fileKey = supported && !downloadUrl && /^[a-f0-9-]{36}$/.test(value.fileKey || '') ? value.fileKey : '';
    const storagePath = supported && !downloadUrl && !fileKey && /^[A-Za-z0-9-]{1,100}$/.test(buildId) && fileName && size > 0 && size <= MAX_GAME_BUILD_BYTES && validGameBuildObjectPath(gameId, buildId, fileName, value.storagePath) ? value.storagePath : '';
    const build = { id, gameId, title: text(value.title, 120), version: text(value.version, 60), platform, osName: platform === 'other' ? text(value.osName, 60) || 'Other OS' : '', supported, unsupportedMessage: text(value.unsupportedMessage, 300) || 'This operating system is not supported yet.', downloadUrl, fileKey, sha256:text(value.sha256,64), buildId: storagePath || fileKey ? buildId : '', fileName: storagePath || fileKey ? fileName : '', size: storagePath || fileKey ? size : 0, storagePath };
    if (!gameId || !/^[a-z0-9-]{1,100}$/.test(gameId) || !platform || !build.title) throw Object.assign(new Error('Choose a game, operating system, and build name.'), { status: 400 });
    if (supported && requestedDownloadUrl && !downloadUrl) throw Object.assign(new Error('Use a valid HTTPS URL for an outside download.'), { status: 400 });
    if (supported && !fileKey && !storagePath && !downloadUrl) throw Object.assign(new Error('Upload a valid installer or add an outside HTTPS URL for every supported operating system.'), { status: 400 });
    return build;
  }
  const categories = ['Plugins & tools', 'Mods & add-ons', 'Skins', 'Other'];
  const item = { id, title: text(value.title, 140), description: text(value.description, 3000), gameId: /^[a-z0-9-]{1,100}$/.test(text(value.gameId, 100)) ? text(value.gameId, 100) : '', category: categories.includes(value.category) ? value.category : 'Other', version: text(value.version, 60), downloadUrl: siteContentUrl(value.downloadUrl, 1200), image: siteContentUrl(value.image, 1200) };
  if (!item.title || !item.description || !item.downloadUrl) throw Object.assign(new Error('Add the extra title, description, and secure download link.'), { status: 400 });
  if ((value.downloadUrl && !item.downloadUrl) || (value.image && !item.image)) throw Object.assign(new Error('Use secure HTTPS links for downloads and images.'), { status: 400 });
  return item;
}
function cleanSiteContentState(value) {
  const result = { ...EMPTY_SITE_CONTENT };
  result.deletedBuiltins = Array.isArray(value?.deletedBuiltins) ? value.deletedBuiltins.filter(id => typeof id === 'string').slice(0,100) : [];
  for (const section of ['games','arts','updates','downloads','gameBuilds']) {
    const seen = new Set();
    result[section] = (Array.isArray(value?.[section]) ? value[section] : []).slice(0, section === 'gameBuilds' ? 500 : 100).map(item => {
      try { return cleanSitePost(section, item); } catch (_) { return null; }
    }).filter(item => item && !seen.has(item.id) && seen.add(item.id));
  }
  for (const section of ['games','arts','updates']) {
    for (const item of DEFAULT_CONTENT[section] || []) if (!result[section].some(post=>post.id===item.id) && !result.deletedBuiltins.includes(item.id)) result[section].push(cleanSitePost(section,item));
  }
  return result;
}
function cleanSecondaryRoles(value) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  return source.map(item => text(item, 32).replace(/\s+/g, ' ')).filter(item => {
    if (!item || !/[A-Za-z0-9]/.test(item) || !/^[A-Za-z0-9][A-Za-z0-9 .+\/#&'-]*$/.test(item)) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
function imageData(value, maxLength = 950_000) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.length > maxLength || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw Object.assign(new Error('That image could not be saved. Choose a smaller JPG, PNG, or WebP image.'), { status: 400 });
  }
  return value;
}
function friendCardAsset(value, maxLength = 950_000, ownerId = '') {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && value.startsWith('data:image/')) return imageData(value, maxLength);
  if (typeof value !== 'string' || value.length > 2000 || !ownerId) throw Object.assign(new Error('That Friend-Card image is not a supported saved asset.'), { status: 400 });
  const neon = /^\/api\/friend-card\/assets\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/i.exec(value);
  if (neon) { if (neon[1].toLowerCase() !== String(ownerId).toLowerCase()) throw Object.assign(new Error('That Friend-Card image does not belong to this account.'), { status: 400 }); return value; }
  try {
    const url = new URL(value), encodedPath = url.pathname.split('/o/')[1] || '', objectPath = decodeURIComponent(encodedPath), bucket = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\//)?.[1];
    const bucketName = decodeURIComponent(bucket || ''), expectedBucket = firebaseStorageBucket();
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com' || !/^[A-Za-z0-9._-]{3,200}$/.test(bucketName) || expectedBucket && bucketName !== expectedBucket || url.searchParams.get('alt') !== 'media' || !/^[A-Za-z0-9-]{16,160}$/.test(url.searchParams.get('token') || '') || !objectPath.startsWith('friend-cards/' + ownerId + '/') || !/^[A-Za-z0-9_-]+\.(?:webp|png|jpg)$/.test(objectPath.slice(('friend-cards/' + ownerId + '/').length))) throw new Error('invalid asset reference');
    return url.href;
  } catch { throw Object.assign(new Error('That Friend-Card image does not belong to this account or a supported storage bucket.'), { status: 400 }); }
}
function friendCardFontAsset(value, ownerId = '') {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.length > 2200 || !ownerId) throw Object.assign(new Error('That Friend-Card font is not a supported saved asset.'), { status: 400 });
  const neon = /^\/api\/friend-card\/fonts\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/i.exec(value);
  if (neon) { if (neon[1].toLowerCase() !== String(ownerId).toLowerCase()) throw Object.assign(new Error('That Friend-Card font does not belong to this account.'), { status: 400 }); return value; }
  try {
    const url = new URL(value), encodedPath = url.pathname.split('/o/')[1] || '', objectPath = decodeURIComponent(encodedPath), bucket = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\//)?.[1];
    const bucketName = decodeURIComponent(bucket || ''), expectedBucket = firebaseStorageBucket();
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com' || !/^[A-Za-z0-9._-]{3,200}$/.test(bucketName) || expectedBucket && bucketName !== expectedBucket || url.searchParams.get('alt') !== 'media' || !/^[A-Za-z0-9-]{16,160}$/.test(url.searchParams.get('token') || '') || !objectPath.startsWith('friend-cards/' + ownerId + '/fonts/') || !/^[A-Za-z0-9_-]+\.(?:woff2?|ttf|otf)$/.test(objectPath.slice(('friend-cards/' + ownerId + '/fonts/').length))) throw new Error('invalid asset reference');
    return url.href;
  } catch { throw Object.assign(new Error('That Friend-Card font does not belong to this account or a supported storage bucket.'), { status: 400 }); }
}
function friendCardReferences(value, target) {
  let found=false;
  const visit=item=>{if(item===target){found=true;return;}if(item&&typeof item==='object')for(const child of Object.values(item))visit(child);};
  visit(value);return found;
}
function chatMediaSignature(mime, buffer) {
  if(mime.startsWith('image/'))return sniffMedia(mime,buffer);
  if(mime==='audio/webm')return buffer.subarray(0,4).equals(Buffer.from([26,69,223,163]));
  if(mime==='audio/ogg')return buffer.toString('ascii',0,4)==='OggS';
  if(mime==='audio/mpeg')return buffer.toString('ascii',0,3)==='ID3'||buffer.length>1&&buffer[0]===255&&(buffer[1]&224)===224;
  if(mime==='audio/mp4')return buffer.toString('ascii',4,8)==='ftyp';
  if(mime==='audio/wav')return buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WAVE';
  return false;
}
function emptyFriendCard() {
  return { published: false, likes: '', dislikes: '', favoriteThing: '', lookingFor: '', personalityTags: [], aspectRatio: '1:1', backgroundImage: '', backgroundColor: '#fff8e9', backgroundOverlayColor: '#ffffff', backgroundOverlayOpacity: 18, borderStyle: 'solid', borderColor: '#dcae55', borderWidth: 2, borderImage: '', titleColor: '#302344', textColor: '#302344', mutedTextColor: '#766b7d', tagTextColor: '#302344', buttonColor: '#3c315b', buttonOverlayColor: '#ffffff', buttonOverlayOpacity: 0, buttonImage: '', buttonTextColor: '#ffffff', buttonBorderStyle: 'solid', buttonBorderColor: '#3c315b', buttonBorderImage: '', effect: 'glow' };
}
function cleanPersonalInfo(value) {
  const input = value && typeof value === 'object' ? value : {};
  const rawEmail = text(input.secondaryEmail, 254).toLowerCase();
  const secondaryEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';
  return { phoneNumber: text(input.phoneNumber, 40).replace(/[^0-9+(). x-]/gi, ''), secondaryEmail, countryCode: countryCode(input.countryCode) };
}
function cleanPersonalityTags(value) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  return source.map(item => text(item, 28).replace(/\s+/g, ' ')).filter(item => {
    if (!item || !/^[A-Za-z0-9][A-Za-z0-9 ._'&+-]*$/.test(item)) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
function cleanFriendCardDesign(value, cardDefaults, ownerId = '') {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.layers)) return null;
  const types = new Set(['avatar','username','likes','dislikes','favorite','lookingFor','tags','button','text','textbox','image','sticker','shape','frame-piece','drawing','eraser']);
  const idSafe = item => text(item, 80).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  const numeric = (item, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(item)) ? Number(item) : fallback));
  const fonts = (Array.isArray(value.fonts) ? value.fonts : []).slice(0, 12).map(font => {
    const id = idSafe(font?.id), family = `SolarisFont-${id}`;
    if (!/^font-[A-Fa-f0-9-]{8,80}$/.test(id)) return null;
    return { id, name: text(font.name || 'Uploaded font', 80), family, url: friendCardFontAsset(font.url, ownerId), format: ['woff2','woff','ttf','otf'].includes(font.format) ? font.format : 'woff2' };
  }).filter(font => font?.url);
  const uploadedFontIds = new Set(fonts.map(font => font.id));
  const stickerLibrary = (Array.isArray(value.stickerLibrary) ? value.stickerLibrary : []).slice(0, 20).map((sticker, index) => ({ id: idSafe(sticker?.id) || `sticker${index + 1}`, name: text(sticker?.name || 'Sticker', 80), image: friendCardAsset(sticker?.image, 800_000, ownerId) })).filter(sticker => sticker.image);
  const usedLayerIds = new Set();
  const layers = value.layers.slice(0, 80).map((layer, index) => {
    if (!layer || typeof layer !== 'object' || !types.has(layer.type)) return null;
    const type = layer.type;
    let layerId=idSafe(layer.id);if(!layerId||usedLayerIds.has(layerId))layerId='layer-'+crypto.randomUUID();usedLayerIds.add(layerId);
    const layerWidth = numeric(layer.width, 20, 1, 10000);
    const path = typeof layer.path === 'string' && layer.path.length <= 16000 && /^[MmLlHhVvCcSsQqTtAaZz0-9., +\-]*$/.test(layer.path) ? layer.path : '';
    const fontFamily = uploadedFontIds.has(layer.fontId) ? `SolarisFont-${layer.fontId}` : new Set(['DM Sans','Unbounded','Arial','Georgia','Trebuchet MS','Verdana','Courier New','serif','sans-serif','monospace']).has(layer.fontFamily) ? layer.fontFamily : 'DM Sans';
    return {
      id: layerId, type, label: type === 'avatar' ? 'Profile picture' : type === 'username' ? 'Username' : text(layer.label || type, 80),
      field: ['avatar','username','likes','dislikes','favoriteThing','lookingFor','personalityTags','button'].includes(layer.field) ? layer.field : '',
      x: numeric(layer.x, 0, -10000, 10000), y: numeric(layer.y, 0, -10000, 10000), width: layerWidth, height: type === 'avatar' || type === 'shape' && ['circle','square','rounded'].includes(layer.shapeStyle) ? layerWidth : numeric(layer.height, 10, 1, 10000),
      rotation: numeric(layer.rotation, 0, -180, 180), fontSize: numeric(layer.fontSize, 3.2, 1, 14), lineHeight: numeric(layer.lineHeight, 1.2, .8, 2.2), letterSpacing: numeric(layer.letterSpacing, 0, -.5, 2), italic: layer.italic === true, opacity: numeric(layer.opacity, 100, 0, 100),
      color: safeColor(layer.color, cardDefaults.textColor), fill: safeColor(layer.fill, cardDefaults.backgroundColor),
      align: ['left','center','right'].includes(layer.align) ? layer.align : 'left', weight: Number(layer.weight) === 700 ? 700 : 500, radius: numeric(layer.radius, 8, 0, 100), shapeStyle: ['circle','rounded','rectangle','square','triangle','diamond','star','hexagon'].includes(layer.shapeStyle) ? layer.shapeStyle : 'rounded',
      text: text(layer.text, 500), fontFamily, fontId: uploadedFontIds.has(layer.fontId) ? layer.fontId : '', image: ['image','sticker','frame-piece'].includes(type) ? friendCardAsset(layer.image, 800_000, ownerId) : '', imageFit: ['contain','cover','fill'].includes(layer.imageFit) ? layer.imageFit : 'contain', imagePositionX: numeric(layer.imagePositionX, 50, 0, 100), imagePositionY: numeric(layer.imagePositionY, 50, 0, 100), imageMask: ['square','rounded','circle'].includes(layer.imageMask) ? layer.imageMask : 'square', path,
      strokeWidth: numeric(layer.strokeWidth, 8, 1, 100), visible: layer.visible !== false, visibilityMode: ['preview','full','both'].includes(layer.visibilityMode) ? layer.visibilityMode : 'both', locked: layer.locked === true
    };
  }).filter(Boolean);
  const frameSource = value.frame && typeof value.frame === 'object' ? value.frame : {};
  const cornerNames = ['topLeft','topRight','bottomLeft','bottomRight'], sideNames = ['top','bottom','left','right'], pieceNames = [...cornerNames,...sideNames];
  const frameImages = (source, names) => Object.fromEntries(names.map(name => [name, friendCardAsset(source?.[name], 800_000, ownerId)]));
  const cleanFramePreset = source => ({
    name: text(source?.name || 'Frame preset',60),
    corners: frameImages(source?.corners,cornerNames), sides: frameImages(source?.sides,sideNames),
    cornerSize: numeric(source?.cornerSize,9,1,30), cornerSizes: Object.fromEntries(cornerNames.map(name => [name,numeric(source?.cornerSizes?.[name],source?.cornerSize || 9,1,30)])),
    visiblePieces: Object.fromEntries(pieceNames.map(name => [name,source?.visiblePieces?.[name] !== false])),
    horizontalThickness: numeric(source?.horizontalThickness,5,1,25), verticalThickness: numeric(source?.verticalThickness,5,1,25),
    sideMode: ['stretch','repeat','connected'].includes(source?.sideMode) ? source.sideMode : 'stretch', placement: 'background', overlap: numeric(source?.overlap,0,0,100), visible: source?.visible !== false,
    alignments: { top: ['left','center','right'].includes(source?.alignments?.top) ? source.alignments.top : 'center', bottom: ['left','center','right'].includes(source?.alignments?.bottom) ? source.alignments.bottom : 'center', left: ['top','middle','bottom'].includes(source?.alignments?.left) ? source.alignments.left : 'middle', right: ['top','middle','bottom'].includes(source?.alignments?.right) ? source.alignments.right : 'middle' }
  });
  const frame = cleanFramePreset(frameSource);
  frame.presets = (Array.isArray(frameSource.presets) ? frameSource.presets : []).slice(0,8).map(cleanFramePreset);
  const aspectRatio = value.aspectRatio === 'custom' ? 'custom' : ['1:1','2:3','3:2','4:5','5:4'].includes(value.aspectRatio) ? value.aspectRatio : '1:1';
  let width = Math.round(numeric(value.width,1000,320,1600)), height = Math.round(numeric(value.height,1000,320,1200));
  if (aspectRatio !== 'custom') {
    const [ratioWidth,ratioHeight] = aspectRatio.split(':').map(Number), minScale = Math.max(320 / ratioWidth,320 / ratioHeight), maxScale = Math.min(1600 / ratioWidth,1200 / ratioHeight);
    const scale = Math.min(maxScale,Math.max(minScale,width / ratioWidth));
    width = Math.round(ratioWidth * scale); height = Math.round(ratioHeight * scale);
  }
  return {
    version: 1, name: text(value.name || 'My Friend-Card', 80) || 'My Friend-Card', fonts, stickerLibrary,
    width, height, aspectRatio,
    backgroundLocked: value.backgroundLocked !== false, showGuides: value.showGuides === true,
    background: { color: safeColor(value.background?.color, cardDefaults.backgroundColor), image: friendCardAsset(value.background?.image, 800_000, ownerId), tint: safeColor(value.background?.tint, '#ffffff'), tintOpacity: numeric(value.background?.tintOpacity, 0, 0, 85), positionX: numeric(value.background?.positionX, 50, 0, 100), positionY: numeric(value.background?.positionY, 50, 0, 100), scale: numeric(value.background?.scale, 100, 50, 300) },
    brush: { color: safeColor(value.brush?.color, '#332244'), size: numeric(value.brush?.size, 8, 1, 100), eraserSize: numeric(value.brush?.eraserSize, 26, 1, 100) },
    frame,
    layers
  };
}
function safeColor(value, fallback) {
  const color = text(value, 7);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}
function cleanFriendCard(value, ownerId = '') {
  const input = value && typeof value === 'object' ? value : {};
  const defaults = emptyFriendCard();
  const borderWidth = Math.min(8, Math.max(1, Math.round(Number(input.borderWidth) || defaults.borderWidth)));
  const borderStyle = FRIEND_CARD_STROKES.has(input.borderStyle) ? input.borderStyle : defaults.borderStyle;
  const buttonBorderStyle = FRIEND_CARD_STROKES.has(input.buttonBorderStyle) ? input.buttonBorderStyle : defaults.buttonBorderStyle;
  const effect = FRIEND_CARD_EFFECTS.has(input.effect) ? input.effect : defaults.effect;
  const aspectRatio = ['1:1', '2:3', '3:2', '4:5', '5:4'].includes(input.aspectRatio) ? input.aspectRatio : defaults.aspectRatio;
  const opacity = (value, fallback) => Math.min(85, Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : fallback)));
  return {
    published: input.published === true,
    revision: Math.max(0, Math.floor(Number(input.revision) || 0)),
    likes: text(input.likes, 400), dislikes: text(input.dislikes, 400), favoriteThing: text(input.favoriteThing, 160), lookingFor: text(input.lookingFor, 300),
    personalityTags: cleanPersonalityTags(input.personalityTags), aspectRatio, backgroundImage: friendCardAsset(input.backgroundImage, 400_000, ownerId), buttonImage: friendCardAsset(input.buttonImage, 400_000, ownerId), borderImage: friendCardAsset(input.borderImage, 400_000, ownerId), buttonBorderImage: friendCardAsset(input.buttonBorderImage, 400_000, ownerId),
    backgroundColor: safeColor(input.backgroundColor, defaults.backgroundColor), backgroundOverlayColor: safeColor(input.backgroundOverlayColor, defaults.backgroundOverlayColor), backgroundOverlayOpacity: opacity(input.backgroundOverlayOpacity, defaults.backgroundOverlayOpacity), borderStyle, borderColor: safeColor(input.borderColor, defaults.borderColor), borderWidth,
    titleColor: safeColor(input.titleColor, defaults.titleColor), textColor: safeColor(input.textColor, defaults.textColor), mutedTextColor: safeColor(input.mutedTextColor, defaults.mutedTextColor), tagTextColor: safeColor(input.tagTextColor, defaults.tagTextColor),
    buttonColor: safeColor(input.buttonColor, defaults.buttonColor), buttonOverlayColor: safeColor(input.buttonOverlayColor, defaults.buttonOverlayColor), buttonOverlayOpacity: opacity(input.buttonOverlayOpacity, defaults.buttonOverlayOpacity), buttonTextColor: safeColor(input.buttonTextColor, defaults.buttonTextColor),
    buttonBorderStyle, buttonBorderColor: safeColor(input.buttonBorderColor, defaults.buttonBorderColor), effect,
    design: cleanFriendCardDesign(input.design, defaults, ownerId)
  };
}
async function setFriendCardAssetsPublished(account, friendCard, published) {
  const urls = new Set();
  const visit = value => {
    if (typeof value === 'string' && value.startsWith('https://firebasestorage.googleapis.com/')) urls.add(value);
    else if (value && typeof value === 'object') for (const item of Object.values(value)) visit(item);
  };
  visit(friendCard);
  if (!urls.size) return;
  try {
    const bucket = getFirebaseStorageBucket();
    for (const value of urls) {
      const url = new URL(value), objectPath = decodeURIComponent(url.pathname.split('/o/')[1] || '');
      if (!objectPath.startsWith(`friend-cards/${account.id}/`)) continue;
      const file = bucket.file(objectPath), [metadata] = await file.getMetadata();
      if (metadata.metadata?.ownerAccountId !== account.id) continue;
      await file.setMetadata({ metadata: { ...(metadata.metadata || {}), published: published ? 'true' : 'false' } });
    }
  } catch (error) { console.error('FIREBASE FRIEND-CARD PUBLISH METADATA ERROR:', error); }
}
function validateSocials(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map(item => {
    const label = text(item && item.label, 30);
    const raw = text(item && item.url, 240);
    if (!label || !raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      return { label, url: url.href };
    } catch { return null; }
  }).filter(Boolean);
}
function validateFavorite(item, type) {
  if (!item || typeof item !== 'object') return null;
  const title = text(item.title, 80);
  if (!title) return null;
  return { type, title, comment: text(item.comment, 240) };
}
function cleanProfile(input, existing = {}, allowMemberFriendCard = true, ownerId = '') {
  const socials = validateSocials(input.socials);
  const favorites = ['game', 'developer', 'artwork'].map(type => validateFavorite(input.favorites && input.favorites[type], type)).filter(Boolean);
  const installedGames = Array.isArray(input.installedGames) ? [...new Set(input.installedGames.map(value => text(value, 80)).filter(Boolean))].slice(0, 20) : [];
  const friendCard = allowMemberFriendCard ? cleanFriendCard(input.friendCard && typeof input.friendCard === 'object' ? input.friendCard : existing.friendCard, ownerId) : emptyFriendCard();
  if (allowMemberFriendCard && input.friendCard?.design) validateFriendCardIdentity(friendCard);
  friendCard.published = allowMemberFriendCard && existing.friendCard?.published === true;
  return {
    username: text(input.username, 24) || existing.username || '',
    usernameLastChangedAt: Number(existing.usernameLastChangedAt) || Date.now(),
    primaryRole: existing.primaryRole || 'member',
    secondaryRoles: cleanSecondaryRoles(existing.secondaryRoles),
    avatarImage: imageData(input.avatarImage),
    bannerImage: imageData(input.bannerImage),
    bannerRatio: input.bannerRatio === '16:9' ? '16:9' : '21:9',
    realName: text(input.realName, 80),
    pronouns: text(input.pronouns, 32),
    notes: text(input.notes, 160),
    bio: text(input.bio, 500),
    socials,
    likes: text(input.likes, 400),
    dislikes: text(input.dislikes, 400),
    friendCard,
    favorites: Object.fromEntries(['game', 'developer', 'artwork'].map(type => [type, favorites.find(item => item.type === type) || null])),
    installedGames
  };
}
async function saveAccounts() {
  const snapshot = JSON.stringify({ accounts, pausedAccounts, siteContent, social: socialSystem.snapshot(), shop: shopSystem.snapshot() });
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    if (pool) {
      await pool.query('INSERT INTO solaris_account_store (store_id, accounts) VALUES (1, $1::jsonb) ON CONFLICT (store_id) DO UPDATE SET accounts = EXCLUDED.accounts', [snapshot]);
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temporary = `${STORE_PATH}.${process.pid}.tmp`;
    await fs.writeFile(temporary, snapshot, { mode: 0o600 });
    await fs.rename(temporary, STORE_PATH);
  });
  return writeQueue;
}
async function restoreExpiredAccounts() {
  const now = Date.now();
  const expired = pausedAccounts.filter(item => Number(item.resumeAt) <= now && item.account?.id);
  if (!expired.length) return;
  for (const item of expired) {
    if (!accounts.some(account => account.id === item.account.id)) accounts.push(item.account);
  }
  pausedAccounts = pausedAccounts.filter(item => Number(item.resumeAt) > now);
  await saveAccounts();
}
async function removeAccountSessions(accountId, req, res) {
  for (const [token, session] of sessions) if (session.accountId === accountId) sessions.delete(token);
  if (pool) await pool.query('DELETE FROM solaris_sessions WHERE account_id = $1', [accountId]);
  await clearSession(req, res);
}
async function handleApi(req, res, pathname) {
  if (!checkOrigin(req)) return send(res, 403, { error: 'This request was not accepted.' });
  await restoreExpiredAccounts();
  if (await friendCardLibrary.handle(req,res,pathname)) return;
  if (await shopSystem.handle(req,res,pathname)) return;
  if (await socialSystem.handle(req,res,pathname)) return;
  if (req.method === 'GET' && pathname === '/api/firebase-config') {
    const setup = firebaseWebConfig();
    return send(res, 200, setup);
  }
  if (req.method === 'GET' && pathname === '/api/me') {
    const account = await getAccount(req);
    return send(res, 200, { user: account ? privateProfile(account) : null });
  }
  if (req.method === 'GET' && pathname === '/api/site-content') {
    const viewer = await getAccount(req);
    const content = { ...siteContent, gameBuilds:siteContent.gameBuilds.map(({storagePath,fileKey,...build})=>({...build,hasFile:Boolean(fileKey||storagePath),needsMigration:Boolean(storagePath&&!fileKey)})) };
    const permissions={games:siteContent.games.filter(post=>canManagePost(viewer,'games',post)).map(post=>post.id),arts:siteContent.arts.filter(post=>canManagePost(viewer,'arts',post)).map(post=>post.id),updates:siteContent.updates.filter(post=>canManagePost(viewer,'updates',post)).map(post=>post.id)};
    return send(res,200,{content,permissions,storage:viewer&&isStudioStaff(viewer)?await fileStore.status():undefined});
  }
  const gameBuildRoute = /^\/api\/game-build\/([a-z0-9-]{1,120})$/.exec(pathname);
  if ((req.method === 'GET' || req.method === 'HEAD') && gameBuildRoute) return downloadGameBuild(req,res,gameBuildRoute[1]);
  if (req.method === 'POST' && pathname === '/api/owner/game-build-upload') return uploadGameBuild(req,res);
  if (req.method === 'PUT' && pathname === '/api/owner/game-builds') {
    const owner = await getAccount(req);
    const input = await readBody(req), gameId = text(input.gameId,100);
    if (!canManageGame(owner,gameId)) return send(res,403,{error:'Only authorized studio developers can manage game builds.'});
    if (!/^[a-z0-9-]{1,100}$/.test(gameId) || !isKnownGameId(gameId)) return send(res,404,{error:'Choose a published game before managing its downloads.'});
    if (!Array.isArray(input.builds) || input.builds.length > 30) return send(res,400,{error:'A game can have up to 30 operating-system entries.'});
    const previousBuilds = siteContent.gameBuilds.filter(build => build.gameId === gameId), seenIds = new Set(), seenBuildIds = new Set();
    let nextForGame;
    try {
      nextForGame = input.builds.map(item => {const previous=previousBuilds.find(build=>build.id===item.id);return cleanSitePost('gameBuilds',{...item,gameId,fileKey:item.fileKey || previous?.fileKey,storagePath:previous?.storagePath||''});});
      for(const build of nextForGame){if(build.fileKey){const stored=await fileStore.metadata(build.fileKey);if(!stored||stored.name!==build.fileName||Number(stored.size)!==build.size||stored.ownerId!==owner.id&&!previousBuilds.some(item=>item.fileKey===build.fileKey))throw Object.assign(new Error('Choose an uploaded build belonging to this game.'),{status:403});build.sha256=stored.sha256;}}
      for (const build of nextForGame) {
        if (seenIds.has(build.id) || (build.buildId && seenBuildIds.has(build.buildId))) throw Object.assign(new Error('Each operating-system build needs its own saved entry.'),{status:400});
        seenIds.add(build.id); if (build.buildId) seenBuildIds.add(build.buildId);
      }
    } catch (error) { return send(res,error.status || 400,{error:error.message || 'One of the game build entries is invalid.'}); }
    const nextIds = new Set(nextForGame.map(build => build.id));
    const removed = previousBuilds.filter(build => !nextIds.has(build.id) || (nextForGame.find(item => item.id === build.id)?.fileKey !== build.fileKey || nextForGame.find(item => item.id === build.id)?.storagePath !== build.storagePath));
    const nextContent = {...siteContent,gameBuilds:[...siteContent.gameBuilds.filter(build => build.gameId !== gameId),...nextForGame]};
    const previousContent = siteContent;
    siteContent = nextContent;
    try { await saveAccounts(); }
    catch (error) { siteContent = previousContent; throw error; }
    await cleanupStoredGameBuilds(removed);
    return send(res,200,{content:siteContent,message:'Game downloads have been saved.'});
  }
  if(req.method==='GET' && pathname==='/api/owner/game-builds'){
    const user=await getAccount(req),gameId=new URL(req.url,'http://localhost').searchParams.get('gameId');
    if(!canManageGame(user,gameId))return send(res,403,{error:'Game management access required.'});
    return send(res,200,{builds:siteContent.gameBuilds.filter(build=>build.gameId===gameId).map(({storagePath,...build})=>({...build,needsMigration:Boolean(storagePath&&!build.fileKey)})),storage:await fileStore.status()});
  }
  if(req.method==='POST' && pathname==='/api/owner/game-build-migrate'){
    const user=await getAccount(req);if(!user||user.role!=='owner')return send(res,403,{error:'Owner access required.'});
    const moved=await migrateGameBuilds();return send(res,200,{message:`Moved ${moved} builds to website storage.`});
  }
  if(req.method==='POST' && pathname==='/api/owner/game-build-cleanup'){
    const user=await getAccount(req),input=await readBody(req);
    if(!canManageGame(user,input.gameId))return send(res,403,{error:'Game management access required.'});
    if(siteContent.gameBuilds.some(build=>build.fileKey===input.fileKey))return send(res,409,{error:'This file is still in use.'});
    const stored=await fileStore.metadata(input.fileKey);if(stored?.ownerId!==user.id)return send(res,403,{error:'This upload belongs to another account.'});
    await fileStore.remove(input.fileKey);return send(res,200,{message:'Unused upload removed.'});
  }
  if (req.method === 'PUT' && pathname === '/api/owner/site-content') {
    const owner = await getAccount(req);
    if (!owner) return send(res,403,{error:'Sign in to manage site content.'});
    const input = await readBody(req), section = text(input.section, 24);
    if (!['games','arts','updates','downloads'].includes(section)) return send(res, 400, { error: 'Choose a valid publishing section.' });
    const prefix = { games: 'owner-game-', arts: 'owner-art-', updates: 'owner-update-', downloads: 'owner-download-' }[section];
    const previousItems = siteContent[section] || [];
    const selected=previousItems.find(item=>item.id===text(input.id || input.post?.id,120));
    if(!canManagePost(owner,section,selected) || !selected && owner.role!=='owner')return send(res,403,{error:'You do not have permission to manage this content.'});
    let nextItems, removedGameBuilds = [];
    if (input.delete === true) {
      const id = text(input.id, 120);
      if (!previousItems.some(item => item.id === id)) return send(res, 404, { error: 'That owner post could not be found.' });
      nextItems = previousItems.filter(item => item.id !== id);
      if (section === 'games') removedGameBuilds = siteContent.gameBuilds.filter(build => build.gameId === id);
    } else {
      const inputPost = input.post && typeof input.post === 'object' ? input.post : {};
      const previousIndex = previousItems.findIndex(item => item.id === text(inputPost.id, 120));
      const postInput = section === 'updates' ? { ...inputPost, publishedAt: previousIndex >= 0 ? previousItems[previousIndex].publishedAt : Date.now() } : inputPost;
      const post = cleanSitePost(section, {...postInput,authorId:selected?.authorId || owner.id});
      const index = previousItems.findIndex(item => item.id === post.id);
      if (index < 0 && previousItems.length >= 100) return send(res, 400, { error: 'This section has reached its 100-post limit.' });
      nextItems = [...previousItems];
      if (index >= 0) nextItems[index] = post; else nextItems.push(post);
    }
    const previous = siteContent;
    siteContent = { ...siteContent, deletedBuiltins: input.delete===true && (DEFAULT_CONTENT[section]||[]).some(item=>item.id===input.id)?[...new Set([...siteContent.deletedBuiltins,input.id])]:siteContent.deletedBuiltins, [section]: nextItems, ...(removedGameBuilds.length ? {gameBuilds:siteContent.gameBuilds.filter(build => build.gameId !== text(input.id,120))} : {}) };
    try { await saveAccounts(); }
    catch (error) { siteContent = previous; throw error; }
    await cleanupStoredGameBuilds(removedGameBuilds);
    return send(res, 200, { content: siteContent, message: 'Your site content has been saved.' });
  }
  if (req.method === 'GET' && pathname === '/api/community') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to use Helunemi Community.' });
    return send(res, 200, { community: communitySnapshot(account) });
  }
  if (req.method === 'POST' && pathname === '/api/community/presence') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to show your online status.' });
    communityPresence.set(account.id,Date.now());
    for (const [id,seenAt] of communityPresence) if (Date.now() - seenAt > 5 * 60 * 1000) communityPresence.delete(id);
    return send(res, 200, { online: true });
  }
  if (req.method === 'POST' && pathname === '/api/community/friend-request') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to add friends.' });
    const input = await readBody(req), target = accounts.find(item => item.id === input.recipientId);
    if (!target || target.id === account.id) return send(res, 404, { error: 'That account could not be found.' });
    normalizeAccount(account); normalizeAccount(target);
    if (account.community.friends.includes(target.id)) return send(res, 409, { error: 'You are already friends.' });
    if (account.community.friendRequestsSent.includes(target.id)) return send(res, 409, { error: 'A friend request is already waiting for this person.' });
    const beforeAccount = JSON.stringify(account.community), beforeTarget = JSON.stringify(target.community);
    if (account.community.friendRequestsReceived.includes(target.id)) {
      account.community.friendRequestsReceived = account.community.friendRequestsReceived.filter(id => id !== target.id);
      target.community.friendRequestsSent = target.community.friendRequestsSent.filter(id => id !== account.id);
      account.community.friends = [...new Set([...account.community.friends, target.id])];
      target.community.friends = [...new Set([...target.community.friends, account.id])];
    } else {
      account.community.friendRequestsSent.push(target.id);
      target.community.friendRequestsReceived.push(account.id);
    }
    try { await saveAccounts(); }
    catch (error) { account.community = JSON.parse(beforeAccount); target.community = JSON.parse(beforeTarget); throw error; }
    return send(res, 200, { community: communitySnapshot(account), message: account.community.friends.includes(target.id) ? `You and ${target.profile.username} are now friends.` : `Friend request sent to ${target.profile.username}.` });
  }
  if (req.method === 'POST' && pathname === '/api/community/friend-response') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to manage friend requests.' });
    const input = await readBody(req), requester = accounts.find(item => item.id === input.requesterId);
    normalizeAccount(account);
    if (!requester || !account.community.friendRequestsReceived.includes(requester.id)) return send(res, 404, { error: 'That friend request is no longer available.' });
    normalizeAccount(requester);
    const beforeAccount = JSON.stringify(account.community), beforeRequester = JSON.stringify(requester.community);
    account.community.friendRequestsReceived = account.community.friendRequestsReceived.filter(id => id !== requester.id);
    requester.community.friendRequestsSent = requester.community.friendRequestsSent.filter(id => id !== account.id);
    if (input.accept === true) {
      account.community.friends = [...new Set([...account.community.friends, requester.id])];
      requester.community.friends = [...new Set([...requester.community.friends, account.id])];
    }
    try { await saveAccounts(); }
    catch (error) { account.community = JSON.parse(beforeAccount); requester.community = JSON.parse(beforeRequester); throw error; }
    return send(res, 200, { community: communitySnapshot(account), message: input.accept === true ? `You and ${requester.profile.username} are now friends.` : 'Friend request declined.' });
  }
  if (req.method === 'GET' && pathname === '/api/community/messages') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to view your messages.' });
    const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams, otherId = query.get('with') || '';
    normalizeAccount(account);
    if (!account.community.friends.includes(otherId)) return send(res, 403, { error: 'You can only message an accepted friend.' });
    const messages = account.community.messages.filter(item => (item.senderId === account.id && item.recipientId === otherId) || (item.senderId === otherId && item.recipientId === account.id)).sort((a,b) => a.createdAt - b.createdAt);
    return send(res, 200, { messages });
  }
  if (req.method === 'POST' && pathname === '/api/community/asset') {
    const account = await getAccount(req);
    if (!account) return send(res,401,{error:'Log in to send chat media.'});
    const input=await readBody(req),target=accounts.find(item=>item.id===input.recipientId);
    normalizeAccount(account);
    if(!target||!account.community.friends.includes(target.id))return send(res,403,{error:'You can only send media to an accepted friend.'});
    const match=typeof input.data==='string'?/^data:(image\/(?:webp|png|jpeg|gif)|audio\/(?:webm|ogg|mpeg|mp4|wav));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.data):null;
    if(!match)return send(res,400,{error:'Choose a JPG, PNG, WebP, GIF, or supported audio recording.'});
    if(!['image','gif','sticker','voice'].includes(input.kind))return send(res,400,{error:'Choose an image, GIF, sticker, or voice recording.'});
    const mime=match[1],isImage=mime.startsWith('image/');
    if(isImage!==['image','gif','sticker'].includes(input.kind))return send(res,400,{error:'The selected media does not match its file type.'});
    if(input.kind==='gif'&&mime!=='image/gif'||input.kind==='voice'&&!mime.startsWith('audio/'))return send(res,400,{error:'The selected media does not match its file type.'});
    const buffer=Buffer.from(match[2],'base64');
    if(!buffer.length||buffer.length>1800000)return send(res,413,{error:'Choose a chat media file smaller than 1.8 MB.'});
    const extension=({'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/gif':'gif','audio/webm':'webm','audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav'})[mime];
    try {
      const stored=await fileStore.save(Readable.from([buffer]),{size:buffer.length,maxBytes:1800000,name:crypto.randomUUID()+'.'+extension,mime,ownerId:account.id,recipientId:target.id,prefix:'community/'+account.id+'/'+target.id,validate:data=>chatMediaSignature(mime,data)});
      return send(res,201,{url:'/api/community/assets/'+stored.key,path:stored.storagePath});
    } catch(error) {
      if(error.status)return send(res,error.status,{error:error.message});
      console.error('NEON COMMUNITY MEDIA UPLOAD ERROR:',error);
      return send(res,503,{error:'Chat media could not be uploaded. Check Neon Object Storage setup.'});
    }
  }
  const communityAssetRoute=/^\/api\/community\/assets\/([a-f0-9-]{36})$/i.exec(pathname);
  if((req.method==='GET'||req.method==='HEAD')&&communityAssetRoute){
    const account=await getAccount(req),key=communityAssetRoute[1];
    if(!account)return send(res,401,{error:'Log in to view chat media.'});
    normalizeAccount(account);
    const message=account.community.messages.find(item=>item.mediaKey===key&&(item.senderId===account.id||item.recipientId===account.id));
    if(!message)return send(res,404,{error:'That chat media is no longer available.'});
    const otherId=message.senderId===account.id?message.recipientId:message.senderId;
    if(!account.community.friends.includes(otherId))return send(res,403,{error:'You can only view media from an accepted friend.'});
    const stored=await fileStore.metadata(key);
    if(!stored||stored.ownerId!==message.senderId||stored.recipientId!==message.recipientId)return send(res,404,{error:'That chat media is no longer available.'});
    return fileStore.serve(req,res,key);
  }
  if (req.method === 'POST' && pathname === '/api/community/message') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to send messages.' });
    const input = await readBody(req), target = accounts.find(item => item.id === input.recipientId);
    normalizeAccount(account);
    if (!target || !account.community.friends.includes(target.id)) return send(res, 403, { error: 'You can only message an accepted friend.' });
    normalizeAccount(target);
    const body = typeof input.text === 'string' ? input.text.trim() : '';
    const type = ['text','image','gif','voice','sticker'].includes(input.type) ? input.type : 'text';
    if (type === 'text' && (!body || body.length > 2000)) return send(res, 400, { error: 'Write a message of 1–2,000 characters.' });
    if (type === 'sticker' && ((!body && !input.mediaUrl) || body.length > 24)) return send(res,400,{error:'Choose a sticker to send.'});
    let mediaUrl='',mediaPath='',mediaKey='';
    if(['image','gif','voice'].includes(type)||type==='sticker'&&input.mediaUrl){
      const neonRoute=/^\/api\/community\/assets\/([a-f0-9-]{36})$/i.exec(String(input.mediaUrl||''));
      if(neonRoute){
        const stored=await fileStore.metadata(neonRoute[1]);
        if(!stored||stored.ownerId!==account.id||stored.recipientId!==target.id||input.mediaPath!==stored.storagePath||!stored.storagePath.startsWith('images/community/'+account.id+'/'+target.id+'/'))return send(res,400,{error:'Upload the image or voice message again.'});
        mediaUrl=neonRoute[0];mediaPath=stored.storagePath;mediaKey=stored.key;
      }else{
        let parsed,urlBucket;
        try{parsed=new URL(String(input.mediaUrl||''));mediaUrl=parsed.href;mediaPath=decodeURIComponent(parsed.pathname.split('/o/')[1]||'');urlBucket=decodeURIComponent(parsed.pathname.split('/')[3]||'');}
        catch(_){return send(res,400,{error:'Upload the image or voice message again.'});}
        if(parsed.hostname!=='firebasestorage.googleapis.com'||parsed.protocol!=='https:'||urlBucket!==firebaseStorageBucket()||mediaPath!==String(input.mediaPath||'')||!mediaPath.startsWith('community/'+account.id+'/'+target.id+'/')||!parsed.searchParams.has('token'))return send(res,400,{error:'That chat media upload is not valid.'});
      }
    }
    if (body.length > 2000) return send(res,400,{error:'Keep messages under 2,000 characters.'});
    const message = { id: crypto.randomUUID(), senderId: account.id, recipientId: target.id, type, text: body, ...(mediaUrl ? {mediaUrl,mediaPath,...(mediaKey?{mediaKey}:{})} : {}), caption: typeof input.caption === 'string' ? input.caption.trim().slice(0,240) : '', createdAt: Date.now() };
    const beforeAccount = JSON.stringify(account.community.messages), beforeTarget = JSON.stringify(target.community.messages);
    account.community.messages = [...account.community.messages, message].slice(-250);
    target.community.messages = [...target.community.messages, message].slice(-250);
    try { await saveAccounts(); }
    catch (error) { account.community.messages = JSON.parse(beforeAccount); target.community.messages = JSON.parse(beforeTarget); throw error; }
    return send(res, 201, { message });
  }
  if (req.method === 'POST' && pathname === '/api/community/bug-report') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to send a report to Helunemi.' });
    const input = await readBody(req), title = text(input.title, 120), details = text(input.details, 4000);
    if (!title || !details) return send(res, 400, { error: 'Add a short title and describe what happened.' });
    const recipients = accounts.filter(isStudioStaff);
    if (!recipients.length) return send(res, 503, { error: 'The studio report inbox is unavailable right now.' });
    const report = { id: crypto.randomUUID(), reporterId: account.id, reporterName: account.profile.username, title, details, page: text(input.page, 300), createdAt: Date.now(), status: 'open' };
    const previous = recipients.map(member => [member, JSON.stringify(member.community?.bugReports || [])]);
    for (const member of recipients) {
      normalizeAccount(member);
      member.community.bugReports = [...member.community.bugReports, report].slice(-100);
    }
    try { await saveAccounts(); }
    catch (error) { for (const [member, old] of previous) member.community.bugReports = JSON.parse(old); throw error; }
    return send(res, 201, { message: 'Your report was sent to the Helunemi team.' });
  }
  if (req.method === 'GET' && pathname === '/api/community/bug-reports') {
    const account = await getAccount(req);
    if (!account || !isStudioStaff(account)) return send(res, 403, { error: 'Only Helunemi staff can view reports.' });
    normalizeAccount(account);
    return send(res, 200, { reports: account.community.bugReports });
  }
  if (req.method === 'PUT' && pathname === '/api/personal-info') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to update your private account information.' });
    const input = await readBody(req);
    const rawSecondaryEmail = text(input.secondaryEmail, 254).toLowerCase();
    if (rawSecondaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawSecondaryEmail)) return send(res, 400, { error: 'Enter a valid secondary email address.' });
    if (input.countryCode && !countryCode(input.countryCode)) return send(res, 400, { error: 'Choose a valid country or region.' });
    const previous = account.personalInfo;
    account.personalInfo = cleanPersonalInfo({ ...previous, ...input });
    try { await saveAccounts(); }
    catch (error) { account.personalInfo = previous; throw error; }
    return send(res, 200, { user: privateProfile(account), message: 'Your personal information has been saved.' });
  }
  if (req.method === 'GET' && pathname === '/api/public-profile') {
    const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
    const account = accounts.find(item => item.id === query.get('id'));
    return account ? send(res, 200, { user: publicProfile(account) }) : send(res, 404, { error: 'This profile could not be found.' });
  }
  if (req.method === 'GET' && pathname === '/api/team') {
    const team = accounts.filter(account => account.role === 'owner' || ['assistant', 'ai-assistant', 'developer'].includes(account.profile.primaryRole)).map(account => {
      const primaryRole = account.role === 'owner' ? 'Owner' : PRIMARY_ROLES[account.profile.primaryRole]?.label || 'Member';
      return { id: account.id, online: account.profile.username, real: account.profile.realName || 'Not shared', avatarImage: account.profile.avatarImage, primaryRole, roles: [primaryRole, ...cleanSecondaryRoles(account.profile.secondaryRoles)], projects: PROJECT_TAGS };
    });
    return send(res, 200, { members: team });
  }
  if (req.method === 'GET' && pathname === '/api/members') {
    const members = accounts.filter(account => account.role !== 'owner' && account.profile.primaryRole === 'member').map(account => ({
      id: account.id,
      username: account.profile.username,
      avatarImage: account.profile.avatarImage,
      friendCard: account.profile.friendCard?.published === true ? cleanFriendCard(account.profile.friendCard, account.id) : null
    }));
    return send(res, 200, { members });
  }
  const friendCardFileRoute=/^\/api\/friend-card\/(assets|fonts)\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/i.exec(pathname);
  if((req.method==='GET'||req.method==='HEAD')&&friendCardFileRoute){
    const [,kind,ownerId,key]=friendCardFileRoute;
    const owner=accounts.find(item=>String(item.id||'').toLowerCase()===ownerId.toLowerCase());
    if(!owner)return send(res,404,{error:'That Friend-Card asset is no longer available.'});
    const stored=await fileStore.metadata(key),allowed=kind==='assets'?['image/png','image/jpeg','image/webp']:['font/woff2','font/woff','font/ttf','font/otf'];
    if(!stored||String(stored.ownerId||'').toLowerCase()!==owner.id.toLowerCase()||!allowed.includes(stored.mime))return send(res,404,{error:'That Friend-Card asset is no longer available.'});
    normalizeAccount(owner);
    const assetUrl='/api/friend-card/'+kind+'/'+owner.id+'/'+stored.key,viewer=await getAccount(req);
    const publicReference=owner.profile.friendCard?.published===true&&friendCardReferences(owner.profile.friendCard,assetUrl);
    if(viewer?.id!==owner.id&&!publicReference)return send(res,404,{error:'That Friend-Card asset is not published.'});
    return fileStore.serve(req,res,key);
  }
  if(req.method==='POST'&&pathname==='/api/friend-card/asset'){
    const account=await getAccount(req);
    if(!account)return send(res,401,{error:'Log in to upload Friend-Card images.'});
    if(account.role==='owner'||account.profile.primaryRole!=='member')return send(res,403,{error:'Only Member accounts can upload Friend-Card images.'});
    const input=await readBody(req),match=typeof input.image==='string'?/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.image):null;
    if(!match)return send(res,400,{error:'Choose a supported JPG, PNG, or WebP image.'});
    const buffer=Buffer.from(match[2],'base64');
    if(!buffer.length||buffer.length>650000)return send(res,413,{error:'That Friend-Card image is too large after resizing.'});
    const ext=match[1]==='jpeg'?'jpg':match[1],mime='image/'+match[1],name=crypto.randomUUID()+'.'+ext;
    try{
      const stored=await fileStore.save(Readable.from([buffer]),{size:buffer.length,maxBytes:650000,name,mime,ownerId:account.id,prefix:'friend-cards/'+account.id,validate:data=>sniffMedia(mime,data)});
      const url='/api/friend-card/assets/'+account.id+'/'+stored.key;
      return send(res,201,{url,path:stored.storagePath,message:'Image uploaded to your private Helunemi storage.'});
    }catch(error){if(error.status)return send(res,error.status,{error:error.message});console.error('NEON FRIEND-CARD ASSET UPLOAD ERROR:',error);return send(res,503,{error:'The image could not be uploaded to Neon Object Storage.'});}
  }
  if(req.method==='POST'&&pathname==='/api/friend-card/font'){
    const account=await getAccount(req);
    if(!account)return send(res,401,{error:'Log in to upload Friend-Card fonts.'});
    if(account.role==='owner'||account.profile.primaryRole!=='member')return send(res,403,{error:'Only Member accounts can upload Friend-Card fonts.'});
    const input=await readBody(req),match=typeof input.data==='string'?/^data:font\/(woff2|woff|ttf|otf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.data):null;
    if(!match)return send(res,400,{error:'Choose a WOFF2, WOFF, TTF, or OTF font file.'});
    const buffer=Buffer.from(match[2],'base64');
    if(!buffer.length||buffer.length>1500000)return send(res,413,{error:'Choose a font file smaller than 1.5 MB.'});
    const sig={woff2:buffer.subarray(0,4).toString('ascii')==='wOF2',woff:buffer.subarray(0,4).toString('ascii')==='wOFF',otf:buffer.subarray(0,4).toString('ascii')==='OTTO',ttf:buffer.subarray(0,4).equals(Buffer.from([0,1,0,0]))||buffer.subarray(0,4).toString('ascii')==='true'};
    if(!sig[match[1]])return send(res,400,{error:'The file contents do not match the selected font format.'});
    const name=crypto.randomUUID()+'.'+match[1],mime='font/'+match[1];
    try{
      const stored=await fileStore.save(Readable.from([buffer]),{size:buffer.length,maxBytes:1500000,name,mime,ownerId:account.id,prefix:'friend-cards/'+account.id+'/fonts',validate:()=>sig[match[1]]});
      const url='/api/friend-card/fonts/'+account.id+'/'+stored.key;
      return send(res,201,{url,format:match[1],message:'Font uploaded to your private Helunemi storage.'});
    }catch(error){if(error.status)return send(res,error.status,{error:error.message});console.error('NEON FRIEND-CARD FONT UPLOAD ERROR:',error);return send(res,503,{error:'The font could not be uploaded to Neon Object Storage.'});}
  }
  if (req.method === 'GET' && pathname === '/api/admin/accounts') {
    const owner = await getAccount(req);
    if (!owner || owner.role !== 'owner') return send(res, 403, { error: 'Only the Helunemi Owner can assign account roles.' });
    const list = accounts.map(account => ({ id: account.id, username: account.profile.username, accountRole: account.role || 'member', primaryRole: account.role === 'owner' ? 'owner' : (account.profile.primaryRole || 'member'), secondaryRoles: cleanSecondaryRoles(account.profile.secondaryRoles) }));
    return send(res, 200, { accounts: list });
  }
  if (req.method === 'PUT' && pathname === '/api/admin/account-roles') {
    const owner = await getAccount(req);
    if (!owner || owner.role !== 'owner') return send(res, 403, { error: 'Only the Helunemi Owner can assign account roles.' });
    const input = await readBody(req);
    const target = accounts.find(item => item.id === input.accountId);
    if (!target) return send(res, 404, { error: 'That account could not be found.' });
    const primaryRole = text(input.primaryRole, 32);
    if (target.role === 'owner' && primaryRole !== 'owner') return send(res, 403, { error: 'The Owner permission cannot be changed here.' });
    if (target.role !== 'owner' && !Object.hasOwn(PRIMARY_ROLES, primaryRole)) return send(res, 400, { error: 'Choose Assistant, AI Assistant, Developer, or Member. Visitor is reserved for guests.' });
    const assignedPrimaryRole = target.role === 'owner' ? 'owner' : primaryRole;
    const previousPrimaryRole = target.profile.primaryRole;
    const previousSecondaryRoles = target.profile.secondaryRoles;
    const previousFriendCard = target.profile.friendCard;
    if (target.role !== 'owner') target.profile.primaryRole = assignedPrimaryRole;
    target.profile.secondaryRoles = assignedPrimaryRole === 'member' ? [] : cleanSecondaryRoles(input.secondaryRoles);
    if (assignedPrimaryRole !== 'member' || target.role === 'owner') target.profile.friendCard = emptyFriendCard();
    try { await saveAccounts(); }
    catch (error) {
      target.profile.primaryRole = previousPrimaryRole;
      target.profile.secondaryRoles = previousSecondaryRoles;
      target.profile.friendCard = previousFriendCard;
      throw error;
    }
    return send(res, 200, { account: { id: target.id, username: target.profile.username, primaryRole: assignedPrimaryRole, secondaryRoles: target.profile.secondaryRoles } });
  }
  if (req.method === 'POST' && pathname === '/api/owner/claim') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many Owner setup attempts. Please try again later.' });
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to claim the Helunemi Owner account.' });
    const input = await readBody(req);
    const ownerUsername = text(process.env.SOLARIS_OWNER_USERNAME || 'Fritzz Xenon', 24);
    const ownerExists = accounts.some(item => item.role === 'owner') || pausedAccounts.some(item => item.account.role === 'owner');
    if (ownerExists || account.profile.username.toLowerCase() !== ownerUsername.toLowerCase()) return send(res, 403, { error: 'This account is not eligible to claim the Owner role.' });
    if (!process.env.SOLARIS_OWNER_SETUP_TOKEN || !secureEqual(input.ownerSetupCode, process.env.SOLARIS_OWNER_SETUP_TOKEN)) return send(res, 403, { error: 'The Owner setup code is not valid.' });
    const previousRole = account.role;
    account.role = 'owner';
    try { await saveAccounts(); }
    catch (error) { account.role = previousRole; throw error; }
    return send(res, 200, { user: { ...privateProfile(account), canClaimOwner: false } });
  }
  if (req.method === 'POST' && pathname === '/api/auth/link') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to connect an email to this Helunemi profile.' });
    const input = await readBody(req);
    const claims = await verifyFirebaseToken(input.idToken);
    const otherAccount = accounts.find(item => item.id !== account.id && item.firebaseUid === claims.uid);
    const otherPaused = pausedAccounts.find(item => item.account.id !== account.id && (item.account.firebaseUid === claims.uid || item.account.email?.toLowerCase() === String(claims.email).toLowerCase()));
    if (otherAccount || otherPaused) return send(res, 409, { error: 'That verified email is already connected to another Helunemi account.' });
    if (account.firebaseUid && account.firebaseUid !== claims.uid) return send(res, 409, { error: 'This Helunemi account is already connected to a different verified email.' });
    const previous = { firebaseUid: account.firebaseUid, email: account.email, emailVerified: account.emailVerified, salt: account.salt, passwordHash: account.passwordHash };
    try {
      await updatePasswordMirror(account, input.password);
      account.firebaseUid = claims.uid;
      account.email = String(claims.email).toLowerCase();
      account.emailVerified = true;
      await saveAccounts();
    } catch (error) {
      Object.assign(account, previous);
      throw error;
    }
    return send(res, 200, { user: privateProfile(account), message: 'Your verified email is connected to this Helunemi account.' });
  }
  if (req.method === 'POST' && pathname === '/api/signup') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many sign-up attempts. Please try again later.' });
    const input = await readBody(req);
    const firebaseEnabled = firebaseWebConfig().enabled;
    let claims = null;
    if (firebaseEnabled) {
      if (!input.idToken) return send(res, 403, { error: 'Create a verified Firebase email account before signing up to Helunemi.' });
      claims = await verifyFirebaseToken(input.idToken);
    }
    else if (input.idToken) return send(res, 503, { error: 'Firebase email sign-in is not fully configured on the server.' });
    const username = text(input.username, 24);
    if (!validUsername(username)) return send(res, 400, { error: 'Use 3–24 letters, numbers, dots, dashes, underscores, or single spaces.' });
    if (accounts.some(account => account.profile.username.toLowerCase() === username.toLowerCase()) || pausedAccounts.some(item => item.account.profile.username.toLowerCase() === username.toLowerCase())) return send(res, 409, { error: 'That username is already taken or temporarily reserved by a paused account.' });
    if ((!claims || input.password) && (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 200)) return send(res, 400, { error: 'Use a password between 10 and 200 characters.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const password = typeof input.password === 'string' && input.password.length >= 10 ? input.password : crypto.randomBytes(48).toString('base64url');
    const passwordHash = Buffer.from(await scrypt(password, salt, 64)).toString('hex');
    const id = crypto.randomUUID();
    if (claims && (accounts.some(item => item.firebaseUid === claims.uid) || pausedAccounts.some(item => item.account.firebaseUid === claims.uid || item.account.email?.toLowerCase() === String(claims.email).toLowerCase()))) return send(res, 409, { error: 'This verified email already has a Helunemi account. Log in instead.' });
    const account = { id, salt, passwordHash, ...(claims ? { firebaseUid: claims.uid, email: String(claims.email).toLowerCase(), emailVerified: true } : {}), role: 'member', tickets: { namecard: 0, who: 0 }, community: emptyCommunity(),
      profile: cleanProfile({ ...input.profile, username }, {}, true, id) };
    accounts.push(account);
    try { await saveAccounts(); }
    catch (error) { accounts = accounts.filter(item => item.id !== id); throw error; }
    await setSession(res, account.id);
    return send(res, 201, { user: privateProfile(account), message: 'Your account is ready.' });
  }
  if (req.method === 'POST' && pathname === '/api/login') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many login attempts. Please try again later.' });
    const input = await readBody(req);
    if (input.idToken) {
      const claims = await verifyFirebaseToken(input.idToken);
      const account = accounts.find(item => item.firebaseUid === claims.uid);
      if (!account) {
        const paused = pausedAccounts.find(item => item.account.firebaseUid === claims.uid || item.account.email?.toLowerCase() === String(claims.email).toLowerCase());
        if (paused) return send(res, 403, { error: `This account is paused until ${new Date(paused.resumeAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC.` });
        return send(res, 404, { error: 'This verified email has no Helunemi profile yet. Create an account or connect it from your existing profile.' });
      }
      const previous = { salt: account.salt, passwordHash: account.passwordHash, email: account.email, emailVerified: account.emailVerified };
      try {
        await updatePasswordMirror(account, input.password);
        account.email = String(claims.email).toLowerCase();
        account.emailVerified = true;
        await saveAccounts();
      } catch (error) {
        Object.assign(account, previous);
        throw error;
      }
      await setSession(res, account.id);
      return send(res, 200, { user: privateProfile(account) });
    }
    const username = text(input.username, 24).toLowerCase();
    const account = accounts.find(item => item.profile.username.toLowerCase() === username);
    const salt = account ? account.salt : '00000000000000000000000000000000';
    const expected = account ? Buffer.from(account.passwordHash, 'hex') : Buffer.alloc(64);
    const candidate = Buffer.from(await scrypt(typeof input.password === 'string' ? input.password.slice(0, 200) : '', salt, 64));
    if (!account) {
      const paused = pausedAccounts.find(item => item.account.profile.username.toLowerCase() === username);
      if (paused && await passwordMatches(paused.account, input.password)) return send(res, 403, { error: `This account is paused until ${new Date(paused.resumeAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC.` });
    }
    if (!account || candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) return send(res, 401, { error: 'The username or password is incorrect.' });
    if (account.firebaseUid) return send(res, 403, { error: 'This account uses its verified email now. Log in with email and password.' });
    await setSession(res, account.id);
    return send(res, 200, { user: privateProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/logout') {
    await clearSession(req, res);
    return send(res, 200, { user: null });
  }
  if (req.method === 'PUT' && pathname === '/api/profile') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to update your profile.' });
    const input = await readBody(req);
    const username = text(input.username, 24);
    if (!validUsername(username)) return send(res, 400, { error: 'Use 3–24 letters, numbers, dots, dashes, underscores, or single spaces for your username.' });
    const usernameChanged = username.toLowerCase() !== account.profile.username.toLowerCase();
    if (usernameChanged && (accounts.some(item => item.id !== account.id && item.profile.username.toLowerCase() === username.toLowerCase()) || pausedAccounts.some(item => item.account.profile.username.toLowerCase() === username.toLowerCase()))) return send(res, 409, { error: 'That username is already taken or reserved by a paused account.' });
    const lastChanged = Number(account.profile.usernameLastChangedAt) || Date.now();
    const onUsernameCooldown = usernameChanged && Date.now() - lastChanged < USERNAME_COOLDOWN_MS;
    const useNamecardTicket = usernameChanged && input.useNamecardTicket === true;
    if (onUsernameCooldown && (!useNamecardTicket || Number(account.tickets?.namecard) < 1)) return send(res, 429, { error: 'Username changes have a one-week cooldown. Get a Namecard ticket in the Shop to change it now.' });
    if (useNamecardTicket && Number(account.tickets?.namecard) < 1) return send(res, 403, { error: 'You do not have a Namecard ticket. Get one in the Shop.' });
    const realName = text(input.realName, 80);
    const realNameChanged = Boolean(account.profile.realName) && realName !== account.profile.realName;
    if (realNameChanged && (input.useWhoTicket !== true || Number(account.tickets?.who) < 1)) return send(res, 403, { error: 'Your real name is permanent. Get a WHO? ticket in the Shop to change it.' });
    const previousProfile = account.profile;
    const previousTickets = { ...(account.tickets || {}) };
    const updatedProfile = cleanProfile(input, account.profile, account.role !== 'owner' && account.profile.primaryRole === 'member', account.id);
    if (usernameChanged) updatedProfile.usernameLastChangedAt = Date.now();
    if (useNamecardTicket) account.tickets.namecard--;
    if (realNameChanged) account.tickets.who--;
    account.profile = updatedProfile;
    try { await saveAccounts(); }
    catch (error) { account.profile = previousProfile; account.tickets = previousTickets; throw error; }
    return send(res, 200, { user: privateProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/account/pause') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to pause your account.' });
    const input = await readBody(req);
    if (input.confirmation !== 'PAUSE') return send(res, 400, { error: 'Type PAUSE exactly to confirm this action.' });
    if (!await confirmAccountActionPassword(account, input)) return send(res, 401, { error: 'Re-enter your current password and try again.' });
    const now = Date.now();
    const backup = JSON.parse(JSON.stringify(account));
    const previousAccounts = accounts;
    const previousPaused = pausedAccounts;
    accounts = accounts.filter(item => item.id !== account.id);
    pausedAccounts = [...pausedAccounts.filter(item => item.account.id !== account.id), { account: backup, pausedAt: now, resumeAt: now + PAUSE_DURATION_MS }];
    try {
      await saveAccounts();
      await removeAccountSessions(account.id, req, res);
    } catch (error) {
      accounts = previousAccounts;
      pausedAccounts = previousPaused;
      await saveAccounts();
      throw error;
    }
    return send(res, 200, { message: `Your account is paused for 30 days. You can log back in after ${new Date(now + PAUSE_DURATION_MS).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC.` });
  }
  if (req.method === 'POST' && pathname === '/api/account/delete') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to delete your account.' });
    const input = await readBody(req);
    if (input.confirmation !== 'DELETE') return send(res, 400, { error: 'Type DELETE exactly to confirm permanent deletion.' });
    if (!await confirmAccountActionPassword(account, input)) return send(res, 401, { error: 'Re-enter your current password and try again.' });
    const previousAccounts = accounts;
    const previousPaused = pausedAccounts;
    accounts = accounts.filter(item => item.id !== account.id);
    pausedAccounts = pausedAccounts.filter(item => item.account.id !== account.id);
    try {
      await saveAccounts();
      await removeAccountSessions(account.id, req, res);
    } catch (error) {
      accounts = previousAccounts;
      pausedAccounts = previousPaused;
      await saveAccounts();
      throw error;
    }
    await socialSystem.removeAccount(account.id);
    return send(res, 200, { message: 'Your account and Helunemi pause backups have been permanently deleted.' });
  }
  return send(res, 404, { error: 'Not found.' });
}

async function loadFileStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  let stored;
  try {
    stored = JSON.parse(await fs.readFile(STORE_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') { accounts = []; pausedAccounts = []; siteContent = cleanSiteContentState({}); socialSystem.load({}); shopSystem.load({}); return; }
    throw error;
  }
  const savedAccounts = Array.isArray(stored) ? stored : Array.isArray(stored?.accounts) ? stored.accounts : [];
  accounts = savedAccounts.filter(account => account && account.id && account.profile && account.passwordHash && account.salt);
  pausedAccounts = Array.isArray(stored?.pausedAccounts) ? stored.pausedAccounts.filter(item => item?.account?.id && item.account.profile && item.account.passwordHash && item.account.salt && Number(item.resumeAt) > 0) : [];
  siteContent = cleanSiteContentState(stored?.siteContent);
  socialSystem.load(stored?.social);
  shopSystem.load(stored?.shop);
  let changed = Array.isArray(stored) || !stored?.siteContent || !stored?.shop;
  changed = accounts.reduce((didChange, account) => normalizeAccount(account) || didChange, changed);
  changed = pausedAccounts.reduce((didChange, item) => normalizeAccount(item.account) || didChange, changed);
  // Migrate legacy account arrays without dropping any existing profile data.
  if (changed) await saveAccounts();
}

async function loadStore() {
  if (!process.env.DATABASE_URL) return loadFileStore();

  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('CREATE TABLE IF NOT EXISTS solaris_account_store (store_id SMALLINT PRIMARY KEY CHECK (store_id = 1), accounts JSONB NOT NULL)');
  await pool.query('CREATE TABLE IF NOT EXISTS solaris_sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at BIGINT NOT NULL)');
  const result = await pool.query('SELECT accounts FROM solaris_account_store WHERE store_id = 1');
  if (result.rows.length) {
    const stored = result.rows[0].accounts;
    const savedAccounts = Array.isArray(stored) ? stored : Array.isArray(stored?.accounts) ? stored.accounts : [];
    accounts = savedAccounts.filter(account => account && account.id && account.profile && account.passwordHash && account.salt);
    pausedAccounts = Array.isArray(stored?.pausedAccounts) ? stored.pausedAccounts.filter(item => item?.account?.id && item.account.profile && item.account.passwordHash && item.account.salt && Number(item.resumeAt) > 0) : [];
    siteContent = cleanSiteContentState(stored?.siteContent);
    socialSystem.load(stored?.social);
    shopSystem.load(stored?.shop);
    let changed = Array.isArray(stored) || !stored?.siteContent || !stored?.shop;
    changed = accounts.reduce((didChange, account) => normalizeAccount(account) || didChange, changed);
    changed = pausedAccounts.reduce((didChange, item) => normalizeAccount(item.account) || didChange, changed);
    if (changed) await saveAccounts();
  } else {
    // Import the existing JSON account store once when attaching a database.
    await loadFileStore();
    await saveAccounts();
  }
  await pool.query('DELETE FROM solaris_sessions WHERE expires_at <= $1', [Date.now()]);
}

const server = http.createServer(async (req, res) => {
  const requestLabel = `${req.method} ${(req.url || '/').split('?')[0]}`;
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url.pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    if (!STATIC_FILES.has(requested)) return send(res, 404, { error: 'Not found.' });
    const filePath = path.join(ROOT, requested);
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': requested.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    console.error(`[REQUEST ERROR] ${requestLabel}`, error);
    if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete that request.' });
    else res.destroy();
  }
});

function retainedUploadKeys() {
  const retained=new Set([...siteContent.gameBuilds.map(build=>build.fileKey),...socialSystem.snapshot().assets.map(asset=>asset.id)].filter(key=>/^[a-f0-9-]{36}$/i.test(String(key||''))));
  const collect=value=>{
    if(typeof value==='string'){const match=/^\/api\/friend-card\/(?:assets|fonts)\/[a-f0-9-]{36}\/([a-f0-9-]{36})$/i.exec(value);if(match)retained.add(match[1]);}
    else if(Array.isArray(value))value.forEach(collect);
    else if(value&&typeof value==='object')Object.values(value).forEach(collect);
  };
  for(const account of [...accounts,...pausedAccounts.map(item=>item.account)]){for(const message of account.community?.messages||[])if(/^[a-f0-9-]{36}$/i.test(String(message.mediaKey||'')))retained.add(message.mediaKey);collect(account.profile?.friendCard);collect(account.friendCards);}
  collect(socialSystem.snapshot().cfcs);
  return [...retained];
}
loadStore().then(async () => {
  await restoreExpiredAccounts();
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.SOLARIS_DATA_DIR) {
    console.warn('Account data is using local files and may be lost after a restart. Configure DATABASE_URL or a persistent SOLARIS_DATA_DIR.');
  }
  server.listen(PORT, HOST, () => console.log(`Helunemi is running at http://localhost:${PORT}`));
  if(siteContent.gameBuilds.some(build=>build.storagePath&&!build.fileKey))migrateGameBuilds().catch(error=>console.error('GAME BUILD MIGRATION NEEDS ATTENTION:',error));
  fileStore.prune(retainedUploadKeys()).catch(error=>console.warn('UPLOAD STORAGE SETUP:',error.message));
}).catch(async error => {
  if (pool) await pool.end().catch(() => {});
  console.error('Could not load the account store:', error);
  process.exitCode = 1;
});

