(() => {
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const tabs=[['general','General'],['posts','Posts'],['stickers','Stickers'],['gifs','GIFs'],['cfc','Custom Friend Card (CFC)']];
  let api, getUser, toast, cardMarkup, captureCard, mounted=null;
  const cache=new Map();
  const money=item=>item.price>0?new Intl.NumberFormat(undefined,{style:'currency',currency:item.currency||'USD'}).format(item.price):'Free';
  const avatar=user=>`<a href="account.html?user=${encodeURIComponent(user.id)}" class="social-avatar" aria-label="View ${escape(user.username)}’s profile">${user.avatarImage?`<img src="${escape(user.avatarImage)}" alt="">`:escape(user.username.slice(0,2).toUpperCase())}</a>`;
  const date=value=>`<time datetime="${new Date(value).toISOString()}">${escape(new Date(value).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}))}</time>`;
  const empty=message=>`<div class="social-empty"><span aria-hidden="true">✦</span><p>${escape(message)}</p></div>`;
  function options(actions,label='Options') {
    return `<div class="content-options"><button class="content-options-toggle" type="button" aria-label="${escape(label)}" aria-expanded="false" data-content-options>⋮</button><div class="content-options-menu" hidden>${actions}</div></div>`;
  }
  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url);toast('Link copied.'); }
    catch { const field=document.createElement('textarea');field.value=url;document.body.append(field);field.select();const success=document.execCommand('copy');field.remove();if(success)toast('Link copied.');else window.prompt('Copy this link:',url); }
  }
  function shareUrl(post) { return new URL(`account.html?user=${encodeURIComponent(post.authorId)}&tab=posts&post=${encodeURIComponent(post.id)}`,location.href).href; }
  function attachmentMarkup(item) {
    if (item.kind==='video')return `<video controls playsinline preload="metadata" src="${escape(item.url)}"></video>`;
    return `<figure class="social-post-image ${item.kind==='sticker'?'is-sticker':''}"><img src="${escape(item.url||item.previewUrl)}" alt="${escape(item.name||'Post attachment')}" loading="lazy">${item.locked?'<figcaption>🔒 '+escape(money(item))+' · Paid content</figcaption>':''}</figure>`;
  }
  function postMarkup(post) {
    cache.set(post.id,post);
    const controls=(post.canManage?`<button type="button" data-social-edit-post="${post.id}">Edit Post</button><button type="button" data-social-edit-post="${post.id}" data-focus-visibility>Change Visibility</button>`:'')+`<button type="button" data-social-share="${post.id}">Copy Link</button>`+(post.canManage?`<button class="is-danger" type="button" data-social-delete-post="${post.id}">Delete Post</button>`:'');
    return `<article class="social-post" id="post-${post.id}" data-post="${post.id}"><header>${avatar(post.author)}<div class="social-post-byline"><a href="account.html?user=${encodeURIComponent(post.authorId)}"><strong>${escape(post.author.username)}</strong></a><small>${date(post.createdAt)}${post.updatedAt?' · Edited':''}</small><span class="social-audience">${({public:'◎ Public',friends:'♧ Friends',party:'✦ Party',self:'🔒 Self'})[post.visibility]}${post.partyName?' · '+escape(post.partyName):''}${post.kind==='announcement'?' · Announcement':''}</span></div>${options(controls,'Post options')}</header><div class="social-rich-content">${post.html}</div>${post.attachments.length?`<div class="social-post-media">${post.attachments.map(attachmentMarkup).join('')}</div>`:''}<div class="social-post-actions"><button type="button" data-social-like="${post.id}" aria-pressed="${post.liked}" ${post.canInteract?'':'disabled'}>♡ <span>${post.likeCount}</span> Like</button><button type="button" data-social-comments="${post.id}" aria-expanded="false">☏ <span>${post.commentCount}</span> Comment</button><button type="button" data-social-share="${post.id}">↗ Share</button></div><section class="social-comments" data-comments="${post.id}" hidden><h3>Comments · ${post.commentCount}</h3>${post.comments.map(comment=>`<article class="social-comment">${avatar(comment.author)}<div><strong>${escape(comment.author.username)}</strong><p>${escape(comment.text)}</p><small>${date(comment.createdAt)}</small></div>${comment.canDelete?`<button class="text-link" type="button" data-social-delete-comment="${comment.id}" data-parent-post="${post.id}">Delete</button>`:''}</article>`).join('')}${post.canInteract?`<form data-comment-form="${post.id}" class="social-comment-form"><label class="visually-hidden" for="comment-${post.id}">Write a comment</label><textarea id="comment-${post.id}" name="text" rows="2" maxlength="2000" required placeholder="Write a comment…"></textarea><button class="btn btn-primary btn-sm" type="submit">Comment</button></form>`:'<p class="panel-help">Log in to comment or like.</p>'}</section></article>`;
  }
  function shell(content,title='',wide=false) {
    const dialog=document.createElement('dialog');dialog.className='social-dialog'+(wide?' social-dialog-wide':'');
    dialog.innerHTML=`<div class="social-dialog-head"><h2>${escape(title)}</h2><button class="icon-btn" type="button" data-social-close aria-label="Close">×</button></div><div class="social-dialog-body">${content}</div>`;
    document.body.append(dialog);dialog.showModal();dialog.addEventListener('click',event=>{if(event.target===dialog||event.target.closest('[data-social-close]'))dialog.close();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});return dialog;
  }
  function formError(form,error) { const message=$('[data-social-message]',form); if(message){message.textContent=error.message;message.classList.add('is-error');}else toast(error.message); }
  function formBusy(form,value){$$('button[type="submit"]',form).forEach(button=>button.disabled=value);}
  async function loadContext(ownerId){return api('/api/social/profile?user='+encodeURIComponent(ownerId));}
  async function renderPosts(panel,append=false) {
    const profile=mounted, id=profile.ownerId;
    if(!append){panel.innerHTML=`<div class="social-section-head"><div><h2>Posts</h2><p>Stories, creations, and news from ${escape(profile.user.username)}.</p></div>${profile.own?'<button class="btn btn-primary btn-sm" type="button" data-social-new-post>+ Create post</button>':''}</div><div data-social-feed aria-live="polite"><p class="social-loading">Loading posts…</p></div>`;}
    const feed=$('[data-social-feed]',panel);
    try{
      const query=new URLSearchParams(location.search),direct=query.get('post');
      if(direct&&!append){
        const result=await api('/api/social/posts/'+encodeURIComponent(direct));if(mounted!==profile)return;
        feed.innerHTML=postMarkup(result.post)+`<button type="button" class="btn btn-ghost btn-sm" data-social-all-posts>View all posts</button>`;return;
      }
      const result=await api('/api/social/posts?user='+encodeURIComponent(id)+(append?'&after='+encodeURIComponent(panel.dataset.cursor):''));if(mounted!==profile)return;
      if(append){$('[data-social-more]',panel)?.remove();feed.insertAdjacentHTML('beforeend',result.posts.map(postMarkup).join(''));}
      else feed.innerHTML=result.posts.length?result.posts.map(postMarkup).join(''):empty('No posts to show for this audience yet.');
      panel.dataset.cursor=result.nextCursor||'';if(result.nextCursor)feed.insertAdjacentHTML('beforeend','<button class="btn btn-ghost" type="button" data-social-more>Load more posts</button>');
    }catch(error){if(mounted===profile)feed.innerHTML=empty(error.message);}
  }
  async function uploadFile(file,kind,status) {
    if(!file)throw new Error('Choose a file first.');
    const limit=kind==='video'?100:20;if(file.size>limit*1024*1024)throw new Error(`Choose a file smaller than ${limit} MB.`);
    return new Promise((resolve,reject)=>{
      const request=new XMLHttpRequest();request.open('POST','/api/social/uploads?kind='+encodeURIComponent(kind)+'&name='+encodeURIComponent(file.name||'preview.png'));request.setRequestHeader('Content-Type',file.type||'application/octet-stream');
      request.upload.onprogress=event=>{if(event.lengthComputable&&status)status.textContent='Uploading · '+Math.round(event.loaded/event.total*100)+'%';};
      request.onerror=()=>reject(new Error('The upload connection stopped. Please try again.'));
      request.onload=()=>{let result={};try{result=JSON.parse(request.responseText);}catch{}if(request.status>=200&&request.status<300)resolve(result);else reject(new Error(result.error||'The file could not be uploaded.'));};request.send(file);
    });
  }
  let activePostEditor = null;
  function openPostPage(existing = null, feature = null, focusVisibility = false) {
    const query = new URLSearchParams();
    if (existing) query.set('edit', existing.id);
    if (feature) query.set('media', feature.id);
    if (focusVisibility) query.set('focus', 'visibility');
    location.assign('create-post.html' + (query.size ? '?' + query : ''));
  }
  async function mountPostPage(root) {
    const user = getUser();
    if (!user) { root.innerHTML = '<div class="wrap"><div class="page-head"><h1>Create a post</h1><p>Log in to write a post for the Helunemi community.</p><a class="btn btn-primary" href="account.html?mode=login">Log in</a></div></div>'; return; }
    try {
      const query = new URLSearchParams(location.search);
      const existing = query.has('edit') ? (await api('/api/social/posts/' + encodeURIComponent(query.get('edit')))).post : null;
      if (existing && !existing.canManage) throw new Error('You can only edit your own posts.');
      const feature = !existing && query.has('media') ? (await api('/api/social/media/' + encodeURIComponent(query.get('media')))).item : null;
      if (feature?.locked) throw new Error('You do not have access to this media.');
      await postEditor(existing, feature, query.get('focus') === 'visibility', root);
    } catch (error) { root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Post editor unavailable</h1><p>${escape(error.message)}</p><a class="btn btn-ghost" href="account.html?tab=posts">Back to posts</a></div></div>`; }
  }
  window.addEventListener('beforeunload', event => {
    if (activePostEditor?.dirty()) { activePostEditor.recover(); event.preventDefault(); event.returnValue = ''; }
  });
  async function postEditor(existing = null, feature = null, focusVisibility = false, root = null) {
    if (!getUser()) return;
    if (!root) { openPostPage(existing, feature, focusVisibility); return; }
    const context = await loadContext(getUser().id), parties = context.circles.filter(circle => circle.kind === 'party');
    root.innerHTML = `<div class="wrap post-compose-page"><div class="post-compose-heading"><div><a class="text-link" href="account.html?tab=posts">← Back to posts</a><h1>${existing ? 'Edit post' : 'Create a post'}</h1><p>Write, add media, and choose who can see your post.</p></div><button class="btn btn-ghost btn-sm" type="button" data-cancel-post>Cancel</button></div><section class="post-draft-notice" data-draft-notice hidden><span>A draft is available in this browser tab.</span><button class="btn btn-ghost btn-sm" type="button" data-restore-post-draft>Restore draft</button><button class="text-link" type="button" data-discard-post-draft>Discard draft</button></section><section class="post-compose-card">${`<form data-post-editor><div class="social-form-grid"><label>Post type<select name="kind"><option value="post">Post</option><option value="announcement" ${existing?.kind==='announcement'?'selected':''}>Announcement</option></select></label><label>Visibility<select name="visibility">${[['public','Public'],['friends','Friends'],['party','Party'],['self','Self']].map(([key,label])=>`<option value="${key}" ${existing?.visibility===key?'selected':''}>${label}</option>`).join('')}</select></label><label data-post-party ${existing?.visibility==='party'?'':'hidden'}>Party<select name="partyId">${parties.map(circle=>`<option value="${circle.id}" ${existing?.partyId===circle.id?'selected':''}>${escape(circle.name)}</option>`).join('')}</select><small>${parties.length?'Only members of this party can view the post.':'Create a party from General → Parties & groups first.'}</small></label></div><div class="rich-toolbar" role="toolbar" aria-label="Text formatting">${[['bold','B','Bold'],['italic','I','Italic'],['underline','U','Underline'],['strikeThrough','S','Strikethrough'],['justifyLeft','⇤','Align left'],['justifyCenter','↔','Align center'],['justifyRight','⇥','Align right'],['insertUnorderedList','• List','Bulleted list'],['insertOrderedList','1. List','Numbered list'],['createLink','↗ Link','Add link'],['removeFormat','Clear','Clear formatting']].map(([command,label,title])=>`<button type="button" data-rich-command="${command}" aria-label="${title}" title="${title}">${label}</button>`).join('')}</div><div class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Post text"></div><div class="social-attachments" data-post-attachments></div><div class="social-composer-tools"><label class="btn btn-ghost btn-sm">Add images / video / GIF<input type="file" data-post-files accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" multiple hidden></label><button class="btn btn-ghost btn-sm" type="button" data-post-library>Use a sticker / GIF</button></div><p class="panel-help">Up to 8 attachments. Images and GIFs: 20 MB each; videos: 100 MB each.</p><p class="form-message" data-social-message role="status"></p><div class="actions"><button class="btn btn-ghost" type="button" data-save-post-draft>Save draft</button><button class="btn btn-primary" type="submit">${existing?'Save changes':'Publish post'}</button></div></form>`}</section><p class="panel-help">Drafts are kept in this browser tab. Publish to save a post to your account. Leaving with unsaved changes will show a warning.</p></div>`;
    const form = $('[data-post-editor]', root), editor = $('.rich-editor', form), message = $('[data-social-message]', form);
    editor.innerHTML = existing?.html || '';
    let attachments = existing?.attachments.map(item => ({...item})) || [], uploading = false, saving = false;
    if (feature) attachments.push({mediaId: feature.id, ...feature});
    const draftKey = 'solaris-post-draft:' + getUser().id + ':' + (existing?.id || 'new');
    const data = () => ({ html: editor.innerHTML, kind: form.elements.kind.value, visibility: form.elements.visibility.value, partyId: form.elements.partyId.value, attachments: attachments.map(item => item.mediaId ? {mediaId:item.mediaId} : {assetId:item.assetId}) });
    const snapshot = () => JSON.stringify(data());
    let baseline = feature ? JSON.stringify({...data(), attachments: []}) : snapshot(), draft = null;
    const recover = () => {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ ...data(), previews: attachments, clientId: form.dataset.clientId, version: existing?.updatedAt || existing?.createdAt || 0, savedAt: Date.now() })); return true; }
      catch { return false; }
    };
    try { draft = JSON.parse(sessionStorage.getItem(draftKey)); } catch {}
    const dirty = () => uploading || saving || snapshot() !== baseline;
    activePostEditor = { dirty, recover };
    const paint = () => { $('[data-post-attachments]', form).innerHTML = attachments.map((item,index) => `<div class="social-attachment">${attachmentMarkup(item)}<button type="button" data-remove-attachment="${index}" aria-label="Remove attachment">×</button></div>`).join(''); };
    const updateParty = () => { $('[data-post-party]', form).hidden = form.elements.visibility.value !== 'party'; };
    paint(); updateParty();
    if (draft && draft.version === (existing?.updatedAt || existing?.createdAt || 0)) {
      const notice = $('[data-draft-notice]', root); notice.hidden = false;
      $('[data-restore-post-draft]', root).onclick = () => {
        editor.innerHTML = String(draft.html || ''); form.elements.kind.value = draft.kind || 'post'; form.elements.visibility.value = draft.visibility || 'public'; form.elements.partyId.value = draft.partyId || '';
        attachments = Array.isArray(draft.previews) ? draft.previews.slice(0, 8) : [];
        if (draft.clientId) form.dataset.clientId = draft.clientId;
        paint(); updateParty(); notice.hidden = true; message.textContent = 'Draft restored. Publish when you are ready.';
      };
      $('[data-discard-post-draft]', root).onclick = () => { try { sessionStorage.removeItem(draftKey); } catch {} notice.hidden = true; };
    }
    form.elements.visibility.addEventListener('change', updateParty);
    form.addEventListener('input', recover); form.addEventListener('change', recover);
    $('[data-save-post-draft]', root).onclick = () => {
      if (uploading || saving) return;
      if (recover()) { baseline = snapshot(); message.textContent = 'Draft saved in this browser tab. It is not published yet.'; message.classList.remove('is-error'); }
      else formError(form, new Error('This browser could not save a draft. Keep this page open until you publish.'));
    };
    $('[data-cancel-post]', root).onclick = () => {
      if (dirty() && !confirm('Leave with unsaved post changes? You can return to recover the draft in this browser tab.')) return;
      if (dirty()) recover(); activePostEditor = null; location.assign('account.html?tab=posts');
    };
    let selection = null;
    const rememberSelection = () => { const current = getSelection(); if (current.rangeCount && editor.contains(current.anchorNode)) selection = current.getRangeAt(0).cloneRange(); };
    editor.addEventListener('keyup', rememberSelection); editor.addEventListener('mouseup', rememberSelection);
    editor.addEventListener('paste', event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); });
    form.addEventListener('click', async event => {
      const command = event.target.closest('[data-rich-command]');
      if (command) {
        editor.focus(); if (selection && editor.contains(selection.commonAncestorContainer)) { const current = getSelection(); current.removeAllRanges(); current.addRange(selection); }
        let argument = null;
        if (command.dataset.richCommand === 'createLink') {
          argument = window.prompt('Link address (https://…)'); if (!argument) return;
          try { if (!['https:','http:','mailto:'].includes(new URL(argument).protocol)) throw new Error(); } catch { toast('Use a valid https:// link.'); return; }
        }
        document.execCommand(command.dataset.richCommand, false, argument); recover(); return;
      }
      const remove = event.target.closest('[data-remove-attachment]');
      if (remove) { attachments.splice(Number(remove.dataset.removeAttachment), 1); paint(); recover(); return; }
      if (event.target.closest('[data-post-library]')) try {
        const [stickers, gifs] = await Promise.all([api('/api/social/media?user=' + encodeURIComponent(getUser().id) + '&kind=sticker'), api('/api/social/media?user=' + encodeURIComponent(getUser().id) + '&kind=gif')]);
        const items = [...stickers.items, ...gifs.items].filter(item => !item.locked);
        const picker = shell(items.length ? `<div class="social-library-picker">${items.map(item => `<button type="button" data-pick-media="${item.id}"><img src="${escape(item.url || item.previewUrl)}" alt=""><span>${escape(item.name)}</span></button>`).join('')}</div>` : empty('Upload a sticker or GIF to your gallery first.'), 'Your stickers & GIFs');
        picker.addEventListener('click', event => {
          const selected = event.target.closest('[data-pick-media]'); if (!selected) return;
          if (saving) return;
          if (attachments.length >= 8) { toast('A post can contain up to 8 attachments.'); return; }
          const item = items.find(item => item.id === selected.dataset.pickMedia); attachments.push({mediaId:item.id, ...item}); paint(); recover(); picker.close();
        });
      } catch (error) { formError(form, error); }
    });
    $('[data-post-files]', form).addEventListener('change', async event => {
      if (uploading || saving) return;
      uploading = true; formBusy(form, true); $('[data-post-files]', form).disabled = true;
      try {
        for (const file of event.target.files) {
          if (attachments.length >= 8) throw new Error('A post can contain up to 8 attachments.');
          const kind = file.type.startsWith('video/') ? 'video' : file.type === 'image/gif' ? 'gif' : 'image';
          const result = await uploadFile(file, kind, message);
          if (attachments.length >= 8) throw new Error('A post can contain up to 8 attachments.');
          attachments.push(result); paint(); recover();
        }
        message.textContent = 'Uploads ready.';
      } catch (error) { formError(form, error); }
      finally { uploading = false; formBusy(form, false); event.target.disabled = false; event.target.value = ''; }
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (uploading || saving) return; saving = true; formBusy(form, true);
      editor.contentEditable = 'false'; const submitted = data();
      const controls = $$('button,input,select', form); controls.forEach(control => control.disabled = true);
      try {
        const result = await api('/api/social/posts' + (existing ? '/' + existing.id : ''), existing ? 'PUT' : 'POST', {...submitted, clientId:form.dataset.clientId || (form.dataset.clientId = crypto.randomUUID())});
        try { sessionStorage.removeItem(draftKey); } catch {}
        activePostEditor = null;
        location.assign('account.html?tab=posts&post=' + encodeURIComponent(result.post.id));
      } catch (error) { formError(form, error); }
      finally { saving = false; editor.contentEditable = 'true'; controls.forEach(control => control.disabled = false); formBusy(form, false); }
    });
    document.title = (existing ? 'Edit Post' : 'Create Post') + ' | Helunemi';
    if (focusVisibility) form.elements.visibility.focus(); else editor.focus();
  }

  function galleryCard(item) {
    cache.set(item.id,item);
    return `<article class="creator-media-card"><button class="creator-media-preview" type="button" data-media-preview="${item.id}"><img src="${escape(item.kind==='gif'&&!item.locked?item.url:item.previewUrl)}" alt="${escape(item.name)}" loading="lazy">${item.locked?'<span class="social-lock">🔒</span>':''}</button><div class="creator-media-copy"><h3>${escape(item.name)}</h3><p>By ${escape(item.creator.username)}</p>${item.collection?`<small>${escape(item.collection)}</small>`:''}<div class="creator-media-meta"><span>${item.classification==='store'?'Store':'Free'}</span><strong>${escape(money(item))}</strong></div><small>${item.locked?'Paid checkout is not available yet.':'Available'}</small></div>${item.canManage?options(`<button type="button" data-media-edit="${item.id}">Edit details</button><button type="button" data-media-feature="${item.id}">Create a post</button><button class="is-danger" type="button" data-media-delete="${item.id}">Delete</button>`,'Gallery item options'):''}</article>`;
  }
  async function renderGallery(panel,kind,category='free') {
    const profile=mounted;
    panel.innerHTML=`<div class="social-section-head"><div><h2>${kind==='gif'?'GIFs':'Stickers'}</h2><p>Creations and collections by ${escape(profile.user.username)}.</p></div>${profile.own?`<button class="btn btn-primary btn-sm" type="button" data-media-upload="${kind}">+ Upload ${kind==='gif'?'GIF':'sticker'}</button>`:''}</div><nav class="social-category-tabs" aria-label="Gallery categories"><button type="button" data-gallery-category="free" aria-pressed="${category==='free'}">Free ${kind==='gif'?'GIFs':'Stickers'}</button><button type="button" data-gallery-category="store" aria-pressed="${category==='store'}">Store ${kind==='gif'?'GIFs':'Stickers'}</button></nav><div class="creator-media-grid" data-gallery-items aria-live="polite"><p class="social-loading">Loading gallery…</p></div>`;panel.dataset.kind=kind;panel.dataset.category=category;
    try{const result=await api('/api/social/media?user='+encodeURIComponent(profile.ownerId)+'&kind='+kind);if(mounted!==profile)return;panel._items=result.items;paintGallery(panel);}catch(error){$('[data-gallery-items]',panel).innerHTML=empty(error.message);}
  }
  function paintGallery(panel){const category=panel.dataset.category;$$('[data-gallery-category]',panel).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.galleryCategory===category)));const items=(panel._items||[]).filter(item=>item.classification===category);$('[data-gallery-items]',panel).innerHTML=items.length?items.map(galleryCard).join(''):empty('No '+category+' '+(panel.dataset.kind==='gif'?'GIFs':'stickers')+' have been published yet.');}
  async function mediaEditor(kind,existing=null) {
    const dialog=shell(`<form data-media-editor><label>Name<input name="name" maxlength="100" required value="${escape(existing?.name||'')}"></label><label>Collection / pack<input name="collection" maxlength="100" value="${escape(existing?.collection||'')}"></label><div class="social-form-grid"><label>Category<select name="classification"><option value="free">Free</option><option value="store" ${existing?.classification==='store'?'selected':''}>Store</option></select></label><label>Price (USD)<input name="price" type="number" min="0" max="10000" step="0.01" value="${existing?.price||0}"><small>Paid checkout is not configured. Priced items display locked previews.</small></label></div>${existing?'':`<label>${kind==='gif'?'GIF file':'Sticker image'}<input type="file" name="file" required accept="${kind==='gif'?'image/gif':'image/png,image/jpeg,image/webp'}"></label>`}<p class="panel-help">Uploading does not create a post unless you choose Upload and Announce.</p><p class="form-message" data-social-message role="status"></p><div class="actions"><button class="btn btn-primary" type="submit" name="action" value="only">${existing?'Save details':'Upload Only'}</button>${existing?'':'<button class="btn btn-ghost" type="submit" name="action" value="announce">Upload and Announce</button>'}</div></form>`,existing?'Edit '+(kind==='gif'?'GIF':'sticker'):'Publish '+(kind==='gif'?'GIF':'sticker'));
    const form=$('form',dialog);form.addEventListener('submit',async event=>{event.preventDefault();formBusy(form,true);try{let uploaded=null;if(!existing)uploaded=await uploadFile(form.elements.file.files[0],kind,$('[data-social-message]',form));await api('/api/social/media'+(existing?'/'+existing.id:''),existing?'PUT':'POST',{kind,name:form.elements.name.value,collection:form.elements.collection.value,classification:form.elements.classification.value,price:form.elements.price.value,...(uploaded?{assetId:uploaded.assetId}:{}),announce:event.submitter?.value==='announce'});dialog.close();toast(existing?'Gallery details saved.':event.submitter?.value==='announce'?'Uploaded and announced.':'Uploaded to your gallery.');if(mounted)renderGallery($(`[data-profile-panel="${kind==='gif'?'gifs':'stickers'}"]`,mounted.root),kind,form.elements.classification.value);}catch(error){formError(form,error);}finally{formBusy(form,false);}});
  }
  async function renderCfcs(panel,category='mine') {
    const profile=mounted;panel.dataset.category=category;
    panel.innerHTML=`<div class="social-section-head"><div><h2>Custom Friend Cards</h2><p>Inspect a card’s design in Preview Mode. Card interactions are disabled here.</p></div>${profile.own&&profile.user.primaryRole==='member'&&profile.user.accountRole!=='owner'?'<div class="actions"><button class="btn btn-ghost btn-sm" type="button" data-edit-friend-card>Edit current card</button><button class="btn btn-primary btn-sm" type="button" data-cfc-save>Save to collection</button></div>':''}</div>${profile.own?`<nav class="social-category-tabs" aria-label="CFC collections">${[['mine','My CFCs'],['shared','Shared With Me'],['groups','Group CFCs']].map(([key,label])=>`<button type="button" data-cfc-category="${key}" aria-pressed="${category===key}">${label}</button>`).join('')}</nav>`:''}<div class="profile-cfc-grid" data-cfc-items><p class="social-loading">Loading cards…</p></div>`;
    try{const result=await api('/api/social/cfcs?user='+encodeURIComponent(profile.ownerId)+'&category='+category);if(mounted!==profile)return;const container=$('[data-cfc-items]',panel);container.innerHTML=result.cards.length?result.cards.map(card=>{cache.set(card.id,card);return `<article class="profile-cfc-tile"><div class="social-section-head"><h3>${escape(card.name)}</h3>${card.canManage&&!card.current?options(`<button type="button" data-cfc-edit="${card.id}">Manage CFC</button><button class="is-danger" type="button" data-cfc-delete="${card.id}">Remove from collection</button>`,'CFC options'):''}</div><div class="profile-cfc-visual" data-cfc-open="${card.id}" role="button" tabindex="0" aria-label="Preview ${escape(card.name)}">${card.current?`<div class="cfc-passive" inert>${cardMarkup(card.member)}</div>`:`<img src="${escape(card.previewUrl)}" alt="${escape(card.locked?'Locked preview':card.name)}" loading="lazy" style="aspect-ratio:${escape(card.aspectRatio?.replace(':',' / ')||'1 / 1')}">`}${card.locked?'<span class="social-lock">🔒 '+escape(money(card))+'</span>':''}</div><div class="profile-cfc-footer"><span class="preview-mode-label">Preview Mode</span><button class="btn btn-ghost btn-sm" type="button" data-cfc-open="${card.id}">${card.locked?'View locked preview':'Open CFC'}</button></div></article>`;}).join(''):empty('No cards in this collection yet.');}catch(error){$('[data-cfc-items]',panel).innerHTML=empty(error.message);}
  }
  async function cfcEditor(existing=null) {
    const context=await loadContext(getUser().id);
    const dialog=shell(`<form data-cfc-editor><label>Card name<input name="name" maxlength="100" required value="${escape(existing?.name||getUser().friendCard?.design?.name||'My Friend-Card')}"></label><div class="social-form-grid"><label>Profile visibility<select name="visibility"><option value="private">Private</option><option value="public" ${existing?.visibility==='public'?'selected':''}>Public</option></select></label><label>Price (USD)<input name="price" type="number" min="0" max="10000" step="0.01" value="${existing?.price||0}"></label></div><p class="panel-help">Priced public cards receive a server-generated blurred preview. Checkout is not available. Shared members and joined groups you select receive preview access.</p><fieldset><legend>Share with accepted friends</legend>${context.friends.map(friend=>`<label class="social-check"><input type="checkbox" name="sharedWith" value="${friend.id}" ${existing?.sharedWith?.includes(friend.id)?'checked':''}>${escape(friend.username)}</label>`).join('')||'<p class="panel-help">Add friends to share a private card.</p>'}</fieldset><fieldset><legend>Share through joined groups</legend>${context.circles.filter(circle=>circle.kind==='group').map(circle=>`<label class="social-check"><input type="checkbox" name="groupIds" value="${circle.id}" ${existing?.groupIds?.includes(circle.id)?'checked':''}>${escape(circle.name)}</label>`).join('')||'<p class="panel-help">Create or join a group in General → Parties & groups.</p>'}</fieldset>${existing?'':'<p class="panel-help">This saves a visual snapshot of your current card. Future editor changes do not replace this saved version.</p>'}<p class="form-message" data-social-message role="status"></p><button class="btn btn-primary" type="submit">${existing?'Save sharing and details':'Save current card to collection'}</button></form>`,'Manage Custom Friend Card');
    const form=$('form',dialog);form.addEventListener('submit',async event=>{event.preventDefault();formBusy(form,true);try{
      let uploaded;
      if(!existing){$('[data-social-message]',form).textContent='Preparing card snapshot…';const blob=await captureCard(getUser());if(!blob)throw new Error('Your card preview could not be captured. Check that its images can load.');uploaded=await uploadFile(new File([blob],'friend-card.png',{type:'image/png'}),'cfc-preview',$('[data-social-message]',form));}
      await api('/api/social/cfcs'+(existing?'/'+existing.id:''),existing?'PUT':'POST',{name:form.elements.name.value,visibility:form.elements.visibility.value,price:form.elements.price.value,sharedWith:$$('input[name="sharedWith"]:checked',form).map(input=>input.value),groupIds:$$('input[name="groupIds"]:checked',form).map(input=>input.value),...(uploaded?{previewAssetId:uploaded.assetId}:{})});dialog.close();toast('CFC collection saved.');if(mounted)renderCfcs($('[data-profile-panel="cfc"]',mounted.root));
    }catch(error){formError(form,error);}finally{formBusy(form,false);}});
  }
  async function circlesPanel(container,profile) {
    try{const context=await loadContext(profile.ownerId);if(mounted!==profile)return;profile.context=context;
      container.innerHTML=`<div class="social-section-head"><div><h2>Parties & groups</h2><p>Parties set a post’s audience. Groups provide shared CFC access.</p></div><button class="btn btn-ghost btn-sm" type="button" data-circle-new>Create</button></div>${context.invitations.map(circle=>`<div class="social-circle"><span><strong>${escape(circle.name)}</strong><small>${escape(circle.kind)} invitation</small></span><div class="actions"><button class="btn btn-primary btn-sm" type="button" data-circle-respond="${circle.id}" data-accept="true">Join</button><button class="btn btn-ghost btn-sm" type="button" data-circle-respond="${circle.id}" data-accept="false">Decline</button></div></div>`).join('')}${context.circles.map(circle=>`<div class="social-circle"><div><strong>${escape(circle.name)}</strong><small>${escape(circle.kind)} · ${circle.members.length} member${circle.members.length===1?'':'s'}</small><div class="tag-list">${circle.members.map(member=>`<span class="tag">${escape(member.username)}${circle.ownerId===getUser().id&&member.id!==getUser().id?`<button type="button" data-circle-remove="${circle.id}" data-user="${member.id}" aria-label="Remove ${escape(member.username)}">×</button>`:''}</span>`).join('')}</div></div><div class="actions">${circle.ownerId===getUser().id?`<button class="btn btn-ghost btn-sm" type="button" data-circle-invite="${circle.id}">Invite friend</button>`:''}<button class="text-link" type="button" data-circle-leave="${circle.id}">${circle.ownerId===getUser().id?'Delete':'Leave'}</button></div></div>`).join('')||'<p class="empty-inline">You haven’t joined any parties or groups yet.</p>'}`;
    }catch(error){container.innerHTML=empty(error.message);}
  }
  async function selectTab(key,updateUrl=true){
    const profile=mounted;if(!profile)return;if(!tabs.some(([id])=>id===key))key='general';profile.active=key;
    $$('[data-profile-tab]',profile.root).forEach(button=>{const active=button.dataset.profileTab===key;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $$('[data-profile-panel]',profile.root).forEach(panel=>panel.hidden=panel.dataset.profilePanel!==key);
    if(updateUrl){const url=new URL(location.href);url.searchParams.set('tab',key);if(key!=='posts')url.searchParams.delete('post');history.replaceState(null,'',url);}
    const panel=$(`[data-profile-panel="${key}"]`,profile.root);
    if(key==='posts')await renderPosts(panel);else if(key==='stickers'||key==='gifs')await renderGallery(panel,key==='gifs'?'gif':'sticker');else if(key==='cfc')await renderCfcs(panel);
  }
  function mount(root,user,own){
    if(!root||root.dataset.socialMounted)return;root.dataset.socialMounted='1';
    const general=document.createElement('section');general.dataset.profilePanel='general';general.className='profile-tab-panel';general.id='profile-panel-general';general.setAttribute('role','tabpanel');general.setAttribute('aria-labelledby','profile-tab-general');
    const hero=$('.account-hero',root);while(hero.nextSibling)general.append(hero.nextSibling);root.append(general);
    const nav=document.createElement('nav');nav.className='profile-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Profile sections');
    nav.innerHTML=tabs.map(([key,label])=>`<button type="button" role="tab" id="profile-tab-${key}" data-profile-tab="${key}" aria-controls="profile-panel-${key}" aria-selected="${key==='general'}" tabindex="${key==='general'?0:-1}">${label}</button>`).join('');hero.after(nav);
    for(const [key]of tabs.slice(1)){const panel=document.createElement('section');panel.className='profile-tab-panel';panel.dataset.profilePanel=key;panel.id='profile-panel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','profile-tab-'+key);panel.hidden=true;root.append(panel);}
    mounted={root,user,ownerId:user.id,own,active:'general'};cache.clear();
    if(own){const circles=document.createElement('section');circles.className='account-panel account-panel-wide';circles.dataset.socialCircles='';$('.account-grid',general)?.append(circles);circles.innerHTML='<p class="social-loading">Loading parties and groups…</p>';circlesPanel(circles,mounted);}
    selectTab(new URLSearchParams(location.search).get('tab')||'general',false);
  }
  document.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-profile-tab]');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const buttons=$$('[data-profile-tab]',mounted.root),index=buttons.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();selectTab(buttons[next].dataset.profileTab);}
    if(event.target.matches('[data-cfc-open]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.click();}
    if(event.key==='Escape')closeOptions();
  });
  function closeOptions(except){$$('.content-options-menu').forEach(menu=>{if(menu!==except){menu.hidden=true;$('[data-content-options]',menu.parentElement)?.setAttribute('aria-expanded','false');}});}
  document.addEventListener('click',async event=>{
    const toggle=event.target.closest('[data-content-options]');if(toggle){event.preventDefault();event.stopPropagation();const menu=$('.content-options-menu',toggle.parentElement),open=menu.hidden;closeOptions(menu);menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));return;}
    if(!event.target.closest('.content-options'))closeOptions();
    const button=event.target.closest('button,[data-cfc-open]');if(!button)return;
    try{
      if(button.dataset.profileTab){await selectTab(button.dataset.profileTab);return;}
      if(button.hasAttribute('data-social-new-post')){await postEditor();return;}
      if(button.dataset.socialEditPost){closeOptions();await postEditor(cache.get(button.dataset.socialEditPost),null,button.hasAttribute('data-focus-visibility'));return;}
      if(button.dataset.socialShare){await copyLink(shareUrl(cache.get(button.dataset.socialShare)));return;}
      if(button.dataset.socialDeletePost){if(!confirm('Delete this post and its comments?'))return;await api('/api/social/posts/'+button.dataset.socialDeletePost,'DELETE');$('#post-'+button.dataset.socialDeletePost)?.remove();toast('Post deleted.');return;}
      if(button.dataset.socialLike){button.disabled=true;try{const result=await api('/api/social/posts/'+button.dataset.socialLike+'/like','POST',{});$('#post-'+result.post.id).outerHTML=postMarkup(result.post);}finally{button.disabled=false;}return;}
      if(button.dataset.socialComments){const panel=$('[data-comments="'+button.dataset.socialComments+'"]');panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));return;}
      if(button.dataset.socialDeleteComment){const result=await api('/api/social/posts/'+button.dataset.parentPost+'/comments/'+button.dataset.socialDeleteComment,'DELETE');$('#post-'+result.post.id).outerHTML=postMarkup(result.post);$('[data-comments="'+result.post.id+'"]').hidden=false;return;}
      if(button.hasAttribute('data-social-more')){await renderPosts(button.closest('[data-profile-panel]'),true);return;}
      if(button.hasAttribute('data-social-all-posts')){const url=new URL(location.href);url.searchParams.delete('post');history.replaceState(null,'',url);await renderPosts(button.closest('[data-profile-panel]'));return;}
      if(button.dataset.mediaUpload){await mediaEditor(button.dataset.mediaUpload);return;}
      if(button.dataset.galleryCategory){const panel=button.closest('[data-profile-panel]');panel.dataset.category=button.dataset.galleryCategory;paintGallery(panel);return;}
      if(button.dataset.mediaEdit){const item=cache.get(button.dataset.mediaEdit);closeOptions();await mediaEditor(item.kind,item);return;}
      if(button.dataset.mediaFeature){closeOptions();await postEditor(null,cache.get(button.dataset.mediaFeature));return;}
      if(button.dataset.mediaDelete){if(!confirm('Remove this item from your gallery?'))return;const item=cache.get(button.dataset.mediaDelete);await api('/api/social/media/'+item.id,'DELETE');await renderGallery(button.closest('[data-profile-panel]'),item.kind);toast('Gallery item removed.');return;}
      if(button.dataset.mediaPreview){const item=cache.get(button.dataset.mediaPreview);shell(`<figure class="social-media-detail"><img src="${escape(item.url||item.previewUrl)}" alt="${escape(item.name)}"><figcaption>${escape(item.name)} · ${escape(money(item))}</figcaption></figure><p>By ${escape(item.creator.username)}${item.collection?' · '+escape(item.collection):''}</p>${item.locked?'<p>🔒 Paid checkout is not available yet.</p>':getUser()&&!item.canManage?`<button type="button" class="btn btn-primary btn-sm" data-media-claim="${item.id}" ${item.claimed?'disabled':''}>${item.claimed?'Added to collection':'Add to collection'}</button>`:''}`,item.name);return;}
      if(button.dataset.mediaClaim){await api('/api/social/media/'+button.dataset.mediaClaim+'/claim','POST',{});button.disabled=true;button.textContent='Added to collection';toast('Added to your collection.');return;}
      if(button.dataset.cfcCategory){await renderCfcs(button.closest('[data-profile-panel]'),button.dataset.cfcCategory);return;}
      if(button.hasAttribute('data-cfc-save')){await cfcEditor();return;}
      if(button.dataset.cfcEdit){closeOptions();await cfcEditor(cache.get(button.dataset.cfcEdit));return;}
      if(button.dataset.cfcDelete){if(!confirm('Remove this saved CFC? Your current editable Friend-Card is kept.'))return;await api('/api/social/cfcs/'+button.dataset.cfcDelete,'DELETE');await renderCfcs(button.closest('[data-profile-panel]'));return;}
      if(button.dataset.cfcOpen){let card=cache.get(button.dataset.cfcOpen);if(!card.current)card=(await api('/api/social/cfcs/'+card.id)).card;shell(`<span class="preview-mode-label">Preview Mode · interactions disabled</span><div class="cfc-expanded-preview">${card.current?`<div class="cfc-passive" inert>${cardMarkup(card.member)}</div>`:`<img src="${escape(card.previewUrl)}" alt="${escape(card.locked?'Locked card preview':card.name)}">`}</div>${card.locked?`<p>🔒 ${escape(money(card))} · Paid checkout is not available yet.</p>`:''}`,card.name,true);return;}
      if(button.hasAttribute('data-circle-new')){const dialog=shell('<form data-circle-create><label>Name<input name="name" maxlength="80" required></label><label>Type<select name="kind"><option value="party">Party · private post audience</option><option value="group">Group · shared CFC collection</option></select></label><p class="form-message" data-social-message role="status"></p><button class="btn btn-primary" type="submit">Create</button></form>','Create a party or group');$('form',dialog).addEventListener('submit',async event=>{event.preventDefault();const form=event.target;formBusy(form,true);try{await api('/api/social/circles','POST',{name:form.elements.name.value,kind:form.elements.kind.value});dialog.close();await circlesPanel($('[data-social-circles]',mounted.root),mounted);}catch(error){formError(form,error);}finally{formBusy(form,false);}});return;}
      if(button.dataset.circleInvite){const context=await loadContext(getUser().id),circle=context.circles.find(item=>item.id===button.dataset.circleInvite);const friends=context.friends.filter(friend=>!circle.members.some(member=>member.id===friend.id)&&!circle.invited.includes(friend.id));const dialog=shell(friends.length?`<form data-circle-invite-form><label>Friend<select name="userId">${friends.map(friend=>`<option value="${friend.id}">${escape(friend.username)}</option>`).join('')}</select></label><p class="form-message" data-social-message role="status"></p><button class="btn btn-primary" type="submit">Send invitation</button></form>`:empty('All your accepted friends are already members or invited.'),'Invite a friend');$('form',dialog)?.addEventListener('submit',async event=>{event.preventDefault();try{await api('/api/social/circles/'+circle.id+'/invite','POST',{userId:event.target.elements.userId.value});dialog.close();toast('Invitation sent.');await circlesPanel($('[data-social-circles]',mounted.root),mounted);}catch(error){formError(event.target,error);}});return;}
      if(button.dataset.circleRespond||button.dataset.circleLeave||button.dataset.circleRemove){const id=button.dataset.circleRespond||button.dataset.circleLeave||button.dataset.circleRemove,action=button.dataset.circleRespond?'respond':button.dataset.circleRemove?'remove':'leave';if(action!=='respond'&&!confirm(action==='remove'?'Remove this member’s access?':'Leave or delete this party/group? Access is revoked immediately.'))return;await api('/api/social/circles/'+id+'/'+action,'POST',{accept:button.dataset.accept==='true',userId:button.dataset.user});await circlesPanel($('[data-social-circles]',mounted.root),mounted);return;}
    }catch(error){toast(error.message);}
  });
  document.addEventListener('submit',async event=>{const form=event.target;if(!form.matches('[data-comment-form]'))return;event.preventDefault();formBusy(form,true);try{const result=await api('/api/social/posts/'+form.dataset.commentForm+'/comments','POST',{text:form.elements.text.value});$('#post-'+result.post.id).outerHTML=postMarkup(result.post);$('[data-comments="'+result.post.id+'"]').hidden=false;}catch(error){toast(error.message);}finally{formBusy(form,false);}});
  window.addEventListener('popstate',()=>{if(mounted&&mounted.root.isConnected)selectTab(new URLSearchParams(location.search).get('tab')||'general',false);});
  window.SolarisSocial={configure(config){({api,getUser,toast,cardMarkup,captureCard}=config);},mount,mountPostPage,options,copyLink};
})();
