'use strict';

const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const sanitizeHtml = require('sanitize-html');
const sharp = require('sharp');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const unique = value => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string') : [])];
const emptyState = () => ({ version: 1, posts: [], media: [], assets: [], cfcs: [], circles: [], claims: [] });

function sanitizePost(value) {
  return sanitizeHtml(String(value || '').slice(0, 40000), {
    allowedTags: ['p','br','strong','b','em','i','u','s','strike','ul','ol','li','blockquote','h2','h3','a','span','div'],
    allowedAttributes: { a: ['href','rel','target'], p: ['style'], div: ['style'], span: ['style'] },
    allowedStyles: { '*': { 'text-align': [/^(left|center|right|justify)$/] } },
    allowedSchemes: ['https','http','mailto'], allowProtocolRelative: false,
    transformTags: { a: (tagName, attributes) => ({ tagName: 'a', attribs: { href: attributes.href || '', rel: 'noopener noreferrer nofollow', target: '_blank' } }) },
    disallowedTagsMode: 'discard'
  });
}
function sniffMedia(mime, buffer) {
  if (mime === 'image/png') return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/jpeg') return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mime === 'image/webp') return buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP';
  if (mime === 'image/gif') return /^GIF8[79]a$/.test(buffer.toString('ascii',0,6));
  if (mime === 'video/mp4') return buffer.toString('ascii',4,8) === 'ftyp';
  if (mime === 'video/webm') return buffer.subarray(0,4).equals(Buffer.from([26,69,223,163]));
  return false;
}

function createSocialSystem(context) {
  const { getAccounts, getAccount, send, readBody, save, files, cleanFriendCard } = context;
  let state = emptyState(), mutation = Promise.resolve(), createdKeys = null;
  const accountById = id => getAccounts().find(account => account.id === id);
  const activeOwner = item => Boolean(accountById(item.ownerId || item.authorId));
  const ownerOf = (item, user) => Boolean(user && (item.ownerId || item.authorId) === user.id);
  const friends = (a, b) => Boolean(a && b && a.community?.friends?.includes(b.id) && b.community?.friends?.includes(a.id));
  const circleFor = id => state.circles.find(circle => circle.id === id);
  const circleMember = (id, user) => Boolean(user && circleFor(id)?.members.includes(user.id));
  const moderator = user => user?.role === 'owner' || user?.profile?.primaryRole === 'assistant';
  const brief = user => ({ id: user.id, username: user.profile.username, avatarImage: user.profile.avatarImage || '' });
  const asset = id => state.assets.find(item => item.id === id);
  const mediaById = id => state.media.find(item => item.id === id);
  const postById = id => state.posts.find(item => item.id === id);
  const cfcById = id => state.cfcs.find(item => item.id === id);
  const entitled = (item, user) => ownerOf(item, user) || Boolean(user && (state.claims.some(claim => claim.itemId === item.id && claim.userId === user.id) || (item.sharedWith || []).includes(user.id) || (item.groupIds || []).some(id => circleMember(id, user))));
  const visiblePost = (post, user) => Boolean(activeOwner(post) && (ownerOf(post, user) || post.visibility === 'public' || post.visibility === 'friends' && friends(accountById(post.authorId), user) || post.visibility === 'party' && circleMember(post.partyId, user)));
  const visibleCfc = (card, user) => activeOwner(card) && (card.visibility === 'public' || entitled(card, user));
  const accessibleMedia = (item, user) => activeOwner(item) && (item.price === 0 || entitled(item, user));
  const fileUrl = id => '/api/social/assets/' + encodeURIComponent(id);
  function mediaSummary(item, user) {
    const unlocked = accessibleMedia(item, user);
    return { id: item.id, kind: item.kind, name: item.name, collection: item.collection, classification: item.classification, price: item.price, currency: 'USD', ownerId: item.ownerId, creator: brief(accountById(item.ownerId)), available: true, locked: !unlocked, previewUrl: fileUrl(item.previewId), ...(unlocked ? { url: fileUrl(item.assetId) } : {}), canManage: ownerOf(item, user), claimed: entitled(item, user) && !ownerOf(item, user), createdAt: item.createdAt };
  }
  function postSummary(post, user) {
    const comments = (post.comments || []).map(comment => ({ ...comment, author: accountById(comment.authorId) ? brief(accountById(comment.authorId)) : { id: '', username: 'Deleted account', avatarImage: '' }, canDelete: ownerOf(post, user) || comment.authorId === user?.id || moderator(user) }));
    return { id: post.id, authorId: post.authorId, author: brief(accountById(post.authorId)), html: sanitizePost(post.html), kind: post.kind, visibility: post.visibility, partyId: post.partyId, partyName: post.partyId ? circleFor(post.partyId)?.name || 'Party' : '', createdAt: post.createdAt, updatedAt: post.updatedAt, likeCount: post.likes.length, liked: Boolean(user && post.likes.includes(user.id)), commentCount: comments.length, comments, canManage: ownerOf(post, user), canInteract: Boolean(user), attachments: post.attachments.map(attachment => {
      if (attachment.mediaId) { const item = mediaById(attachment.mediaId); return item && activeOwner(item) ? { mediaId: item.id, ...mediaSummary(item,user) } : null; }
      const file = asset(attachment.assetId); return file ? { assetId: file.id, kind: file.kind, url: fileUrl(file.id), name: file.name } : null;
    }).filter(Boolean) };
  }
  function cfcSummary(card, user) {
    const unlocked = card.price === 0 || entitled(card, user);
    return { id: card.id, name: card.name, ownerId: card.ownerId, creator: brief(accountById(card.ownerId)), visibility: card.visibility, price: card.price, currency: 'USD', locked: !unlocked, previewUrl: fileUrl(unlocked ? card.previewId : card.lockedPreviewId), aspectRatio: card.aspectRatio, canManage: ownerOf(card,user), sharedWith: ownerOf(card,user) ? card.sharedWith : [], groupIds: ownerOf(card,user) ? card.groupIds : [], createdAt: card.createdAt };
  }
  async function commit(change) {
    const task = mutation.catch(() => {}).then(async () => {
      const before = structuredClone(state), created = [];
      createdKeys = created;
      try { const result = await change(); await save(); return result; }
      catch (error) { state = before; for (const key of created) await files.remove(key).catch(()=>{}); throw error; }
      finally { createdKeys = null; }
    });
    mutation = task; return task;
  }
  function ownAsset(id, user, kinds) {
    const item = asset(id);
    if (!item || item.ownerId !== user.id || kinds && !kinds.includes(item.kind)) throw fail('Choose a file uploaded by your account.');
    return item;
  }
  async function cleanupAssets(ids) {
    const unreferenced=unique(ids).filter(id=>!state.posts.some(post=>post.attachments.some(item=>item.assetId===id))&&!state.media.some(item=>item.assetId===id||item.previewId===id)&&!state.cfcs.some(card=>card.previewId===id||card.lockedPreviewId===id));
    if(!unreferenced.length)return;
    await commit(()=>{state.assets=state.assets.filter(item=>!unreferenced.includes(item.id));});
    for(const id of unreferenced)await files.remove(id).catch(error=>console.error('MEDIA CLEANUP ERROR:',error));
  }
  function postInput(input, user) {
    const visibility = ['public','friends','party','self'].includes(input.visibility) ? input.visibility : 'public';
    const partyId = visibility === 'party' ? text(input.partyId,100) : '';
    if (visibility === 'party' && (circleFor(partyId)?.kind !== 'party' || !circleMember(partyId,user))) throw fail('Choose a party you belong to.');
    const html = sanitizePost(input.html);
    const attachments = (Array.isArray(input.attachments) ? input.attachments : []).slice(0,8).map(item => {
      if (item.mediaId) { const media = mediaById(item.mediaId); if (!media || !activeOwner(media) || !accessibleMedia(media,user)) throw fail('You do not have access to that sticker or GIF.'); return { mediaId: media.id }; }
      return { assetId: ownAsset(item.assetId,user,['image','video','gif','sticker']).id };
    });
    if (!sanitizeHtml(html,{allowedTags:[],allowedAttributes:{}}).trim() && !attachments.length) throw fail('Write some text or add media to your post.');
    return { html, attachments, visibility, partyId, kind: input.kind === 'announcement' ? 'announcement' : 'post' };
  }
  async function thumbnail(id, user, blurred) {
    const original = ownAsset(id,user,['image','sticker','gif','cfc-preview']);
    const meta = await files.metadata(original.id);
    if (!meta || meta.size > 20 * 1024 * 1024) throw fail('Choose an image smaller than 20 MB for the preview.');
    const chunks = [];
    for await (const chunk of files.read(original.id,0,meta.size-1)) chunks.push(chunk);
    let image = sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000 }).rotate().resize({width: blurred ? 240 : 640, height: blurred ? 240 : 640, fit:'inside', withoutEnlargement:true});
    if (blurred) image = image.blur(18);
    const buffer = await image.webp({quality: blurred ? 35 : 75}).toBuffer();
    const stored = await files.save(Readable.from([buffer]), {size:buffer.length,maxBytes:4*1024*1024,name:'preview.webp',mime:'image/webp',ownerId:user.id});
    createdKeys?.push(stored.key);
    state.assets.push({ id:stored.key,ownerId:user.id,kind:'thumbnail',name:'preview.webp',createdAt:Date.now() });
    return stored.key;
  }
  function canReadAsset(file, user) {
    if (!file || !activeOwner(file)) return false;
    if (file.ownerId === user?.id) return true;
    if (state.media.some(item => activeOwner(item) && (item.previewId === file.id || item.assetId === file.id && accessibleMedia(item,user)))) return true;
    if (state.cfcs.some(card => visibleCfc(card,user) && (card.lockedPreviewId === file.id || card.previewId === file.id && (card.price === 0 || entitled(card,user))))) return true;
    return state.posts.some(post => visiblePost(post,user) && post.attachments.some(item => item.assetId === file.id));
  }
  async function upload(req, res, user, query) {
    const kind = query.get('kind'), mime = text(req.headers['content-type'],80).split(';')[0];
    const allowed = { image:['image/png','image/jpeg','image/webp','image/gif'],sticker:['image/png','image/jpeg','image/webp'],gif:['image/gif'],video:['video/mp4','video/webm'],'cfc-preview':['image/png','image/jpeg','image/webp'] };
    if (!allowed[kind]?.includes(mime)) throw fail('Choose a PNG, JPEG, WebP, GIF, MP4, or WebM matching the selected upload type.');
    if (state.assets.filter(item => item.ownerId === user.id).length >= 1000) throw fail('Your account has reached its upload limit.');
    const size = Number(req.headers['content-length']), maxBytes = kind === 'video' ? 100*1024*1024 : 20*1024*1024;
    const extension = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'}[mime];
    const name = text(query.get('name'),100).replace(/[^A-Za-z0-9._ -]/g,'_') || 'upload.'+extension;
    const stored = await files.save(req, {size,maxBytes,name,mime,ownerId:user.id,validate:buffer=>sniffMedia(mime,buffer)});
    let dimensions = {};
    if(mime.startsWith('image/')){
      try{const chunks=[];for await(const chunk of files.read(stored.key,0,size-1))chunks.push(chunk);const info=await sharp(Buffer.concat(chunks),{limitInputPixels:40_000_000}).metadata();if(!info.width||!info.height||info.width*info.height>40_000_000)throw new Error('Image dimensions are too large.');dimensions={width:info.width,height:info.pageHeight||info.height};}
      catch(error){await files.remove(stored.key).catch(()=>{});throw fail('This image is invalid or exceeds 40 megapixels.');}
    }
    let duplicate;
    try { await commit(() => { duplicate=state.assets.find(item=>item.ownerId===user.id&&item.kind===kind&&item.sha256===stored.sha256);if(!duplicate)state.assets.push({ id:stored.key,ownerId:user.id,kind,name,sha256:stored.sha256,...dimensions,createdAt:Date.now() }); }); }
    catch (error) { await files.remove(stored.key).catch(()=>{}); throw error; }
    if(duplicate)await files.remove(stored.key).catch(()=>{});
    const id=duplicate?.id||stored.key;
    send(res,201,{ assetId:id,kind,name,url:fileUrl(id),size });
  }
  async function handle(req, res, pathname) {
    if (!pathname.startsWith('/api/social/')) return false;
    const user = await getAccount(req), query = new URL(req.url,'http://localhost').searchParams;
    const method = req.method;
    const fileMatch = /^\/api\/social\/assets\/([a-f0-9-]{36})$/.exec(pathname);
    if (fileMatch && ['GET','HEAD'].includes(method)) {
      if (!canReadAsset(asset(fileMatch[1]),user)) throw fail('This media is private or unavailable.',403);
      await files.serve(req,res,fileMatch[1]); return true;
    }
    if (method === 'GET' && pathname === '/api/social/profile') {
      const ownerId = query.get('user') || user?.id, owner = accountById(ownerId);
      if (!owner) throw fail('Profile not found.',404);
      const own = owner.id === user?.id;
      send(res,200,{ owner:brief(owner),own,circles:own ? state.circles.filter(circle=>circle.members.includes(user.id)).map(circle=>({...circle,members:circle.members.map(id=>accountById(id)).filter(Boolean).map(brief),invited:circle.ownerId===user.id ? circle.invited : []})) : [],friends:own ? (owner.community?.friends||[]).map(accountById).filter(Boolean).map(brief) : [],invitations:own ? state.circles.filter(circle=>circle.invited.includes(user.id)).map(circle=>({id:circle.id,name:circle.name,kind:circle.kind})) : [],storage:own ? await files.status() : undefined }); return true;
    }
    if (method === 'GET' && pathname === '/api/social/posts') {
      const ownerId = query.get('user') || user?.id;
      if (!accountById(ownerId)) throw fail('Profile not found.',404);
      const all = state.posts.filter(post=>post.authorId===ownerId && visiblePost(post,user)).sort((a,b)=>b.createdAt-a.createdAt || b.id.localeCompare(a.id));
      const after = query.get('after'), index = after ? all.findIndex(post=>post.id===after)+1 : 0;
      const posts = all.slice(index,index+15);
      send(res,200,{posts:posts.map(post=>postSummary(post,user)),nextCursor:index+15<all.length ? posts.at(-1)?.id : null}); return true;
    }
    const postMatch = /^\/api\/social\/posts\/([a-f0-9-]{36})(?:\/(like|comments)(?:\/([a-f0-9-]{36}))?)?$/.exec(pathname);
    if (postMatch && method === 'GET') {
      const post = postById(postMatch[1]);
      if (!post || !visiblePost(post,user)) throw fail('This post is unavailable or its audience does not include you.',403);
      send(res,200,{post:postSummary(post,user)}); return true;
    }
    if (method === 'GET' && pathname === '/api/social/media') {
      const ownerId = query.get('user') || user?.id, kind = query.get('kind') === 'gif' ? 'gif' : 'sticker';
      const all = state.media.filter(item=>item.ownerId===ownerId && item.kind===kind && activeOwner(item)).sort((a,b)=>b.createdAt-a.createdAt);
      send(res,200,{items:all.map(item=>mediaSummary(item,user))}); return true;
    }
    const mediaMatch = /^\/api\/social\/media\/([a-f0-9-]{36})(?:\/(claim))?$/.exec(pathname);
    if (mediaMatch && method === 'GET') {
      const item = mediaById(mediaMatch[1]); if (!item || !activeOwner(item)) throw fail('This item is unavailable.',404);
      send(res,200,{item:mediaSummary(item,user)}); return true;
    }
    if (method === 'GET' && pathname === '/api/social/cfcs') {
      const ownerId = query.get('user') || user?.id, own = ownerId===user?.id, category = query.get('category') || 'mine';
      if (!own && category !== 'mine') throw fail('Other members’ private collections are not accessible.',403);
      let cards = state.cfcs.filter(card=>activeOwner(card) && (category==='shared' ? card.sharedWith.includes(user.id) && card.ownerId!==user.id : category==='groups' ? card.groupIds.some(id=>circleMember(id,user)) && card.ownerId!==user.id : card.ownerId===ownerId && (own || card.visibility==='public')));
      cards = cards.filter(card=>visibleCfc(card,user));
      const owner = accountById(ownerId), current = category==='mine' && owner && (own || owner.profile.friendCard?.published) && owner.profile.primaryRole==='member' && owner.role!=='owner' ? {id:'current-'+owner.id,name:owner.profile.friendCard?.design?.name || 'Current Friend-Card',current:true,creator:brief(owner),member:{...brief(owner),friendCard:cleanFriendCard(owner.profile.friendCard,owner.id)},canManage:own,price:0,locked:false} : null;
      send(res,200,{cards:[...(current?[current]:[]),...cards.map(card=>cfcSummary(card,user))]}); return true;
    }
    const cfcMatch = /^\/api\/social\/cfcs\/([a-f0-9-]{36})$/.exec(pathname);
    if (cfcMatch && method==='GET') {
      const card=cfcById(cfcMatch[1]); if (!card || !visibleCfc(card,user)) throw fail('This CFC is private or unavailable.',403);
      send(res,200,{card:cfcSummary(card,user)}); return true;
    }
    if (!user) throw fail('Log in to create or manage community content.',401);
    if (pathname==='/api/social/uploads' && method==='POST') { await upload(req,res,user,query); return true; }
    if (pathname==='/api/social/posts' && method==='POST') {
      const input=await readBody(req), values=postInput(input,user);
      if (state.posts.filter(post=>post.authorId===user.id).length>=1000) throw fail('You have reached the post limit.');
      const nonce=text(input.clientId,100), duplicate=nonce && state.posts.find(post=>post.authorId===user.id&&post.clientId===nonce);
      if (duplicate) { send(res,200,{post:postSummary(duplicate,user)}); return true; }
      const post={id:crypto.randomUUID(),authorId:user.id,...values,clientId:nonce,createdAt:Date.now(),updatedAt:0,likes:[],comments:[]};
      await commit(()=>state.posts.push(post)); send(res,201,{post:postSummary(post,user)}); return true;
    }
    if (postMatch) {
      const post=postById(postMatch[1]); if (!post || !visiblePost(post,user)) throw fail('This post is unavailable or restricted.',403);
      if (!postMatch[2] && method==='PUT') {
        if (!ownerOf(post,user)) throw fail('Only the author can edit this post.',403);
        const values=postInput(await readBody(req),user); await commit(()=>Object.assign(post,values,{updatedAt:Date.now()})); send(res,200,{post:postSummary(post,user)}); return true;
      }
      if (!postMatch[2] && method==='DELETE') {
        if (!ownerOf(post,user)) throw fail('Only the author can delete this post.',403);
        await commit(()=>{state.posts=state.posts.filter(item=>item.id!==post.id);}); await cleanupAssets(post.attachments.map(item=>item.assetId)); send(res,200,{message:'Post deleted.'}); return true;
      }
      if (postMatch[2]==='like' && method==='POST') {
        await commit(()=>{ post.likes=post.likes.includes(user.id) ? post.likes.filter(id=>id!==user.id) : [...post.likes,user.id]; }); send(res,200,{post:postSummary(post,user)}); return true;
      }
      if (postMatch[2]==='comments' && method==='POST') {
        const body=text((await readBody(req)).text,2000); if(!body)throw fail('Write a comment.'); if(post.comments.length>=500)throw fail('This post has reached its comment limit.');
        await commit(()=>post.comments.push({id:crypto.randomUUID(),authorId:user.id,text:body,createdAt:Date.now()})); send(res,201,{post:postSummary(post,user)}); return true;
      }
      if (postMatch[2]==='comments' && postMatch[3] && method==='DELETE') {
        const comment=post.comments.find(item=>item.id===postMatch[3]); if(!comment)throw fail('Comment not found.',404);
        if(comment.authorId!==user.id&&!ownerOf(post,user)&&!moderator(user))throw fail('You cannot delete this comment.',403);
        await commit(()=>{post.comments=post.comments.filter(item=>item.id!==comment.id);}); send(res,200,{post:postSummary(post,user)}); return true;
      }
    }
    if (pathname==='/api/social/media' && method==='POST' || mediaMatch && method==='PUT') {
      const input=await readBody(req), existing=mediaMatch?mediaById(mediaMatch[1]):null;
      if(!existing && !mediaMatch){const duplicate=state.media.find(item=>item.ownerId===user.id&&item.assetId===input.assetId);if(duplicate){
        if(input.announce===true&&!duplicate.announcementId)await commit(()=>{if(duplicate.announcementId)return;const post={id:crypto.randomUUID(),authorId:user.id,html:'<p>'+sanitizeHtml('Released: '+duplicate.name,{allowedTags:[],allowedAttributes:{}})+'</p>',kind:'announcement',visibility:'public',partyId:'',attachments:[{mediaId:duplicate.id}],createdAt:Date.now(),updatedAt:0,likes:[],comments:[]};state.posts.push(post);duplicate.announcementId=post.id;});
        send(res,200,{item:mediaSummary(duplicate,user),announcementId:duplicate.announcementId});return true;
      }}
      if (mediaMatch && (!existing||!ownerOf(existing,user)))throw fail('Only the creator can edit this item.',403);
      const kind=existing?.kind || input.kind; if(!['sticker','gif'].includes(kind))throw fail('Choose a sticker or GIF.');
      const original=ownAsset(input.assetId||existing?.assetId,user,[kind]);
      const name=text(input.name,100); if(!name)throw fail('Give your upload a name.');
      const classification=input.classification==='store'?'store':'free';
      const price=classification==='store'?Math.round(Math.max(0,Math.min(10000,Number(input.price)||0))*100)/100:0;
      let item;
      await commit(async()=>{
        const concurrent=!existing&&state.media.find(entry=>entry.ownerId===user.id&&entry.assetId===original.id);
        if(concurrent)item=concurrent;
        else {
          const previewId=existing?.assetId===original.id&&existing?.price===price?existing.previewId:await thumbnail(original.id,user,price>0);
          item={id:existing?.id||crypto.randomUUID(),ownerId:user.id,kind,assetId:original.id,previewId,name,classification,price,collection:text(input.collection,100),createdAt:existing?.createdAt||Date.now(),announcementId:existing?.announcementId||''};
          if(existing)Object.assign(existing,item);else state.media.push(item);
        }
        if(input.announce===true&&!item.announcementId){
          const post={id:crypto.randomUUID(),authorId:user.id,html:'<p>'+sanitizeHtml('Released: '+name,{allowedTags:[],allowedAttributes:{}})+'</p>',kind:'announcement',visibility:'public',partyId:'',attachments:[{mediaId:item.id}],createdAt:Date.now(),updatedAt:0,likes:[],comments:[]};
          state.posts.push(post);item.announcementId=post.id;if(existing)existing.announcementId=post.id;
        }
      });
      send(res,existing?200:201,{item:mediaSummary(item,user),announcementId:item.announcementId});return true;
    }
    if(mediaMatch&&method==='DELETE'){
      const item=mediaById(mediaMatch[1]);if(!item||!ownerOf(item,user))throw fail('Only the creator can delete this item.',403);
      await commit(()=>{state.media=state.media.filter(entry=>entry.id!==item.id);state.claims=state.claims.filter(entry=>entry.itemId!==item.id);});await cleanupAssets([item.assetId,item.previewId]);send(res,200,{message:'Gallery item removed.'});return true;
    }
    if(mediaMatch?.[2]==='claim'&&method==='POST'){
      const item=mediaById(mediaMatch[1]);if(!item||!activeOwner(item))throw fail('Item not found.',404);if(item.price>0)throw fail('Paid checkout is not configured. This item cannot be purchased yet.',409);
      await commit(()=>{if(!state.claims.some(entry=>entry.itemId===item.id&&entry.userId===user.id))state.claims.push({itemId:item.id,userId:user.id});});send(res,200,{item:mediaSummary(item,user)});return true;
    }
    if(pathname==='/api/social/cfcs'&&method==='POST'||cfcMatch&&method==='PUT'){
      const input=await readBody(req),existing=cfcMatch?cfcById(cfcMatch[1]):null;
      if(cfcMatch&&(!existing||!ownerOf(existing,user)))throw fail('Only the creator can manage this CFC.',403);
      if(!existing&&(user.role==='owner'||user.profile.primaryRole!=='member'))throw fail('Create a Member Friend-Card before saving a CFC to your collection.',403);
      const preview=ownAsset(input.previewAssetId||existing?.previewId,user,['cfc-preview']);
      const name=text(input.name,100);if(!name)throw fail('Give your CFC a name.');
      const sharedWith=unique(input.sharedWith).filter(id=>friends(user,accountById(id))).slice(0,100);
      const groupIds=unique(input.groupIds);if(groupIds.some(id=>circleFor(id)?.kind!=='group'||!circleMember(id,user)))throw fail('Only joined groups may receive this CFC.');
      const price=Math.round(Math.max(0,Math.min(10000,Number(input.price)||0))*100)/100;
      let card;
      await commit(async()=>{
        card={id:existing?.id||crypto.randomUUID(),ownerId:user.id,name,price,visibility:input.visibility==='public'?'public':'private',sharedWith,groupIds,previewId:preview.id,lockedPreviewId:existing?.previewId===preview.id?existing.lockedPreviewId:await thumbnail(preview.id,user,true),aspectRatio:preview.width&&preview.height?preview.width+':'+preview.height:existing?.aspectRatio||user.profile.friendCard?.aspectRatio||'1:1',createdAt:existing?.createdAt||Date.now()};
        if(existing)Object.assign(existing,card);else state.cfcs.push(card);
      });send(res,existing?200:201,{card:cfcSummary(card,user)});return true;
    }
    if(cfcMatch&&method==='DELETE'){
      const card=cfcById(cfcMatch[1]);if(!card||!ownerOf(card,user))throw fail('Only the creator can remove this CFC.',403);
      await commit(()=>{state.cfcs=state.cfcs.filter(item=>item.id!==card.id);});await cleanupAssets([card.previewId,card.lockedPreviewId]);send(res,200,{message:'CFC removed.'});return true;
    }
    if(pathname==='/api/social/circles'&&method==='POST'){
      const input=await readBody(req),name=text(input.name,80);if(!name)throw fail('Give the party or group a name.');
      if(state.circles.filter(circle=>circle.ownerId===user.id).length>=30)throw fail('Your account has reached its party and group limit.');
      const circle={id:crypto.randomUUID(),kind:input.kind==='group'?'group':'party',name,ownerId:user.id,members:[user.id],invited:[],createdAt:Date.now()};
      await commit(()=>state.circles.push(circle));send(res,201,{circle});return true;
    }
    const circleMatch=/^\/api\/social\/circles\/([a-f0-9-]{36})\/(invite|respond|leave|remove)$/.exec(pathname);
    if(circleMatch&&method==='POST'){
      const circle=circleFor(circleMatch[1]);if(!circle)throw fail('Party or group not found.',404);const input=await readBody(req),action=circleMatch[2];
      await commit(()=>{
        if(action==='invite'){
          if(circle.ownerId!==user.id)throw fail('Only the creator can invite members.',403);
          const target=accountById(input.userId);if(!friends(user,target))throw fail('Choose an accepted friend.');
          if(!circle.members.includes(target.id)&&!circle.invited.includes(target.id))circle.invited.push(target.id);
        }else if(action==='respond'){
          if(!circle.invited.includes(user.id))throw fail('You do not have an invitation.',403);
          circle.invited=circle.invited.filter(id=>id!==user.id);if(input.accept===true)circle.members=unique([...circle.members,user.id]);
        }else if(action==='remove'){
          if(circle.ownerId!==user.id||input.userId===user.id)throw fail('Only the creator can remove other members.',403);
          circle.members=circle.members.filter(id=>id!==input.userId);circle.invited=circle.invited.filter(id=>id!==input.userId);
        }else{
          if(!circle.members.includes(user.id))throw fail('You do not belong to this circle.',403);
          if(circle.ownerId===user.id)state.circles=state.circles.filter(item=>item.id!==circle.id);else circle.members=circle.members.filter(id=>id!==user.id);
        }
      });send(res,200,{message:'Membership updated.'});return true;
    }
    throw fail('Unknown community action.',404);
  }
  return { handle, snapshot:()=>state, load(value) { const result=emptyState();for(const key of ['posts','media','assets','cfcs','circles','claims'])result[key]=Array.isArray(value?.[key])?value[key]:[];state=result; }, async removeAccount(id) {
    const owned=state.assets.filter(item=>item.ownerId===id).map(item=>item.id);
    await commit(()=>{
      state.posts=state.posts.filter(item=>item.authorId!==id).map(post=>({...post,likes:post.likes.filter(value=>value!==id),comments:post.comments.filter(comment=>comment.authorId!==id)}));
      state.media=state.media.filter(item=>item.ownerId!==id);state.cfcs=state.cfcs.filter(item=>item.ownerId!==id);state.assets=state.assets.filter(item=>item.ownerId!==id);state.claims=state.claims.filter(item=>item.userId!==id);
      state.circles=state.circles.filter(item=>item.ownerId!==id).map(item=>({...item,members:item.members.filter(value=>value!==id),invited:item.invited.filter(value=>value!==id)}));
    });for(const key of owned)await files.remove(key).catch(error=>console.error('ACCOUNT MEDIA DELETE ERROR:',error));
  } };
}

module.exports={createSocialSystem,sanitizePost,sniffMedia};
