'use strict';
const crypto = require('node:crypto');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const MAX_IDENTITY_LAYERS = 3; // One original and at most two duplicates.
function validateFriendCardIdentity(card) {
  const layers = card?.design?.layers;
  if (!Array.isArray(layers)) throw fail('Add a profile picture and a username layer before saving this Friend-Card.');
  for (const [type, label] of [['avatar','profile picture'],['username','username']]) {
    const count = layers.filter(layer => layer.type === type).length;
    if (!count) throw fail(`Your Friend-Card needs a ${label} layer before it can be saved or posted. Add it from Layers → Text & buttons.`);
    if (count > MAX_IDENTITY_LAYERS) throw fail(`Keep at most three ${label} layers: one original and two duplicates.`);
  }
}
function createFriendCardLibrary({ getAccount, send, readBody, save, clean, publishAssets, privateProfile }) {
  let mutation = Promise.resolve();
  const library = user => Array.isArray(user.friendCards) ? user.friendCards : [];
  const isMember = user => user && user.role !== 'owner' && user.profile.primaryRole === 'member';
  const active = (user, item) => user.activeFriendCardId === item.id || item.id === 'current' && !library(user).some(entry=>entry.id===user.activeFriendCardId);
  const summary = (user, item, designs = false) => ({ id: item.id, name: item.friendCard?.design?.name || 'My Friend-Card', revision: Number(item.friendCard?.revision) || 0, updatedAt: item.updatedAt || 0, published: active(user,item) && user.profile.friendCard?.published === true, active: active(user,item), aspectRatio: item.friendCard?.aspectRatio || '1:1', backgroundImage: item.friendCard?.backgroundImage || '', ...(designs ? {friendCard: clean(item.friendCard,user.id)} : {}) });
  function choices(user, designs) {
    const items = library(user).filter(item => item?.id && item.friendCard?.design).map(item => summary(user,item,designs));
    if (user.profile.friendCard?.design && !library(user).some(item => active(user,item))) items.unshift(summary(user,{id:'current',friendCard:user.profile.friendCard,updatedAt:Number(user.profile.friendCard.revision)||0},designs));
    return items;
  }
  async function commit(change) {
    const task = mutation.catch(() => {}).then(change); mutation = task; return task;
  }
  async function handle(req,res,pathname) {
    const saveRoute = pathname === '/api/member-friend-card/save' && req.method === 'PUT';
    const postRoute = pathname === '/api/member-friend-card/post' && req.method === 'POST';
    const match = /^\/api\/member-friend-cards(?:\/(current|[a-f0-9-]{36}))?$/.exec(pathname);
    if (!saveRoute && !postRoute && !(match && req.method === 'GET')) return false;
    const user = await getAccount(req);
    if (!user) throw fail('Log in to manage your Friend-Cards.',401);
    if (!isMember(user)) throw fail('Only Member accounts can edit a Member Friend-Card.',403);
    if (match) {
      const query = new URL(req.url,'http://localhost').searchParams;
      if (!match[1]) { send(res,200,{cards:choices(user,query.get('designs') === '1')}); return true; }
      const item = match[1] === 'current' && user.profile.friendCard?.design ? {id:'current',friendCard:user.profile.friendCard} : library(user).find(item=>item.id === match[1]);
      if (!item) throw fail('This Friend-Card could not be found in your saved cards.',404);
      send(res,200,{card:{...summary(user,item,true),friendCard:clean(item.friendCard,user.id)}});return true;
    }
    const input = await readBody(req);
    const result = await commit(async () => {
      const before = {cards:structuredClone(library(user)),activeId:user.activeFriendCardId,profile:user.profile.friendCard};
      const creating = input.createNew === true;
      const requestedId = creating ? '' : String(input.cardId || user.activeFriendCardId || 'current');
      let item = requestedId === 'current' ? library(user).find(card=>card.id===user.activeFriendCardId) || {id:'current',friendCard:user.profile.friendCard} : library(user).find(card=>card.id===requestedId);
      if (!creating && !item) throw fail('This Friend-Card no longer exists. Choose a saved card again.',404);
      const currentRevision = creating ? 0 : Math.max(0,Number(item.friendCard?.revision)||0);
      if (!Number.isSafeInteger(Number(input.expectedRevision)) || Number(input.expectedRevision) !== currentRevision) throw fail('This Friend-Card changed in another session. Reopen the latest saved card before saving these edits.',409);
      const card = clean(input.friendCard,user.id);
      validateFriendCardIdentity(card);
      const needsArchive = Boolean(user.profile.friendCard?.design && !library(user).some(entry=>entry.id===user.activeFriendCardId));
      const needsNew = creating || item?.id === 'current' && !needsArchive;
      if (library(user).length + Number(needsArchive) + Number(needsNew) > 50) throw fail('You have reached the 50 saved Friend-Card limit.');
      try {
        user.friendCards = library(user).slice();
        // Preserve the previous current card before any new card can replace it.
        if (user.profile.friendCard?.design && !user.friendCards.some(entry=>entry.id===user.activeFriendCardId)) {
          const archived = {id:crypto.randomUUID(),friendCard:clean(user.profile.friendCard,user.id),createdAt:Date.now(),updatedAt:Date.now()};
          user.friendCards.unshift(archived); user.activeFriendCardId = archived.id;
          if (requestedId === 'current') item = archived;
        }
        if (creating || item?.id === 'current') { item = {id:crypto.randomUUID(),createdAt:Date.now()}; user.friendCards.push(item); }
        else item = user.friendCards.find(entry=>entry.id===item.id);
        if (!item) throw fail('This Friend-Card could not be saved.',409);
        card.revision = Math.max(Date.now(),currentRevision+1);
        const publish = postRoute || user.activeFriendCardId === item.id && user.profile.friendCard?.published === true;
        card.published = publish;
        Object.assign(item,{friendCard:card,updatedAt:Date.now()});
        if (publish || !user.profile.friendCard?.design) { user.activeFriendCardId = item.id; user.profile.friendCard = card; }
        else if (user.activeFriendCardId === item.id) user.profile.friendCard = card;
        for (const entry of user.friendCards) if (entry.id !== user.activeFriendCardId && entry.friendCard.published) entry.friendCard = {...entry.friendCard,published:false};
        await save();
        if (publish) await publishAssets(user,card,true);
        return {user:privateProfile(user),card:summary(user,item,true),message:publish ? 'Your Friend-Card is posted on the Members page.' : 'Your Friend-Card is saved privately in My CFCs.'};
      } catch (error) { user.friendCards = before.cards; user.activeFriendCardId = before.activeId; user.profile.friendCard = before.profile; throw error; }
    });
    send(res,200,result);return true;
  }
  return {handle};
}
module.exports = {createFriendCardLibrary,validateFriendCardIdentity};
