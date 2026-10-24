'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const CHUNK_SIZE = 1024 * 1024;
const validKey = key => /^[a-f0-9-]{36}$/.test(String(key));
const failure = (message, status = 400) => Object.assign(new Error(message), { status });

function rangeFor(header, size) {
  if (!header) return { start: 0, end: size - 1, status: 200 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match || (!match[1] && !match[2])) throw failure('Invalid download range.', 416);
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size || (!match[1] && Number(match[2]) <= 0)) throw failure('Invalid download range.', 416);
  return { start, end, status: 206 };
}
function makeObjectKey(prefix, id) {
  const parts = String(prefix || '').split('/').filter(Boolean);
  if (parts.some(part => part === '.' || part === '..' || !/^[A-Za-z0-9._-]{1,80}$/.test(part))) throw failure('The upload location is invalid.');
  return 'images/' + (parts.length ? parts.join('/') + '/' : '') + id;
}

function createFileStorage({ getPool, dataDir, s3ClientFactory, signGetUrl } = {}) {
  const configured = process.env.SOLARIS_UPLOAD_DIR;
  const directory = path.resolve(configured || path.join(dataDir, 'uploads'));
  const s3cfg = {
    endpoint: String(process.env.AWS_ENDPOINT_URL_S3 || '').trim(),
    region: String(process.env.AWS_REGION || '').trim(),
    accessKeyId: String(process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
    bucket: String(process.env.NEON_STORAGE_BUCKET || '').trim()
  };
  const anyS3 = Object.values(s3cfg).some(Boolean), allS3 = Object.values(s3cfg).every(Boolean);
  let mode = '', pool, setupPromise, s3;
  async function initialize() {
    pool = getPool();
    if (anyS3 && !allS3) throw failure('Neon Object Storage settings are incomplete. Configure endpoint, region, access key, secret key, and bucket.', 503);
    if (allS3 && !pool) throw failure('Neon Object Storage uploads need DATABASE_URL so file metadata remains persistent.', 503);
    if (pool && (!configured || allS3)) {
      await pool.query('CREATE TABLE IF NOT EXISTS solaris_files (id UUID PRIMARY KEY, metadata JSONB NOT NULL, ready BOOLEAN NOT NULL DEFAULT FALSE)');
      await pool.query('CREATE TABLE IF NOT EXISTS solaris_file_chunks (file_id UUID NOT NULL REFERENCES solaris_files(id) ON DELETE CASCADE, part INTEGER NOT NULL, data BYTEA NOT NULL, PRIMARY KEY(file_id, part))');
      mode = allS3 ? 's3' : 'postgres';
      if (allS3) {
        const options = { endpoint: s3cfg.endpoint, region: s3cfg.region, credentials: { accessKeyId: s3cfg.accessKeyId, secretAccessKey: s3cfg.secretAccessKey }, forcePathStyle: true };
        s3 = s3ClientFactory ? s3ClientFactory(options) : new S3Client(options);
      }
      await pool.query("DELETE FROM solaris_files WHERE NOT ready AND (metadata->>'createdAt')::bigint < $1", [Date.now() - 24 * 60 * 60 * 1000]);
    } else {
      if ((process.env.RENDER || process.env.NODE_ENV === 'production') && !configured) throw failure('Persistent uploads need Neon Object Storage, DATABASE_URL, or SOLARIS_UPLOAD_DIR on an attached persistent disk.', 503);
      if ((process.env.RENDER || process.env.NODE_ENV === 'production') && !pool && !process.env.SOLARIS_DATA_DIR) throw failure('Persist file metadata too: configure DATABASE_URL, or SOLARIS_DATA_DIR on the attached disk.', 503);
      await fsp.mkdir(directory, { recursive: true, mode: 0o700 });
      if (process.env.RENDER) {
        const real = await fsp.realpath(directory);
        const mounts = (await fsp.readFile('/proc/mounts', 'utf8')).split('\n').map(line => line.split(' ')[1]?.replace(/\\040/g, ' ')).filter(Boolean);
        if (!mounts.some(mount => mount !== '/' && (real === mount || real.startsWith(mount + '/')) && !['/etc','/dev','/proc','/sys'].some(prefix => mount === prefix || mount.startsWith(prefix + '/')))) throw failure('SOLARIS_UPLOAD_DIR must be inside a mounted Render persistent disk, or use Neon Object Storage.', 503);
        if (!pool) {
          const metadataDirectory = await fsp.realpath(dataDir);
          if (!mounts.some(mount => mount !== '/' && (metadataDirectory === mount || metadataDirectory.startsWith(mount + '/')) && !['/etc','/dev','/proc','/sys'].some(prefix => mount === prefix || mount.startsWith(prefix + '/')))) throw failure('SOLARIS_DATA_DIR must be inside a persistent disk too, or use DATABASE_URL for metadata.', 503);
        }
      }
      mode = 'disk';
      for (const name of await fsp.readdir(directory)) {
        if (!/^[a-f0-9-]{36}\.partial$/.test(name)) continue;
        const target = path.join(directory, name), stat = await fsp.stat(target);
        if (Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) await fsp.unlink(target).catch(() => {});
      }
    }
  }
  async function ready() {
    if (!setupPromise) setupPromise = initialize().catch(error => { setupPromise = null; throw error; });
    await setupPromise;
  }
  async function remove(key) {
    if (!validKey(key)) return;
    await ready();
    if (pool && (mode === 'postgres' || mode === 's3')) {
      const result = await pool.query('SELECT metadata FROM solaris_files WHERE id=$1', [key]);
      const item = result.rows[0]?.metadata;
      if (item?.storageBackend === 'neon-s3') {
        if (!s3) throw failure('Neon Object Storage credentials are required to remove this stored file.', 503);
        await s3.send(new DeleteObjectCommand({ Bucket: s3cfg.bucket, Key: item.objectKey }));
      }
      if (result.rows[0]) { await pool.query('DELETE FROM solaris_files WHERE id=$1', [key]); return; }
    }
    await Promise.all(['.bin','.json','.partial'].map(ext => fsp.unlink(path.join(directory,key+ext)).catch(error => { if (error.code !== 'ENOENT') throw error; })));
  }
  async function save(source, { size, maxBytes, name, mime, ownerId, recipientId, prefix = '', validate }) {
    await ready();
    if (!Number.isSafeInteger(size) || size < 1 || size > maxBytes) throw failure('The uploaded file exceeds the allowed size.', 413);
    const key = crypto.randomUUID(), storagePath = makeObjectKey(prefix,key), hash = crypto.createHash('sha256');
    let received=0, first=Buffer.alloc(0), part=0, pending=Buffer.alloc(0);
    const metadata = { key,size,name,mime,ownerId,createdAt:Date.now(),storagePath,...(recipientId?{recipientId}:{}),...(mode==='s3'?{storageBackend:'neon-s3',objectKey:storagePath}:{}) };
    if (mode==='postgres'||mode==='s3') await pool.query('INSERT INTO solaris_files(id,metadata) VALUES($1,$2::jsonb)',[key,JSON.stringify(metadata)]);
    try {
      const meter=new Transform({ transform(chunk,encoding,callback) {
        received+=chunk.length;
        if(received>maxBytes||received>size)return callback(failure('The upload size does not match the file.',413));
        if(first.length<512)first=Buffer.concat([first,chunk.subarray(0,512-first.length)]);
        hash.update(chunk);callback(null,chunk);
      }});
      if(mode==='disk') await pipeline(source,meter,fs.createWriteStream(path.join(directory,key+'.partial'),{flags:'wx',mode:0o600}));
      else if(mode==='s3') {
        source.on('error',error=>meter.destroy(error));source.pipe(meter);
        await s3.send(new PutObjectCommand({Bucket:s3cfg.bucket,Key:storagePath,Body:meter,ContentLength:size,ContentType:mime||'application/octet-stream',CacheControl:'private, no-store',Metadata:{fileId:key}}));
      } else {
        source.on('error',error=>meter.destroy(error));source.pipe(meter);
        for await(const chunk of meter) {
          pending=Buffer.concat([pending,chunk]);
          while(pending.length>=CHUNK_SIZE){await pool.query('INSERT INTO solaris_file_chunks(file_id,part,data) VALUES($1,$2,$3)',[key,part++,pending.subarray(0,CHUNK_SIZE)]);pending=pending.subarray(CHUNK_SIZE);}
        }
        if(pending.length)await pool.query('INSERT INTO solaris_file_chunks(file_id,part,data) VALUES($1,$2,$3)',[key,part,pending]);
      }
      if(received!==size)throw failure('The upload was incomplete. Please try again.');
      if(validate&&!validate(first))throw failure('The file contents do not match its selected format.');
      metadata.sha256=hash.digest('hex');
      if(mode==='postgres'||mode==='s3')await pool.query('UPDATE solaris_files SET metadata=$2::jsonb,ready=TRUE WHERE id=$1',[key,JSON.stringify(metadata)]);
      else { await fsp.rename(path.join(directory,key+'.partial'),path.join(directory,key+'.bin'));await fsp.writeFile(path.join(directory,key+'.json'),JSON.stringify(metadata),{flag:'wx',mode:0o600}); }
      return metadata;
    } catch(error) {
      if(!source.readableEnded){source.unpipe?.();source.resume?.();}
      await remove(key).catch(()=>{});throw error;
    }
  }
  async function metadata(key) {
    if(!validKey(key))return null;
    await ready();
    if((mode==='postgres'||mode==='s3')&&pool){const result=await pool.query('SELECT metadata FROM solaris_files WHERE id=$1 AND ready',[key]);if(result.rows[0]?.metadata)return result.rows[0].metadata;}
    try{const value=JSON.parse(await fsp.readFile(path.join(directory,key+'.json'),'utf8'));return{...value,storageBackend:value.storageBackend||'disk'};}
    catch(error){if(error.code==='ENOENT')return null;throw error;}
  }
  function read(key,start,end,item) {
    if(!validKey(key))throw failure('File not found.',404);
    return Readable.from((async function*(){
      item=item||await metadata(key);
      if(item?.storageBackend==='neon-s3'){
        if(!s3)throw failure('Neon Object Storage credentials are missing for this file.',503);
        const result=await s3.send(new GetObjectCommand({Bucket:s3cfg.bucket,Key:item.objectKey,Range:'bytes='+start+'-'+end}));
        if(!result.Body)throw failure('The stored file is incomplete.',503);
        for await(const chunk of result.Body)yield chunk;return;
      }
      if(item.storageBackend==='disk'||mode==='disk'){const stream=fs.createReadStream(path.join(directory,key+'.bin'),{start,end});for await(const chunk of stream)yield chunk;return;}
      for(let part=Math.floor(start/CHUNK_SIZE);part<=Math.floor(end/CHUNK_SIZE);part++){
        const data=(await pool.query('SELECT data FROM solaris_file_chunks WHERE file_id=$1 AND part=$2',[key,part])).rows[0]?.data;
        if(!data)throw failure('The stored file is incomplete.',503);
        yield data.subarray(Math.max(0,start-part*CHUNK_SIZE),Math.min(data.length,end-part*CHUNK_SIZE+1));
      }
    })());
  }
  async function serve(req,res,key,{attachment=false}={}) {
    const item=await metadata(key);if(!item)throw failure('This file is no longer available.',404);
    let range;
    try{range=rangeFor(req.headers.range,item.size);}
    catch(error){res.writeHead(416,{'Content-Range':'bytes */'+item.size,'Cache-Control':'no-store'});res.end();return;}
    if(item.storageBackend==='neon-s3'&&attachment&&req.method==='GET'&&!req.headers.range){
      if(!s3)throw failure('Neon Object Storage credentials are missing for this file.',503);
      const disposition=(attachment?'attachment':'inline')+'; filename="'+item.name.replace(/[^A-Za-z0-9._ -]/g,'_')+'"';
      const command=new GetObjectCommand({Bucket:s3cfg.bucket,Key:item.objectKey,ResponseContentType:item.mime||'application/octet-stream',ResponseContentDisposition:disposition,ResponseCacheControl:'private, no-store'});
      const url=signGetUrl?await signGetUrl(s3,command,{expiresIn:300}):await getSignedUrl(s3,command,{expiresIn:300});
      res.writeHead(302,{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return;
    }
    const headers={'Content-Type':item.mime,'Content-Length':String(range.end-range.start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':(attachment?'attachment':'inline')+'; filename="'+item.name.replace(/[^A-Za-z0-9._ -]/g,'_')+'"'};
    if(range.status===206)headers['Content-Range']='bytes '+range.start+'-'+range.end+'/'+item.size;
    res.writeHead(range.status,headers);if(req.method==='HEAD'){res.end();return;}
    const stream=read(key,range.start,range.end,item);res.on('close',()=>stream.destroy());
    try{await pipeline(stream,res);}catch(error){if(!req.destroyed&&error.code!=='ERR_STREAM_PREMATURE_CLOSE')console.error('FILE DOWNLOAD ERROR:',error);}
  }
  async function prune(retainedKeys) {
    await ready();const retained=new Set(retainedKeys.filter(validKey)),cutoff=Date.now()-24*60*60*1000;
    if(mode==='postgres')await pool.query("DELETE FROM solaris_files WHERE NOT (id = ANY($1::uuid[])) AND (metadata->>'createdAt')::bigint < $2",[[...retained],cutoff]);
    else if(mode==='s3'){
      const result=await pool.query("SELECT id FROM solaris_files WHERE NOT (id = ANY($1::uuid[])) AND (metadata->>'createdAt')::bigint < $2",[[...retained],cutoff]);
      for(const row of result.rows)await remove(row.id);
    }else{
      for(const name of await fsp.readdir(directory)){
        if(!/^[a-f0-9-]{36}\.json$/.test(name)||retained.has(name.slice(0,-5)))continue;
        const item=await metadata(name.slice(0,-5));if(item&&item.createdAt<cutoff)await remove(item.key);
      }
    }
  }
  return {ready,save,remove,metadata,read,serve,prune,async status(){try{await ready();return{available:true,backend:mode==='s3'?'neon-object-storage':mode};}catch(error){return{available:false,message:error.message};}}};
}

module.exports = { createFileStorage, rangeFor };
