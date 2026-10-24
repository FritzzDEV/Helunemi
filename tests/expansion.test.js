'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const crypto=require('node:crypto');
const sharp=require('sharp');
const {sanitizePost}=require('../social-system');
const {rangeFor,createFileStorage}=require('../file-storage');
let child,base,directory,env,logs='';
const password='TestOnlyPassword123';
const users={};
async function request(route,{user,method='GET',body,headers={},raw}={}){
  const response=await fetch(base+route,{method,headers:{...(user?{Cookie:user.cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):raw});
  const type=response.headers.get('content-type')||'';
  const data=type.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer());
  return {status:response.status,data,headers:response.headers};
}
async function ok(route,options,status=200){const response=await request(route,options);assert.equal(response.status,status,JSON.stringify(response.data));return response.data;}
async function start(){
  child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>logs+=data);child.stderr.on('data',data=>logs+=data);
  for(let attempt=0;attempt<80;attempt++){try{const response=await fetch(base+'/api/me');if(response.ok)return;}catch{}if(child.exitCode!==null)throw new Error(logs);await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Server did not start: '+logs);
}
async function stop(){if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}}
async function signup(key,name){const result=await request('/api/signup',{method:'POST',body:{username:name,password,profile:{username:name,bio:'Preserve this bio',installedGames:['Gamma Frost']}}});assert.equal(result.status,201,JSON.stringify(result.data));users[key]={...result.data.user,cookie:result.headers.get('set-cookie').split(';')[0]};return users[key];}
async function login(user){const result=await request('/api/login',{method:'POST',body:{username:user.username,password}});assert.equal(result.status,200);user.cookie=result.headers.get('set-cookie').split(';')[0];}
async function upload(user,kind,buffer,mime='image/png'){return ok('/api/social/uploads?kind='+kind+'&name=test.'+(mime==='image/gif'?'gif':'png'),{user,method:'POST',headers:{'Content-Type':mime},raw:buffer},201);}
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'solaris-expansion-'));
  const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
  env={...process.env};for(const key of Object.keys(env))if(/^(FIREBASE|DATABASE_URL|RENDER|SOLARIS)/.test(key))delete env[key];
  Object.assign(env,{PORT:String(port),NODE_ENV:'test',SOLARIS_DATA_DIR:directory,SOLARIS_OWNER_SETUP_TOKEN:'integration-test-owner-token'});base='http://127.0.0.1:'+port;await start();
  await signup('owner','Fritzz Xenon');await signup('alice','Alice Creator');await signup('bob','Bob Friend');await signup('stranger','Charlie Visitor');await signup('developer','Dev Tester');
  await ok('/api/owner/claim',{user:users.owner,method:'POST',body:{ownerSetupCode:env.SOLARIS_OWNER_SETUP_TOKEN}});
  await ok('/api/admin/account-roles',{user:users.owner,method:'PUT',body:{accountId:users.developer.id,primaryRole:'developer',secondaryRoles:['Tester']}});
  await ok('/api/community/friend-request',{user:users.alice,method:'POST',body:{recipientId:users.bob.id}});
  await ok('/api/community/friend-response',{user:users.bob,method:'POST',body:{requesterId:users.alice.id,accept:true}});
});
after(async()=>{await stop();await fs.rm(directory,{recursive:true,force:true});});

test('formatted post HTML strips scripts, event handlers, dangerous URLs and CSS',()=>{
  const output=sanitizePost('<script>alert(1)</script><img src=x onerror=alert(1)><p style="text-align:center;position:fixed">Hello <b>world</b></p><a href="javascript:alert(1)">link</a><a href="https://example.com">safe</a>');
  assert(!/script|onerror|position:|javascript:|<img/.test(output));assert.match(output,/<b>world<\/b>/);assert.match(output,/text-align:center/);assert.match(output,/rel="noopener noreferrer nofollow"/);
});
test('all post visibility levels are enforced on direct reads and interactions',async()=>{
  const party=(await ok('/api/social/circles',{user:users.alice,method:'POST',body:{name:'Test Party',kind:'party'}},201)).circle;
  await ok('/api/social/circles/'+party.id+'/invite',{user:users.alice,method:'POST',body:{userId:users.bob.id}});
  await ok('/api/social/circles/'+party.id+'/respond',{user:users.bob,method:'POST',body:{accept:true}});
  for(const visibility of ['public','friends','party','self']){
    const post=(await ok('/api/social/posts',{user:users.alice,method:'POST',body:{html:'<p>'+visibility+'</p>',visibility,partyId:party.id}},201)).post;
    for(const [viewer,allowed]of [[users.alice,true],[users.bob,visibility!=='self'],[users.stranger,visibility==='public'],[null,visibility==='public']])assert.equal((await request('/api/social/posts/'+post.id,{user:viewer})).status,allowed?200:403,visibility+' read');
    if(visibility!=='public')assert.equal((await request('/api/social/posts/'+post.id+'/like',{user:users.stranger,method:'POST',body:{}})).status,403);
  }
  assert.equal((await request('/api/social/circles/'+party.id+'/respond',{user:users.stranger,method:'POST',body:{accept:true}})).status,403);
});
test('post edits, idempotent publishing, likes, comments and deletion obey ownership',async()=>{
  const body={html:'<p>Before</p>',visibility:'public',clientId:crypto.randomUUID()};
  const post=(await ok('/api/social/posts',{user:users.alice,method:'POST',body},201)).post;
  assert.equal((await ok('/api/social/posts',{user:users.alice,method:'POST',body})).post.id,post.id);
  let result=await ok('/api/social/posts/'+post.id+'/like',{user:users.bob,method:'POST',body:{}});assert.equal(result.post.likeCount,1);
  result=await ok('/api/social/posts/'+post.id+'/like',{user:users.bob,method:'POST',body:{}});assert.equal(result.post.likeCount,0);
  const comment=(await ok('/api/social/posts/'+post.id+'/comments',{user:users.bob,method:'POST',body:{text:'A comment'}},201)).post.comments[0];
  assert.equal((await request('/api/social/posts/'+post.id+'/comments/'+comment.id,{user:users.stranger,method:'DELETE'})).status,403);
  await ok('/api/social/posts/'+post.id+'/comments/'+comment.id,{user:users.alice,method:'DELETE'});
  assert.equal((await request('/api/social/posts/'+post.id,{user:users.bob,method:'PUT',body:{html:'Hacked'}})).status,403);
  await ok('/api/social/posts/'+post.id,{user:users.alice,method:'PUT',body:{html:'<p>After</p>',visibility:'self'}});
  assert.equal((await request('/api/social/posts/'+post.id,{user:users.bob})).status,403);
  await ok('/api/social/posts/'+post.id,{user:users.alice,method:'DELETE'});
});
test('post attachments remain private and access is revoked on privacy changes',async()=>{
  const png=await sharp({create:{width:30,height:20,channels:4,background:'orange'}}).png().toBuffer();
  const file=await upload(users.alice,'image',png);
  assert.equal((await request(file.url,{user:users.bob})).status,403);
  assert.equal((await request('/api/social/posts',{user:users.bob,method:'POST',body:{html:'stolen',attachments:[{assetId:file.assetId}]} })).status,400);
  const post=(await ok('/api/social/posts',{user:users.alice,method:'POST',body:{html:'<p>Private image</p>',visibility:'friends',attachments:[{assetId:file.assetId}]}},201)).post;
  assert.equal((await request(file.url,{user:users.bob})).status,200);assert.equal((await request(file.url)).status,403);
  await ok('/api/social/posts/'+post.id,{user:users.alice,method:'PUT',body:{html:'<p>Now private</p>',visibility:'self',attachments:[{assetId:file.assetId}]}});
  assert.equal((await request(file.url,{user:users.bob})).status,403);
});
test('sticker/GIF upload is independent from announcements and paid originals are protected',async()=>{
  const png=await sharp({create:{width:80,height:80,channels:4,background:'red'}}).png().toBuffer();
  const before=(await ok('/api/social/posts?user='+users.alice.id,{user:users.alice})).posts.length;
  const file=await upload(users.alice,'sticker',png);
  const item=(await ok('/api/social/media',{user:users.alice,method:'POST',body:{kind:'sticker',assetId:file.assetId,name:'Paid star',classification:'store',price:3}},201)).item;
  assert.equal((await ok('/api/social/posts?user='+users.alice.id,{user:users.alice})).posts.length,before);
  const outsider=(await ok('/api/social/media/'+item.id,{user:users.bob})).item;assert.equal(outsider.locked,true);assert(!outsider.url);assert(!JSON.stringify(outsider).includes(file.assetId));
  assert.equal((await request(file.url,{user:users.bob})).status,403);assert.equal((await request(outsider.previewUrl,{user:users.bob})).status,200);
  assert.equal((await request('/api/social/media/'+item.id+'/claim',{user:users.bob,method:'POST',body:{}})).status,409);
  const gif=await sharp(png).gif().toBuffer(),gifFile=await upload(users.alice,'gif',gif,'image/gif');
  const announced=await ok('/api/social/media',{user:users.alice,method:'POST',body:{kind:'gif',assetId:gifFile.assetId,name:'Free GIF',classification:'free',announce:true}},201);assert(announced.announcementId);
  const repeated=await ok('/api/social/media',{user:users.alice,method:'POST',body:{kind:'gif',assetId:gifFile.assetId,name:'Free GIF',announce:true}});assert.equal(repeated.item.id,announced.item.id);
  await ok('/api/social/media/'+announced.item.id+'/claim',{user:users.bob,method:'POST',body:{}});
});
test('CFC categories, shared/group access, blurred paid previews and revocation work',async()=>{
  const png=await sharp({create:{width:100,height:150,channels:4,background:'purple'}}).png().toBuffer(),file=await upload(users.alice,'cfc-preview',png);
  const group=(await ok('/api/social/circles',{user:users.alice,method:'POST',body:{name:'CFC Group',kind:'group'}},201)).circle;
  await ok('/api/social/circles/'+group.id+'/invite',{user:users.alice,method:'POST',body:{userId:users.bob.id}});await ok('/api/social/circles/'+group.id+'/respond',{user:users.bob,method:'POST',body:{accept:true}});
  const card=(await ok('/api/social/cfcs',{user:users.alice,method:'POST',body:{name:'Paid CFC',previewAssetId:file.assetId,visibility:'public',price:5,groupIds:[group.id],sharedWith:[]}},201)).card;
  const stranger=(await ok('/api/social/cfcs/'+card.id,{user:users.stranger})).card;assert.equal(stranger.locked,true);assert.notEqual(stranger.previewUrl,file.url);assert(!JSON.stringify(stranger).includes(file.assetId));assert.equal((await request(file.url,{user:users.stranger})).status,403);
  assert.equal((await ok('/api/social/cfcs/'+card.id,{user:users.bob})).card.locked,false);
  assert((await ok('/api/social/cfcs?user='+users.bob.id+'&category=groups',{user:users.bob})).cards.some(item=>item.id===card.id));
  assert.equal((await request('/api/social/cfcs?user='+users.bob.id+'&category=groups',{user:users.stranger})).status,403);
  await ok('/api/social/circles/'+group.id+'/leave',{user:users.bob,method:'POST',body:{}});assert.equal((await ok('/api/social/cfcs/'+card.id,{user:users.bob})).card.locked,true);assert.equal((await request(file.url,{user:users.bob})).status,403);
  await ok('/api/social/cfcs/'+card.id,{user:users.alice,method:'PUT',body:{name:'Private CFC',visibility:'private',price:0,sharedWith:[users.bob.id],groupIds:[]}});
  assert.equal((await request('/api/social/cfcs/'+card.id,{user:users.stranger})).status,403);assert.equal((await request('/api/social/cfcs/'+card.id,{user:users.bob})).status,200);
});
test('game downloads use website storage, enforce roles and retain range support',async()=>{
  const payload=Buffer.concat([Buffer.from('PK\x03\x04'),Buffer.alloc(4096,42)]),buildId='build-'+crypto.randomUUID();
  const headers={'Content-Type':'application/octet-stream','X-Game-Id':'gamma-frost','X-Build-Id':buildId,'X-Game-Platform':'android','X-File-Name':'gamma.apk','X-Upload-Size':String(payload.length)};
  assert.equal((await request('/api/owner/game-build-upload',{user:users.alice,method:'POST',headers,raw:payload})).status,403);
  const file=await ok('/api/owner/game-build-upload',{user:users.developer,method:'POST',headers,raw:payload},201);assert(file.fileKey);assert(!file.storagePath);
  const build={id:'owner-game-build-'+crypto.randomUUID(),gameId:'gamma-frost',title:'Android test',platform:'android',supported:true,version:'v0.0.2',...file};
  await ok('/api/owner/game-builds',{user:users.developer,method:'PUT',body:{gameId:'gamma-frost',builds:[build]}});users.build=build;users.buildPayload=payload;
  const publicContent=await ok('/api/site-content');assert(!JSON.stringify(publicContent).includes(file.fileKey));
  assert.equal((await request('/api/game-build/'+build.id)).status,401);
  let response=await request('/api/game-build/'+build.id,{user:users.bob});assert.equal(response.status,200);assert.deepEqual(response.data,payload);assert.match(response.headers.get('content-disposition'),/attachment/);
  response=await request('/api/game-build/'+build.id,{user:users.bob,headers:{Range:'bytes=2-10'}});assert.equal(response.status,206);assert.deepEqual(response.data,payload.subarray(2,11));
  assert.equal((await request('/api/game-build/'+build.id,{user:users.bob,headers:{Range:'bytes=999999-'}})).status,416);
  assert.equal((await request('/api/owner/game-builds?gameId=gamma-frost',{user:users.alice})).status,403);
});
test('game/art/update management edits real seeded records and blocks forged edits',async()=>{
  const content=(await ok('/api/site-content')).content,game=content.games.find(item=>item.id==='gamma-frost');
  assert.equal((await request('/api/owner/site-content',{user:users.alice,method:'PUT',body:{section:'games',post:{...game,name:'Hacked'}}})).status,403);
  await ok('/api/owner/site-content',{user:users.developer,method:'PUT',body:{section:'games',post:{...game,name:'Gamma Frost Updated'}}});
  const art=content.arts[0];await ok('/api/owner/site-content',{user:users.owner,method:'PUT',body:{section:'arts',post:{...art,description:'New description'}}});
  const update=content.updates[0];await ok('/api/owner/site-content',{user:users.owner,method:'PUT',body:{section:'updates',post:{...update,title:'Updated studio news'}}});
  await ok('/api/owner/site-content',{user:users.owner,method:'PUT',body:{section:'arts',id:art.id,delete:true}});
});
test('invalid image uploads are rejected and identical uploads reuse their asset',async()=>{
  const invalid=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(30)]);
  assert.equal((await request('/api/social/uploads?kind=image&name=bad.png',{user:users.alice,method:'POST',headers:{'Content-Type':'image/png'},raw:invalid})).status,400);
  const image=await sharp({create:{width:13,height:17,channels:4,background:'green'}}).png().toBuffer();
  const first=await upload(users.alice,'image',image),second=await upload(users.alice,'image',image);assert.equal(first.assetId,second.assetId);
});
test('party removal revokes access immediately and post feeds paginate without repeated items',async()=>{
  const party=(await ok('/api/social/circles',{user:users.alice,method:'POST',body:{name:'Revocation Party',kind:'party'}},201)).circle;
  await ok('/api/social/circles/'+party.id+'/invite',{user:users.alice,method:'POST',body:{userId:users.bob.id}});await ok('/api/social/circles/'+party.id+'/respond',{user:users.bob,method:'POST',body:{accept:true}});
  const post=(await ok('/api/social/posts',{user:users.alice,method:'POST',body:{html:'<p>Party only</p>',visibility:'party',partyId:party.id}},201)).post;
  await ok('/api/social/posts/'+post.id,{user:users.bob});await ok('/api/social/circles/'+party.id+'/remove',{user:users.alice,method:'POST',body:{userId:users.bob.id}});
  assert.equal((await request('/api/social/posts/'+post.id,{user:users.bob})).status,403);
  for(let index=0;index<18;index++)await ok('/api/social/posts',{user:users.alice,method:'POST',body:{html:'<p>Page '+index+'</p>',visibility:'public'}},201);
  const first=await ok('/api/social/posts?user='+users.alice.id),second=await ok('/api/social/posts?user='+users.alice.id+'&after='+first.nextCursor);
  assert.equal(first.posts.length,15);assert(first.nextCursor);assert(second.posts.length>0);assert(!second.posts.some(item=>first.posts.some(post=>post.id===item.id)));
});
test('accounts, social records, files and seeded-content changes survive server restart',async()=>{
  await stop();await start();await login(users.bob);await login(users.alice);
  const response=await request('/api/game-build/'+users.build.id,{user:users.bob});assert.equal(response.status,200);assert.deepEqual(response.data,users.buildPayload);
  const content=(await ok('/api/site-content')).content;assert.equal(content.games.find(item=>item.id==='gamma-frost').name,'Gamma Frost Updated');assert(!content.arts.some(item=>item.id==='gamma-frost-icon'));assert(content.updates.some(item=>item.title==='Updated studio news'));
  assert((await ok('/api/social/posts?user='+users.alice.id,{user:users.alice})).posts.length>0);assert.equal((await ok('/api/me',{user:users.alice})).user.bio,'Preserve this bio');
  assert((await ok('/api/social/media?user='+users.alice.id+'&kind=gif')).items.length>0);
});
test('replacing and removing builds deletes obsolete stored files while URLs stay stable',async()=>{
  await login(users.developer);
  const previous=users.build,payload=Buffer.concat([Buffer.from('PK\x03\x04'),Buffer.alloc(100,19)]);
  const file=await ok('/api/owner/game-build-upload',{user:users.developer,method:'POST',headers:{'Content-Type':'application/octet-stream','X-Game-Id':'gamma-frost','X-Build-Id':'build-'+crypto.randomUUID(),'X-Game-Platform':'android','X-File-Name':'gamma-new.apk','X-Upload-Size':String(payload.length)},raw:payload},201);
  await ok('/api/owner/game-builds',{user:users.developer,method:'PUT',body:{gameId:'gamma-frost',builds:[{...previous,...file,version:'v0.0.3'}]}});
  const response=await request('/api/game-build/'+previous.id,{user:users.bob});assert.deepEqual(response.data,payload);
  await assert.rejects(fs.stat(path.join(directory,'uploads',previous.fileKey+'.bin')),{code:'ENOENT'});
  await ok('/api/owner/game-builds',{user:users.developer,method:'PUT',body:{gameId:'gamma-frost',builds:[]}});
  assert.equal((await request('/api/game-build/'+previous.id,{user:users.bob})).status,404);
  await assert.rejects(fs.stat(path.join(directory,'uploads',file.fileKey+'.bin')),{code:'ENOENT'});
});
test('range parser handles suffixes and rejects multiple/invalid ranges',()=>{
  assert.deepEqual(rangeFor('bytes=-5',10),{start:5,end:9,status:206});assert.throws(()=>rangeFor('bytes=0-1,4-5',10));assert.throws(()=>rangeFor('bytes=-0',10));
});
test('production storage refuses ephemeral local fallback without a disk or database',async()=>{
  const old=process.env.NODE_ENV,previous=process.env.SOLARIS_UPLOAD_DIR;process.env.NODE_ENV='production';delete process.env.SOLARIS_UPLOAD_DIR;
  try{const storage=createFileStorage({getPool:()=>null,dataDir:directory});const result=await storage.status();assert.equal(result.available,false);assert.match(result.message,/Persistent uploads/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;if(previous!==undefined)process.env.SOLARIS_UPLOAD_DIR=previous;}
});
