(() => {
  const DATA = {
    games: [
      { id: 'gamma-frost', name: 'Gamma Frost', subtitle: 'Hollow Shift', genre: 'MMORPG', status: 'In Development', version: 'v0.0.2', cover: 'frost', icon: 'assets/hollow-shift-icon.webp', banner: 'assets/gamma-frost-banner.webp',
        blurb: 'Tame animals, explore a living world, adventure, and experiment in an MMORPG shaped by the time of day where you play.',
        details: 'Gamma Frost is Helunemi’s current work in progress. Its world follows realistic local time: daytime where you are brings day to the game, and nighttime brings night. Hollow Shift is its secondary title.',
        worldIntro: `Welcome to Granvoil, a world where humans and monsters live together. Granvoil was once peaceful, until an anomaly drove many monsters berserk. The chaos lasted three days and three nights. Only those who escaped the kingdom survived, and many people were killed, greatly reducing humanity’s numbers.\n\nThree years later, humans learned to control nictrons: magical molecules that float through the air. Nictrons are everywhere and began to spread after the anomaly. Scientists discovered that they could be used to create powers such as fire and water, and to control the ground and air. They cannot create light, gravity, or darkness.\n\nIn the new generation, humans fight for their lives against the berserk monsters. For reasons still unknown, monsters with humanlike forms—such as cat people, dog people, dwarves, and elves—were not affected by the anomaly. Scientists theorize that elves escaped its effects because they are considered a higher class than humans. After the discovery of nictrons became public, elves were the first to access them, though only some have a high aptitude for their use.\n\nOver time, guilds became a way for people to make a living by fighting monsters or setting out as adventurers.`,
        playerIntro: `After a very long time without a day off, you finally have one—and you’re excited to decide how to spend it. Lost in thought, you don’t notice a truck speeding toward you. By the time you see it, it’s too late. The truck hits you and sends you flying.\n\nYour consciousness slowly fades, leaving you trapped in darkness. After a while in the void, you slowly open your eyes to a bright sky. You have been reincarnated in Granvoil.`,
        releasePlan: 'Gamma Frost is planned for an early access release in the future. Its early access launch will not be an MMORPG; the game will begin in a more limited form while its larger online world continues to develop.' },
      { id: 'omiwo', name: 'OmiWo: Collide', subtitle: 'Ominous World', genre: 'Open-world gacha', status: 'Future project', version: '', cover: 'collide',
        blurb: 'A planned open-world gacha game featuring six main characters and three partners.',
        details: 'OmiWo means “Ominous World.” Each partner has a unique storyline, and all three storylines follow the same path. The characters know one another and belong to Six Arrows, the famous party of the adventurers’ guild. This is a future project and is not currently in development.' }
    ],
    members: [],
    arts: [
      { id:'gamma-frost-icon', title:'Gamma Frost Icon', image:'assets/hollow-shift-icon.webp', shape:'icon', type:'Game icon', projectId:'gamma-frost', mainTag:'From Gamma Frost', tags:['AI artwork','No owner','1girl','cute','short','blush','high quality','black hair','medium hair','wavy hair','headband','bridal veil','white crown','white background','open smile','blue eyes','facing viewer','4k'] },
      { id:'gamma-frost-banner', title:'Gamma Frost Banner', image:'assets/gamma-frost-banner.webp', shape:'banner', type:'Game banner', projectId:'gamma-frost', mainTag:'From Gamma Frost', tags:['AI artwork','No owner','1girl','cute','short','blush','high quality','black hair','medium hair','wavy hair','headband','bridal veil','white crown','white background','open smile','full body','blue eyes','facing viewer','4k','cinematic pose','lying on ground','looking back at viewer'] }
    ]
  };
  const originalCatalog = structuredClone(DATA);
  const ROUTES = [['home','Home','index.html'],['list','List','list.html'],['members','Members','members.html'],['games','Games','games.html'],['updates','Updates','updates.html'],['arts','Arts','arts.html'],['groups','Groups','groups.html'],['download','Download','download.html'],['shop','Shop','shop.html']];
  const PRIMARY_ROLE_LABELS = {assistant:'Assistant','ai-assistant':'AI Assistant',developer:'Developer',member:'Member',visitor:'Visitor'};
  const PRIMARY_ROLE_EXPLANATIONS = {
    assistant:'Supports studio coordination and helps keep Helunemi projects moving.',
    'ai-assistant':'An AI contributor that helps with Helunemi work under human direction.',
    developer:'Builds, tests, or maintains Helunemi projects.',
    owner:'Owns Helunemi and manages its team roles.'
  };
  const SECONDARY_ROLE_TAGS = ['Scripter','Coder','Modeler','Tester','Updater','Announcer','Debugger','App tester','Artist'];
  const EMPTY_FRIEND_CARD = {published:false,likes:'',dislikes:'',favoriteThing:'',lookingFor:'',personalityTags:[],aspectRatio:'1:1',backgroundImage:'',backgroundColor:'#fff8e9',backgroundOverlayColor:'#ffffff',backgroundOverlayOpacity:18,borderStyle:'solid',borderColor:'#dcae55',borderWidth:2,borderImage:'',titleColor:'#302344',textColor:'#302344',mutedTextColor:'#766b7d',tagTextColor:'#302344',buttonColor:'#3c315b',buttonOverlayColor:'#ffffff',buttonOverlayOpacity:0,buttonImage:'',buttonTextColor:'#ffffff',buttonBorderStyle:'solid',buttonBorderColor:'#3c315b',buttonBorderImage:'',effect:'glow'};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paragraphs = value => String(value || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean).map(part => `<p>${esc(part)}</p>`).join('');
  const app = $('#app');
  const page = document.body.dataset.page || 'home';
  const titles = {home:'',list:'List',members:'Members',games:'Games',updates:'Updates',account:'Profile',arts:'Arts',groups:'Groups',download:'Download',shop:'Shop',project:'Project',artwork:'Artwork',chat:'Community Chat',publish:'Publish','create-post':'Create Post','shop-product':'Manage Product','explore-ais':'Explore AIs'};
  let currentUser = null;
  let ownerPosts = {games:[],arts:[],updates:[],downloads:[],gameBuilds:[],deletedBuiltins:[]};
  let contentPermissions={games:[],arts:[],updates:[]};
  let uploadStorageStatus=null;
  let memberProfiles = [];
  let communityData = {friends:[],friendRequestsSent:[],friendRequestsReceived:[],bugReports:[]};
  let communityPane = 'home';
  let communityConversationId = '';
  let communitySettingsConversationId = '';
  let communityRefreshTimer = null;
  let communityRecorder = null;
  let communityRecorderChunks = [];
  const defaultCommunityChatSettings = {background:'#111017',ownBubble:'#342442',friendBubble:'#24212a',text:'#f7f2ff',fontSize:15,fontFamily:'DM Sans',animation:'pop',compact:false,wallpaper:''};
  let communityChatSettings = {...defaultCommunityChatSettings};
  let firebaseSetupKnown = false;
  let firebaseEnabled = false;
  let firebaseMissingSettings = [];
  let firebasePublicConfig = null;
  let firebaseClientPromise = null;
  let firebaseClient = null;
  let firebaseSetupError = '';
  let isGuest = new URLSearchParams(location.search).get('guest') === '1';
  try {
    isGuest = isGuest || sessionStorage.getItem('solaris-guest') === '1';
    if (isGuest) sessionStorage.setItem('solaris-guest','1');
  } catch (_) {}
  let editingProfile = false;
  let editingFriendCard = false;
  let viewingPersonalInfo = false;
  let friendCardDesignState = null;
  let friendCardSelectedLayer = null;
  let friendCardPropertiesTab = 'properties';
  let friendCardAssetValues = {friendCardButtonImage:'',friendCardButtonBorderImage:''};
  let friendCardUndoStack = [];
  let friendCardRedoStack = [];
  let friendCardZoom = 100;
  let friendCardBackgroundBefore = null;
  let friendCardLayerBefore = null;
  let cropSession = null;
  let cropDialog = null;
  let toastTimer;

  window.SolarisSocial?.configure({api,getUser:()=>currentUser,toast,cardMarkup:member=>friendCardMarkup(member,false,false,'own'),captureCard:captureProfileCard,viewCard:member=>openFriendCardDialog(member,'preview',true)});
  window.SolarisShop?.configure({api,getUser:()=>currentUser,updateUser:user=>{currentUser=user;profilePreview();},toast});
  const avatarLetters = name => String(name || 'Helunemi').trim().split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join('').toUpperCase() || 'H';
  const avatar = (name, extra = '', image = '') => `<span class="avatar ${extra}" aria-hidden="true">${image ? `<img src="${esc(image)}" alt="">` : esc(avatarLetters(name))}</span>`;
  const bannerImage = image => image ? `<img class="profile-banner-image" src="${esc(image)}" alt="">` : '';
  const bannerRatioClass = ratio => ratio === '16:9' ? 'banner-ratio-16-9' : 'banner-ratio-21-9';
  const noteControl = (note, extra = '') => note ? `<div class="note-control ${extra}"><button class="note-ellipsis" type="button" data-note-toggle aria-expanded="false" aria-label="Show profile note">...</button><div class="note-bubble" hidden>${esc(note)}</div></div>` : '';
  const gameById = id => DATA.games.find(game => game.id === id);
  const gameByName = name => DATA.games.find(game => game.name === name);
  const artById = id => DATA.arts.find(art => art.id === id);
  const projectIcon = (game, extra = '') => `<span class="project-icon project-icon-${esc(game.cover)} ${extra}" aria-hidden="true">${game.icon ? `<img src="${esc(game.icon)}" alt="">` : esc(game.name === 'Gamma Frost' ? 'GF' : 'OW')}</span>`;
  const gameBannerImage = game => game.banner ? `<img class="game-cover-image" src="${esc(game.banner)}" alt="">` : '';
  const artworkHref = art => `artwork.html?id=${encodeURIComponent(art.id)}`;
  function contentMenu(section,id) {
    const allowed=currentUser?.accountRole==='owner'||contentPermissions[section]?.includes(id);
    let actions='';
    if(allowed){if(section==='games')actions+=`<a href="publish.html?type=game-builds&amp;gameId=${encodeURIComponent(id)}">Manage Game Downloads</a>`;actions+=`<a href="publish.html?type=${section}&amp;edit=${encodeURIComponent(id)}">Edit ${section==='games'?'Game':section==='arts'?'Artwork':'Update'}</a>`;if(section!=='games')actions+=`<button type="button" class="is-danger" data-owner-post-delete="${section}" data-post-id="${esc(id)}">Delete ${section==='arts'?'Artwork':'Update'}</button>`;}
    if(section==='updates')actions+=`<button type="button" data-copy-update="${esc(id)}">Copy Update Link</button>`;
    return actions?window.SolarisSocial.options(actions):'';
  }
  function artworkCard(art) {
    return `<article class="artwork-card">${contentMenu('arts',art.id)}<a href="${artworkHref(art)}"><div class="artwork-card-image artwork-card-image-${esc(art.shape)}"><img src="${esc(art.image)}" alt="${esc(art.title)}"></div><div class="artwork-card-copy"><span class="artwork-main-tag">${esc(art.mainTag)}</span><h2>${esc(art.title)}</h2><span class="artwork-type">${esc(art.type)}</span>${art.credit ? `<span class="artwork-type">Credit: ${esc(art.credit)}</span>` : ''}<div class="artwork-tags">${art.tags.map(tag => `<span class="artwork-tag">${esc(tag)}</span>`).join('')}</div><span class="artwork-open">Artwork details <span aria-hidden="true">↗</span></span></div></a></article>`;
  }
  const badge = status => `<span class="badge ${status === 'In Development' ? 'b-dev' : status === 'Beta' ? 'b-beta' : status === 'Released' ? 'b-released' : 'b-soon'}">${esc(status)}</span>`;
  const socialIcon = label => ({Instagram:'◎',YouTube:'▶',Discord:'◉',Twitch:'▣',TikTok:'♪',Website:'↗',Bluesky:'✳',X:'𝕏'}[label] || '↗');
  const favoriteIcon = type => ({game:'🎮',developer:'✦',artwork:'▧'}[type] || '★');
  const favoritesFor = user => user?.favorites || {};

  function projectCard(game) {
    return `<article class="game">${contentMenu('games',game.id)}<div class="cover cover-${game.cover}" aria-hidden="true">${gameBannerImage(game)}<span class="cover-kicker">${esc(game.subtitle)}</span><strong>${esc(game.name)}</strong></div>
      <div class="game-body"><div class="game-top"><div class="game-card-title">${projectIcon(game)}<h3>${esc(game.name)}</h3></div>${badge(game.status)}</div><p class="meta">${esc(game.genre)}${game.version ? ` · ${esc(game.version)}` : ''}</p>
      <p>${esc(game.blurb)}</p><a class="btn btn-ghost btn-sm" href="project.html?id=${encodeURIComponent(game.id)}">Project details</a></div></article>`;
  }
  const memberFilterOptions = ['Assistant','AI Assistant','Developer','Member',...SECONDARY_ROLE_TAGS,...DATA.games.map(game => game.name)];
  function tagsForMember(member) {
    return [...new Set([...(member.roles || []),...(member.projects || [])])];
  }
  function renderMemberFilters() {
    const bar = $('.member-filter-bar');
    if (!bar) return;
    const tags = [...new Set([...memberFilterOptions,...DATA.members.flatMap(member => tagsForMember(member))])];
    if (activeMemberTag !== 'All' && !tags.includes(activeMemberTag)) activeMemberTag = 'All';
    bar.innerHTML = `<button class="member-filter-chip" type="button" data-member-filter="All" aria-pressed="${activeMemberTag === 'All'}">All</button>${tags.map(tag => `<button class="member-filter-chip" type="button" data-member-filter="${esc(tag)}" aria-pressed="${activeMemberTag === tag}">${esc(tag)}</button>`).join('')}`;
  }
  function memberCard(member) {
    const tags = tagsForMember(member);
    const photo = member.id ? `<a class="member-avatar-link" href="account.html?user=${encodeURIComponent(member.id)}" aria-label="Open ${esc(member.online)}’s full profile">${avatar(member.online,'',member.avatarImage)}</a>` : avatar(member.online,'',member.avatarImage);
    return `<article class="member" data-member-card data-tags="${esc(tags.join('|'))}" data-search="${esc([member.online,member.real,...member.roles,...member.projects].join(' '))}">${photo}<div><h3>${esc(member.online)}</h3><p><strong>Real name:</strong> ${esc(member.real)}</p><div class="member-tags" aria-label="Member roles and projects">${tags.map(tag => `<span class="tag member-tag${DATA.games.some(game => game.name === tag) ? ' member-tag-project' : ''}">${esc(tag)}</span>`).join('')}</div>${member.id ? `<a class="member-profile-link" href="account.html?user=${encodeURIComponent(member.id)}">View profile <span aria-hidden="true">↗</span></a>` : ''}</div></article>`;
  }
  let activeMemberTag = 'All';
  function updateMemberResults() {
    const query = ($('#member-search')?.value || '').trim().toLowerCase();
    const cards = $$('[data-member-card]');
    let shown = 0;
    cards.forEach(card => {
      const tags = card.dataset.tags.split('|');
      const matchesTag = activeMemberTag === 'All' || tags.includes(activeMemberTag);
      const matchesQuery = !query || `${card.dataset.search} ${card.dataset.tags}`.toLowerCase().includes(query);
      card.hidden = !(matchesTag && matchesQuery);
      if (!card.hidden) shown++;
    });
    const empty = $('#member-no-results');
    if (empty) empty.hidden = shown > 0;
  }
  async function loadTeamMembers() {
    const container = $('#member-results');
    try {
      const result = await api('/api/team');
      DATA.members = result.members || [];
      if (page === 'list' && container) { container.innerHTML = DATA.members.map(memberCard).join(''); renderMemberFilters(); updateMemberResults(); }
      updateGlobalSearchResults();
      if (page === 'account' && currentUser && editingProfile) showAccount();
    } catch (_) {
      if (page === 'list' && container) { container.innerHTML = ''; setMessage('#member-load-message','Team profiles could not be loaded. Please refresh the page.'); }
    }
  }
  let friendCardEditorContext = null;
  let friendCardChoiceMode = '';
  let friendCardViewMode = 'all';
  let friendCardClipboard = null;
  const friendCardSquareLayer = layer => layer.type === 'avatar' || layer.type === 'shape' && ['square','rounded','circle'].includes(layer.shapeStyle);
  const friendCardLimit = value => Math.max(-10000,Math.min(10000,Number(value) || 0));
  const friendCardSize = value => Math.max(1,Math.min(10000,Number(value) || 1));
  function friendCardDraftKey() {
    return `solaris-friend-card-draft:${currentUser?.id}:${friendCardEditorContext?.id || friendCardEditorContext?.draftId || 'current'}`;
  }
  function friendCardIdentityMessage(card = friendCardFromForm($('#friend-card-form'))) {
    const layers = card?.design?.layers || [];
    const missing = [['avatar','profile picture'],['username','username']].filter(([type])=>!layers.some(layer=>layer.type===type)).map(([,label])=>label);
    if (missing.length) return `Cannot save or post: add ${missing.join(' and ')} ${missing.length === 1 ? 'layer' : 'layers'} from Layers → Text & buttons.`;
    for (const [type,label] of [['avatar','Profile picture'],['username','Username']]) {
      const identity = layers.filter(layer => layer.type === type);
      if (identity.length > 3) return 'Profile picture and username each allow one original and two duplicates (three total).';
      const missingViews = ['preview','full'].filter(view => !identity.some(layer => layer.visible !== false && ['both',view].includes(layer.visibilityMode || 'both')));
      if (missingViews.length) return `Cannot save or post: ${label} must be visible in ${missingViews.map(view => view === 'full' ? 'full view' : 'preview').join(' and ')}. Use one layer in both views, or separate visible layers for each view.`;
    }
    return '';
  }
  function updateFriendCardRequirementNotice() {
    const message = friendCardIdentityMessage(), notice = $('[data-cfc-required-notice]');
    if (notice) { notice.textContent = message || 'Each view needs a visible PFP and username. Separate layers are okay; up to three of each.'; notice.classList.toggle('is-error',Boolean(message)); }
  }
  let friendCardChoiceGeneration = 0;
  function friendCardChoiceContents() {
    const existing = friendCardChoiceMode === 'existing';
    const body = existing
      ? '<button class="text-link cfc-choice-back" type="button" data-cfc-choose-back>← Friend-Card options</button><p>Choose one of your saved designs or collection cards.</p><div data-cfc-choice-list><p class="social-loading">Loading your Friend-Cards…</p></div>'
      : '<p>Choose where you want to start.</p><div class="cfc-choice-actions"><button type="button" class="account-panel cfc-choice-action" data-cfc-choose-existing><strong>Edit existing CFC</strong><span>Choose from the cards you have already made.</span></button><button type="button" class="account-panel cfc-choice-action" data-cfc-create-new><strong>Create new CFC</strong><span>Start with only your profile picture and username.</span></button></div>';
    return `<header class="cfc-choice-head"><h2 id="cfc-choice-title">${existing ? 'Edit an existing CFC' : 'Custom Friend-Cards'}</h2><button type="button" class="cfc-choice-close" data-cfc-close aria-label="Close Friend-Card options">×</button></header><div class="cfc-choice-body">${body}</div>`;
  }
  function closeFriendCardChooser() {
    friendCardChoiceMode = ''; friendCardChoiceGeneration++;
    $('#cfc-choice-dialog')?.close();
  }
  function openFriendCardChooser(mode = 'options') {
    if (!currentUser || currentUser.accountRole === 'owner' || currentUser.primaryRole !== 'member') return;
    let dialog = $('#cfc-choice-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'cfc-choice-dialog'; dialog.className = 'cfc-choice-dialog';
      dialog.setAttribute('aria-labelledby','cfc-choice-title');
      dialog.addEventListener('click',event => { if (event.target === dialog) closeFriendCardChooser(); });
      dialog.addEventListener('cancel',event => { event.preventDefault(); closeFriendCardChooser(); });
      dialog.addEventListener('close',() => { if (!dialog.open) { friendCardChoiceMode = ''; friendCardChoiceGeneration++; } });
      document.body.append(dialog);
    }
    const options = $('#profile-options');
    if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
    friendCardChoiceMode = mode === 'existing' ? 'existing' : 'options'; friendCardChoiceGeneration++;
    dialog.innerHTML = friendCardChoiceContents();
    if (!dialog.open) dialog.showModal();
    else dialog.querySelector('[data-cfc-choose-back],[data-cfc-choose-existing]')?.focus();
    if (friendCardChoiceMode === 'existing') loadFriendCardChoices();
  }

  async function loadFriendCardChoices() {
    const container = $('[data-cfc-choice-list]'); if (!container) return;
    try {
      const [library, collection] = await Promise.all([api('/api/member-friend-cards'),api('/api/social/cfcs?category=mine')]);
      if (!container.isConnected || friendCardChoiceMode !== 'existing') return;
      const rows = library.cards.map(card=>`<article class="account-panel cfc-choice-row"><div><strong>${esc(card.name)}</strong><p>${esc(card.published ? 'Posted on Members' : 'Private saved design')} · ${esc(card.aspectRatio)}</p></div><button class="btn btn-primary btn-sm" type="button" data-edit-library-card="${esc(card.id)}">Edit CFC</button></article>`);
      const snapshots = collection.cards.filter(card=>!card.current).map(card=>`<article class="account-panel cfc-choice-row"><img src="${esc(card.previewUrl)}" alt="${esc(card.name)} preview"><div><strong>${esc(card.name)}</strong><p>${card.sourceAvailable ? 'Saved collection design' : 'Saved image only · import it as a background for a new editable card'}</p></div><button class="btn btn-ghost btn-sm" type="button" data-edit-collection-card="${esc(card.id)}">${card.sourceAvailable ? 'Edit CFC' : 'Use saved image'}</button></article>`);
      const drafts=[];
      try{for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index),prefix=`solaris-friend-card-draft:${currentUser.id}:`;if(!key?.startsWith(prefix))continue;const suffix=key.slice(prefix.length);if(!/^(?:new-|collection-)[a-f0-9-]{36}$/i.test(suffix))continue;const saved=JSON.parse(localStorage.getItem(key));if(saved?.design&&saved?.friendCard)drafts.push(`<article class="account-panel cfc-choice-row"><div><strong>${esc(saved.design.name||'Unsaved Friend-Card')}</strong><p>Unsaved draft · this browser only</p></div><button class="btn btn-ghost btn-sm" type="button" data-resume-cfc-draft="${esc(suffix)}">Resume draft</button></article>`);}}catch{}
      container.innerHTML = [...rows,...snapshots,...drafts].join('') || '<section class="account-panel"><p>No saved Friend-Cards yet.</p><button class="btn btn-primary" type="button" data-cfc-create-new>Create your first CFC</button></section>';
    } catch (error) { if (container.isConnected && friendCardChoiceMode === 'existing') container.innerHTML = `<section class="account-panel"><p>${esc(error.message)}</p><button class="btn btn-ghost" type="button" data-cfc-choose-existing>Try again</button></section>`; }
  }
  function enterFriendCardEditor(context) {
    closeFriendCardChooser();
    friendCardEditorContext = context; friendCardViewMode = 'all';
    editingProfile = false; viewingPersonalInfo = false; editingFriendCard = true; showAccount();
  }
  function createNewFriendCard() {
    const card = normalizedFriendCard({...EMPTY_FRIEND_CARD,personalityTags:[],published:false,revision:0});
    card.design = defaultFriendCardDesign(card);
    enterFriendCardEditor({id:null,draftId:'new-'+crypto.randomUUID(),revision:0,friendCard:card});
  }
  async function editLibraryFriendCard(id) {
    const generation = $('#cfc-choice-dialog')?.open ? friendCardChoiceGeneration : null;
    try {
      const result = await api('/api/member-friend-cards/'+encodeURIComponent(id));
      if (generation !== null && (generation !== friendCardChoiceGeneration || !$('#cfc-choice-dialog')?.open)) return;
      enterFriendCardEditor(result.card);
    }
    catch (error) { toast(error.message); }
  }
  async function editCollectionFriendCard(id) {
    const generation = $('#cfc-choice-dialog')?.open ? friendCardChoiceGeneration : null;
    try {
      const {card:source} = await api('/api/social/cfcs/'+encodeURIComponent(id));
      let card;
      if (source.editableFriendCard) card = normalizedFriendCard({...source.editableFriendCard,published:false,revision:0});
      else {
        const response = await fetch(source.previewUrl); if (!response.ok) throw new Error('The saved image could not be loaded.');
        const blob = await response.blob(), image = await compressFriendCardImage(new File([blob],'saved-card.webp',{type:blob.type}));
        card = normalizedFriendCard({...EMPTY_FRIEND_CARD,published:false,revision:0,backgroundImage:image});
        card.design = defaultFriendCardDesign(card);
      }
      if (generation !== null && (generation !== friendCardChoiceGeneration || !$('#cfc-choice-dialog')?.open)) return;
      card.design = {...card.design,name:source.name || 'My Friend-Card'};
      enterFriendCardEditor({id:null,draftId:'collection-'+id,revision:0,friendCard:card});
      toast(source.editableFriendCard ? 'Collection design opened as a new editable card.' : 'Saved image imported as the background. Its original layers were not stored.');
    } catch (error) { toast(error.message); }
  }
  function canAddFriendCardLayer(layer) {
    if (!friendCardDesignState || friendCardDesignState.layers.length >= 80) { toast('This design has reached its 80 layer limit.'); return false; }
    if (['avatar','username'].includes(layer.type) && friendCardDesignState.layers.filter(item=>item.type===layer.type).length >= 3) { toast(`${layer.type === 'avatar' ? 'Profile picture' : 'Username'} allows one original and two duplicates.`); return false; }
    return true;
  }
  let friendCardSelectedLayers = new Set();
  let friendCardSelectedGroup = '';

  function friendCardSetSelection(ids, groupId = '') {
    const valid = new Set((friendCardDesignState?.layers || []).map(layer => layer.id));
    const requested = [...ids].filter(id => valid.has(id));
    friendCardSelectedLayers = new Set(requested);
    friendCardSelectedLayer = requested.at(-1) || null;
    const group = friendCardDesignState?.groups?.find(item => item.id === groupId);
    const members = group ? friendCardDesignState.layers.filter(layer => layer.groupId === groupId) : [];
    friendCardSelectedGroup = members.length && members.length === friendCardSelectedLayers.size && members.every(layer => friendCardSelectedLayers.has(layer.id)) ? groupId : '';
    return friendCardSelection();
  }
  function friendCardSelection() {
    return (friendCardDesignState?.layers || []).filter(layer => friendCardSelectedLayers.has(layer.id));
  }
  function syncFriendCardSelection() {
    const layers = friendCardDesignState?.layers || [], valid = new Set(layers.map(layer => layer.id));
    friendCardSelectedLayers = new Set([...friendCardSelectedLayers].filter(id => valid.has(id)));
    if (!friendCardSelectedLayers.size && friendCardSelectedLayer && valid.has(friendCardSelectedLayer)) friendCardSelectedLayers.add(friendCardSelectedLayer);
    if (!friendCardSelectedLayers.has(friendCardSelectedLayer)) friendCardSelectedLayer = friendCardSelection().at(-1)?.id || null;
    const group = friendCardDesignState?.groups?.find(item => item.id === friendCardSelectedGroup);
    const members = group ? layers.filter(layer => layer.groupId === group.id) : [];
    if (!members.length || members.length !== friendCardSelectedLayers.size || !members.every(layer => friendCardSelectedLayers.has(layer.id))) friendCardSelectedGroup = '';
  }
  function revealFriendCardSelection() {
    const selection = friendCardSelection();
    if (friendCardViewMode !== 'all' && selection.some(layer => (layer.visibilityMode || 'both') !== 'both' && layer.visibilityMode !== friendCardViewMode)) friendCardViewMode = 'all';
    friendCardPropertiesTab = 'properties';
    repaintFriendCardEditor({dirty:false});
  }
  function selectFriendCardLayer(id, {toggle = false, preserve = false, individual = false} = {}) {
    const layer = friendCardDesignState?.layers.find(item => item.id === id); if (!layer) return;
    syncFriendCardSelection();
    if (toggle) {
      const ids = new Set(friendCardSelectedLayers);
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      friendCardSetSelection(ids);
    } else if (preserve && friendCardSelectedLayers.has(id)) {
      friendCardSelectedLayer = id;
    } else if (!individual && layer.groupId && friendCardDesignState.groups?.some(group => group.id === layer.groupId)) {
      friendCardSetSelection(friendCardDesignState.layers.filter(item => item.groupId === layer.groupId).map(item => item.id),layer.groupId);
    } else friendCardSetSelection([id]);
    revealFriendCardSelection();
  }
  function selectFriendCardGroup(id, toggle = false) {
    syncFriendCardSelection();
    const group = friendCardDesignState?.groups?.find(item => item.id === id); if (!group) return;
    const members = friendCardDesignState.layers.filter(layer => layer.groupId === id).map(layer => layer.id); if (!members.length) return;
    if (toggle) {
      const ids = new Set(friendCardSelectedLayers), remove = members.every(layerId => ids.has(layerId));
      for (const layerId of members) { if (remove) ids.delete(layerId); else ids.add(layerId); }
      friendCardSetSelection(ids);
    } else friendCardSetSelection(members,id);
    revealFriendCardSelection();
  }
  function friendCardCompactGroupStack(layers) {
    const units=[],seen=new Set();
    for(const layer of [...layers].reverse()) {
      if(!layer.groupId){units.push([layer]);continue;}
      if(seen.has(layer.groupId))continue;seen.add(layer.groupId);
      units.push(layers.filter(item=>item.groupId===layer.groupId));
    }
    return units.reverse().flat();
  }
  function pruneFriendCardGroups() {
    if (!friendCardDesignState) return;
    const groups = Array.isArray(friendCardDesignState.groups) ? friendCardDesignState.groups : [];
    const known = new Set(groups.map(group => group.id));
    for (const layer of friendCardDesignState.layers) if (!known.has(layer.groupId)) layer.groupId = '';
    const used = new Set(friendCardDesignState.layers.map(layer => layer.groupId).filter(Boolean));
    friendCardDesignState.groups = groups.filter(group => used.has(group.id));
    friendCardDesignState.layers = friendCardCompactGroupStack(friendCardDesignState.layers);
    if (!used.has(friendCardSelectedGroup)) friendCardSelectedGroup = '';
  }
  function groupFriendCardLayers() {
    const selected = friendCardSelection();
    if (selected.length < 2) { toast('Select at least two layers to make a group.'); return; }
    if (selected.some(layer => layer.locked)) { toast('Unlock the selected layers before grouping them.'); return; }
    pruneFriendCardGroups();
    const selectedIds = new Set(selected.map(layer => layer.id));
    const remainingGroups = (friendCardDesignState.groups || []).filter(group => friendCardDesignState.layers.some(layer => layer.groupId === group.id && !selectedIds.has(layer.id)));
    if (remainingGroups.length >= 40) { toast('This design has reached its 40 group limit.'); return; }
    recordFriendCardHistory();
    const id = 'group-' + crypto.randomUUID(), names = new Set(remainingGroups.map(group => group.name.toLowerCase()));
    let name = 'Group', suffix = 1; while (names.has(name.toLowerCase())) name = `Group ${suffix++}`;
    const lastIndex = Math.max(...selected.map(layer => friendCardDesignState.layers.indexOf(layer)));
    const insertion = friendCardDesignState.layers.slice(0,lastIndex + 1).filter(layer => !selectedIds.has(layer.id)).length;
    const remaining = friendCardDesignState.layers.filter(layer => !selectedIds.has(layer.id));
    selected.forEach(layer => { layer.groupId = id; });
    remaining.splice(insertion,0,...selected);
    friendCardDesignState.layers = remaining;
    friendCardDesignState.groups = [...remainingGroups,{id,name,collapsed:false}];
    pruneFriendCardGroups(); friendCardSetSelection(selected.map(layer => layer.id),id);
    repaintFriendCardEditor();
  }
  function ungroupFriendCardLayers() {
    const selected = friendCardSelection(); if (!selected.some(layer => layer.groupId)) return;
    recordFriendCardHistory(); selected.forEach(layer => { layer.groupId = ''; });
    pruneFriendCardGroups(); friendCardSetSelection(selected.map(layer => layer.id)); repaintFriendCardEditor();
  }

  function friendCardCopyName(label, reserved) {
    const base = String(label || 'Layer').replace(/(?: copy(?: \d+)?)+$/i,'').trim() || 'Layer';
    const names = new Set([...reserved].map(name => String(name).toLowerCase()));
    let next = 0;
    for (const name of names) {
      const match = /^(.*?) copy(?: (\d+))?$/.exec(name);
      if (!match || match[1].replace(/(?: copy(?: \d+)?)+$/i,'').trim() !== base.toLowerCase()) continue;
      const number = match[2] ? Number(match[2]) : 0;
      if (Number.isSafeInteger(number)) next = Math.max(next,number + 1);
    }
    let result;
    do {
      const suffix = next ? ` copy ${next}` : ' copy';
      result = base.slice(0,Math.max(1,80 - suffix.length)) + suffix; next++;
    } while (names.has(result.toLowerCase()));
    reserved.add(result.toLowerCase());
    return result;
  }
  function friendCardClipboardPayload(layers) {
    const card = friendCardFromForm($('#friend-card-form'));
    const linked = {likes:card?.likes,dislikes:card?.dislikes,favorite:card?.favoriteThing,lookingFor:card?.lookingFor};
    const groupIds = new Set(layers.map(layer => layer.groupId).filter(Boolean));
    const fontIds = new Set(layers.map(layer => layer.fontId).filter(Boolean));
    const contents = {};
    for (const layer of layers) if (Object.prototype.hasOwnProperty.call(linked,layer.type)) contents[layer.id] = linked[layer.type] || '';
    return {
      ownerId:currentUser.id,source:friendCardDraftKey(),layers:structuredClone(layers),
      groups:structuredClone((friendCardDesignState.groups || []).filter(group => groupIds.has(group.id))),
      fonts:structuredClone((friendCardDesignState.fonts || []).filter(font => fontIds.has(font.id))),contents
    };
  }
  function copyFriendCardLayer(cut = false) {
    const selected = friendCardSelection(); if (!selected.length) { toast('Select one or more layers first.'); return; }
    if (cut && selected.some(layer => layer.locked)) { toast('Unlock the selected layers before cutting them.'); return; }
    friendCardClipboard = friendCardClipboardPayload(selected);
    if (cut) deleteFriendCardLayer(); else toast(`${selected.length === 1 ? 'Layer' : `${selected.length} layers`} copied. Press Ctrl+V to paste.`);
  }
  function pasteFriendCardLayer(duplicateId = '') {
    let payload;
    if (duplicateId) {
      const original = friendCardDesignState?.layers.find(layer => layer.id === duplicateId); if (!original) return;
      payload = friendCardClipboardPayload(friendCardSelectedLayers.has(duplicateId) ? friendCardSelection() : [original]);
    } else payload = friendCardClipboard?.ownerId === currentUser?.id ? friendCardClipboard : null;
    if (!payload?.layers?.length) { toast('Copy one or more layers first.'); return; }
    const originals = payload.layers;
    if (friendCardDesignState.layers.length + originals.length > 80) { toast('Pasting these layers would exceed the 80 layer limit.'); return; }
    for (const type of ['avatar','username']) {
      const count = friendCardDesignState.layers.filter(layer => layer.type === type).length + originals.filter(layer => layer.type === type).length;
      if (count > 3) { toast(`${type === 'avatar' ? 'Profile picture' : 'Username'} allows one original and two duplicates. No layers were pasted.`); return; }
    }
    pruneFriendCardGroups();
    const sourceGroups = (payload.groups || []).filter(group => originals.some(layer => layer.groupId === group.id));
    if (friendCardDesignState.groups.length + sourceGroups.length > 40) { toast('Pasting these groups would exceed the 40 group limit.'); return; }
    const reserved = new Set(friendCardDesignState.layers.map(layer => layer.label.toLowerCase()));
    const reservedGroups = new Set(friendCardDesignState.groups.map(group => group.name.toLowerCase()));
    const groupIds = new Map(sourceGroups.map(group => [group.id,'group-' + crypto.randomUUID()]));
    const groups = sourceGroups.map(group => ({id:groupIds.get(group.id),name:friendCardCopyName(group.name,reservedGroups),collapsed:false}));
    const fonts = structuredClone(friendCardDesignState.fonts || []), crossCard = payload.source !== friendCardDraftKey();
    const copies = originals.map(original => {
      const layer = {...structuredClone(original),id:'layer-' + crypto.randomUUID(),x:friendCardLimit(original.x + 3),y:friendCardLimit(original.y + 3),locked:false,groupId:groupIds.get(original.groupId) || ''};
      layer.label = layer.type === 'avatar' ? 'Profile picture' : layer.type === 'username' ? 'Username' : friendCardCopyName(original.label,reserved);
      if (crossCard && Object.prototype.hasOwnProperty.call(payload.contents || {},original.id)) { layer.type = 'textbox'; layer.text = payload.contents[original.id]; layer.field = ''; }
      const font = payload.fonts?.find(item => item.id === layer.fontId);
      if (font && !fonts.some(item => item.id === font.id)) {
        if (fonts.length < 12) fonts.push(structuredClone(font)); else { layer.fontId = ''; layer.fontFamily = 'DM Sans'; }
      }
      return layer;
    });
    recordFriendCardHistory(); friendCardDesignState.layers.push(...copies); friendCardDesignState.groups.push(...groups); friendCardDesignState.fonts = fonts;
    const groupId = groups.length === 1 && copies.every(layer => layer.groupId === groups[0].id) ? groups[0].id : '';
    friendCardSetSelection(copies.map(layer => layer.id),groupId); repaintFriendCardEditor();
  }
  function deleteFriendCardLayer(id = friendCardSelectedLayer) {
    const layer = friendCardDesignState?.layers.find(item => item.id === id); if (!layer) return;
    const selected = friendCardSelectedLayers.has(id) ? friendCardSelection() : [layer];
    if (selected.some(item => item.locked)) { toast('Unlock the selected layers before deleting them.'); return; }
    const ids = new Set(selected.map(item => item.id)); recordFriendCardHistory();
    friendCardDesignState.layers = friendCardDesignState.layers.filter(item => !ids.has(item.id));
    pruneFriendCardGroups(); friendCardSetSelection([]); repaintFriendCardEditor();
    if (selected.some(item => ['avatar','username'].includes(item.type))) toast(friendCardIdentityMessage() || 'Layers removed. Both views still have a profile picture and username.');
  }

  function friendCardLayerListMarkup() {
    if (!friendCardDesignState?.layers.length) return '<p class="empty-inline">Add an element to start building your card.</p>';
    const layers = friendCardDesignState.layers, groups = friendCardDesignState.groups || [], seen = new Set();
    const row = layer => `<div class="friend-layer-row${friendCardSelectedLayers.has(layer.id) ? ' is-current' : ''}" data-layer-row="${esc(layer.id)}"><button type="button" class="friend-layer-select" data-select-layer="${esc(layer.id)}" aria-pressed="${friendCardSelectedLayers.has(layer.id)}" title="${esc(layer.label)}"><span class="friend-layer-kind" aria-hidden="true">${({avatar:'◉',username:'T',likes:'♥',dislikes:'♡',favorite:'★',lookingFor:'⌕',tags:'#',button:'▱',text:'T',textbox:'T',image:'▧',sticker:'▧',shape:'◧','frame-piece':'▣',drawing:'✎',eraser:'⌫'})[layer.type] || '•'}</span><span class="friend-layer-row-text"><span>${esc(layer.label)}</span><small>${layer.visibilityMode === 'preview' ? 'Preview only' : layer.visibilityMode === 'full' ? 'Full view only' : 'Both views'}${layer.locked ? ' · Locked' : ''}</small></span></button><button type="button" class="friend-layer-toggle" data-toggle-layer="${esc(layer.id)}" aria-label="${layer.visible ? 'Hide' : 'Show'} ${esc(layer.label)}" aria-pressed="${layer.visible}">${layer.visible ? '◉' : '○'}</button></div>`;
    return [...layers].reverse().map(layer => {
      const group = groups.find(item => item.id === layer.groupId); if (!group) return row(layer);
      if (seen.has(group.id)) return ''; seen.add(group.id);
      const members = layers.filter(item => item.groupId === group.id), selected = members.every(item => friendCardSelectedLayers.has(item.id));
      return `<section class="friend-layer-group${selected ? ' is-current' : ''}" data-layer-group="${esc(group.id)}"><div class="friend-layer-group-head"><button type="button" class="friend-group-expand" data-toggle-group="${esc(group.id)}" aria-expanded="${!group.collapsed}" aria-label="${group.collapsed ? 'Expand' : 'Collapse'} ${esc(group.name)}">${group.collapsed ? '▸' : '▾'}</button><button type="button" class="friend-group-select" data-select-group="${esc(group.id)}" aria-pressed="${selected}" title="Select ${esc(group.name)}"><span aria-hidden="true">▣</span><span>${esc(group.name)}</span><small>${members.length} ${members.length === 1 ? 'item' : 'items'}</small></button><button type="button" class="friend-group-ungroup" data-group-action="ungroup" data-group-id="${esc(group.id)}" aria-label="Ungroup ${esc(group.name)}" title="Ungroup">↗</button></div><div class="friend-layer-group-items"${group.collapsed ? ' hidden' : ''}>${[...members].reverse().map(row).join('')}</div></section>`;
    }).join('');
  }
  function friendCardSelectionPropertiesMarkup() {
    const selected = friendCardSelection(), group = friendCardDesignState?.groups?.find(item => item.id === friendCardSelectedGroup);
    if (!group && selected.length < 2) return null;
    const primary = friendCardSelectedLayer || selected.at(-1)?.id || '', locked = selected.filter(layer => layer.locked).length;
    return `<div class="friend-properties-shell"><div class="friend-properties-heading"><span class="friend-layer-kind" aria-hidden="true">${group ? '▣' : '◫'}</span><div><strong>${group ? esc(group.name) : `${selected.length} layers selected`}</strong><small>${selected.length} ${selected.length === 1 ? 'item' : 'items'}${locked ? ` · ${locked} locked` : ''}</small></div></div><div class="friend-properties-panes"><div class="friend-properties-content friend-multi-properties">${group ? `<label>Group name<input type="text" data-cfc-group-name="${esc(group.id)}" maxlength="80" value="${esc(group.name)}"></label>` : ''}<p class="panel-help">G moves the selection, R rotates it, and S resizes it. Shift-click individual layers to add or remove them.</p><div class="friend-layer-controls"><button type="button" class="btn btn-ghost btn-sm" data-group-action="group"${selected.length < 2 || locked ? ' disabled' : ''}>Group selected</button>${selected.some(layer => layer.groupId) ? '<button type="button" class="btn btn-ghost btn-sm" data-group-action="ungroup">Ungroup</button>' : ''}<button type="button" class="btn btn-ghost btn-sm" data-duplicate-layer="${esc(primary)}">Duplicate</button><button type="button" class="btn btn-ghost btn-sm" data-selection-visible>${selected.every(layer => layer.visible !== false) ? 'Hide selected' : 'Show selected'}</button><button type="button" class="btn btn-ghost btn-sm" data-selection-lock>${locked === selected.length ? 'Unlock all' : 'Lock all'}</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="front" data-layer-id="${esc(primary)}">Move to front</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="back" data-layer-id="${esc(primary)}">Move to back</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="up" data-layer-id="${esc(primary)}">Move up</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="down" data-layer-id="${esc(primary)}">Move down</button><button type="button" class="btn btn-danger btn-sm" data-delete-layer="${esc(primary)}">Delete selected</button></div></div></div></div>`;
  }

  function setFriendCardView(mode) {
    if (!['all','preview','full'].includes(mode)) return;
    if (friendCardActiveTransform) commitFriendCardTransform();
    friendCardViewMode = mode; updateFriendCardEditorPreview();
  }
  function friendCardShortcut(event) {
    const form=$('#friend-card-form');if(!form||event.isComposing||$('dialog[open]'))return false;
    const typing=Boolean(event.target.closest('input,textarea,select,[contenteditable="true"]'));
    const key=event.key.toLowerCase(),modifier=event.ctrlKey||event.metaKey;
    if(form.inert){if(modifier&&key==='s')event.preventDefault();return true;}
    if(modifier&&key==='s'){event.preventDefault();if(!event.repeat){const button=$('[data-friend-save]');if(button&&!button.disabled)saveFriendCardChanges(false,button);}return true;}
    if(typing)return false;
    if(key==='enter'&&friendCardActiveTransform){event.preventDefault();commitFriendCardTransform();return true;}
    if(modifier&&key==='a'){event.preventDefault();friendCardSetSelection(friendCardDesignState.layers.map(layer=>layer.id));repaintFriendCardEditor({dirty:false});return true;}
    if(modifier&&key==='g'){event.preventDefault();if(!event.repeat){if(friendCardActiveTransform)commitFriendCardTransform();if(event.shiftKey)ungroupFriendCardLayers();else groupFriendCardLayers();}return true;}
    if(modifier&&['c','x','v','d','z','y'].includes(key)){
      event.preventDefault();if(event.repeat)return true;if(friendCardActiveTransform)commitFriendCardTransform();
      if(key==='c'||key==='x')copyFriendCardLayer(key==='x');
      else if(key==='v')pasteFriendCardLayer();
      else if(key==='d'){if(friendCardSelection().length)pasteFriendCardLayer(friendCardSelectedLayer);else toast('Select one or more layers to duplicate.');}
      else undoFriendCard(key==='y'||event.shiftKey);
      return true;
    }
    if(!modifier&&['delete','backspace'].includes(key)){event.preventDefault();if(!event.repeat){if(friendCardActiveTransform)commitFriendCardTransform();deleteFriendCardLayer();}return true;}
    if(!modifier&&['arrowleft','arrowright','arrowup','arrowdown'].includes(key)){
      const layers=friendCardSelection();if(!layers.length||layers.some(layer=>layer.locked))return false;
      event.preventDefault();if(friendCardActiveTransform)commitFriendCardTransform();recordFriendCardHistory();const step=event.shiftKey?10:1;
      for(const layer of layers){layer.x=friendCardLimit(layer.x+(key==='arrowleft'?-1:key==='arrowright'?1:0)*step*100/friendCardDesignState.width);layer.y=friendCardLimit(layer.y+(key==='arrowup'?-1:key==='arrowdown'?1:0)*step*100/friendCardDesignState.height);}
      repaintFriendCardEditor();return true;
    }
    return false;
  }

  function friendCardShapeMarkup(layer) {
    const shapes = {
      star:'<polygon points="50,2 61.5,35 97,35 68.5,56 79.5,91 50,70 20.5,91 31.5,56 3,35 38.5,35"/>',
      triangle:'<polygon points="50,2 98,98 2,98"/>',
      diamond:'<polygon points="50,1 99,50 50,99 1,50"/>',
      hexagon:'<polygon points="25,2 75,2 99,50 75,98 25,98 1,50"/>',
      circle:'<circle cx="50" cy="50" r="50"/>',
      rounded:`<rect width="100" height="100" rx="${Math.max(0,Math.min(50,Number(layer.radius)||0))}"/>`,
      square:'<rect width="100" height="100"/>', rectangle:'<rect width="100" height="100"/>'
    };
    return `<svg class="friend-shape-visual" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${shapes[layer.shapeStyle] || shapes.square}</svg>`;
  }

  function normalizedFriendCard(value) {
    return {...EMPTY_FRIEND_CARD,...(value && typeof value === 'object' ? value : {}),personalityTags:Array.isArray(value?.personalityTags) ? value.personalityTags : []};
  }
  function friendCardFontListMarkup() {
    return friendCardDesignState?.fonts?.length ? friendCardDesignState.fonts.map(font => `<div class="friend-font-row"><span><strong>${esc(font.name)}</strong><small>${esc(font.format.toUpperCase())} · available in this design</small></span><button type="button" class="btn btn-ghost btn-sm" data-remove-friend-font="${esc(font.id)}">Remove</button></div>`).join('') : '<p class="empty-inline">No uploaded fonts yet.</p>';
  }
  function friendCardStickerLibraryMarkup() {
    return friendCardDesignState?.stickerLibrary?.length ? friendCardDesignState.stickerLibrary.map(sticker => `<div class="friend-sticker-library-item"><button type="button" data-use-friend-sticker="${esc(sticker.id)}" title="Add ${esc(sticker.name)} to this card"><img src="${esc(sticker.image)}" alt=""><span>${esc(sticker.name)}</span></button><button type="button" data-remove-friend-sticker="${esc(sticker.id)}" aria-label="Remove ${esc(sticker.name)} from sticker library">×</button></div>`).join('') : '<p class="empty-inline">Upload a sticker to reuse it here.</p>';
  }
  const friendCardRatios = ['1:1','2:3','3:2','4:5','5:4'];
  function colorWithOpacity(color, opacity) {
    const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color || '');
    if (!match) return `rgba(255,255,255,${Math.max(0,Math.min(1,Number(opacity) / 100 || 0))})`;
    return `rgba(${parseInt(match[1],16)},${parseInt(match[2],16)},${parseInt(match[3],16)},${Math.max(0,Math.min(1,Number(opacity) / 100 || 0))})`;
  }
  function friendCardStyle(card, framed = false) {
    const ratio = friendCardRatios.includes(card.aspectRatio) ? card.aspectRatio.replace(':',' / ') : '1 / 1';
    return `--friend-ratio:${ratio};--friend-bg:${esc(card.backgroundColor)};--friend-stroke:${esc(card.borderColor)};--friend-stroke-style:${framed ? 'none' : esc(card.borderStyle)};--friend-stroke-width:${framed ? 0 : Number(card.borderWidth) || 2}px;--friend-title-color:${esc(card.titleColor)};--friend-text-color:${esc(card.textColor)};--friend-muted-color:${esc(card.mutedTextColor)};--friend-tag-text-color:${esc(card.tagTextColor)};--friend-button-bg:${esc(card.buttonColor)};--friend-button-text:${esc(card.buttonTextColor)};--friend-button-stroke:${esc(card.buttonBorderColor)};--friend-button-stroke-style:${esc(card.buttonBorderStyle)}${!framed && card.borderImage ? `;--friend-border-image:url(&quot;${esc(card.borderImage)}&quot;);border:var(--friend-stroke-width) solid transparent;border-image-source:var(--friend-border-image);border-image-slice:28;border-image-width:1` : ''}${card.buttonBorderImage ? `;--friend-button-border-image:url(&quot;${esc(card.buttonBorderImage)}&quot;)` : ''}${framed ? ';border:0;border-image:none' : ''}`;
  }
  function defaultFriendCardDesign(card) {
    const id = type => `${type}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const layer = (type, label, x, y, width, height, extra = {}) => ({id:id(type),type,label,x,y,width,height,rotation:0,fontSize:3.2,color:card.textColor,align:'left',opacity:100,visible:true,locked:false,...extra});
    const ratio = (card.aspectRatio || '1:1').split(':').map(Number), scale = Math.min(1000 / ratio[0],1600 / ratio[0],1200 / ratio[1]), width = Math.round(ratio[0] * scale), height = Math.round(ratio[1] * scale);
    return {version:1,name:'My Friend-Card',width,height,aspectRatio:card.aspectRatio || '1:1',backgroundLocked:true,showGuides:false,background:{color:card.backgroundColor,image:card.backgroundImage,tint:card.backgroundOverlayColor,tintOpacity:card.backgroundOverlayOpacity,positionX:50,positionY:50,scale:100},frame:{corners:{},sides:{},cornerSize:9,cornerSizes:{topLeft:9,topRight:9,bottomLeft:9,bottomRight:9},visiblePieces:{topLeft:true,topRight:true,bottomLeft:true,bottomRight:true,top:true,bottom:true,left:true,right:true},horizontalThickness:5,verticalThickness:5,sideMode:'stretch',placement:'background',overlap:0,visible:true,alignments:{top:'center',bottom:'center',left:'middle',right:'middle'},presets:[]},groups:[],layers:[
      layer('avatar','Profile picture',5,7,18,18,{fontSize:3.5,field:'avatar'}),
      layer('username','Username',27,9,68,12,{fontSize:5,field:'username',fontFamily:'Unbounded',color:card.titleColor,weight:700})
    ]};
  }
  function normalizedFriendCardDesign(value, card) {
    const source = value && typeof value === 'object' && value.version === 1 && Array.isArray(value.layers) ? value : defaultFriendCardDesign(card);
    const number = (input,fallback,min,max) => Math.min(max,Math.max(min,Number.isFinite(Number(input)) ? Number(input) : fallback));
    const color = (input,fallback) => /^#[0-9a-f]{6}$/i.test(String(input || '')) ? String(input).toLowerCase() : fallback;
    const image = input => typeof input === 'string' && input.length <= 800_000 && (/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(input) || /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[A-Za-z0-9._-]+\/o\/[A-Za-z0-9%_.-]+\?alt=media&token=[A-Za-z0-9-]+$/.test(input) || /^\/api\/friend-card\/assets\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/i.test(input)) ? input : '';
    const fontAsset = input => typeof input === 'string' && (input.length <= 2_200_000 && /^data:font\/(?:woff2|woff|ttf|otf);base64,[A-Za-z0-9+/]+={0,2}$/.test(input) || input.length <= 2200 && (/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[A-Za-z0-9._-]+\/o\/[A-Za-z0-9%_.-]+\?alt=media&token=[A-Za-z0-9-]+$/.test(input) || /^\/api\/friend-card\/fonts\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/i.test(input))) ? input : '';
    const frame = source.frame && typeof source.frame === 'object' ? source.frame : {};
    const cleanFrameImages = (object, keys) => Object.fromEntries(keys.map(key => [key,image(object?.[key])]));
    const alignments = frame.alignments && typeof frame.alignments === 'object' ? frame.alignments : {};
    const cornerNames = ['topLeft','topRight','bottomLeft','bottomRight'], sideNames = ['top','bottom','left','right'], pieceNames = [...cornerNames,...sideNames];
    const types = new Set(['avatar','username','likes','dislikes','favorite','lookingFor','tags','button','text','textbox','image','sticker','shape','frame-piece','drawing','eraser']);
    const builtInFonts = ['DM Sans','Unbounded','Arial','Georgia','Trebuchet MS','Verdana','Courier New','serif','sans-serif','monospace'];
    const customFonts = (Array.isArray(source.fonts) ? source.fonts : []).slice(0,12).map(font => {
      const id = String(font?.id || '').replace(/[^A-Za-z0-9-]/g,'').slice(0,80), url = fontAsset(font?.url);
      return /^font-[A-Fa-f0-9-]{8,80}$/.test(id) && url ? {id,name:String(font.name || 'Uploaded font').slice(0,80),family:`SolarisFont-${id}`,url,format:['woff2','woff','ttf','otf'].includes(font.format) ? font.format : 'woff2'} : null;
    }).filter(Boolean);
    const customFontIds = new Set(customFonts.map(font => font.id));
    const normalizeFramePreset = input => {
      const sourceFrame = input && typeof input === 'object' ? input : {}, sourceAlignments = sourceFrame.alignments && typeof sourceFrame.alignments === 'object' ? sourceFrame.alignments : {};
      return {name:String(sourceFrame.name || 'Frame preset').slice(0,60),corners:cleanFrameImages(sourceFrame.corners,cornerNames),sides:cleanFrameImages(sourceFrame.sides,sideNames),cornerSize:number(sourceFrame.cornerSize,9,1,30),cornerSizes:Object.fromEntries(cornerNames.map(key => [key,number(sourceFrame.cornerSizes?.[key],sourceFrame.cornerSize || 9,1,30)])),visiblePieces:Object.fromEntries(pieceNames.map(key => [key,sourceFrame.visiblePieces?.[key] !== false])),horizontalThickness:number(sourceFrame.horizontalThickness,5,1,25),verticalThickness:number(sourceFrame.verticalThickness,5,1,25),sideMode:['stretch','repeat','connected'].includes(sourceFrame.sideMode) ? sourceFrame.sideMode : 'stretch',placement:'background',overlap:number(sourceFrame.overlap,0,0,100),visible:sourceFrame.visible !== false,alignments:{top:['left','center','right'].includes(sourceAlignments.top) ? sourceAlignments.top : 'center',bottom:['left','center','right'].includes(sourceAlignments.bottom) ? sourceAlignments.bottom : 'center',left:['top','middle','bottom'].includes(sourceAlignments.left) ? sourceAlignments.left : 'middle',right:['top','middle','bottom'].includes(sourceAlignments.right) ? sourceAlignments.right : 'middle'}};
    };
    const normalizedFrame = normalizeFramePreset(frame);
    normalizedFrame.presets = (Array.isArray(frame.presets) ? frame.presets : []).slice(0,8).map(normalizeFramePreset);
    const usedGroupIds = new Set();
    const normalizedGroups = (Array.isArray(source.groups) ? source.groups : []).slice(0,40).flatMap(group => {
      if (!group || typeof group !== 'object') return [];
      const id=String(group.id || '').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
      if(!id || usedGroupIds.has(id))return [];usedGroupIds.add(id);
      return [{id,name:String(group.name || 'Group').trim().slice(0,80) || 'Group',collapsed:group.collapsed === true}];
    });
    const usedLayerIds = new Set();
    const layers = source.layers.slice(0,80).filter(layer => layer && types.has(layer.type)).map((layer,index) => {
      const type = layer.type;
      let layerId=String(layer.id || `layer-${index}`).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
      if(!layerId||usedLayerIds.has(layerId))layerId='layer-'+crypto.randomUUID();usedLayerIds.add(layerId);
      const width = number(layer.width,20,1,10000);
      return {
      id:layerId,groupId:usedGroupIds.has(layer.groupId) ? layer.groupId : '',
      type,label:type === 'avatar' ? 'Profile picture' : type === 'username' ? 'Username' : String(layer.label || type || 'Layer').slice(0,80),field:String(layer.field || ''),
      x:number(layer.x,0,-10000,10000),y:number(layer.y,0,-10000,10000),width,height:friendCardSquareLayer(layer) ? width : number(layer.height,10,1,10000),rotation:number(layer.rotation,0,-180,180),
      fontSize:number(layer.fontSize,3.2,1,14),fontFamily:customFontIds.has(layer.fontId) ? `SolarisFont-${layer.fontId}` : builtInFonts.includes(layer.fontFamily) ? layer.fontFamily : 'DM Sans',fontId:customFontIds.has(layer.fontId) ? layer.fontId : '',lineHeight:number(layer.lineHeight,1.2,.8,2.2),letterSpacing:number(layer.letterSpacing,0,-.5,2),italic:layer.italic === true,
      color:color(layer.color,card.textColor),fill:color(layer.fill,card.backgroundColor),align:['left','center','right'].includes(layer.align) ? layer.align : 'left',weight:Number(layer.weight) === 700 ? 700 : 500,
      radius:number(layer.radius,8,0,100),shapeStyle:['circle','rounded','rectangle','square','triangle','diamond','star','hexagon'].includes(layer.shapeStyle) ? layer.shapeStyle : 'rounded',opacity:number(layer.opacity,100,0,100),
      image:image(layer.image),imageFit:['contain','cover','fill'].includes(layer.imageFit) ? layer.imageFit : 'contain',imagePositionX:number(layer.imagePositionX,50,0,100),imagePositionY:number(layer.imagePositionY,50,0,100),imageMask:['square','rounded','circle'].includes(layer.imageMask) ? layer.imageMask : 'square',
      text:String(layer.text || '').slice(0,500),path:typeof layer.path === 'string' && layer.path.length <= 16000 && /^[MmLlHhVvCcSsQqTtAaZz0-9., +\-]*$/.test(layer.path) ? layer.path : '',strokeWidth:number(layer.strokeWidth,8,1,100),visible:layer.visible !== false,visibilityMode:['preview','full','both'].includes(layer.visibilityMode) ? layer.visibilityMode : 'both',locked:layer.locked === true
    }; });
    const aspectRatio = source.aspectRatio === 'custom' ? 'custom' : friendCardRatios.includes(source.aspectRatio) ? source.aspectRatio : card.aspectRatio;
    let width = number(source.width,1000,320,1600), height = number(source.height,1000,320,1200);
    if (aspectRatio !== 'custom') {
      const [ratioWidth,ratioHeight] = aspectRatio.split(':').map(Number), minScale = Math.max(320 / ratioWidth,320 / ratioHeight), maxScale = Math.min(1600 / ratioWidth,1200 / ratioHeight);
      const scale = Math.min(maxScale,Math.max(minScale,width / ratioWidth));
      width = Math.round(ratioWidth * scale); height = Math.round(ratioHeight * scale);
    }
    return {
      version:1,name:String(source.name || 'My Friend-Card').slice(0,80),width,height,groups:normalizedGroups.filter(group => layers.some(layer => layer.groupId === group.id)),
      aspectRatio,
      backgroundLocked:source.backgroundLocked !== false,showGuides:source.showGuides === true,
      background:{color:color(source.background?.color,card.backgroundColor),image:image(source.background?.image),tint:color(source.background?.tint,card.backgroundOverlayColor),tintOpacity:number(source.background?.tintOpacity,card.backgroundOverlayOpacity,0,85),positionX:number(source.background?.positionX,50,0,100),positionY:number(source.background?.positionY,50,0,100),scale:number(source.background?.scale,100,50,300)},
      brush:{color:color(source.brush?.color,'#332244'),size:number(source.brush?.size,8,1,100),eraserSize:number(source.brush?.eraserSize,26,1,100)},
      frame:normalizedFrame,fonts:customFonts,stickerLibrary:(Array.isArray(source.stickerLibrary) ? source.stickerLibrary : []).slice(0,20).map((sticker,index) => ({id:String(sticker.id || `sticker-${index}`).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80),name:String(sticker.name || 'Sticker').slice(0,80),image:image(sticker.image)})).filter(sticker => sticker.image),layers:friendCardCompactGroupStack(layers)
    };
  }
  function friendCardLayerContent(layer, card, member, editor, openAction) {
    const label = esc(layer.label || '');
    const value = {likes:card.likes,dislikes:card.dislikes,favorite:card.favoriteThing,lookingFor:card.lookingFor};
    if (layer.type === 'avatar') return `<span class="friend-layer-avatar">${avatar(member.username,'friend-card-avatar',member.avatarImage)}</span>`;
    if (layer.type === 'username') return `<span class="friend-layer-username">${esc(member.username || 'Helunemi Member')}</span>`;
    if (layer.type === 'likes' || layer.type === 'dislikes' || layer.type === 'favorite' || layer.type === 'lookingFor') return `<span class="friend-layer-caption"><small>${label}</small><span>${esc(value[layer.type] || 'Add this detail in your Friend-Card editor.')}</span></span>`;
    if (layer.type === 'tags') return `<span class="friend-layer-tags">${card.personalityTags.map(tag => `<span class="friend-personality-tag">${esc(tag)}</span>`).join('') || '<small>Add personality tags in your Friend-Card editor.</small>'}</span>`;
    if (layer.type === 'button') return `<button class="friend-card-open friend-layer-button" type="button"${editor ? ' aria-disabled="true"' : openAction} style="${friendCardButtonStyle({...card,buttonColor:layer.fill || card.buttonColor,buttonTextColor:layer.color || card.buttonTextColor})}">${esc(layer.text || 'Open Friend-Card')}</button>`;
    if (['image','sticker','frame-piece'].includes(layer.type)) return layer.image ? `<img class="friend-layer-image" src="${esc(layer.image)}" alt="${label}" draggable="false">` : `<span class="friend-layer-placeholder">${label || 'Choose an image'}</span>`;
    if (layer.type === 'shape') return friendCardShapeMarkup(layer);
    if (layer.type === 'textbox') return `<span class="friend-layer-caption"><small>${label}</small><span>${esc(layer.text || '')}</span></span>`;
    if (layer.type === 'drawing') {
      const maskId = `friend-erase-${String(layer.id).replace(/[^A-Za-z0-9_-]/g,'')}`;
      const layers = card.design?.layers || [];
      const layerIndex = layers.findIndex(item => item.id === layer.id);
      const erasePaths = layers.slice(layerIndex + 1).filter(item => item.type === 'eraser' && item.visible !== false && item.path).map(item => `<path class="friend-eraser-stroke" data-friend-eraser="${esc(item.id)}" d="${esc(item.path)}" fill="none" stroke="#000" stroke-width="${Math.max(1,Number(item.strokeWidth) || 26)}" stroke-linecap="round" stroke-linejoin="round"></path>`).join('');
      return `<svg class="friend-layer-drawing" viewBox="0 0 1000 1000" aria-hidden="true"><defs><mask id="${maskId}"><rect width="1000" height="1000" fill="#fff"></rect>${erasePaths}</mask></defs><path class="friend-drawing-stroke" d="${esc(layer.path || '')}" fill="none" stroke="${esc(layer.color || '#332244')}" stroke-width="${Math.max(1,Number(layer.strokeWidth) || 8)}" stroke-linecap="round" stroke-linejoin="round" mask="url(#${maskId})"></path></svg>`;
    }
    if (layer.type === 'eraser') return '';
    return `<span class="friend-layer-text">${esc(layer.text || label || 'Text')}</span>`;
  }
  function friendCardLayersMarkup(card, member, editor = false, openAction = '', full = false) {
    const design = normalizedFriendCardDesign(card.design,card);
    const action = openAction === 'own' ? 'data-open-own-friend-card' : member.id ? `data-open-friend-card="${esc(member.id)}"` : '';
    return design.layers.map((layer,index)=>({layer,index})).filter(({layer})=>friendCardVisibleInView(layer,editor ? friendCardViewMode : full ? 'full' : 'preview')).map(({layer,index}) => {
      const safeWidth = friendCardSize(layer.width), square = friendCardSquareLayer(layer);
      const physicalHeight = square ? safeWidth * design.width / Math.max(1,design.height) : friendCardSize(layer.height);
      const safe = {...layer,x:friendCardLimit(layer.x),y:friendCardLimit(layer.y),width:safeWidth,height:square ? safeWidth : physicalHeight,rotation:Math.max(-180,Math.min(180,Number(layer.rotation)||0)),fontSize:Math.min(14,Math.max(1,Number(layer.fontSize)||3.2)),opacity:Math.min(100,Math.max(0,Number(layer.opacity)||0))};
      const imageRadius = safe.imageMask === 'circle' ? '50%' : safe.imageMask === 'rounded' ? '12%' : '0';
      const radius = safe.shapeStyle === 'circle' ? '50%' : ['rectangle','square','triangle','diamond','star','hexagon'].includes(safe.shapeStyle) ? '0' : `${Math.min(10,Math.max(0,Number(safe.radius)||0)/10)}cqw`;
      const style = `left:${safe.x}%;top:${safe.y}%;width:${safe.width}%;height:${square ? `${safe.width}cqw` : `${safe.height}%`};z-index:${index+1};transform:rotate(${safe.rotation}deg);font-size:calc(${safe.fontSize} * 1cqw);font-family:'${esc(safe.fontFamily)}';font-style:${safe.italic ? 'italic' : 'normal'};line-height:${safe.lineHeight};letter-spacing:${safe.letterSpacing}em;color:${esc(safe.color||card.textColor)};text-align:${safe.align};opacity:${safe.opacity/100};--layer-fill:${esc(safe.fill||card.backgroundColor)};--layer-radius:${radius};--layer-weight:${Number(safe.weight)===700?700:500};--layer-image-fit:${safe.imageFit};--layer-image-position:${safe.imagePositionX}% ${safe.imagePositionY}%;--layer-image-radius:${imageRadius};`;
      return `<div class="friend-card-layer friend-layer-${['shape','avatar','username','text','image'].includes(safe.type)?esc(safe.type)+'-container':esc(safe.type)}${safe.locked&&editor?' is-locked':''}${editor&&friendCardSelectedLayers.has(safe.id)?' is-selected':''}"${editor?` data-editor-layer="${esc(safe.id)}" tabindex="0" aria-label="Select ${esc(safe.label)}"`:''} style="${style}">${friendCardLayerContent(safe,card,member,editor,action)}${editor&&safe.id===friendCardSelectedLayer&&!safe.locked?'<button type="button" class="friend-layer-rotate" data-rotate-layer aria-label="Rotate selected layer" title="Drag to rotate">↻</button><button type="button" class="friend-layer-resize" data-resize-layer aria-label="Resize selected layer"></button>':''}</div>`;
    }).join('') + (editor ? friendCardSelectionBoundsMarkup() : '');
  }

  // Coordinates are percentages of the card surface; overlap slides pieces underneath the card.
  function friendCardFramePieces(design) {
    const frame = design.frame || {};
    if (frame.visible === false) return [];
    const corners = ['topLeft','topRight','bottomLeft','bottomRight'];
    const width = Math.max(320,Number(design.width) || 1000), height = Math.max(320,Number(design.height) || 1000);
    const cornerSize = key => Math.min(30,Math.max(1,Number(frame.cornerSizes?.[key]) || Number(frame.cornerSize) || 9));
    const cornerX = key => Math.min(cornerSize(key),cornerSize(key) * height / width);
    const cornerY = key => Math.min(cornerSize(key),cornerSize(key) * width / height);
    const cornerPresent = key => frame.visiblePieces?.[key] !== false && Boolean(frame.corners?.[key]);
    const horizontal = Math.min(25,Math.max(1,Number(frame.horizontalThickness) || 5));
    const vertical = Math.min(25,Math.max(1,Number(frame.verticalThickness) || 5));
    const geometry = {
      topLeft:{x:-cornerX('topLeft'),y:-cornerY('topLeft'),width:cornerX('topLeft'),height:cornerY('topLeft')},
      topRight:{x:100,y:-cornerY('topRight'),width:cornerX('topRight'),height:cornerY('topRight')},
      bottomLeft:{x:-cornerX('bottomLeft'),y:100,width:cornerX('bottomLeft'),height:cornerY('bottomLeft')},
      bottomRight:{x:100,y:100,width:cornerX('bottomRight'),height:cornerY('bottomRight')},
      top:{x:0,y:-horizontal,width:100,height:horizontal},
      bottom:{x:0,y:100,width:100,height:horizontal},
      left:{x:-vertical,y:0,width:vertical,height:100},
      right:{x:100,y:0,width:vertical,height:100}
    };
    const overlap = Math.min(100,Math.max(0,Number(frame.overlap) || 0)) / 100;
    for (const [key,piece] of Object.entries(geometry)) {
      if (key.includes('Left') || key === 'left') piece.x += piece.width * overlap;
      if (key.includes('Right') || key === 'right') piece.x -= piece.width * overlap;
      if (key.startsWith('top') || key === 'top') piece.y += piece.height * overlap;
      if (key.startsWith('bottom') || key === 'bottom') piece.y -= piece.height * overlap;
    }
    if (frame.sideMode === 'connected') {
      // Overlap the selected corner(s) from behind so the side has no open seam.
      for (const [side,start,end,horizontalSide] of [
        ['top','topLeft','topRight',true],['bottom','bottomLeft','bottomRight',true],
        ['left','topLeft','bottomLeft',false],['right','topRight','bottomRight',false]
      ]) {
        const alignment = frame.alignments?.[side] || (horizontalSide ? 'center' : 'middle');
        const startSize = alignment !== (horizontalSide ? 'right' : 'bottom') && cornerPresent(start) ? (horizontalSide ? cornerX(start) : cornerY(start)) * (1 - overlap) : 0;
        const endSize = alignment !== (horizontalSide ? 'left' : 'top') && cornerPresent(end) ? (horizontalSide ? cornerX(end) : cornerY(end)) * (1 - overlap) : 0;
        if (horizontalSide) { geometry[side].x = -startSize; geometry[side].width += startSize + endSize; }
        else { geometry[side].y = -startSize; geometry[side].height += startSize + endSize; }
      }
    }
    return Object.entries(geometry).flatMap(([key,bounds]) => {
      const corner = corners.includes(key), image = (corner ? frame.corners : frame.sides)?.[key];
      return frame.visiblePieces?.[key] === false || !image ? [] : [{key,image,corner,...bounds}];
    });
  }
  function friendCardFrameInsets(design) {
    return friendCardFramePieces(design).reduce((insets,piece) => ({
      top:Math.max(insets.top,-piece.y),right:Math.max(insets.right,piece.x + piece.width - 100),
      bottom:Math.max(insets.bottom,piece.y + piece.height - 100),left:Math.max(insets.left,-piece.x)
    }),{top:0,right:0,bottom:0,left:0});
  }
  function friendCardFrameMarkup(design) {
    const pieces = friendCardFramePieces(design);
    if (!pieces.length) return '';
    return `<div class="friend-card-exterior-frame" aria-hidden="true">${pieces.map(piece => {
      const horizontal = ['top','bottom'].includes(piece.key), repeat = design.frame.sideMode === 'repeat' && !piece.corner;
      const style = `left:${piece.x}%;top:${piece.y}%;width:${piece.width}%;height:${piece.height}%;z-index:${piece.corner ? 1 : 0};background-image:url(&quot;${esc(piece.image)}&quot;);background-size:${repeat ? horizontal ? 'auto 100%' : '100% auto' : '100% 100%'};background-repeat:${repeat ? horizontal ? 'repeat-x' : 'repeat-y' : 'no-repeat'}`;
      return `<div class="friend-custom-frame-piece frame-${piece.key}" style="${style}"></div>`;
    }).join('')}</div>`;
  }
  function syncFriendCardFrameControls() {
    if (!friendCardDesignState) return;
    const frame = friendCardDesignState.frame;
    const framed = friendCardFramePieces(friendCardDesignState).length > 0;
    $$('[data-cfc-stroke-controls]').forEach(controls => { controls.disabled = framed; });
    $$('[data-cfc-stroke-notice]').forEach(notice => { notice.hidden = !framed; });
    const legacyStroke = $('[data-friend-card-asset-row="friendCardBorderImage"]');
    if (legacyStroke) {
      legacyStroke.classList.toggle('is-stroke-disabled',framed);
      legacyStroke.querySelectorAll('button,input[type="file"]').forEach(input => {
        input.disabled = framed || input.hasAttribute('data-export-stk') && !$('#friend-card-form')?.elements.friendCardBorderImage?.value;
      });
    }
    const overlap = $('[data-frame-overlap-value]'); if (overlap) overlap.textContent = `${frame.overlap || 0}%`;
    $$('[data-frame-alignment]').forEach(label => { label.hidden = frame.sideMode !== 'connected'; });
    $$('[data-frame-property]').forEach(input => {
      const value = input.dataset.frameProperty.split('.').reduce((source,key) => source?.[key],frame);
      if (input.type === 'checkbox') input.checked = value !== false;
      else if ((input.type === 'range' || document.activeElement !== input) && value != null) input.value = value;
    });
  }

  function friendCardButtonStyle(card) {
    const image = card.buttonImage ? `;background-image:linear-gradient(${colorWithOpacity(card.buttonOverlayColor,card.buttonOverlayOpacity)},${colorWithOpacity(card.buttonOverlayColor,card.buttonOverlayOpacity)}),url(&quot;${esc(card.buttonImage)}&quot;)` : '';
    return `--friend-button-bg:${esc(card.buttonColor)};--friend-button-text:${esc(card.buttonTextColor)};--friend-button-stroke:${esc(card.buttonBorderColor)};--friend-button-stroke-style:${esc(card.buttonBorderStyle)}${card.buttonBorderImage ? `;--friend-button-border-image:url(&quot;${esc(card.buttonBorderImage)}&quot;);border:2px solid transparent;border-image-source:var(--friend-button-border-image);border-image-slice:28;border-image-width:1` : ''}${image}`;
  }
  function ensureFriendCardFontFaces(fonts = []) {
    for (const font of fonts) {
      const id = String(font.id || '').replace(/[^A-Za-z0-9-]/g,'');
      if (!id || !font.url || $(`#solaris-font-${CSS.escape(id)}`)) continue;
      const format = ({woff2:'woff2',woff:'woff',ttf:'truetype',otf:'opentype'})[font.format] || 'woff2';
      const style = document.createElement('style'); style.id = `solaris-font-${id}`;
      style.textContent = `@font-face{font-family:'SolarisFont-${id}';src:url("${font.url}") format("${format}");font-display:swap}`;
      document.head.append(style);
    }
  }
  function friendCardMarkup(member, full = false, editor = false, openAction = '') {
    const card = normalizedFriendCard(member.friendCard);
    const aspect = friendCardRatios.includes(card.aspectRatio) ? card.aspectRatio : '1:1';
    const effect = ['none','glow','lift','shine'].includes(card.effect) ? card.effect : 'glow';
    const title = esc(member.username || 'Helunemi Member');
    const searchData = !full && !editor ? esc([member.username,card.likes,card.dislikes,card.favoriteThing,card.lookingFor,...card.personalityTags].join(' ')) : '';
    const action = openAction === 'own' ? 'data-open-own-friend-card' : `data-open-friend-card="${esc(member.id || '')}"`;
    const design = normalizedFriendCardDesign(card.design,card);
    ensureFriendCardFontFaces(design.fonts);
    const image = design.background.image ? `background-image:linear-gradient(${colorWithOpacity(design.background.tint,design.background.tintOpacity)},${colorWithOpacity(design.background.tint,design.background.tintOpacity)}),url(&quot;${esc(design.background.image)}&quot;);background-position:${design.background.positionX}% ${design.background.positionY}%;background-size:${design.background.scale}% auto;background-repeat:no-repeat` : '';
    const frameMarkup = friendCardFrameMarkup(design);
    const markup = `<article class="friend-card friend-card-effect-${effect}${full ? ' friend-card-full' : ' friend-card-preview'}${editor && design.showGuides ? ' friend-show-guides' : ''}" data-friend-aspect="${aspect}"${!full && !editor ? ` data-friend-member data-friend-search="${searchData}"` : ''} style="${friendCardStyle({...card,aspectRatio:design.aspectRatio === 'custom' ? '1:1' : design.aspectRatio},Boolean(frameMarkup))};--friend-ratio:${design.width} / ${design.height};--design-ratio:${design.width} / ${design.height};${image}"><div class="friend-card-layer-canvas">${friendCardLayersMarkup(card,member,editor,openAction,full)}</div><span class="visually-hidden">${title} Friend-Card</span></article>`;
    const insets = friendCardFrameInsets(design);
    if (!frameMarkup) return markup;
    const outerWidth = 100 + insets.left + insets.right, ratio = design.width / design.height;
    const padding = [insets.top / ratio,insets.right,insets.bottom / ratio,insets.left].map(value => `${value / outerWidth * 100}%`).join(' ');
    return `<div class="friend-card-frame-space" style="padding:${padding}"><div class="friend-card-frame-stack">${frameMarkup}${markup}</div></div>`;
  }
  function friendCardAssetRow(title, field, value, supportsStk = false) {
    const thumb = value ? `<span class="friend-card-image-thumb" data-friend-card-thumb="${field}" style="background-image:url(&quot;${esc(value)}&quot;)"></span>` : `<span class="friend-card-image-thumb friend-card-image-empty" data-friend-card-thumb="${field}">No image selected</span>`;
    return `<div class="friend-card-asset-row" data-friend-card-asset-row="${field}"><div><strong>${title}</strong><small>${supportsStk ? 'Upload JPG, PNG, WebP, or a Helunemi .stk stroke file.' : 'Upload a JPG, PNG, or WebP image.'} Images are resized before saving.</small></div>${thumb}<input type="file" accept="image/png,image/jpeg,image/webp${supportsStk ? ',.stk,application/json' : ''}" data-friend-card-image="${field}" hidden><input type="hidden" name="${field}" value="${esc(value)}"><div class="friend-card-asset-actions"><button class="btn btn-ghost btn-sm" type="button" data-choose-friend-card-image="${field}">Choose image</button><button class="btn btn-ghost btn-sm" type="button" data-remove-friend-card-image="${field}"${value ? '' : ' hidden'}>Remove</button>${supportsStk ? `<button class="btn btn-ghost btn-sm" type="button" data-export-stk="${field}"${value ? '' : ' disabled'}>Export .stk</button>` : ''}</div></div>`;
  }
  function friendFrameAssetRow(group,key,label) {
    const image=friendCardDesignState?.frame?.[group]?.[key]||'',visible=friendCardDesignState?.frame?.visiblePieces?.[key]!==false;
    const short=label.replace(' corner','').replace(' side','');
    const size=group==='corners'?`<input class="frame-piece-size-value" type="number" min="1" max="30" data-frame-property="cornerSizes.${key}" value="${esc(friendCardDesignState.frame.cornerSizes?.[key]||friendCardDesignState.frame.cornerSize||9)}" aria-label="${esc(label)} size in percent" title="Corner size (%)">`:'<span class="frame-piece-size-empty" aria-hidden="true">—</span>';
    return `<div class="frame-piece-row"><span title="${esc(label)}">${esc(short)}</span><label class="frame-piece-upload${image?' has-image':''}" title="${image?'Replace':'Choose'} ${esc(label)} image"${image?` style="--frame-preview:url(&quot;${esc(image)}&quot;)"`:''}><input type="file" accept="image/png,image/jpeg,image/webp" data-frame-piece="${group}.${key}" aria-label="Choose ${esc(label)} image"><span aria-hidden="true">${image?'↺':'+'}</span></label>${size}<button type="button" class="frame-piece-remove" data-remove-frame-piece="${group}.${key}" aria-label="Remove ${esc(label)} image"${image?'':' disabled'}>×</button><label class="frame-piece-visibility" title="Show ${esc(label)}"><input type="checkbox" data-frame-piece-visible="${key}"${visible?' checked':''} aria-label="Show ${esc(label)}"></label></div>`;
  }

  function friendColorControl(label, name, value, binding = '') {
    const bind = binding ? ` ${binding}` : ` name="${name}"`;
    const safeColor = /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#302344';
    return `<label class="friend-color-control"><span>${label}</span><span class="friend-color-picker"><input type="color"${bind} value="${esc(safeColor)}" aria-label="${label} color"><input type="text" class="friend-color-hex" data-friend-color-hex maxlength="7" spellcheck="false" inputmode="text" value="${esc(safeColor.toUpperCase())}" aria-label="${label} HEX color" placeholder="#302344"></span></label>`;
  }
  function friendRangeControl(label, name, value) {
    return `<label class="friend-range-control"><span class="friend-range-heading">${label}<output data-friend-range-output>${Number(value)}%</output></span><input type="range" name="${name}" min="0" max="85" step="1" value="${esc(value)}"></label>`;
  }

  function friendCardFramePresetsMarkup() {
    const presets = friendCardDesignState?.frame?.presets || [];
    return presets.length ? presets.map((preset,index) => `<div class="friend-frame-preset-row"><strong>${esc(preset.name)}</strong><button type="button" class="btn btn-ghost btn-sm" data-load-frame-preset="${index}">Apply</button><button type="button" class="btn btn-ghost btn-sm" data-remove-frame-preset="${index}" aria-label="Remove ${esc(preset.name)}">×</button></div>`).join('') : '<p class="empty-inline">Save your current eight-piece setup to reuse it later.</p>';
  }
  function friendCardLayerPropertiesMarkup() {
    const multiple = friendCardSelectionPropertiesMarkup(); if (multiple) return multiple;
    const layer = friendCardDesignState?.layers.find(item => item.id === friendCardSelectedLayer);
    if (!layer) return '<div class="friend-properties-empty"><span aria-hidden="true">✦</span><h3>Select a layer</h3><p>Choose an item on the card or in the Layers panel to edit its position, size, and appearance.</p></div>';
    const linkedField = ({likes:'likes',dislikes:'dislikes',favorite:'favoriteThing',lookingFor:'lookingFor',tags:'personalityTags'})[layer.type];
    const getContent = () => linkedField === 'personalityTags' ? ($('#friend-card-form')?.elements.friendCardPersonalityTags?.value || '') : linkedField ? ($('#friend-card-form')?.elements[`friendCard${linkedField[0].toUpperCase()}${linkedField.slice(1)}`]?.value || '') : layer.text || '';
    const fontFamilies = ['DM Sans','Unbounded','Arial','Georgia','Trebuchet MS','Verdana','Courier New','serif','sans-serif','monospace'].map(font => ({family:font,name:font})).concat((friendCardDesignState.fonts || []).map(font => ({family:font.family,name:font.name})));
    const typographyControls = ['text','textbox','username','likes','dislikes','favorite','lookingFor','tags','button'].includes(layer.type) ? `<details class="friend-property-details"><summary>Typography &amp; color</summary><div class="friend-property-grid"><label>Font scale<input type="number" min="1" max="14" step=".1" data-layer-property="fontSize" value="${esc(layer.fontSize)}"></label><label>Font family<select data-layer-property="fontFamily">${fontFamilies.map(font => `<option value="${esc(font.family)}"${layer.fontFamily === font.family ? ' selected' : ''}>${esc(font.name)}</option>`).join('')}</select></label><label>Alignment<select data-layer-property="align"><option value="left"${layer.align === 'left' ? ' selected' : ''}>Left</option><option value="center"${layer.align === 'center' ? ' selected' : ''}>Center</option><option value="right"${layer.align === 'right' ? ' selected' : ''}>Right</option></select></label><label>Weight<select data-layer-property="weight"><option value="500"${Number(layer.weight) !== 700 ? ' selected' : ''}>Regular</option><option value="700"${Number(layer.weight) === 700 ? ' selected' : ''}>Bold</option></select></label><label>Line spacing<input type="number" min=".8" max="2.2" step=".05" data-layer-property="lineHeight" value="${esc(layer.lineHeight)}"></label><label>Letter spacing<input type="number" min="-.5" max="2" step=".05" data-layer-property="letterSpacing" value="${esc(layer.letterSpacing)}"></label>${friendColorControl('Text color','',layer.color || '#302344','data-layer-property="color"')}<label class="friend-check-row"><input type="checkbox" data-layer-property="italic"${layer.italic ? ' checked' : ''}> Italic</label>${layer.type === 'button' ? `${friendColorControl('Button background','',layer.fill || '#3c315b','data-layer-property="fill"')}<label>Corner roundness<input type="number" min="0" max="100" data-layer-property="radius" value="${esc(layer.radius || 8)}"></label>` : ''}</div></details>` : '';
    const imageControls = ['image','sticker','frame-piece'].includes(layer.type) ? `<div class="friend-layer-image-tools"><label class="btn btn-ghost btn-sm">Replace image<input type="file" accept="image/png,image/jpeg,image/webp" data-layer-image-input="${esc(layer.id)}" hidden></label><div class="friend-property-grid"><label>Image fit<select data-layer-property="imageFit"><option value="contain"${layer.imageFit === 'contain' ? ' selected' : ''}>Contain</option><option value="cover"${layer.imageFit === 'cover' ? ' selected' : ''}>Cover / crop</option><option value="fill"${layer.imageFit === 'fill' ? ' selected' : ''}>Stretch</option></select></label><label>Image mask<select data-layer-property="imageMask"><option value="square"${layer.imageMask === 'square' ? ' selected' : ''}>Square</option><option value="rounded"${layer.imageMask === 'rounded' ? ' selected' : ''}>Rounded</option><option value="circle"${layer.imageMask === 'circle' ? ' selected' : ''}>Circle</option></select></label><label>Crop horizontal<input type="range" min="0" max="100" data-layer-property="imagePositionX" value="${esc(layer.imagePositionX)}"></label><label>Crop vertical<input type="range" min="0" max="100" data-layer-property="imagePositionY" value="${esc(layer.imagePositionY)}"></label></div></div>` : '';
    const formCard = friendCardFromForm($('#friend-card-form')) || currentUser?.friendCard || friendCardAssetValues;
    const buttonAssets = layer.type === 'button' ? `<div class="friend-card-asset-list">${friendCardAssetRow('Button background image','friendCardButtonImage',formCard.buttonImage || '')}${friendCardAssetRow('Button stroke image','friendCardButtonBorderImage',formCard.buttonBorderImage || '',true)}</div>` : '';
    const assetContent = imageControls || buttonAssets || '<p class="panel-help">This layer has no image assets. Select an image, sticker, or button layer to customize its assets.</p>';
    const linkedContent = linkedField ? (['likes','dislikes','lookingFor'].includes(layer.type) ? `<label>${layer.type === 'likes' ? 'What I like' : layer.type === 'dislikes' ? 'What I dislike' : 'What I’m looking for'}<textarea data-layer-content-field rows="3" maxlength="400">${esc(getContent())}</textarea></label>` : `<label>${layer.type === 'tags' ? 'Tags (comma separated)' : layer.type === 'favorite' ? 'Favorite thing' : 'Content'}<input data-layer-content-field value="${esc(getContent())}" maxlength="${layer.type === 'favorite' ? 160 : 400}"></label>`) : '';
    const positionControls = friendCardSquareLayer(layer) ? `<label>X position<input type="number" min="-10000" max="10000" step="0.1" data-layer-property="x" value="${esc(layer.x)}"></label><label>Y position<input type="number" min="-10000" max="10000" step="0.1" data-layer-property="y" value="${esc(layer.y)}"></label><label>Size<input type="number" min="1" max="10000" step="0.1" data-layer-property="width" value="${esc(layer.width)}"></label><label>Rotation<input type="number" min="-180" max="180" step="1" data-layer-property="rotation" value="${esc(layer.rotation)}"></label><label>Opacity<input type="range" min="0" max="100" data-layer-property="opacity" value="${esc(layer.opacity)}"></label>` : `<label>X position<input type="number" min="-10000" max="10000" step="0.1" data-layer-property="x" value="${esc(layer.x)}"></label><label>Y position<input type="number" min="-10000" max="10000" step="0.1" data-layer-property="y" value="${esc(layer.y)}"></label><label>Width<input type="number" min="1" max="10000" step="0.1" data-layer-property="width" value="${esc(layer.width)}"></label><label>Height<input type="number" min="1" max="10000" step="0.1" data-layer-property="height" value="${esc(layer.height)}"></label><label>Rotation<input type="number" min="-180" max="180" step="1" data-layer-property="rotation" value="${esc(layer.rotation)}"></label><label>Opacity<input type="range" min="0" max="100" data-layer-property="opacity" value="${esc(layer.opacity)}"></label>`;
    const tab = friendCardPropertiesTab === 'assets' ? 'assets' : 'properties';
    return `<div class="friend-properties-shell"><div class="friend-properties-heading"><span class="friend-layer-kind" aria-hidden="true">✦</span><div><strong>${esc(layer.label)}</strong><small>${esc(layer.type)} layer</small></div></div><nav class="friend-properties-tabs" aria-label="Selected layer settings"><button type="button" data-property-pane-tab="properties" aria-pressed="${tab === 'properties'}">Properties</button><button type="button" data-property-pane-tab="assets" aria-pressed="${tab === 'assets'}">Assets</button></nav><div class="friend-properties-panes"><div class="friend-properties-content" data-property-pane-content="properties"${tab === 'properties' ? '' : ' hidden'}>${!['avatar','username'].includes(layer.type) ? `<label>Layer name<input data-layer-property="label" maxlength="80" value="${esc(layer.label)}"></label>` : ''}${linkedContent}${['text','textbox','button'].includes(layer.type) ? `<label>${layer.type === 'button' ? 'Button label' : 'Text'}<textarea data-layer-property="text" rows="3" maxlength="500">${esc(layer.text || '')}</textarea></label>` : ''}<label>Show in<select data-layer-property="visibilityMode"><option value="both"${layer.visibilityMode === 'both' ? ' selected' : ''}>Preview and full view</option><option value="preview"${layer.visibilityMode === 'preview' ? ' selected' : ''}>Preview only</option><option value="full"${layer.visibilityMode === 'full' ? ' selected' : ''}>Full view only</option></select></label>${['avatar','username'].includes(layer.type) ? '<p class="friend-identity-help">Each view needs a visible PFP and username. You can use separate Preview only and Full view only layers, or one layer in both views.</p>' : ''}<div class="friend-property-grid friend-layer-position-grid">${positionControls}</div>${typographyControls}${layer.type === 'shape' ? `<div class="friend-property-grid">${friendColorControl('Shape color','',layer.fill || '#f5a300','data-layer-property="fill"')}<label>Shape type<select data-layer-property="shapeStyle">${[['rectangle','Rectangle'],['square','Square'],['rounded','Rounded square'],['circle','Circle'],['triangle','Triangle'],['diamond','Diamond'],['star','Star'],['hexagon','Hexagon']].map(([value,label]) => `<option value="${value}"${layer.shapeStyle === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label>Corner roundness<input type="number" min="0" max="100" data-layer-property="radius" value="${esc(layer.radius || 8)}"></label></div>` : ''}<div class="friend-layer-controls"><button type="button" class="btn btn-ghost btn-sm" data-duplicate-layer="${esc(layer.id)}">Duplicate</button><button type="button" class="btn btn-ghost btn-sm" data-lock-layer="${esc(layer.id)}">${layer.locked ? 'Unlock' : 'Lock'}</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="front" data-layer-id="${esc(layer.id)}">Move to front</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="back" data-layer-id="${esc(layer.id)}">Move to back</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="up" data-layer-id="${esc(layer.id)}">Move up</button><button type="button" class="btn btn-ghost btn-sm" data-layer-order="down" data-layer-id="${esc(layer.id)}">Move down</button><button type="button" class="btn btn-danger btn-sm" data-delete-layer="${esc(layer.id)}">Delete</button></div></div><div class="friend-properties-content friend-property-assets" data-property-pane-content="assets"${tab === 'assets' ? '' : ' hidden'}>${assetContent}</div></div></div>`;
  }
  function hiddenFriendCardFields(card) {
    const fields = {friendCardLikes:card.likes,friendCardDislikes:card.dislikes,friendCardFavoriteThing:card.favoriteThing,friendCardLookingFor:card.lookingFor,friendCardPersonalityTags:card.personalityTags.join(', '),friendCardTitleColor:card.titleColor,friendCardTextColor:card.textColor,friendCardMutedTextColor:card.mutedTextColor,friendCardTagTextColor:card.tagTextColor,friendCardButtonOverlayColor:card.buttonOverlayColor,friendCardButtonOverlayOpacity:card.buttonOverlayOpacity,friendCardButtonBorderStyle:card.buttonBorderStyle};
    return Object.entries(fields).map(([name,value]) => `<input type="hidden" name="${name}" value="${esc(value)}">`).join('');
  }
  function friendCardEditorSection(user) {
    if (user.accountRole === 'owner' || user.primaryRole !== 'member') return '';
    let card = normalizedFriendCard(user.friendCard), recoveredDraft = false;
    try {
      const saved = JSON.parse((localStorage.getItem(friendCardDraftKey()) || (friendCardEditorContext?.id === 'current' ? localStorage.getItem(`solaris-friend-card-draft:${user.id}`) : null)) || 'null');
      if (saved?.design && saved?.friendCard && (!saved.savedAt || Date.now() - Number(saved.savedAt) < 30 * 24 * 60 * 60 * 1000)) {
        card = normalizedFriendCard({...card,...saved.friendCard,published:card.published});
        recoveredDraft = true;
      }
    } catch (_) {}
    const options = (values, selected, labels = values) => values.map((value,index) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(labels[index] || value)}</option>`).join('');
    let savedDraftDesign = null;
    try { const saved = JSON.parse((localStorage.getItem(friendCardDraftKey()) || (friendCardEditorContext?.id === 'current' ? localStorage.getItem(`solaris-friend-card-draft:${user.id}`) : null)) || 'null'); savedDraftDesign = recoveredDraft ? saved?.design : null; } catch (_) {}
    friendCardDesignState = normalizedFriendCardDesign(savedDraftDesign || card.design,card);
    friendCardSetSelection([friendCardDesignState.layers[0]?.id].filter(Boolean));
    friendCardPropertiesTab = 'properties';
    friendCardAssetValues = {friendCardButtonImage:card.buttonImage || '',friendCardButtonBorderImage:card.buttonBorderImage || ''};
    friendCardUndoStack = []; friendCardRedoStack = [];
    friendCardActiveTool = 'select'; friendCardTransformMode = 'move'; friendCardActiveTransform = null; friendCardZoom = 100;
    const previewCard = {...card,design:friendCardDesignState};
    const imageRows = `${friendCardAssetRow('Card background image','friendCardBackgroundImage',card.backgroundImage)}${friendCardAssetRow('Legacy frame image','friendCardBorderImage',card.borderImage,true)}`;
    const frameNames = [['topLeft','Top-left corner'],['topRight','Top-right corner'],['bottomLeft','Bottom-left corner'],['bottomRight','Bottom-right corner']].map(([key,label]) => friendFrameAssetRow('corners',key,label)).join('') + [['top','Top side'],['bottom','Bottom side'],['left','Left side'],['right','Right side']].map(([key,label]) => friendFrameAssetRow('sides',key,label)).join('');
    const framePresets = `<div class="friend-frame-presets"><button type="button" class="btn btn-ghost btn-sm" data-save-frame-preset>Save current frame preset</button><div data-frame-preset-list>${friendCardFramePresetsMarkup()}</div></div>`;
    const cardAppearance = `<details class="friend-editor-section friend-global-style"><summary><strong>Card &amp; button appearance</strong><small>Colors, strokes, and effects.</small></summary><fieldset class="friend-card-stroke-controls" data-cfc-stroke-controls>${friendColorControl('Card stroke','friendCardBorderColor',card.borderColor)}<label>Stroke style<select name="friendCardBorderStyle">${options(['solid','dashed','dotted','double'],card.borderStyle,['Solid','Dashed','Dotted','Double'])}</select></label><label>Stroke width<select name="friendCardBorderWidth">${options(['1','2','3','4','5','6','7','8'],String(card.borderWidth))}</select></label></fieldset><p class="friend-stroke-notice" data-cfc-stroke-notice hidden>Card stroke is disabled while an 8-piece frame is visible. Hide or remove the frame to restore your stroke.</p><label>Card effect<select name="friendCardEffect">${options(['none','glow','lift','shine'],card.effect,['None','Soft glow','Lift on hover','Shine'])}</select></label><h3>Button appearance</h3>${friendColorControl('Button background','friendCardButtonColor',card.buttonColor)}${friendColorControl('Button text','friendCardButtonTextColor',card.buttonTextColor)}${friendColorControl('Button stroke','friendCardButtonBorderColor',card.buttonBorderColor)}</details>`;
    return `<form id="friend-card-form" class="friend-card-editor-form" novalidate>${hiddenFriendCardFields(card)}<section class="friend-card-workspace"><header class="friend-editor-toolbar"><div class="friend-editor-title"><span class="section-eyebrow">HELUNEMI FRIEND-CARD STUDIO</span><input data-design-name aria-label="Design name" maxlength="80" value="${esc(friendCardDesignState.name)}"></div><div class="friend-editor-history"><button type="button" data-friend-undo disabled aria-label="Undo">↶</button><button type="button" data-friend-redo disabled aria-label="Redo">↷</button><span data-friend-save-status>${recoveredDraft ? 'Recovered unsaved changes · save to sync your account' : 'All changes saved to your account'}</span></div><div class="friend-editor-toolbar-actions"><button type="button" class="btn btn-ghost btn-sm" data-friend-export>Export .hcfc</button><label class="btn btn-ghost btn-sm friend-import-label">Import design<input type="file" accept=".hcfc,.scfc,application/zip,application/json" data-friend-import hidden></label><button type="button" class="btn btn-ghost btn-sm" data-friend-png>Download PNG</button><button type="button" class="btn btn-primary btn-sm" data-friend-save>Save</button></div></header>
      <div class="friend-card-editor-layout friend-design-workspace"><aside class="friend-editor-panel friend-editor-left"><div class="friend-editor-panel-head"><div><span class="section-eyebrow">DESIGN</span><h2>Elements &amp; layers</h2></div><button type="button" class="friend-panel-collapse" aria-label="Collapse elements panel" data-collapse-editor-panel="left">‹</button></div>
        <div class="friend-editor-section"><h3>Card setup</h3><label>Aspect ratio<select name="friendCardAspectRatio" data-design-ratio><option value="custom"${friendCardDesignState.aspectRatio === 'custom' ? ' selected' : ''}>Custom dimensions</option>${options(friendCardRatios,friendCardDesignState.aspectRatio)}</select></label><div class="friend-property-grid friend-dimensions"><label>Width<input type="number" min="320" max="1600" step="10" data-design-dimension="width" value="${esc(friendCardDesignState.width)}"></label><label>Height<input type="number" min="320" max="1200" step="10" data-design-dimension="height" value="${esc(friendCardDesignState.height)}"></label></div><label>Background<input type="color" name="friendCardBackgroundColor" value="${esc(card.backgroundColor)}"></label><label>Background tint<input type="color" name="friendCardBackgroundOverlayColor" value="${esc(card.backgroundOverlayColor)}"></label>${friendRangeControl('Tint strength','friendCardBackgroundOverlayOpacity',card.backgroundOverlayOpacity)}<div class="friend-background-crop"><span>Background image position</span><div class="friend-property-grid"><label>Horizontal<input type="range" min="0" max="100" value="${esc(friendCardDesignState.background.positionX)}" data-background-property="positionX"></label><label>Vertical<input type="range" min="0" max="100" value="${esc(friendCardDesignState.background.positionY)}" data-background-property="positionY"></label><label>Scale<input type="range" min="50" max="300" value="${esc(friendCardDesignState.background.scale)}" data-background-property="scale"></label></div></div><label class="friend-check-row"><input type="checkbox" data-background-locked${friendCardDesignState.backgroundLocked ? ' checked' : ''}> Lock background from canvas selection</label><label class="friend-check-row"><input type="checkbox" data-show-guides${friendCardDesignState.showGuides ? ' checked' : ''}> Show safe-area guides</label></div>
        <div class="friend-editor-section"><h3>Add to card</h3><div class="friend-tool-grid"><button type="button" data-insert-layer="text">＋ Text</button><button type="button" data-insert-layer="button">▱ Button</button><button type="button" data-insert-image>＋ Image</button><button type="button" data-insert-sticker>▧ Sticker</button><button type="button" data-insert-sticker-url>↗ Image URL</button></div><div class="friend-sticker-library" data-friend-sticker-library>${friendCardStickerLibraryMarkup()}</div><input type="file" accept="image/png,image/jpeg,image/webp" data-cfc-image-input multiple hidden><input type="file" accept="image/png,image/jpeg,image/webp" data-sticker-input hidden></div>
        <details class="friend-editor-section friend-frame-section"><summary><strong>Custom 8-piece frame</strong><small>Frame images stay behind the card. Adjust overlap to tuck them under its edges; Connected mode joins the chosen corners.</small></summary><div class="friend-frame-assets">${frameNames}</div>${framePresets}<div class="friend-property-grid"><label>Default corner size<input type="number" min="1" max="30" data-frame-property="cornerSize" value="${esc(friendCardDesignState.frame.cornerSize || 9)}"></label><label>Horizontal width<input type="number" min="1" max="25" data-frame-property="horizontalThickness" value="${esc(friendCardDesignState.frame.horizontalThickness || 5)}"></label><label>Vertical width<input type="number" min="1" max="25" data-frame-property="verticalThickness" value="${esc(friendCardDesignState.frame.verticalThickness || 5)}"></label><label class="friend-frame-overlap">Overlap behind card <output data-frame-overlap-value>${esc(friendCardDesignState.frame.overlap || 0)}%</output><input type="range" min="0" max="100" step="1" data-frame-property="overlap" value="${esc(friendCardDesignState.frame.overlap || 0)}"></label><label>Side mode<select data-frame-property="sideMode">${options(['stretch','repeat','connected'],friendCardDesignState.frame.sideMode,['Stretch','Repeat','Connected'])}</select></label><label data-frame-alignment${friendCardDesignState.frame.sideMode === 'connected' ? '' : ' hidden'}>Top side alignment<select data-frame-property="alignments.top">${options(['left','center','right'],friendCardDesignState.frame.alignments.top,['Left corner','Both corners','Right corner'])}</select></label><label data-frame-alignment${friendCardDesignState.frame.sideMode === 'connected' ? '' : ' hidden'}>Bottom side alignment<select data-frame-property="alignments.bottom">${options(['left','center','right'],friendCardDesignState.frame.alignments.bottom,['Left corner','Both corners','Right corner'])}</select></label><label data-frame-alignment${friendCardDesignState.frame.sideMode === 'connected' ? '' : ' hidden'}>Left side alignment<select data-frame-property="alignments.left">${options(['top','middle','bottom'],friendCardDesignState.frame.alignments.left,['Top corner','Both corners','Bottom corner'])}</select></label><label data-frame-alignment${friendCardDesignState.frame.sideMode === 'connected' ? '' : ' hidden'}>Right side alignment<select data-frame-property="alignments.right">${options(['top','middle','bottom'],friendCardDesignState.frame.alignments.right,['Top corner','Both corners','Bottom corner'])}</select></label></div><label class="friend-check-row"><input type="checkbox" data-frame-property="visible"${friendCardDesignState.frame.visible ? ' checked' : ''}> Show frame</label></details>
        <section class="friend-editor-section friend-layer-panel"><div class="friend-panel-title"><h3>Layers</h3><span data-friend-layer-count>${friendCardDesignState.layers.length}</span></div><p class="friend-layer-summary" data-friend-layer-summary role="status"></p><p class="friend-layer-list-help">Frontmost layers are at the top. Shift-click to select several layers.</p><div class="friend-layer-list-actions"><button class="btn btn-ghost btn-sm" type="button" data-group-action="group" data-cfc-group-create>Group selected</button><button class="btn btn-ghost btn-sm" type="button" data-group-action="ungroup" data-cfc-group-ungroup>Ungroup</button></div><div data-friend-layer-list>${friendCardLayerListMarkup()}</div></section>
        <details class="friend-editor-section"><summary><strong>Image assets</strong><small>Card background and legacy frame images.</small></summary><div class="friend-card-asset-list">${imageRows}</div></details>
        <details class="friend-editor-section"><summary><strong>Font library</strong><small>Upload fonts you have permission to use.</small></summary><label class="btn btn-ghost btn-sm friend-font-upload">Upload font<input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" data-friend-font-input hidden></label><div class="friend-font-list" data-friend-font-list>${friendCardFontListMarkup()}</div></details>
      </aside><section class="friend-editor-center" aria-label="Friend-Card canvas"><div class="friend-canvas-toolbar"><div class="friend-tool-mode" role="toolbar" aria-label="Canvas tools"><button type="button" data-editor-tool="select" aria-pressed="true">↖ Select</button></div><div class="friend-canvas-zoom"><button type="button" data-zoom="out" aria-label="Zoom out">−</button><output data-zoom-label>${friendCardZoom}%</output><button type="button" data-zoom="in" aria-label="Zoom in">＋</button><button type="button" data-zoom="fit">Fit</button><button type="button" data-preview-card>Open preview</button></div><div class="friend-preview-switch" role="group" aria-label="Friend-Card viewport"><span>View:</span><button type="button" data-cfc-view-mode="all" aria-pressed="true">All layers</button><button type="button" data-cfc-view-mode="preview" aria-pressed="false">Preview</button><button type="button" data-cfc-view-mode="full" aria-pressed="false">Full view</button></div></div><div class="friend-canvas-scroll"><div class="friend-canvas-size" style="--friend-editor-zoom:${friendCardZoom / 100}"><div id="friend-card-editor-stage">${friendCardMarkup({...user,friendCard:previewCard},false,true)}</div></div></div><p class="friend-canvas-hint"><span data-cfc-required-notice role="status"></span><span>Shift-click select · G move · R rotate · S scale · Ctrl+G group · Ctrl+Shift+G ungroup · Ctrl+C/V/X copy/paste/cut · Delete remove</span></p></section>
      <aside class="friend-editor-panel friend-editor-right"><div class="friend-editor-panel-head"><div><span class="section-eyebrow">PROPERTIES</span><h2>Customize</h2></div><button type="button" class="friend-panel-collapse" aria-label="Collapse properties panel" data-collapse-editor-panel="right">›</button></div><div data-friend-properties>${friendCardLayerPropertiesMarkup()}</div><div class="friend-editor-section friend-global-style"><h3>Card appearance</h3><fieldset class="friend-card-stroke-controls" data-cfc-stroke-controls>${friendColorControl('Card stroke','friendCardBorderColor',card.borderColor)}<label>Stroke style<select name="friendCardBorderStyle">${options(['solid','dashed','dotted','double'],card.borderStyle,['Solid','Dashed','Dotted','Double'])}</select></label><label>Stroke width<select name="friendCardBorderWidth">${options(['1','2','3','4','5','6','7','8'],String(card.borderWidth))}</select></label></fieldset><p class="friend-stroke-notice" data-cfc-stroke-notice hidden>Card stroke is disabled while an 8-piece frame is visible. Hide or remove the frame to restore your stroke.</p><label>Card effect<select name="friendCardEffect">${options(['none','glow','lift','shine'],card.effect,['None','Soft glow','Lift on hover','Shine'])}</select></label><h3>Button appearance</h3>${friendColorControl('Button background','friendCardButtonColor',card.buttonColor)}${friendColorControl('Button text','friendCardButtonTextColor',card.buttonTextColor)}${friendColorControl('Button stroke','friendCardButtonBorderColor',card.buttonBorderColor)}</div></aside></div>
      <div class="friend-card-publish-row"><div><strong>${card.published ? 'Your Friend-Card is posted.' : 'Your Friend-Card is private.'}</strong><p>${card.published ? 'Saving changes will update the card shown on the Members page.' : 'It will appear in Members only after you post it.'}</p></div><div class="friend-card-editor-actions"><button class="btn btn-ghost" type="button" data-friend-save-secondary>Save Friend-Card</button><button class="btn btn-primary" type="button" data-post-friend-card>${card.published ? 'Update posted Friend-Card' : 'Post custom friend card'}</button></div><p class="form-message" id="friend-card-post-message" role="status"></p><button class="btn btn-ghost" type="button" data-cancel-edit>Back to profile</button></div></section></form>`;
  }
  function friendCardFromForm(form) {
    if (!form?.elements.friendCardLikes) return null;
    const get = name => { const input = form.elements[name]; return input ? input.value?.trim() || '' : friendCardAssetValues[name] || ''; };
    const card = {
      revision:Number(friendCardEditorContext?.revision ?? currentUser?.friendCard?.revision) || 0,likes:get('friendCardLikes'),dislikes:get('friendCardDislikes'),favoriteThing:get('friendCardFavoriteThing'),lookingFor:get('friendCardLookingFor'),personalityTags:get('friendCardPersonalityTags').split(',').map(item => item.trim()).filter(Boolean),aspectRatio:friendCardDesignState?.aspectRatio === 'custom' ? '1:1' : friendCardDesignState?.aspectRatio || get('friendCardAspectRatio'),backgroundImage:get('friendCardBackgroundImage'),backgroundColor:get('friendCardBackgroundColor'),backgroundOverlayColor:get('friendCardBackgroundOverlayColor'),backgroundOverlayOpacity:Number(get('friendCardBackgroundOverlayOpacity') || 0),borderStyle:get('friendCardBorderStyle'),borderColor:get('friendCardBorderColor'),borderWidth:Number(get('friendCardBorderWidth')),borderImage:get('friendCardBorderImage'),titleColor:get('friendCardTitleColor'),textColor:get('friendCardTextColor'),mutedTextColor:get('friendCardMutedTextColor'),tagTextColor:get('friendCardTagTextColor'),
      buttonColor:get('friendCardButtonColor'),buttonOverlayColor:get('friendCardButtonOverlayColor'),buttonOverlayOpacity:Number(get('friendCardButtonOverlayOpacity')),buttonImage:get('friendCardButtonImage'),buttonTextColor:get('friendCardButtonTextColor'),buttonBorderStyle:get('friendCardButtonBorderStyle'),buttonBorderColor:get('friendCardButtonBorderColor'),buttonBorderImage:get('friendCardButtonBorderImage'),effect:get('friendCardEffect'),design:friendCardDesignState
    };
    if (friendCardDesignState) friendCardDesignState.background = {...friendCardDesignState.background,color:card.backgroundColor,image:card.backgroundImage,tint:card.backgroundOverlayColor,tintOpacity:card.backgroundOverlayOpacity};
    return card;
  }
  function updateFriendCardEditorPreview() {
    syncFriendCardSelection();
    syncFriendCardFrameControls();
    const form = $('#friend-card-form');
    $$('[data-friend-color-hex]').forEach(input => {
      const color = input.closest('.friend-color-picker')?.querySelector('input[type="color"]');
      if (color && document.activeElement !== input) input.value = color.value.toUpperCase();
    });
    $$('[data-friend-range-output]').forEach(output => {
      const input = output.closest('.friend-range-control')?.querySelector('input[type="range"]');
      if (input) output.textContent = `${input.value}%`;
    });
    const card = friendCardFromForm(form);
    const preview = $('#friend-card-editor-stage');
    if (preview && card && currentUser) { preview.dataset.cfcViewport = friendCardViewMode; preview.innerHTML = friendCardMarkup({...currentUser,friendCard:card},friendCardViewMode === 'full',true); }
    $$('[data-cfc-view-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cfcViewMode===friendCardViewMode)));
    updateFriendCardRequirementNotice();
    updateFriendCardLayerCounts();
    requestAnimationFrame(fitFriendCardCanvas);
    const ownPreview = $('.own-friend-card-preview');
    if (ownPreview && card && currentUser) ownPreview.innerHTML = friendCardMarkup({...currentUser,friendCard:card},false,false,'own');
  }
  let friendCardActiveTool = 'select';
  let friendCardTransformMode = 'move';
  let friendCardDrag = null;
  let friendCardActiveTransform = null;
  let friendCardPointer = {x:window.innerWidth / 2,y:window.innerHeight / 2};
  let friendCardPan = null;
  function friendCardSnapshot() { return friendCardDesignState ? JSON.stringify(friendCardDesignState) : ''; }
  function recordFriendCardHistory() {
    if (!friendCardDesignState) return;
    friendCardUndoStack.push(friendCardSnapshot());
    if (friendCardUndoStack.length > 80) friendCardUndoStack.shift();
    friendCardRedoStack = [];
    const undo = $('[data-friend-undo]'), redo = $('[data-friend-redo]');
    if (undo) undo.disabled = false;
    if (redo) redo.disabled = true;
    const status = $('[data-friend-save-status]');
    if (status) status.textContent = 'Unsaved changes';
  }
  function saveFriendCardDraftLocally() {
    if (!currentUser || !friendCardDesignState) return;
    try { localStorage.setItem(friendCardDraftKey(),JSON.stringify({design:friendCardDesignState,friendCard:friendCardFromForm($('#friend-card-form')),savedAt:Date.now()})); } catch (_) {}
  }
  function repaintFriendCardEditor(options = {}) {
    syncFriendCardSelection();
    const list = $('[data-friend-layer-list]');
    if (list && options.layers !== false) list.innerHTML = friendCardLayerListMarkup();
    const fontList = $('[data-friend-font-list]');
    if (fontList) fontList.innerHTML = friendCardFontListMarkup();
    const stickerLibrary = $('[data-friend-sticker-library]');
    if (stickerLibrary) stickerLibrary.innerHTML = friendCardStickerLibraryMarkup();
    const framePresetList = $('[data-frame-preset-list]');
    if (framePresetList) framePresetList.innerHTML = friendCardFramePresetsMarkup();
    const properties = $('[data-friend-properties]');
    if (properties && options.properties !== false) properties.innerHTML = friendCardLayerPropertiesMarkup();
    if (options.canvas !== false) updateFriendCardEditorPreview();
    updateFriendCardLayerCounts();
    const undo=$('[data-friend-undo]'),redo=$('[data-friend-redo]');
    if(undo)undo.disabled=!friendCardUndoStack.length;if(redo)redo.disabled=!friendCardRedoStack.length;
    if(options.dirty !== false){
      const status=$('[data-friend-save-status]');if(status)status.textContent='Unsaved changes';
      saveFriendCardDraftLocally();
    }
  }

  function addFriendCardLayer(type) {
    if (!friendCardDesignState) return;
    if (!canAddFriendCardLayer({type})) return;
    if (friendCardDesignState.layers.length >= 80) { toast('This design has reached its 80 layer limit.'); return; }
    const count = friendCardDesignState.layers.length;
    const id = `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
    const cardColors = friendCardFromForm($('#friend-card-form'));
    const defaults = {avatar:{label:'Profile picture',x:5,y:7,width:18,height:18,fontSize:3.5,field:'avatar'},username:{label:'Username',x:27,y:9,width:60,height:12,fontSize:5,field:'username',fontFamily:'Unbounded',weight:700},textbox:{label:'Text box',text:'Write something about yourself.',x:8,y:35,width:42,height:18,fontSize:3.2},text:{label:'Text',text:'Add your text',x:32,y:35,width:38,height:15,fontSize:4.2},shape:{label:'Square',shapeStyle:'square',fill:'#f5a300',x:30,y:35,width:35,height:20,fontSize:3.2},button:{label:'Button',text:'Visit my profile',fill:cardColors?.buttonColor || '#3c315b',color:cardColors?.buttonTextColor || '#ffffff',x:30,y:74,width:40,height:10,fontSize:3},image:{label:'Image',image:'',x:20,y:25,width:40,height:30,fontSize:3.2},sticker:{label:'Sticker',image:'',x:34,y:35,width:30,height:30,fontSize:3.2}}[type];
    if (!defaults) return;
    recordFriendCardHistory();
    const layer = {id,type,...defaults,rotation:0,opacity:100,color:defaults.color || '#302344',align:'center',visible:true,visibilityMode:'both',locked:false,radius:8};
    friendCardDesignState.layers.push(layer);
    friendCardSetSelection([id]);
    repaintFriendCardEditor();
    return layer;
  }
  function updateFriendCardLayer(id, key, value, track = true) {
    const layer = friendCardDesignState?.layers.find(item => item.id === id);
    if (!layer || layer.locked) return;
    if (key === 'label' && ['avatar','username'].includes(layer.type)) return;

    if (track) recordFriendCardHistory();
    if (['x','y','width','height','rotation','fontSize','lineHeight','letterSpacing','opacity','radius','imagePositionX','imagePositionY'].includes(key)) value = Number(value);
    if (key === 'x' || key === 'y') value = friendCardLimit(value);
    if (key === 'width' || key === 'height') value = friendCardSize(value);
    if (key === 'rotation') value = Math.min(180,Math.max(-180,Number(value) || 0));
    if (key === 'fontSize') value = Math.min(14,Math.max(1,Number(value) || 1));
    if (key === 'lineHeight') value = Math.min(2.2,Math.max(.8,Number(value) || 1.2));
    if (key === 'letterSpacing') value = Math.min(2,Math.max(-.5,Number(value) || 0));
    if (key === 'opacity') value = Math.min(100,Math.max(0,Number(value) || 0));
    if (['imagePositionX','imagePositionY'].includes(key)) value = Math.min(100,Math.max(0,Number(value) || 0));
    if (key === 'text') value = String(value).slice(0,500);
    if (key === 'label') value = String(value).slice(0,80);
    if (key === 'align' && !['left','center','right'].includes(value)) return;
    const customFont = key === 'fontFamily' ? friendCardDesignState.fonts.find(font => font.family === value) : null;
    if (key === 'fontFamily' && !customFont && !['DM Sans','Unbounded','Arial','Georgia','Trebuchet MS','Verdana','Courier New','serif','sans-serif','monospace'].includes(value)) return;
    if (key === 'shapeStyle' && !['circle','rounded','rectangle','square','triangle','diamond','star','hexagon'].includes(value)) return;
    if (key === 'visibilityMode' && !['preview','full','both'].includes(value)) return;
    if (key === 'imageFit' && !['contain','cover','fill'].includes(value)) return;
    if (key === 'imageMask' && !['square','rounded','circle'].includes(value)) return;
    if (key === 'italic') value = value === true || value === 'true';
    if (key === 'weight' && ![500,700].includes(Number(value))) return;
    if (key === 'weight') value = Number(value);
    if (['color','fill'].includes(key) && !/^#[0-9a-f]{6}$/i.test(String(value))) return;
    if (key === 'fontFamily') layer.fontId = customFont?.id || '';
    if (friendCardSquareLayer(layer) && ['width','height'].includes(key)) { layer.width = value; layer.height = value; } else layer[key] = value;
    repaintFriendCardEditor({layers:false,properties:false});
  }
  function updateFriendCardLayerContent(value) {
    const layer = friendCardDesignState?.layers.find(item => item.id === friendCardSelectedLayer);
    const form = $('#friend-card-form');
    if (!layer || !form) return;
    const field = ({likes:'friendCardLikes',dislikes:'friendCardDislikes',favorite:'friendCardFavoriteThing',lookingFor:'friendCardLookingFor',tags:'friendCardPersonalityTags'})[layer.type];
    if (field && form.elements[field]) form.elements[field].value = value;
    repaintFriendCardEditor({layers:false,properties:false});
  }
  function snapFriendCardPosition(value,size,axis,id) {
    const edge = axis === 'x' ? 'x' : 'y', dimension = axis === 'x' ? 'width' : 'height';
    const candidates = [0,(100 - size) / 2,100 - size];
    for (const other of friendCardDesignState?.layers || []) {
      if ((id instanceof Set ? id.has(other.id) : other.id === id) || other.visible === false || other.type === 'eraser') continue;
      const start = Number(other[edge]) || 0, otherSize = axis === 'y' && friendCardSquareLayer(other) ? other.width * friendCardDesignState.width / friendCardDesignState.height : Number(other[dimension]) || 0;
      candidates.push(start,start + otherSize - size,start + (otherSize - size) / 2);
    }
    const nearest = candidates.sort((a,b) => Math.abs(a - value) - Math.abs(b - value))[0];
    return nearest != null && Math.abs(nearest - value) <= 1.25 ? nearest : value;
  }
  function friendCardVisibleInView(layer, mode = friendCardViewMode) {
    return layer.visible !== false && layer.type !== 'eraser' && (mode === 'all' || (layer.visibilityMode || 'both') === 'both' || layer.visibilityMode === mode);
  }
  function updateFriendCardLayerCounts() {
    if (!friendCardDesignState) return;
    const layers = friendCardDesignState.layers, visible = layers.filter(layer => friendCardVisibleInView(layer)).length;
    const count = $('[data-friend-layer-count]'); if (count) count.textContent = String(layers.length);
    const selected=friendCardSelection(),groupButton=$('[data-cfc-group-create]'),ungroupButton=$('[data-cfc-group-ungroup]');
    if(groupButton)groupButton.disabled=selected.length<2||selected.some(layer=>layer.locked);
    if(ungroupButton)ungroupButton.disabled=!selected.some(layer=>layer.groupId);
    const summary = $('[data-friend-layer-summary]');
    if (summary) summary.textContent = `${layers.length} layers · ${visible} visible in ${friendCardViewMode === 'all' ? 'All layers' : friendCardViewMode === 'full' ? 'Full view' : 'Preview'} · ${friendCardDesignState.groups?.length || 0} groups · ${friendCardSelection().length} selected`;
  }
  function friendCardMoveStack(items, selected, direction) {
    const moving = items.filter(item => selected.has(item.id)), remaining = items.filter(item => !selected.has(item.id));
    if (direction === 'front') return [...remaining,...moving];
    if (direction === 'back') return [...moving,...remaining];
    const result = items.slice();
    if (direction === 'up') {
      for(let index=result.length-2;index>=0;index--) if(selected.has(result[index].id)&&!selected.has(result[index+1].id)) [result[index],result[index+1]]=[result[index+1],result[index]];
    } else {
      for(let index=1;index<result.length;index++) if(selected.has(result[index].id)&&!selected.has(result[index-1].id)) [result[index],result[index-1]]=[result[index-1],result[index]];
    }
    return result;
  }
  function reorderFriendCardLayer(id, direction) {
    if (!friendCardDesignState || !['up','down','front','back'].includes(direction)) return;
    const selection = friendCardSelectedLayers.has(id) || !id ? friendCardSelection() : friendCardDesignState.layers.filter(layer => layer.id === id);
    if (!selection.length) return;
    const selected = new Set(selection.map(layer => layer.id)), before = friendCardSnapshot();
    const parent = selection[0].groupId, members = parent ? friendCardDesignState.layers.filter(layer => layer.groupId === parent) : [];
    if (parent && selection.every(layer => layer.groupId === parent) && selection.length < members.length && !friendCardSelectedGroup) {
      const ordered = friendCardMoveStack(members,selected,direction); let offset=0;
      friendCardDesignState.layers=friendCardDesignState.layers.map(layer => layer.groupId === parent ? ordered[offset++] : layer);
    } else {
      const units=[],seen=new Set();
      for(const layer of friendCardDesignState.layers){
        const key=layer.groupId ? 'group:'+layer.groupId : 'layer:'+layer.id;
        if(seen.has(key))continue;seen.add(key);
        units.push({id:key,layers:layer.groupId ? friendCardDesignState.layers.filter(item => item.groupId === layer.groupId) : [layer]});
      }
      const selectedUnits=new Set(units.filter(unit => unit.layers.some(layer => selected.has(layer.id))).map(unit => unit.id));
      friendCardDesignState.layers=friendCardMoveStack(units,selectedUnits,direction).flatMap(unit => unit.layers);
    }
    if (friendCardSnapshot() === before) return;
    friendCardUndoStack.push(before);if(friendCardUndoStack.length>80)friendCardUndoStack.shift();friendCardRedoStack=[];
    repaintFriendCardEditor();
  }
  function setFriendCardSelectionLocked() {
    const selected=friendCardSelection();if(!selected.length)return;
    recordFriendCardHistory();const lock=selected.some(layer=>!layer.locked);
    selected.forEach(layer=>{layer.locked=lock;});repaintFriendCardEditor();
  }
  function setFriendCardSelectionVisible() {
    const selected=friendCardSelection();if(!selected.length)return;
    recordFriendCardHistory();const visible=selected.some(layer=>layer.visible===false);
    selected.forEach(layer=>{layer.visible=visible;});repaintFriendCardEditor();
  }

  function undoFriendCard(redo = false) {
    const from = redo ? friendCardRedoStack : friendCardUndoStack;
    const to = redo ? friendCardUndoStack : friendCardRedoStack;
    if (!from.length) return;
    to.push(friendCardSnapshot());
    friendCardDesignState = normalizedFriendCardDesign(JSON.parse(from.pop()),friendCardFromForm($('#friend-card-form')) || currentUser.friendCard);
    repaintFriendCardEditor();
    $('[data-friend-undo]').disabled = !friendCardUndoStack.length;
    $('[data-friend-redo]').disabled = !friendCardRedoStack.length;
  }
  function updateFriendEditorDimension(kind, value) {
    if (!friendCardDesignState) return;
    recordFriendCardHistory();
    const number = Math.min(kind === 'width' ? 1600 : 1200,Math.max(320,Number(value) || 320));
    friendCardDesignState[kind] = number;
    friendCardDesignState.aspectRatio = 'custom';
    const ratio = $('[data-design-ratio]'); if (ratio) ratio.value = 'custom';
    const width = $('[data-design-dimension="width"]'), height = $('[data-design-dimension="height"]');
    if (width) width.value = friendCardDesignState.width;
    if (height) height.value = friendCardDesignState.height;
    repaintFriendCardEditor();
  }
  function setFriendCardZoom(direction) {
    const size = $('.friend-canvas-size'), scroller = $('.friend-canvas-scroll'), stage = $('#friend-card-editor-stage .friend-card');
    if (!size || !scroller || !stage) return;
    if (direction === 'fit') {
      size.style.setProperty('--friend-editor-zoom',1);
      const availableWidth = Math.max(1,scroller.clientWidth - 32), availableHeight = Math.max(1,scroller.clientHeight - 32);
      const bounds = $('#friend-card-editor-stage').getBoundingClientRect();
      const width = Math.max(1,bounds.width), height = Math.max(1,bounds.height);
      friendCardZoom = Math.max(35,Math.min(100,Math.floor(Math.min(availableWidth / width,availableHeight / height) * 100)));
    } else friendCardZoom = Math.min(100,Math.max(35,friendCardZoom + (direction === 'in' ? 10 : -10)));
    size.style.setProperty('--friend-editor-zoom',friendCardZoom / 100);
    const output = $('[data-zoom-label]'); if (output) output.textContent = `${friendCardZoom}%`;
  }
  async function importFriendCardImage(file) {
    const data = await compressFriendCardImage(file);
    const result = await api('/api/friend-card/asset','POST',{image:data});
    return result.url;
  }
  async function importFriendCardImageUrl(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Enter a complete HTTPS image address.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('For safety, image links must use HTTPS and contain no login details.');
    let response;
    try { response = await fetch(url.href,{mode:'cors',credentials:'omit',redirect:'follow'}); }
    catch { throw new Error('That image host does not allow browser imports. Download the image and use Add image instead.'); }
    if (!response.ok) throw new Error('The image URL could not be opened.');
    const blob = await response.blob();
    if (!/^image\/(?:jpeg|png|webp)$/.test(blob.type) || blob.size > 12 * 1024 * 1024) throw new Error('That link must point to a JPG, PNG, or WebP image smaller than 12 MB.');
    const file = new File([blob],`imported-image.${blob.type.split('/')[1]}`,{type:blob.type});
    return importFriendCardImage(file);
  }
  async function persistFriendCardAssets(card) {
    const upload = async value => {
      if (typeof value !== 'string' || !value.startsWith('data:image/')) return value;
      const result = await api('/api/friend-card/asset','POST',{image:value});
      return result.url;
    };
    const uploadFont = async (value, parent) => {
      const result = await api('/api/friend-card/font','POST',{data:value});
      parent.format = result.format;
      return result.url;
    };
    const form = $('#friend-card-form');
    for (const key of ['backgroundImage','buttonImage','borderImage','buttonBorderImage']) {
      card[key] = await upload(card[key]);
      const field = `friendCard${key[0].toUpperCase()}${key.slice(1)}`;
      if (form?.elements[field]) form.elements[field].value = card[key];
    }
    const visit = async (value, parent, key) => {
      if (typeof value === 'string') { if (value.startsWith('data:image/')) parent[key] = await upload(value); else if (value.startsWith('data:font/')) parent[key] = await uploadFont(value,parent); return; }
      if (value && typeof value === 'object') for (const entry of Object.keys(value)) await visit(value[entry],value,entry);
    };
    if (card.design) await visit(card.design,null,null);
    return card;
  }
  async function exportFriendCardPng(options = {}) {
    const stage = options.stage || $('#friend-card-editor-stage .friend-card');
    if (!stage) return;
    try { await document.fonts?.ready; } catch (_) {}
    const design=options.design||friendCardDesignState;
    const width = design.width, height = design.height;
    let clone = (stage.closest('.friend-card-frame-stack') || stage).cloneNode(true);
    if(!options.stage && $('#friend-card-form')){const template=document.createElement('template');template.innerHTML=friendCardMarkup({...currentUser,friendCard:friendCardFromForm($('#friend-card-form'))},friendCardViewMode==='full',false);clone=template.content.querySelector('.friend-card-frame-stack,.friend-card');}
    clone.style.overflow='visible';
    clone.style.width = `${width}px`; clone.style.height = `${height}px`; clone.style.aspectRatio = 'auto'; clone.style.maxWidth = 'none';
    const surface = clone.matches('.friend-card') ? clone : clone.querySelector('.friend-card');
    if (surface !== clone) { surface.style.width = '100%'; surface.style.height = '100%'; surface.style.maxWidth = 'none'; surface.style.margin = '0'; }
    surface.classList.remove('friend-show-guides');
    clone.querySelectorAll('.friend-layer-resize,.friend-layer-rotate').forEach(handle => handle.remove());
    clone.querySelectorAll('.friend-card-layer').forEach(layer => { layer.classList.remove('is-selected'); layer.removeAttribute('data-editor-layer'); layer.removeAttribute('tabindex'); layer.removeAttribute('aria-label'); });
    clone.querySelectorAll('button[disabled]').forEach(button => button.removeAttribute('disabled'));
    const toDataUrl = async url => { const response = await fetch(url); if (!response.ok) throw new Error('Asset unavailable'); const blob = await response.blob(); return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); };
    try {
      for (const image of clone.querySelectorAll('img[src]')) if(!image.src.startsWith('data:')) image.src = await toDataUrl(image.src);
      for (const element of clone.querySelectorAll('[style]')) {
        const declarations = element.style.cssText;
        const matches = [...declarations.matchAll(/url\(["']?([^"')]+)["']?\)/g)].filter(match=>!match[1].startsWith('data:'));
        let updated = declarations;
        for (const match of matches) updated = updated.replace(match[1],await toDataUrl(match[1]));
        element.style.cssText = updated;
      }
    } catch (_) { toast('PNG export could not load an image. Check your connection and try again.'); return; }
    const insets = friendCardFrameInsets(design);
    const padding = {top:Math.ceil(insets.top * height / 100),right:Math.ceil(insets.right * width / 100),bottom:Math.ceil(insets.bottom * height / 100),left:Math.ceil(insets.left * width / 100)};
    const exportWidth = width + padding.left + padding.right, exportHeight = height + padding.top + padding.bottom;
    clone.style.position = 'absolute'; clone.style.left = `${padding.left}px`; clone.style.top = `${padding.top}px`; clone.style.margin = '0';
    const markup = clone.outerHTML;
    const css = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText); } catch (_) { return []; } }).join('\n');
    let fontCss = '';
    try {
      for (const font of design.fonts || []) {
        const asset = await bytesFromAsset(font.url,true); let binary = '';
        for (let start = 0; start < asset.bytes.length; start += 0x8000) binary += String.fromCharCode(...asset.bytes.subarray(start,start + 0x8000));
        const format = ({woff2:'woff2',woff:'woff',ttf:'truetype',otf:'opentype'})[font.format] || 'woff2';
        fontCss += `@font-face{font-family:'${font.family}';src:url('data:${asset.mime};base64,${btoa(binary)}') format('${format}');font-display:block}`;
      }
    } catch (_) { toast('PNG export could not load one of your uploaded fonts.'); return; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:100%;height:100%"><style>${css}${fontCss}</style>${markup}</div></foreignObject></svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), image = new Image();
    try {
      await new Promise((resolve,reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = exportWidth; canvas.height = exportHeight;
      const context = canvas.getContext('2d'); if (!context) throw new Error('PNG export is not available in this browser.');
      context.drawImage(image,0,0,exportWidth,exportHeight);
      const png = await new Promise((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The PNG could not be created.')),'image/png'));
      if(options.download===false)return png;
      const link = document.createElement('a'); link.href = URL.createObjectURL(png); link.download = `${friendCardDesignState.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'friend-card'}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href),1500);
    } catch (_) { toast('PNG export could not render one of the images. Try re-uploading that image and export again.'); }
    finally { URL.revokeObjectURL(url); }
  }
  const crc32Table = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
  function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
  function concatBytes(parts) { const size = parts.reduce((sum,part) => sum + part.length,0), output = new Uint8Array(size); let offset = 0; for (const part of parts) { output.set(part,offset); offset += part.length; } return output; }
  function makeZipStore(files) {
    const encoder = new TextEncoder(), local = [], central = []; let offset = 0;
    const now = new Date(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2), date = ((Math.max(1980,now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const file of files) {
      const name = encoder.encode(file.name), bytes = file.bytes, crc = crc32(bytes);
      const localHeader = new Uint8Array(30 + name.length), localView = new DataView(localHeader.buffer);
      localView.setUint32(0,0x04034b50,true); localView.setUint16(4,20,true); localView.setUint16(6,0,true); localView.setUint16(8,0,true); localView.setUint16(10,time,true); localView.setUint16(12,date,true); localView.setUint32(14,crc,true); localView.setUint32(18,bytes.length,true); localView.setUint32(22,bytes.length,true); localView.setUint16(26,name.length,true); localView.setUint16(28,0,true); localHeader.set(name,30); local.push(localHeader,bytes);
      const entry = new Uint8Array(46 + name.length), view = new DataView(entry.buffer);
      view.setUint32(0,0x02014b50,true); view.setUint16(4,20,true); view.setUint16(6,20,true); view.setUint16(8,0,true); view.setUint16(10,0,true); view.setUint16(12,time,true); view.setUint16(14,date,true); view.setUint32(16,crc,true); view.setUint32(20,bytes.length,true); view.setUint32(24,bytes.length,true); view.setUint16(28,name.length,true); view.setUint16(30,0,true); view.setUint16(32,0,true); view.setUint16(34,0,true); view.setUint16(36,0,true); view.setUint32(38,0,true); view.setUint32(42,offset,true); entry.set(name,46); central.push(entry); offset += localHeader.length + bytes.length;
    }
    const directory = concatBytes(central), end = new Uint8Array(22), view = new DataView(end.buffer);
    view.setUint32(0,0x06054b50,true); view.setUint16(4,0,true); view.setUint16(6,0,true); view.setUint16(8,files.length,true); view.setUint16(10,files.length,true); view.setUint32(12,directory.length,true); view.setUint32(16,offset,true); view.setUint16(20,0,true);
    return concatBytes([...local,directory,end]);
  }
  function unzipStore(bytes) {
    const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), decoder = new TextDecoder(), files = new Map(); let offset = 0, total = 0;
    while (offset + 30 <= bytes.length && view.getUint32(offset,true) === 0x04034b50) {
      if (files.size >= 100) throw new Error('This design has too many files.');
      const method = view.getUint16(offset + 8,true), expectedCrc = view.getUint32(offset + 14,true), compressed = view.getUint32(offset + 18,true), uncompressed = view.getUint32(offset + 22,true), nameLength = view.getUint16(offset + 26,true), extraLength = view.getUint16(offset + 28,true);
      if (method !== 0 || compressed !== uncompressed || uncompressed > 1_000_000) throw new Error('This Friend-Card package uses an unsupported compression method or large asset.');
      const name = decoder.decode(bytes.subarray(offset + 30,offset + 30 + nameLength));
      if (name.startsWith('/') || name.includes('..') || name.includes('\\') || !/^[A-Za-z0-9_.\/-]+$/.test(name)) throw new Error('This design contains an unsafe file path.');
      const start = offset + 30 + nameLength + extraLength, end = start + compressed;
      if (end > bytes.length) throw new Error('This Friend-Card package is incomplete.');
      const content = bytes.slice(start,end); total += content.length; if (total > 5_000_000) throw new Error('This Friend-Card package is larger than 5 MB.');
      if (crc32(content) !== expectedCrc) throw new Error('This Friend-Card package contains a damaged asset.');
      if (files.has(name)) throw new Error('This Friend-Card package has duplicate file names.');
      files.set(name,content); offset = end;
    }
    if (!files.size) throw new Error('This file is not a supported Friend-Card package.');
    return files;
  }
  async function bytesFromAsset(value, font = false) {
    if (value.startsWith('data:image/')) { const match = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value); if (!match) throw new Error('A design image is not valid.'); return {mime:match[1],bytes:Uint8Array.from(atob(match[2]),char => char.charCodeAt(0))}; }
    if (value.startsWith('data:font/')) { const match = /^data:(font\/(?:woff2|woff|ttf|otf));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value); if (!match) throw new Error('A design font is not valid.'); return {mime:match[1],bytes:Uint8Array.from(atob(match[2]),char => char.charCodeAt(0))}; }
    const response = await fetch(value); if (!response.ok) throw new Error('An image could not be fetched for the portable design file.');
    const blob = await response.blob();
    if (font && /^font\/(?:woff2|woff|ttf|otf)$/.test(blob.type)) return {mime:blob.type,bytes:new Uint8Array(await blob.arrayBuffer())};
    if (!font && /^image\/(?:webp|png|jpeg)$/.test(blob.type)) return {mime:blob.type,bytes:new Uint8Array(await blob.arrayBuffer())};
    throw new Error(font ? 'A design font could not be fetched for the portable file.' : 'A design asset is not a supported image.');
  }
  async function dataUrlFromBytes(bytes,mime) { let binary = ''; for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start,start + 0x8000)); return `data:${mime};base64,${btoa(binary)}`; }
  async function exportFriendCardDesign() {
    const card = friendCardFromForm($('#friend-card-form'));
    const design = JSON.parse(JSON.stringify(friendCardDesignState));
    card.design = design;
    const manifest = {format:'solaris-custom-friend-card',version:1,exportedAt:new Date().toISOString(),friendCard:card,design}, files = [];
    const collect = async (value,parent,key) => {
      if (typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('data:font/') || value.startsWith('/api/friend-card/assets/') || value.startsWith('/api/friend-card/fonts/') || value.startsWith('https://firebasestorage.googleapis.com/'))) {
        const isFont = key === 'url' && Boolean(parent?.format), asset = await bytesFromAsset(value,isFont), extension = asset.mime.split('/')[1] === 'jpeg' ? 'jpg' : asset.mime.split('/')[1], name = `assets/${isFont ? 'font' : 'asset'}-${String(files.length + 1).padStart(3,'0')}.${extension}`;
        files.push({name,bytes:asset.bytes}); parent[key] = `asset://${name}`; return;
      }
      if (value && typeof value === 'object') for (const child of Object.keys(value)) await collect(value[child],value,child);
    };
    try {
      await collect(manifest,null,null);
    } catch (error) { toast(error.message); return; }
    files.unshift({name:'manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest))});
    const blob = new Blob([makeZipStore(files)],{type:'application/vnd.solaris.friend-card'});
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${friendCardDesignState.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'friend-card'}.hcfc`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href),1500);
  }
  async function importFriendCardDesign(file) {
    if (!file || file.size > 5_000_000) throw new Error('Choose a Friend-Card design smaller than 5 MB.');
    const archive = unzipStore(new Uint8Array(await file.arrayBuffer())), manifestBytes = archive.get('manifest.json');
    if (!manifestBytes) throw new Error('This design package has no manifest.');
    const data = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (data?.format !== 'solaris-custom-friend-card' || data.version !== 1 || !data.design || !Array.isArray(data.design.layers)) throw new Error('This is not a supported Helunemi Friend-Card design.');
    if (data.design.layers.length > 80) throw new Error('This design has more layers than Helunemi supports.');
    const hydrate = async (value,parent,key,depth = 0) => {
      if (depth > 24) throw new Error('This Friend-Card package has an unsupported nesting depth.');
      if (typeof value === 'string' && value.startsWith('asset://')) {
        const name = value.slice(8), bytes = archive.get(name);
        if (!name.startsWith('assets/') || name.includes('..') || name.includes('\\')) throw new Error('This design contains an unsafe asset path.');
        if (!bytes) throw new Error(`This design is missing ${name}.`);
        const extension = name.split('.').pop(), isFont = key === 'url', mime = isFont && ['woff2','woff','ttf','otf'].includes(extension) ? `font/${extension}` : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : '';
        if (!mime) throw new Error('This package has an unsupported image format.');
        parent[key] = await dataUrlFromBytes(bytes,mime); return;
      }
      if (value && typeof value === 'object') for (const child of Object.keys(value)) await hydrate(value[child],value,child,depth + 1);
    };
    await hydrate(data,null,null);
    recordFriendCardHistory();
    friendCardDesignState = normalizedFriendCardDesign(data.design,normalizedFriendCard(data.friendCard));
    friendCardSetSelection([friendCardDesignState.layers[0]?.id].filter(Boolean));
    const form = $('#friend-card-form');
    const imported = data.friendCard || {};
    for (const [key,value] of Object.entries(imported)) {
      const field = `friendCard${key[0]?.toUpperCase()}${key.slice(1)}`;
      if (form.elements[field] && typeof value === 'string') form.elements[field].value = value;
    }
    const ratio = $('[data-design-ratio]'); if (ratio) ratio.value = friendCardDesignState.aspectRatio;
    repaintFriendCardEditor();
  }
  async function compressFriendCardImage(file) {
    if (!file || !/^image\/(?:jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
    if (typeof createImageBitmap !== 'function') throw new Error('Image editing is not supported in this browser.');
    const bitmap = await createImageBitmap(file);
    try {
      for (const scale of [1,.82,.66,.5,.38]) {
        const factor = Math.min(scale,1400/bitmap.width,1000/bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1,Math.round(bitmap.width*factor));
        canvas.height = Math.max(1,Math.round(bitmap.height*factor));
        const context = canvas.getContext('2d');
        if (!context) break;
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        for (const quality of [.82,.68,.54,.42]) {
          const data = canvas.toDataURL('image/webp',quality);
          if (data.length <= 390_000 && /^data:image\/(?:webp|jpeg|png);base64,/.test(data)) return data;
        }
      }
    } finally { bitmap.close?.(); }
    throw new Error('This image could not be resized enough. Try a smaller image.');
  }
  async function readFriendCardAsset(file) {
    if (!file) throw new Error('Choose an image first.');
    if (file.name.toLowerCase().endsWith('.stk')) {
      if (file.size > 450_000) throw new Error('Choose a .stk file smaller than 450 KB.');
      const payload = JSON.parse(await file.text());
      const image = payload?.format === 'solaris-stroke-v1' ? payload.image : '';
      if (typeof image !== 'string' || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 390_000) throw new Error('This .stk file is not a supported Helunemi stroke asset.');
      const result = await api('/api/friend-card/asset','POST',{image});
      return result.url;
    }
    const image = await compressFriendCardImage(file);
    const result = await api('/api/friend-card/asset','POST',{image});
    return result.url;
  }
  async function importFriendCardFont(file) {
    if (!file || file.size > 1_500_000) throw new Error('Choose a font file smaller than 1.5 MB.');
    const format = file.name.toLowerCase().split('.').pop();
    if (!['woff2','woff','ttf','otf'].includes(format)) throw new Error('Use a WOFF2, WOFF, TTF, or OTF font file.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = ''; for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start,start + 0x8000));
    const data = `data:font/${format};base64,${btoa(binary)}`;
    const result = await api('/api/friend-card/font','POST',{data}), id = `font-${crypto.randomUUID()}`;
    return {id,name:file.name.replace(/\.[^.]+$/,'').slice(0,80),family:`SolarisFont-${id}`,url:result.url,format:result.format};
  }
  function exportFriendCardStk(field) {
    const image = $('#friend-card-form')?.elements[field]?.value;
    if (!image) return;
    const blob = new Blob([JSON.stringify({format:'solaris-stroke-v1',image})],{type:'application/vnd.solaris.stroke+json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${field.replace(/^friendCard/,'').replace(/Image$/,'').toLowerCase()}.stk`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href),1000);
  }
  async function saveFriendCardChanges(publish, button) {
    if (friendCardActiveTransform) commitFriendCardTransform();
    let friendCard=friendCardFromForm($('#friend-card-form'));if(!friendCard)return;
    const problem=friendCardIdentityMessage(friendCard);
    if(problem){updateFriendCardRequirementNotice();setMessage('#friend-card-post-message',problem);toast(problem);return;}
    const controls=$$('[data-friend-save],[data-post-friend-card],[data-friend-save-secondary]');
    if(controls.some(control=>control.disabled))return;
    controls.forEach(control=>control.disabled=true);
    const form=$('#friend-card-form');form.inert=true;form.setAttribute('aria-busy','true');friendCardDrag=null;
    const oldContextId=friendCardEditorContext?.id;
    const previousDraftKey=friendCardDraftKey();
    try{
      friendCard=await persistFriendCardAssets(friendCard);friendCardDesignState=friendCard.design;
      const context=friendCardEditorContext;
      const result=await api(publish?'/api/member-friend-card/post':'/api/member-friend-card/save',publish?'POST':'PUT',{friendCard,cardId:context?.id||'current',createNew:Boolean(context&&!context.id),expectedRevision:Number(context?.revision??currentUser?.friendCard?.revision)||0});
      currentUser=result.user;
      if(result.card){
        friendCardEditorContext=result.card;friendCardDesignState=result.card.friendCard.design;
        for(const [key,value] of Object.entries(result.card.friendCard)){const field=form.elements.namedItem('friendCard'+key[0].toUpperCase()+key.slice(1));if(field&&typeof value==='string')field.value=value;}
        friendCardAssetValues={friendCardButtonImage:result.card.friendCard.buttonImage||'',friendCardButtonBorderImage:result.card.friendCard.buttonBorderImage||''};
        updateFriendCardEditorPreview();
      }
      try{localStorage.removeItem(previousDraftKey);if(oldContextId==='current')localStorage.removeItem(`solaris-friend-card-draft:${currentUser.id}`);}catch{}
      profilePreview();const savedStatus=$('[data-friend-save-status]');if(savedStatus)savedStatus.textContent='Saved to your account';
      const postButton=$('[data-post-friend-card]');if(postButton)postButton.textContent=result.card?.published?'Update posted Friend-Card':'Post custom friend card';
      setMessage('#friend-card-post-message',result.message,false);updateFriendCardRequirementNotice();
      if(result.card?.published)await loadMemberProfiles();
    }catch(error){setMessage('#friend-card-post-message',error.message);toast(error.message);}
    finally{form.inert=false;form.removeAttribute('aria-busy');controls.forEach(control=>control.disabled=false);}
  }

  function fitFriendCardViewer(dialog) {
    const viewport = $('[data-cfc-view-viewport]',dialog), plane = $('[data-cfc-view-plane]',dialog), surface = $('[data-cfc-view-surface]',dialog);
    const design = dialog.friendCardViewerDesign;
    if (!viewport || !plane || !surface || !design || !dialog.open) return;
    const ratio = design.width / Math.max(1,design.height);
    // The surface fits independently of decorative frame dimensions.
    const width = Math.max(1,Math.floor(Math.min(680,design.width,Math.max(1,viewport.clientWidth - 48),Math.max(1,viewport.clientHeight - 48) * ratio)));
    const height = width / ratio, insets = friendCardFrameInsets(design);
    const horizontal = Math.max(insets.left,insets.right) * width / 100 + 24;
    const vertical = Math.max(insets.top,insets.bottom) * height / 100 + 24;
    surface.style.width = `${width}px`;
    plane.style.minWidth = `${Math.ceil(width + 2 * horizontal)}px`;
    plane.style.minHeight = `${Math.ceil(height + 2 * vertical)}px`;
    viewport.scrollLeft = Math.max(0,(viewport.scrollWidth - viewport.clientWidth) / 2);
    viewport.scrollTop = Math.max(0,(viewport.scrollHeight - viewport.clientHeight) / 2);
  }
  function openFriendCardDialog(member,initialView = 'full',passive = false) {
    let dialog = $('#friend-card-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'friend-card-dialog'; dialog.className = 'friend-card-dialog';
      dialog.setAttribute('aria-label','Friend-Card viewer');
      dialog.innerHTML = '<button class="friend-card-dialog-close" type="button" data-close-friend-card aria-label="Close Friend-Card">×</button><div id="friend-card-dialog-content"></div>';
      dialog.addEventListener('click',event => {
        if (event.target === dialog || event.target.matches('[data-cfc-view-viewport],[data-cfc-view-plane]')) dialog.close();
      });
      window.addEventListener('resize',() => { if (dialog.open) fitFriendCardViewer(dialog); });
      document.body.append(dialog);
    }
    const content = $('#friend-card-dialog-content',dialog), editing = Boolean($('#friend-card-form')), readonly = editing || passive;
    const card = normalizedFriendCard(member.friendCard);
    dialog.friendCardViewerDesign = normalizedFriendCardDesign(card.design,card);
    const paint = mode => {
      content.innerHTML = `<div class="friend-preview-switch friend-dialog-view-switch" role="group" aria-label="Friend-Card view"><button type="button" data-dialog-cfc-view="preview" aria-pressed="${mode === 'preview'}">Preview</button><button type="button" data-dialog-cfc-view="full" aria-pressed="${mode === 'full'}">Full view</button></div><div class="friend-card-view-viewport" data-cfc-view-viewport><div class="friend-card-view-plane" data-cfc-view-plane><div class="friend-card-view-surface" data-cfc-view-surface${readonly ? ' inert' : ''}>${friendCardMarkup(member,mode === 'full')}</div></div></div><div class="friend-card-view-actions">${readonly ? '' : communityFriendAction(member)}</div>`;
      requestAnimationFrame(() => fitFriendCardViewer(dialog));
    };
    content.onclick = event => { const button = event.target.closest('[data-dialog-cfc-view]'); if (button) paint(button.dataset.dialogCfcView); };
    paint(initialView === 'preview' ? 'preview' : 'full');
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => fitFriendCardViewer(dialog));
  }


  async function loadMemberProfiles() {
    const grid = $('#member-card-grid');
    try {
      const result = await api('/api/members');
      memberProfiles = result.members || [];
      if (grid) {
        renderMemberCardGrid();
      }
      updateGlobalSearchResults();
    } catch (error) {
      if (grid) {
        grid.innerHTML = '';
        setMessage('#member-card-message',error.message || 'Member cards could not be loaded. Please refresh the page.');
      }
    }
  }
  function filterFriendCards(value) {
    const query = String(value || '').trim().toLowerCase();
    let shown = 0;
    $$('[data-friend-member]').forEach(card => { const entry = card.closest('[data-friend-entry]') || card; entry.hidden = !card.dataset.friendSearch.toLowerCase().includes(query); if (!entry.hidden) shown++; });
    const empty = $('#member-card-empty');
    if (empty) {
      empty.hidden = shown > 0;
      const postedCount = memberProfiles.filter(member => member.friendCard?.published === true).length;
      empty.textContent = postedCount ? 'No posted Friend-Cards match that search.' : 'No custom Friend-Cards have been posted yet.';
    }
  }
  function communityFriendAction(member) {
    if (currentUser?.id === member.id) return '';
    if (!currentUser) return `<a class="community-add-friend" href="account.html?mode=login">Log in to add friend</a>`;
    const id = esc(member.id), friends = communityData.friends || [], sent = communityData.friendRequestsSent || [], received = communityData.friendRequestsReceived || [];
    if (friends.some(person => person.id === member.id)) return `<a class="community-add-friend is-done" href="chat.html?with=${encodeURIComponent(member.id)}">Message</a>`;
    if (sent.some(person => person.id === member.id)) return '<button class="community-add-friend is-pending" type="button" disabled>Request sent</button>';
    if (received.some(person => person.id === member.id)) return `<button class="community-add-friend" type="button" data-community-respond="${id}" data-community-accept="true">Accept request</button>`;
    return `<button class="community-add-friend" type="button" data-community-add-friend="${id}">Add Friend</button>`;
  }
  function renderMemberCardGrid() {
    const grid = $('#member-card-grid');
    if (!grid) return;
    const postedCards = memberProfiles.filter(member => member.friendCard?.published === true);
    grid.innerHTML = postedCards.map(member => `<div class="friend-card-entry" data-friend-entry>${friendCardMarkup(member)}<div class="friend-entry-actions"><button class="btn btn-ghost btn-sm" type="button" data-open-friend-card="${esc(member.id)}">Open Friend-Card</button>${communityFriendAction(member)}</div></div>`).join('');
    filterFriendCards($('[data-friend-search]')?.value || '');
  }
  function isCurrentUserStaff() {
    return currentUser?.accountRole === 'owner' || ['assistant','ai-assistant','developer'].includes(currentUser?.primaryRole);
  }
  function setQuickMenuOpen(open, focusLink = '') {
    const panel = $('#quick-menu-panel'), toggle = $('#quick-menu-toggle');
    if (!panel || !toggle) return;
    if (open) { closeProfile(); closeGlobalSearch(); }
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close quick menu' : 'Open quick menu');
    if (open && focusLink) {
      const links = $$('a', panel);
      (focusLink === 'last' ? links.at(-1) : links[0])?.focus();
    }
  }
  function closeQuickMenu(restoreFocus = false) {
    const panel = $('#quick-menu-panel');
    if (!panel || panel.hidden) return false;
    setQuickMenuOpen(false);
    if (restoreFocus) $('#quick-menu-toggle')?.focus();
    return true;
  }
  function ensureCommunityMessenger() {
    if (page === 'chat') {
      document.body.classList.add('community-page-body');
      $('#site-quick-menu')?.remove();
      return;
    }
    if ($('#site-quick-menu')) return;
    const menu = document.createElement('div');
    menu.id = 'site-quick-menu'; menu.className = 'quick-menu';
    menu.innerHTML = `<button class="quick-menu-toggle" id="quick-menu-toggle" type="button" data-quick-menu-toggle aria-label="Open quick menu" aria-expanded="false" aria-controls="quick-menu-panel" title="Menu"><span class="quick-menu-icon" aria-hidden="true"></span></button><nav class="quick-menu-panel" id="quick-menu-panel" aria-label="Quick links" hidden><a href="chat.html" data-quick-menu-link><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z"></path><path d="M7 11h8M7 15h5"></path></svg><span>Community</span></a><a href="explore-ais.html" data-quick-menu-link${page === 'explore-ais' ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"></path></svg><span>Explore AIs</span></a></nav>`;
    document.body.append(menu);
    $('#quick-menu-toggle', menu).addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowUp'].includes(event.key)) return;
      event.preventDefault(); setQuickMenuOpen(true, event.key === 'ArrowUp' ? 'last' : 'first');
    });
    menu.addEventListener('focusout', event => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) closeQuickMenu();
    });
  }

  function renderCommunitySidebar() {
    const sidebar = $('[data-community-sidebar]');
    if (!sidebar) return;
    if (!currentUser) {
      sidebar.innerHTML = '<p class="community-sidebar-kicker">COMMUNITY</p><p class="community-signin-hint">Sign in to chat with friends and send requests.</p><a class="btn btn-primary" href="account.html?mode=login">Log in</a><a class="btn btn-ghost" href="account.html?mode=signup">Create account</a>';
      return;
    }
    const requests = communityData.friendRequestsReceived || [];
    const friends = communityData.friends || [];
    sidebar.innerHTML = `<p class="community-sidebar-kicker">YOUR SPACE</p><button class="community-nav-item${communityPane === 'home' ? ' is-active' : ''}" type="button" data-community-pane="home"><span>✦</span> Overview</button><button class="community-nav-item${communityPane === 'requests' ? ' is-active' : ''}" type="button" data-community-pane="requests"><span>♧</span> Friend requests${requests.length ? `<b>${requests.length}</b>` : ''}</button>${isCurrentUserStaff() ? `<button class="community-nav-item${communityPane === 'reports' ? ' is-active' : ''}" type="button" data-community-pane="reports"><span>⚑</span> Studio reports${communityData.bugReports?.length ? `<b>${communityData.bugReports.filter(report => report.status === 'open').length}</b>` : ''}</button>` : ''}<div class="community-friends-heading"><span>FRIENDS</span><b>${friends.length}</b></div><div class="community-friend-list">${friends.length ? friends.map(person => `<button class="community-friend-item${communityPane === 'chat' && communityConversationId === person.id ? ' is-active' : ''}" type="button" data-community-chat="${esc(person.id)}">${avatar(person.username,'community-avatar',person.avatarImage)}<span><strong>${esc(person.username)}</strong><small>${esc(person.primaryRole)}</small></span><i class="${person.online ? 'is-online' : 'is-offline'}" title="${person.online ? 'Online' : 'Offline'}"></i></button>`).join('') : '<p class="community-no-friends">Accepted friends appear here. Visit the Members page to send a request.</p>'}</div><button class="community-report-launch" type="button" data-community-pane="report"><span>⚑</span><span><strong>Report a bug</strong><small>Send a note to the studio team</small></span><b>↗</b></button>`;
  }
  function renderCommunityMessages(messages) {
    const list = $('.community-message-list');
    if (!list) return;
    const existing = new Set($$('.community-message[data-message-id]',list).map(item => item.dataset.messageId));
    list.innerHTML = messages.length ? messages.map(message => {
      const type = message.type || 'text', isMine = message.senderId === currentUser?.id;
      let body = type === 'image' || type === 'gif' ? `<img class="chat-media-image${type === 'gif' ? ' is-gif' : ''}" src="${esc(message.mediaUrl)}" alt="${type === 'gif' ? 'Animated GIF' : 'Image shared in chat'}" loading="lazy">` : type === 'voice' ? `<audio class="chat-voice-player" controls preload="metadata" src="${esc(message.mediaUrl)}">Your browser cannot play this voice message.</audio>` : type === 'sticker' ? (message.mediaUrl ? `<img class="chat-sticker-image" src="${esc(message.mediaUrl)}" alt="Sticker" loading="lazy">` : `<div class="chat-sticker-message" aria-label="Sticker">${esc(message.text)}</div>`) : `<p>${esc(message.text).replace(/\n/g,'<br>')}</p>`;
      const animate = !existing.has(message.id) && Date.now() - Number(message.createdAt) < 5000;
      return `<article class="community-message${isMine ? ' is-mine' : ''}${animate ? ' is-new' : ''}" data-message-id="${esc(message.id)}"><span class="community-message-author">${isMine ? 'You' : esc(communityData.friends.find(person => person.id === message.senderId)?.username || 'Friend')}</span>${body}${message.caption ? `<p class="chat-media-caption">${esc(message.caption)}</p>` : ''}<time>${new Date(message.createdAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</time></article>`;
    }).join('') : '<p class="community-empty-chat">This is the start of your conversation. Say hello!</p>';
    list.scrollTop = list.scrollHeight;
  }
  async function loadCommunityConversation(id) {
    const main = $('[data-community-main]'), person = communityData.friends.find(friend => friend.id === id);
    if (!main || !person) return;
    if (communitySettingsConversationId !== id) {
      communitySettingsConversationId = id;
      loadCommunityChatSettings();
    }
    main.classList.add('is-chat-view');
    applyCommunityChatSettings();
    main.innerHTML = `<header class="community-pane-heading">${avatar(person.username,'community-avatar',person.avatarImage)}<div><h2>${esc(person.username)}</h2><p><i class="chat-online-dot${person.online ? ' is-online' : ''}"></i><span data-friend-presence>${person.online ? 'Online' : 'Offline'}</span> · ${esc(person.primaryRole)}</p></div><a href="account.html?user=${encodeURIComponent(person.id)}">View profile ↗</a><button class="chat-settings-button" type="button" data-chat-settings aria-label="Chat appearance settings">⚙</button></header><div class="community-message-list" aria-live="polite"></div><div class="chat-composer-wrap"><div class="chat-sticker-panel" data-chat-sticker-panel hidden><span>Send a sticker</span><div>${['✨','🌞','💖','🥺','🌙','🎮','🎉','🐈','❄️','⭐','💬','🫶'].map(sticker => `<button type="button" data-chat-sticker="${sticker}" aria-label="Send sticker ${sticker}">${sticker}</button>`).join('')}<button type="button" data-chat-file-open="sticker" aria-label="Upload a sticker image" title="Upload your own sticker">＋</button></div></div><form class="community-composer" id="community-message-form"><div class="chat-composer-tools"><button type="button" data-chat-file-open="image" aria-label="Send image" title="Send image">▧</button><button type="button" data-chat-file-open="gif" aria-label="Send GIF" title="Send GIF">GIF</button><button type="button" data-chat-sticker-toggle aria-label="Choose sticker" title="Choose sticker">✦</button><button type="button" data-chat-voice aria-label="Record voice message" title="Record voice message">🎙</button><input type="file" data-chat-file="image" accept="image/png,image/jpeg,image/webp" hidden><input type="file" data-chat-file="gif" accept="image/gif" hidden><input type="file" data-chat-file="sticker" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div><label class="visually-hidden" for="community-message-input">Message ${esc(person.username)}</label><textarea id="community-message-input" name="text" rows="1" maxlength="2000" placeholder="Message ${esc(person.username)}…"></textarea><button class="btn btn-primary" type="submit" aria-label="Send message">Send <span aria-hidden="true">↑</span></button><span class="chat-voice-status" data-chat-voice-status aria-live="polite"></span></form></div><aside class="chat-settings-panel" data-chat-settings-panel hidden></aside>`;
    try { const result = await api(`/api/community/messages?with=${encodeURIComponent(id)}`); renderCommunityMessages(result.messages || []); }
    catch (error) { main.querySelector('.community-message-list').innerHTML = `<p class="community-inline-error">${esc(error.message)}</p>`; }
  }
  async function renderCommunityPane() {
    const main = $('[data-community-main]');
    if (!main) return;
    main.classList.remove('is-chat-view');
    if (communityPane !== 'chat' || !currentUser || !communityConversationId) clearCommunityChatSettingsScope(main);
    if (!currentUser) {
      main.innerHTML = `<div class="community-welcome community-gate"><span class="community-welcome-mark">✦</span><p class="section-eyebrow">HELUNEMI COMMUNITY</p><h1>Make a little room for connection.</h1><p>Sign in to chat with friends, accept requests, and send a bug report to the studio.</p><div><a class="btn btn-primary" href="account.html?mode=login">Log in</a><a class="btn btn-ghost" href="account.html?mode=signup">Sign up</a></div></div>`;
      return;
    }
    if (communityPane === 'chat') { await loadCommunityConversation(communityConversationId); return; }
    if (communityPane === 'report') {
      main.innerHTML = `<section class="community-form-panel"><p class="section-eyebrow">HELP IMPROVE HELUNEMI</p><h1>Report a bug or issue</h1><p>Share what went wrong and where you saw it. The report goes to the Helunemi owner and active studio team.</p><form id="community-report-form"><label>Short title<input name="title" maxlength="120" required placeholder="A few words describing the issue"></label><label>What happened?<textarea name="details" rows="7" maxlength="4000" required placeholder="What did you expect, and what happened instead?"></textarea></label><input type="hidden" name="page" value="${esc(location.pathname + location.search)}"><p class="form-message" data-community-report-message role="status"></p><div><button type="button" class="btn btn-ghost" data-community-pane="home">Cancel</button><button type="submit" class="btn btn-primary">Send report</button></div></form></section>`;
      return;
    }
    if (communityPane === 'requests') {
      const requests = communityData.friendRequestsReceived || [];
      main.innerHTML = `<section class="community-form-panel community-requests-panel"><p class="section-eyebrow">PEOPLE YOU MAY KNOW</p><h1>Friend requests</h1><p>Accept a request to start chatting. You can also meet members on the Members page.</p>${requests.length ? `<div class="community-request-list">${requests.map(person => `<article class="community-request-card">${avatar(person.username,'community-avatar',person.avatarImage)}<div><strong>${esc(person.username)}</strong><small>${esc(person.primaryRole)}</small></div><button class="btn btn-primary btn-sm" type="button" data-community-respond="${esc(person.id)}" data-community-accept="true">Accept</button><button class="btn btn-ghost btn-sm" type="button" data-community-respond="${esc(person.id)}" data-community-accept="false">Decline</button></article>`).join('')}</div>` : '<div class="community-empty-state"><span>♧</span><h2>No requests yet</h2><p>When someone sends you a friend request, it will appear here.</p><a class="btn btn-ghost" href="members.html">Explore members</a></div>'}</section>`;
      return;
    }
    if (communityPane === 'reports' && isCurrentUserStaff()) {
      let reports = communityData.bugReports || [];
      try { reports = (await api('/api/community/bug-reports')).reports || reports; communityData.bugReports = reports; }
      catch (error) { main.innerHTML = `<p class="community-inline-error">${esc(error.message)}</p>`; return; }
      main.innerHTML = `<section class="community-form-panel community-reports-panel"><p class="section-eyebrow">STUDIO INBOX</p><h1>Bug reports</h1><p>Reports sent by Helunemi accounts are visible to the active studio team.</p>${reports.length ? `<div class="community-report-list">${[...reports].reverse().map(report => `<article class="community-report-card"><div><span class="community-report-status${report.status === 'resolved' ? ' is-resolved' : ''}">${esc(report.status)}</span><time>${new Date(report.createdAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</time></div><h2>${esc(report.title)}</h2><p>${esc(report.details).replace(/\n/g,'<br>')}</p><small>From <a href="account.html?user=${encodeURIComponent(report.reporterId)}">${esc(report.reporterName)}</a> · ${esc(report.page || 'Site')}</small></article>`).join('')}</div>` : '<div class="community-empty-state"><span>⚑</span><h2>Nothing to review</h2><p>New community reports will show up here.</p></div>'}</section>`;
      return;
    }
    main.innerHTML = `<section class="community-welcome"><span class="community-welcome-mark">✦</span><p class="section-eyebrow">HELUNEMI COMMUNITY</p><h1>Good things grow when we build together.</h1><p>Chat with accepted friends, make new connections from Member Friend-Cards, or send a bug report directly to the Helunemi team.</p><div class="community-home-actions"><button class="btn btn-primary" type="button" data-community-pane="report">Report a bug</button><a class="btn btn-ghost" href="members.html">Find members</a></div></section><section class="community-home-stats"><article><span>♧</span><strong>${communityData.friends?.length || 0}</strong><small>friends</small></article><article><span>↗</span><strong>${communityData.friendRequestsReceived?.length || 0}</strong><small>requests</small></article><article><span>✦</span><strong>${communityData.bugReports?.filter(report => report.status === 'open').length || 0}</strong><small>open studio reports</small></article></section>`;
  }
  function renderCommunityUI() {
    ensureCommunityMessenger(); renderCommunitySidebar(); renderCommunityPane();
  }
  function communityChatSettingsKey() {
    return `solaris-chat-settings:${encodeURIComponent(currentUser?.id || 'guest')}:${encodeURIComponent(communityConversationId || 'none')}`;
  }
  function clearCommunityChatSettingsScope(main = $('[data-community-main]')) {
    communitySettingsConversationId = '';
    communityChatSettings = {...defaultCommunityChatSettings};
    if (!main) return;
    ['--chat-bg','--chat-own-bubble','--chat-friend-bubble','--chat-message-text','--chat-font-size','--chat-font-family','--chat-wallpaper-image'].forEach(property => main.style.removeProperty(property));
    main.classList.remove('chat-compact');
    delete main.dataset.chatAnimation;
  }
  function applyCommunityChatSettings() {
    const panel = $('[data-community-main]'), settings = communityChatSettings;
    if (!panel || !panel.classList.contains('is-chat-view')) return;
    panel.style.setProperty('--chat-bg',settings.background);
    panel.style.setProperty('--chat-own-bubble',settings.ownBubble);
    panel.style.setProperty('--chat-friend-bubble',settings.friendBubble);
    panel.style.setProperty('--chat-message-text',settings.text);
    panel.style.setProperty('--chat-font-size',`${settings.fontSize}px`);
    panel.style.setProperty('--chat-font-family',settings.fontFamily);
    panel.style.setProperty('--chat-wallpaper-image',settings.wallpaper ? `url("${settings.wallpaper}")` : 'none');
    panel.classList.toggle('chat-compact',settings.compact);
    panel.dataset.chatAnimation = settings.animation;
  }
  function loadCommunityChatSettings() {
    communityChatSettings = {...defaultCommunityChatSettings};
    try {
      const saved = JSON.parse(localStorage.getItem(communityChatSettingsKey()) || '{}');
      communityChatSettings = {...communityChatSettings,...saved};
      if (!/^#[\da-f]{6}$/i.test(communityChatSettings.background)) communityChatSettings.background = '#111017';
      if (!/^#[\da-f]{6}$/i.test(communityChatSettings.ownBubble)) communityChatSettings.ownBubble = '#342442';
      if (!/^#[\da-f]{6}$/i.test(communityChatSettings.friendBubble)) communityChatSettings.friendBubble = '#24212a';
      if (!/^#[\da-f]{6}$/i.test(communityChatSettings.text)) communityChatSettings.text = '#f7f2ff';
      communityChatSettings.fontSize = Math.min(20,Math.max(13,Number(communityChatSettings.fontSize) || 15));
      if (!['DM Sans','Georgia','monospace'].includes(communityChatSettings.fontFamily)) communityChatSettings.fontFamily = 'DM Sans';
      if (!['pop','fade','slide','none'].includes(communityChatSettings.animation)) communityChatSettings.animation = 'pop';
      if (typeof communityChatSettings.wallpaper !== 'string' || !communityChatSettings.wallpaper.startsWith('data:image/')) communityChatSettings.wallpaper = '';
    } catch (_) {}
    applyCommunityChatSettings();
  }
  function saveCommunityChatSettings() {
    try { localStorage.setItem(communityChatSettingsKey(),JSON.stringify(communityChatSettings)); }
    catch (_) { toast('These appearance settings could not be saved in this browser.'); }
    applyCommunityChatSettings();
  }
  function renderCommunityChatSettings() {
    const panel = $('[data-chat-settings-panel]');
    if (!panel) return;
    panel.innerHTML = `<div class="chat-settings-heading"><div><span class="section-eyebrow">YOUR CHAT SPACE</span><h2>Appearance</h2></div><button type="button" data-chat-settings-close aria-label="Close settings">×</button></div><div class="chat-settings-fields"><label>Chat background<input type="color" data-chat-setting="background" value="${esc(communityChatSettings.background)}"></label><label>Your bubble<input type="color" data-chat-setting="ownBubble" value="${esc(communityChatSettings.ownBubble)}"></label><label>Friend bubble<input type="color" data-chat-setting="friendBubble" value="${esc(communityChatSettings.friendBubble)}"></label><label>Message text<input type="color" data-chat-setting="text" value="${esc(communityChatSettings.text)}"></label><label class="chat-range-setting">Text size <output data-chat-font-output>${communityChatSettings.fontSize}px</output><input type="range" min="13" max="20" step="1" data-chat-setting="fontSize" value="${communityChatSettings.fontSize}"></label><label>Message font<select data-chat-setting="fontFamily"><option${communityChatSettings.fontFamily === 'DM Sans' ? ' selected' : ''}>DM Sans</option><option${communityChatSettings.fontFamily === 'Georgia' ? ' selected' : ''}>Georgia</option><option${communityChatSettings.fontFamily === 'monospace' ? ' selected' : ''}>monospace</option></select></label><label>New message animation<select data-chat-setting="animation"><option value="pop"${communityChatSettings.animation === 'pop' ? ' selected' : ''}>Soft pop</option><option value="fade"${communityChatSettings.animation === 'fade' ? ' selected' : ''}>Fade in</option><option value="slide"${communityChatSettings.animation === 'slide' ? ' selected' : ''}>Slide in</option><option value="none"${communityChatSettings.animation === 'none' ? ' selected' : ''}>None</option></select></label><label class="chat-wallpaper-setting">Chat wallpaper <input type="file" data-chat-wallpaper accept="image/png,image/jpeg,image/webp"></label><label class="chat-compact-setting"><input type="checkbox" data-chat-setting="compact"${communityChatSettings.compact ? ' checked' : ''}> Compact message spacing</label><button type="button" class="btn btn-ghost btn-sm" data-chat-wallpaper-clear${communityChatSettings.wallpaper ? '' : ' hidden'}>Remove wallpaper</button></div><div class="chat-coming-soon"><span>Custom chat bubbles</span><strong>Coming soon~</strong><p>Build a bubble style that feels like yours. This option is planned for a future update.</p></div>`;
  }
  async function initializeCommunityPage() {
    communityPane = 'home';
    communityConversationId = '';
    clearCommunityChatSettingsScope();
    renderCommunityUI();
    if (!currentUser) return;
    const requestedFriend = new URLSearchParams(location.search).get('with') || '';
    try {
      await api('/api/community/presence','POST',{});
      const result = await api('/api/community');
      communityData = result.community || communityData;
      const initialFriend = communityData.friends?.some(person => person.id === requestedFriend) ? requestedFriend : communityData.friends?.[0]?.id;
      if (initialFriend) { communityPane = 'chat'; communityConversationId = initialFriend; }
      renderCommunitySidebar();
      if (communityPane === 'chat') await loadCommunityConversation(communityConversationId);
      else await renderCommunityPane();
    } catch (error) { toast(error.message); }
    clearInterval(communityRefreshTimer);
    communityRefreshTimer = setInterval(async () => {
      if (!currentUser || document.visibilityState === 'hidden') return;
      try {
        await api('/api/community/presence','POST',{});
        const result = await api('/api/community');
        communityData = result.community || communityData;
        renderCommunitySidebar();
        if (communityPane === 'chat' && communityConversationId) {
          const person = communityData.friends.find(friend => friend.id === communityConversationId);
          const label = $('[data-friend-presence]');
          if (!person) { communityPane = 'home'; communityConversationId = ''; await renderCommunityPane(); }
          else {
            if (label) label.textContent = person.online ? 'Online' : 'Offline';
            $('.chat-online-dot')?.classList.toggle('is-online',person.online === true);
            const messages = await api(`/api/community/messages?with=${encodeURIComponent(communityConversationId)}`);
            renderCommunityMessages(messages.messages || []);
          }
        }
      } catch (_) {}
    },12000);
  }
  async function sendCommunityMedia(file, kind, caption = '') {
    if (!communityConversationId || !file) return;
    const status = $('[data-chat-voice-status]');
    try {
      const largeImage = file.type.startsWith('image/') && file.type !== 'image/gif';
      if (file.size > (largeImage ? 12_000_000 : 1_800_000)) throw new Error(largeImage ? 'Choose an image smaller than 12 MB.' : 'Choose a file smaller than 1.8 MB.');
      if (status) status.textContent = 'Uploading…';
      let data = await readAsDataUrl(file);
      if (['image','sticker'].includes(kind) && file.type !== 'image/gif') data = await compressChatImage(data);
      if (kind === 'voice') data = data.replace(/^data:audio\/webm;codecs=[^;]+;base64,/,'data:audio/webm;base64,').replace(/^data:audio\/ogg;codecs=[^;]+;base64,/,'data:audio/ogg;base64,');
      const upload = await api('/api/community/asset','POST',{recipientId:communityConversationId,kind,data});
      await api('/api/community/message','POST',{recipientId:communityConversationId,type:kind === 'gif' ? 'gif' : kind,mediaUrl:upload.url,mediaPath:upload.path,text:'',caption:caption.slice(0,240)});
      const result = await api(`/api/community/messages?with=${encodeURIComponent(communityConversationId)}`);
      renderCommunityMessages(result.messages || []);
      if (status) status.textContent = '';
      const textInput = $('#community-message-input'); if (textInput) textInput.value = '';
    } catch (error) { if (status) status.textContent = ''; toast(error.message); }
  }
  function readAsDataUrl(file) {
    return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('The selected file could not be read.')); reader.readAsDataURL(file); });
  }
  async function compressChatImage(dataUrl) {
    const image = new Image();
    await new Promise((resolve,reject) => { image.onload = resolve; image.onerror = () => reject(new Error('That image could not be opened.')); image.src = dataUrl; });
    const scale = Math.min(1,1600 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not prepare that image.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for (const quality of [.86,.75,.64,.53]) { const output = canvas.toDataURL('image/webp',quality); if (output.length < 2_400_000) return output; }
    throw new Error('That image is too large after resizing. Choose a smaller image.');
  }
  async function sendCommunitySticker(sticker) {
    if (!communityConversationId) return;
    try {
      await api('/api/community/message','POST',{recipientId:communityConversationId,type:'sticker',text:sticker});
      const result = await api(`/api/community/messages?with=${encodeURIComponent(communityConversationId)}`);
      renderCommunityMessages(result.messages || []);
      $('[data-chat-sticker-panel]')?.setAttribute('hidden','');
    } catch (error) { toast(error.message); }
  }
  async function refreshCommunity() {
    if (!currentUser) { communityData = {friends:[],friendRequestsSent:[],friendRequestsReceived:[],bugReports:[]}; renderCommunityUI(); renderMemberCardGrid(); return; }
    try {
      const result = await api('/api/community'); communityData = result.community || communityData;
      renderCommunitySidebar(); renderMemberCardGrid();
      if (page === 'chat' && communityPane !== 'chat') renderCommunityPane();
    } catch (error) { if (page === 'chat') toast(error.message); }
  }
  async function updateCommunityFriendRequest(button) {
    button.disabled = true;
    try {
      const result = await api('/api/community/friend-request','POST',{recipientId:button.dataset.communityAddFriend});
      communityData = result.community; renderCommunitySidebar(); renderMemberCardGrid(); toast(result.message);
    } catch (error) { toast(error.message); button.disabled = false; }
  }
  async function respondToCommunityRequest(button) {
    button.disabled = true;
    try {
      const result = await api('/api/community/friend-response','POST',{requesterId:button.dataset.communityRespond,accept:button.dataset.communityAccept === 'true'});
      communityData = result.community; renderCommunitySidebar(); renderCommunityPane(); renderMemberCardGrid(); toast(result.message);
    } catch (error) { toast(error.message); button.disabled = false; }
  }
  function favoriteCard(type, item) {
    if (!item?.title) return '';
    const game = type === 'game' ? gameByName(item.title) : null;
    const art = type === 'artwork' ? DATA.arts.find(entry => entry.title === item.title) : null;
    const artworkClass = type === 'game' ? `favorite-cover cover-${game?.cover || 'frost'}` : `favorite-icon favorite-icon-${type}`;
    const icon = type === 'game' ? `<span class="${artworkClass}" aria-hidden="true">${game?.icon ? `<img src="${esc(game.icon)}" alt="">` : `<b>${esc(item.title.slice(0,1))}</b>`}</span>` : art ? `<span class="favorite-cover favorite-artwork-cover" aria-hidden="true"><img src="${esc(art.image)}" alt=""></span>` : `<span class="${artworkClass}" aria-hidden="true">${favoriteIcon(type)}</span>`;
    return `<article class="favorite-card">${icon}<div class="favorite-copy"><span class="favorite-type">Favorite ${esc(type)}</span><strong>${esc(item.title)}</strong><p>${esc(item.comment || 'No comment added.')}</p></div></article>`;
  }
  function socialsMarkup(socials) {
    const items = Array.isArray(socials) ? socials.filter(item => item?.label && item?.url) : [];
    return items.length ? `<ul class="social-list">${items.map(item => `<li><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span class="social-icon" aria-hidden="true">${esc(socialIcon(item.label))}</span><span><b>${esc(item.label)}</b><small>${esc(item.url.replace(/^https:\/\//, '').replace(/\/$/, ''))}</small></span></a></li>`).join('')}</ul>` : '<p class="empty-inline">No social accounts added yet.</p>';
  }
  function profilePreview() {
    ensureCommunityMessenger();
    if (page === 'chat') return;
    if (currentUser) refreshCommunity();
    const button = $('#profile-button');
    const popover = $('#profile-popover');
    if (!currentUser) {
      if (isGuest) {
        button.innerHTML = avatar('Visitor','guest-avatar');
        button.setAttribute('aria-label','Open Visitor profile preview');
        popover.innerHTML = `<div class="profile-pop-hero guest-pop-hero"><div class="profile-pop-banner guest-pop-banner"><span>VISITOR</span></div><div class="profile-pop-head">${avatar('Visitor','guest-avatar')}<div class="profile-pop-identity"><strong>Visitor</strong><span class="profile-pop-bio">Browsing Helunemi as a guest</span><span class="profile-role-chip">Visitor</span></div></div></div><a class="btn btn-primary profile-view" href="account.html?guest=1">View guest profile</a>`;
        return;
      }
      button.innerHTML = avatar('Guest');
      button.setAttribute('aria-label', 'Open account sign-in preview');
      popover.innerHTML = `<div class="profile-pop-head">${avatar('Guest')}<div><strong>Welcome to Helunemi</strong><span>Sign in or create a profile</span></div></div>
        <p class="profile-pop-note">Create an account to add your bio, social links, and favorites.</p><div class="profile-pop-actions"><a class="btn btn-ghost btn-sm" href="account.html?mode=login">Log in</a><a class="btn btn-primary btn-sm" href="account.html?mode=signup">Sign up</a></div>`;
      return;
    }
    button.innerHTML = avatar(currentUser.username, '', currentUser.avatarImage);
    button.setAttribute('aria-label', `Open ${currentUser.username} profile preview`);
    const favs = favoritesFor(currentUser);
    const cards = [['game',favs.game],['developer',favs.developer],['artwork',favs.artwork]].map(([type,item]) => favoriteCard(type,item)).filter(Boolean).join('');
    const installed = currentUser.installedGames?.length ? `<div class="preview-section"><h3>Installed games</h3><div class="tag-list">${currentUser.installedGames.map(game => `<span class="tag">${esc(game)}</span>`).join('')}</div></div>` : '';
    const socials = currentUser.socials?.length ? `<div class="preview-section"><h3>Social accounts</h3>${socialsMarkup(currentUser.socials)}</div>` : '';
    const favorites = cards ? `<div class="preview-section"><h3>Favorites</h3><div class="favorite-list">${cards}</div></div>` : '';
    const bio = currentUser.bio || 'No bio added yet.';
    const pronouns = currentUser.pronouns ? `<span class="profile-pop-pronouns">${esc(currentUser.pronouns)}</span>` : '';
    const note = noteControl(currentUser.notes, 'note-control-pop');
    popover.innerHTML = `<div class="profile-pop-hero"><div class="profile-pop-banner">${bannerImage(currentUser.bannerImage)}</div>${note}
      <div class="profile-pop-head">${avatar(currentUser.username, '', currentUser.avatarImage)}<div class="profile-pop-identity"><strong>${esc(currentUser.username)}</strong><span class="profile-pop-bio">${esc(bio)}</span>${pronouns}</div></div></div>
      <div class="profile-pop-content">${socials}${favorites}${installed}${(!socials && !favorites && !installed) ? '<p class="profile-pop-note">Add social accounts, favorites, and installed games from your profile page.</p>' : ''}</div>
      <a class="btn btn-primary profile-view" href="account.html">View full account</a>`;
  }

  const ownerPostFields = {
    games: [
      {key:'name',label:'Game title',required:true}, {key:'subtitle',label:'Subtitle'}, {key:'genre',label:'Genre',required:true},
      {key:'status',label:'Project status',type:'select',required:true,options:['In Development','Future project','Beta','Released']},
      {key:'version',label:'Version'}, {key:'cover',label:'Card theme',type:'select',options:['frost','collide']},
      {key:'icon',label:'Game icon',type:'image'}, {key:'banner',label:'Project banner',type:'image'},
      {key:'blurb',label:'Short summary',type:'textarea',required:true,placeholder:'A short overview shown on game cards.'},
      {key:'details',label:'Project details',type:'textarea',required:true,placeholder:'The main project description shown on its details page.'},
      {key:'worldIntro',label:'World introduction',type:'textarea'},{key:'playerIntro',label:'Player introduction',type:'textarea'},{key:'releasePlan',label:'Release plans',type:'textarea'}
    ],
    arts: [
      {key:'title',label:'Artwork title',required:true}, {key:'description',label:'Description',type:'textarea'}, {key:'image',label:'Artwork image',type:'image',required:true},
      {key:'credit',label:'Artist / creator credit',maxLength:300,placeholder:'Artist name, creator, or studio'},
      {key:'type',label:'Artwork type',required:true,placeholder:'Concept art, game icon…'},
      {key:'shape',label:'Image shape',type:'select',options:['square','icon','banner','circle']},
      {key:'projectId',label:'Related game',type:'games'}, {key:'mainTag',label:'Main tag',required:true},
      {key:'tags',label:'Tags',type:'text',placeholder:'Separate tags with commas'}
    ],
    updates: [
      {key:'title',label:'Update title',required:true}, {key:'category',label:'Update type',type:'select',required:true,options:['Game','Website','Release','Beta','New game','Studio','Other']},
      {key:'gameId',label:'Related game',type:'games'}, {key:'content',label:'Update text',type:'textarea',required:true}
    ],
    downloads: [
      {key:'title',label:'Extra title',required:true}, {key:'category',label:'Type',type:'select',required:true,options:['Plugins & tools','Mods & add-ons','Skins','Other']},
      {key:'gameId',label:'For game',type:'games'}, {key:'version',label:'Version'},
      {key:'image',label:'Cover image URL',placeholder:'https://…'}, {key:'downloadUrl',label:'Download link',required:true,placeholder:'https://…'},
      {key:'description',label:'Description',type:'textarea',required:true}
    ]
  };
  const ownerPostSectionLabels = {games:'Games',arts:'Arts',updates:'Updates',downloads:'Downloads'};
  const ownerPostActionLabels = {games:'Add a Game',arts:'Add Artwork',updates:'Post an Update',downloads:'Add a Download'};
  function ownerPageMenu(section) {
    if (currentUser?.accountRole !== 'owner') return '';
    return `<details class="owner-page-menu"><summary aria-label="Publishing options" title="Publishing options"><span aria-hidden="true">⋮</span></summary><div class="owner-page-menu-popover"><a href="publish.html?type=${section}">${ownerPostActionLabels[section]}</a></div></details>`;
  }
  function ownerPageHeading(section, title, description) {
    return `<div class="page-head page-head-with-menu"><div><h1>${title}</h1><p>${description}</p></div>${ownerPageMenu(section)}</div>`;
  }
  function ownerFieldMarkup(section, field) {
    const controlName = field.key;
    let control;
    if (field.type === 'textarea') control = `<textarea name="${controlName}" rows="4"${field.required ? ' required' : ''} placeholder="${esc(field.placeholder || '')}"></textarea>`;
    else if (field.type === 'select') control = `<select name="${controlName}"${field.required ? ' required' : ''}>${(field.options || []).map((option,index) => `<option value="${esc(option)}"${index === 0 ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    else if (field.type === 'games') control = `<select name="${controlName}"><option value="">No game selected</option>${DATA.games.map(game => `<option value="${esc(game.id)}">${esc(game.name)}</option>`).join('')}</select>`;
    else if (field.type === 'image') control = `<div class="owner-image-import"><input type="hidden" name="${controlName}" data-owner-image-value="${controlName}"><label class="owner-image-picker"><input type="file" accept="image/png,image/jpeg,image/webp" data-owner-image-import="${controlName}" data-owner-image-required="${field.required ? 'true' : 'false'}"><span class="btn btn-ghost btn-sm">Choose image</span><span class="owner-image-hint">PNG, JPG, or WebP · imported into Helunemi</span></label><div class="owner-image-preview-wrap"><img data-owner-image-preview="${controlName}" alt="${esc(field.label)} preview" hidden><button class="btn btn-ghost btn-sm" type="button" data-owner-image-clear="${controlName}" hidden>Remove image</button></div></div>`;
    else control = `<input name="${controlName}" type="text" maxlength="${field.maxLength || (field.key === 'tags' ? 1800 : 1200)}"${field.required ? ' required' : ''} placeholder="${esc(field.placeholder || '')}">`;
    if (field.type === 'image') return `<div class="owner-post-field owner-post-field-image${field.required ? ' is-required' : ''}"><span>${esc(field.label)}${field.required ? ' <i>Required</i>' : ''}</span>${control}</div>`;
    return `<label class="owner-post-field${field.type === 'textarea' ? ' is-wide' : ''}">${esc(field.label)}${control}</label>`;
  }
  function ownerTextContainerMarkup(item = {}) {
    return `<article class="owner-dynamic-row" data-game-text-container><div class="owner-dynamic-row-head"><strong>Text container</strong><button class="btn btn-ghost btn-sm" type="button" data-remove-game-text>Remove</button></div><label class="owner-post-field">Container title<input type="text" maxlength="100" data-game-text-field="title" value="${esc(item.title || '')}" placeholder="For example: Story, features, or development notes"></label><label class="owner-post-field is-wide">Text<textarea rows="4" maxlength="10000" data-game-text-field="body" placeholder="Write this section's text.">${esc(item.body || '')}</textarea></label></article>`;
  }
  function ownerContentManager(section) {
    const editId=new URLSearchParams(location.search).get('edit');
    if(currentUser?.accountRole!=='owner'&&!contentPermissions[section]?.includes(editId))return '';
    const posts = (ownerPosts[section] || []).filter(post=>currentUser?.accountRole==='owner'||contentPermissions[section]?.includes(post.id));
    requestAnimationFrame(()=>{if(editId){const button=$(`[data-owner-post-edit="${section}"][data-post-id="${CSS.escape(editId)}"]`);if(button)fillOwnerPostForm(button);}});
    const cards = posts.length ? posts.map(post => {
      const title = post.name || post.title || 'Untitled post';
      const detail = section === 'games' ? `${post.status} · ${post.genre}` : section === 'updates' ? (post.category || 'Studio update') : section === 'downloads' ? post.category : (post.type || 'Artwork');
      return `<article class="owner-post-row"><span><strong>${esc(title)}</strong><small>${esc(detail || '')}</small></span><span class="owner-post-row-actions">${section === 'games' ? `<a class="btn btn-ghost btn-sm" href="publish.html?type=game-builds&amp;gameId=${encodeURIComponent(post.id)}">Manage downloads</a>` : ''}<button class="btn btn-ghost btn-sm" type="button" data-owner-post-edit="${section}" data-post-id="${esc(post.id)}">Edit</button><button class="btn btn-danger btn-sm" type="button" data-owner-post-delete="${section}" data-post-id="${esc(post.id)}">Delete</button></span></article>`;
    }).join('') : '<p class="owner-post-empty">No posts here yet. Publish the first one below.</p>';
    const extraEditors = section === 'games' ? `<section class="owner-extra-editor"><div><h4>Additional project text</h4><p>Short summary and Project details are already included above. Add optional sections only when you need them.</p></div><div class="owner-dynamic-list" data-game-text-list></div><h4>Screenshots</h4><div class="owner-screenshot-list" data-owner-screenshots></div><label class="btn btn-ghost btn-sm">Import screenshots<input type="file" accept="image/png,image/jpeg,image/webp" multiple data-owner-screenshot-import hidden></label><button class="btn btn-ghost" type="button" data-add-game-text-container>Add text container</button></section>` : '';
    return `<section class="owner-publishing" aria-label="Owner publishing tools for ${ownerPostSectionLabels[section]}"><div class="owner-publishing-heading"><div><span class="section-eyebrow">OWNER PUBLISHING</span><h2>Manage ${ownerPostSectionLabels[section]}</h2><p>Your posts are saved with Helunemi site data.</p></div></div><div class="owner-post-list">${cards}</div><form class="owner-post-form" data-owner-content-form data-section="${section}"><input type="hidden" name="id"><h3 data-owner-form-title>Post a new ${section === 'games' ? 'game' : section === 'arts' ? 'artwork' : section === 'updates' ? 'update' : 'download'}</h3><div class="owner-post-fields">${ownerPostFields[section].map(field => ownerFieldMarkup(section,field)).join('')}</div>${extraEditors}<div class="owner-post-form-actions"><button class="btn btn-primary" type="submit" data-owner-form-submit>Publish post</button><button class="btn btn-ghost" type="button" data-owner-post-cancel hidden>Cancel edit</button><span class="form-message" data-owner-post-message role="status"></span></div></form></section>`;
  }
  function applyOwnerPosts(content) {
    ownerPosts = { deletedBuiltins:Array.isArray(content?.deletedBuiltins)?content.deletedBuiltins:[], games:Array.isArray(content?.games) ? content.games : [], arts:Array.isArray(content?.arts) ? content.arts : [], updates:Array.isArray(content?.updates) ? content.updates : [], downloads:Array.isArray(content?.downloads) ? content.downloads : [], gameBuilds:Array.isArray(content?.gameBuilds) ? content.gameBuilds : [] };
    const merge=(base,posts)=>[...new Map([...base,...posts].map(item=>[item.id,item])).values()].filter(item=>!ownerPosts.deletedBuiltins.includes(item.id));
    DATA.games=merge(originalCatalog.games,ownerPosts.games).map(game=>({...game,_ownerManaged:true}));
    DATA.games = DATA.games.map(game => ({...game,gameDownloads:ownerPosts.gameBuilds.filter(build => build.gameId === game.id)}));
    DATA.arts=merge(originalCatalog.arts,ownerPosts.arts).map(art=>({...art,_ownerManaged:true}));
  }
  async function loadOwnerPosts() {
    const result = await api('/api/site-content');
    contentPermissions=result.permissions||contentPermissions;uploadStorageStatus=result.storage||null;
    applyOwnerPosts(result.content);
    if(page==='publish'&&new URLSearchParams(location.search).get('type')==='game-builds'){const gameId=new URLSearchParams(location.search).get('gameId');try{const manager=await api('/api/owner/game-builds?gameId='+encodeURIComponent(gameId));ownerPosts.gameBuilds=ownerPosts.gameBuilds.filter(build=>build.gameId!==gameId).concat(manager.builds);uploadStorageStatus=manager.storage;}catch(error){toast(error.message);}}
    if (['home','games','project','arts','artwork','updates','download','publish'].includes(page)) renderPage();
  }
  function ownerPostFromForm(form) {
    const raw = Object.fromEntries(new FormData(form));
    const section = form.dataset.section, existing = raw.id ? ownerPosts[section]?.find(item => item.id === raw.id) : null;
    const post = {...(existing || {}),...raw};
    if (section === 'games') {
      post.cover = raw.cover || 'frost';
      post.screenshots=$$('[data-owner-screenshot]',form).map(image=>image.src);
      post.textContainers = $$('[data-game-text-container]',form).map(row => ({title:$('[data-game-text-field="title"]',row).value.trim(),body:$('[data-game-text-field="body"]',row).value.trim()})).filter(item => item.title || item.body);
    }
    if (section === 'arts') post.tags = String(raw.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
    return post;
  }
  function setOwnerImagePreview(form, key, value) {
    const hidden = $(`[data-owner-image-value="${key}"]`,form), preview = $(`[data-owner-image-preview="${key}"]`,form), clear = $(`[data-owner-image-clear="${key}"]`,form);
    if (hidden) hidden.value = value || '';
    if (preview) { preview.src = value || ''; preview.hidden = !value; }
    if (clear) clear.hidden = !value;
  }
  function fillOwnerPostForm(button) {
    const section = button.dataset.ownerPostEdit, post = ownerPosts[section]?.find(item => item.id === button.dataset.postId);
    const form = $(`[data-owner-content-form][data-section="${section}"]`);
    if (!form || !post) return;
    for (const field of ownerPostFields[section]) {
      const input = form.elements.namedItem(field.key);
      if (!input) continue;
      const value = post[field.key] ?? '';
      if (field.type === 'image') setOwnerImagePreview(form,field.key,value);
      else if (field.key === 'tags') input.value = Array.isArray(value) ? value.join(', ') : value;
      else input.value = value;
    }
    if (section === 'games') {
      $('[data-game-text-list]',form).innerHTML = (post.textContainers || []).map(ownerTextContainerMarkup).join('');
      $('[data-owner-screenshots]',form).innerHTML=(post.screenshots||[]).map(ownerScreenshotMarkup).join('');
    }
    form.elements.id.value = post.id;
    $('[data-owner-form-title]',form).textContent = `Edit ${section === 'games' ? 'game' : section === 'arts' ? 'artwork' : section === 'updates' ? 'update' : 'download'}`;
    $('[data-owner-form-submit]',form).textContent = 'Save changes';
    $('[data-owner-post-cancel]',form).hidden = false;
    form.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function ownerScreenshotMarkup(image){return `<div class="owner-screenshot-item"><img src="${esc(image)}" data-owner-screenshot alt="Game screenshot"><button type="button" class="icon-btn" data-remove-screenshot aria-label="Remove screenshot">×</button></div>`;}
  function resetOwnerPostForm(form) {
    form.reset();
    form.elements.id.value = '';
    $$('[data-owner-image-value]',form).forEach(input => setOwnerImagePreview(form,input.dataset.ownerImageValue,''));
    const textList = $('[data-game-text-list]',form);
    if (textList) textList.innerHTML = '';
    $('[data-owner-screenshots]',form)?.replaceChildren();
    $('[data-owner-form-title]',form).textContent = `Post a new ${form.dataset.section === 'games' ? 'game' : form.dataset.section === 'arts' ? 'artwork' : form.dataset.section === 'updates' ? 'update' : 'download'}`;
    $('[data-owner-form-submit]',form).textContent = 'Publish post';
    $('[data-owner-post-cancel]',form).hidden = true;
    const message = $('[data-owner-post-message]',form); message.textContent = ''; message.className = 'form-message';
  }
  async function saveOwnerPostForm(form) {
    const section = form.dataset.section, message = $('[data-owner-post-message]',form), button = $('[data-owner-form-submit]',form);
    if(currentUser?.accountRole!=='owner'&&!contentPermissions[section]?.includes(form.elements.id.value)){toast('You do not have permission to edit this content.');return;}
    button.disabled = true; message.textContent = 'Saving…'; message.className = 'form-message';
    try {
      const post = ownerPostFromForm(form);
      if (section === 'games' && !post.id && (!post.icon || !post.banner)) throw new Error('Import both a game icon and a project banner before publishing.');
      if (section === 'arts' && !post.image) throw new Error('Import an artwork image before publishing.');
      if (section === 'games' && post.textContainers.some(item => !item.title || !item.body)) throw new Error('Add a title and text to each additional text container, or remove the empty one.');
      if (!post.id) post.id = `owner-${({games:'game',arts:'art',updates:'update',downloads:'download'})[section]}-${crypto.randomUUID()}`;
      const index = (ownerPosts[section] || []).findIndex(item => item.id === post.id);
      const result = await api('/api/owner/site-content','PUT',{section,post});
      applyOwnerPosts(result.content); renderPage(); toast(index >= 0 ? 'Your post has been updated.' : 'Your post is now published.');
    } catch (error) { message.textContent = error.message; message.classList.add('is-error'); }
    finally { button.disabled = false; }
  }
  async function deleteOwnerPost(button) {
    if(currentUser?.accountRole!=='owner'&&!contentPermissions[button.dataset.ownerPostDelete]?.includes(button.dataset.postId)){toast('You do not have permission to remove this content.');return;}
    const section = button.dataset.ownerPostDelete, post = ownerPosts[section]?.find(item => item.id === button.dataset.postId);
    if (!post || !window.confirm(`Delete “${post.name || post.title}” from ${ownerPostSectionLabels[section]}? This cannot be undone.`)) return;
    button.disabled = true;
    try {
      const result = await api('/api/owner/site-content','PUT',{section,id:post.id,delete:true});
      applyOwnerPosts(result.content); renderPage(); toast('The post has been removed.');
    } catch (error) { toast(error.message); button.disabled = false; }
  }
  const gameBuildAccept = {windows:'.exe,.msi',android:'.apk',other:'.zip,.dmg,.appimage,.deb,.rpm,.7z,.tgz,.tar.gz,.tar.xz'};
  function formatGameBuildSize(size) {
    const bytes = Number(size) || 0;
    if (bytes < 1024 ** 2) return `${Math.max(1,Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 ** 2 >= 1024 ? bytes / 1024 ** 3 : bytes / 1024 ** 2).toFixed(1)} ${bytes / 1024 ** 2 >= 1024 ? 'GB' : 'MB'}`;
  }
  function gameBuildDownloadButton(item) {
    const external = Boolean(item.downloadUrl);
    const href = external ? esc(item.downloadUrl) : '/api/game-build/' + encodeURIComponent(item.id);
    const attributes = external ? 'target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"' : 'download';
    const label = external ? 'Outside download' : 'Download';
    const icon = external ? '↗' : '↓';
    return '<a class="btn btn-primary btn-sm" href="' + href + '" ' + attributes + '>' + label + ' <span aria-hidden="true">' + icon + '</span></a>';
  }
  function ownerGameBuildRowMarkup(build = {}) {
    const platform = ['windows','android','other'].includes(build.platform) ? build.platform : 'windows';
    const supported = build.supported !== false;
    return `<article class="owner-dynamic-row game-upload-row" data-game-build-row><input type="hidden" data-game-build-field="id" value="${esc(build.id || '')}"><input type="hidden" data-game-build-field="buildId" value="${esc(build.buildId || '')}"><input type="hidden" data-game-build-field="fileName" value="${esc(build.fileName || '')}"><input type="hidden" data-game-build-field="size" value="${esc(build.size || '')}"><input type="hidden" data-game-build-field="fileKey" value="${esc(build.fileKey || '')}"><input type="hidden" data-game-build-field="hasFile" value="${build.hasFile||build.fileKey||build.needsMigration?'true':''}"><input type="hidden" data-game-build-field="storagePath" value=""><div class="owner-dynamic-row-head"><strong>Game build</strong><button class="btn btn-ghost btn-sm" type="button" data-remove-game-build>Remove</button></div><div class="owner-post-fields"><label class="owner-post-field">Build name<input type="text" maxlength="120" required data-game-build-field="title" value="${esc(build.title || '')}" placeholder="Windows early access build"></label><label class="owner-post-field">Version<input type="text" maxlength="60" data-game-build-field="version" value="${esc(build.version || '')}" placeholder="v0.0.2"></label><label class="owner-post-field">Operating system<select data-game-build-platform><option value="windows"${platform === 'windows' ? ' selected' : ''}>Windows</option><option value="android"${platform === 'android' ? ' selected' : ''}>Android</option><option value="other"${platform === 'other' ? ' selected' : ''}>Other OS</option></select></label><label class="owner-post-field">Availability<select data-game-build-supported><option value="true"${supported ? ' selected' : ''}>Supported · upload a build</option><option value="false"${!supported ? ' selected' : ''}>Not supported · show a note</option></select></label><label class="owner-post-field game-build-os-name"${platform === 'other' ? '' : ' hidden'}>OS name<input type="text" maxlength="60" data-game-build-field="osName" value="${esc(build.osName || '')}" placeholder="Linux, macOS…"></label><label class="owner-post-field game-build-unsupported-message"${supported ? ' hidden' : ''}>Message shown to visitors<input type="text" maxlength="300" data-game-build-field="unsupportedMessage" value="${esc(build.unsupportedMessage || 'This operating system is not supported yet.')}"></label></div><div class="game-build-current-file" data-game-build-current${(build.fileKey||build.hasFile||build.needsMigration) && supported ? '' : ' hidden'}><span>Current file</span><strong>${esc(build.fileName || '')}</strong><small>${formatGameBuildSize(build.size)}</small></div><label class="owner-post-field game-build-file-field" data-game-build-file-wrap${supported ? '' : ' hidden'}>Game file <span class="game-build-file-hint">${platform === 'windows' ? 'Windows installer · .exe or .msi' : platform === 'android' ? 'Android package · .apk' : 'Other OS package · .zip, .dmg, .AppImage, .deb, .rpm, .7z, .tar.gz, or .tar.xz'}</span><input type="file" data-game-build-file accept="${gameBuildAccept[platform]}"><small data-game-build-file-name>${build.fileKey||build.hasFile||build.needsMigration ? 'Leave empty to keep the current file.' : 'Choose the installer to enable this download.'}</small></label><label class="owner-post-field game-build-url-field"${supported ? '' : ' hidden'}>Outside download URL<input type="url" maxlength="1200" data-game-build-field="downloadUrl" value="${esc(build.downloadUrl || '')}" placeholder="https://example.com/game-build"><small>Use an HTTPS link or upload a file above, not both.</small></label><div class="game-upload-progress" data-game-build-progress hidden><progress max="100" value="0" data-game-build-progress-bar></progress><span data-game-build-progress-text role="status" aria-live="polite">Preparing upload…</span></div></article>`;
  }
  function ownerGameBuildManager(gameId) {
    if(currentUser?.accountRole!=='owner'&&!contentPermissions.games.includes(gameId))return '';
    const game = gameById(gameId) || DATA.games[0];
    if (!game) return '<p class="empty">Choose a published game first.</p>';
    const builds = ownerPosts.gameBuilds.filter(build => build.gameId === game.id);
    return `<section class="owner-publishing game-build-manager"><div class="owner-publishing-heading"><div><span class="section-eyebrow">GAME DOWNLOADS</span><h2>Manage downloads for ${esc(game.name)}</h2><p>Upload installers to Helunemi’ persistent website storage or add an outside HTTPS download link. Download buttons are available to signed-in Helunemi accounts.</p></div></div>${uploadStorageStatus?.available===false?`<p class="form-message is-error">${esc(uploadStorageStatus.message)}</p>`:''}${builds.some(build=>build.needsMigration)&&currentUser?.accountRole==='owner'?'<button class="btn btn-ghost" type="button" data-migrate-game-builds>Move existing builds to website storage</button>':''}<form data-owner-game-build-form data-game-id="${esc(game.id)}"><div class="owner-dynamic-list game-build-editor-list" data-game-build-list>${builds.map(ownerGameBuildRowMarkup).join('')}</div><button class="btn btn-ghost" type="button" data-add-game-build>Add operating system</button><p class="game-build-security-note">Windows supports .exe and .msi, Android supports .apk, and Other OS supports .zip, .dmg, .AppImage, .deb, .rpm, .7z, .tar.gz, and .tar.xz. Maximum upload size: 2 GiB per uploaded file. Add either a file or an outside HTTPS link for each supported system. Visitors on unsupported systems will see your note instead of a download button.</p><div class="owner-post-form-actions"><button class="btn btn-primary" type="submit" data-game-build-save>Save game downloads</button><a class="btn btn-ghost" href="project.html?id=${encodeURIComponent(game.id)}">Cancel</a><span class="form-message" data-game-build-message role="status"></span></div></form></section>`;
  }
  function gameBuildFormData(row, gameId) {
    const get = key => $(`[data-game-build-field="${key}"]`,row)?.value || '';
    const platform = $('[data-game-build-platform]',row).value;
    const supported = $('[data-game-build-supported]',row).value === 'true';
    const file = $('[data-game-build-file]',row).files?.[0] || null;
    return {id:get('id') || `owner-game-build-${crypto.randomUUID()}`,gameId,title:$('[data-game-build-field="title"]',row).value.trim(),version:$('[data-game-build-field="version"]',row).value.trim(),platform,osName:platform === 'other' ? $('[data-game-build-field="osName"]',row).value.trim() : '',supported,unsupportedMessage:$('[data-game-build-field="unsupportedMessage"]',row).value.trim() || 'This operating system is not supported yet.',buildId:get('buildId'),fileName:get('fileName'),size:Number(get('size')) || 0,storagePath:get('storagePath'),fileKey:get('fileKey'),hasFile:get('hasFile')==='true',downloadUrl:supported?$('[data-game-build-field="downloadUrl"]',row).value.trim():'',file};
  }
  function uploadGameBuildFile(file, gameId, buildId, platform, onProgress) {
    return new Promise((resolve,reject) => {
      const request = new XMLHttpRequest();
      request.open('POST','/api/owner/game-build-upload'); request.withCredentials = true;
      request.setRequestHeader('Content-Type','application/octet-stream');
      request.setRequestHeader('X-Game-Id',gameId); request.setRequestHeader('X-Build-Id',buildId);
      request.setRequestHeader('X-Game-Platform',platform); request.setRequestHeader('X-File-Name',encodeURIComponent(file.name)); request.setRequestHeader('X-Upload-Size',String(file.size));
      request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
      request.onerror = () => reject(new Error('The connection stopped during upload. Check your internet connection and try again.'));
      request.onabort = () => reject(new Error('The upload was cancelled.'));
      request.onload = () => { let result = {}; try { result = JSON.parse(request.responseText || '{}'); } catch (_) {} if (request.status < 200 || request.status >= 300) return reject(new Error(result.error || 'The game build could not be uploaded.')); resolve(result); };
      request.send(file);
    });
  }
  async function saveOwnerGameBuilds(form) {
    const message = $('[data-game-build-message]',form), button = $('[data-game-build-save]',form), gameId = form.dataset.gameId;
    if(currentUser?.accountRole!=='owner'&&!contentPermissions.games.includes(gameId)){toast('Game management access required.');return;}
    const rows = $$('[data-game-build-row]',form), uploaded = [], builds = [];
    button.disabled = true; message.textContent = 'Checking builds…'; message.className = 'form-message';
    try {
      for (const row of rows) {
        const build = gameBuildFormData(row,gameId), allowed = {windows:/\.(exe|msi)$/i,android:/\.apk$/i,other:/\.(zip|dmg|appimage|deb|rpm|7z|tgz|tar\.gz|tar\.xz)$/i}[build.platform];
        if (!build.title) throw new Error('Give every operating-system entry a build name.');
        if (!build.platform || !allowed) throw new Error('Choose Windows, Android, or Other OS for every build.');
        if (build.downloadUrl) { try { if (new URL(build.downloadUrl).protocol !== 'https:') throw new Error(); } catch (_) { throw new Error('Use a valid HTTPS URL for an outside download.'); } }
        if (build.file && build.downloadUrl) throw new Error('Choose either an uploaded file or an outside URL for each operating system.');
        if (build.file && !allowed.test(build.file.name)) throw new Error(`Choose a valid ${build.platform === 'windows' ? '.exe or .msi' : build.platform === 'android' ? '.apk' : 'Other OS archive or package'} file.`);
        if (build.file && build.file.size > 2 * 1024 ** 3) throw new Error('Each game build can be up to 2 GiB.');
        if (build.supported && !build.file && (build.storagePath||build.fileKey||build.hasFile) && !build.downloadUrl && !allowed.test(build.fileName)) throw new Error(`The existing file does not match ${build.platform}. Choose a replacement installer.`);
        if (build.supported && !build.file && !build.storagePath && !build.fileKey && !build.hasFile && !build.downloadUrl) throw new Error(`Upload a file or add an outside URL for ${build.title}, or mark this operating system as not supported.`);
        if (build.file && build.supported) {
          build.buildId = `build-${crypto.randomUUID()}`;
          const progress = $('[data-game-build-progress]',row), bar = $('[data-game-build-progress-bar]',row), status = $('[data-game-build-progress-text]',row);
          progress.hidden = false; bar.value = 0; status.textContent = `Uploading ${build.file.name} · 0%`;
          const result = await uploadGameBuildFile(build.file,gameId,build.buildId,build.platform,percent => { bar.value = percent; status.textContent = percent >= 100 ? 'Verifying and saving file…' : `Uploading ${build.file.name} · ${percent}%`; });
          build.fileName = result.fileName; build.size = result.size; build.fileKey=result.fileKey;build.sha256=result.sha256;build.hasFile=true;build.storagePath=''; build.downloadUrl = ''; uploaded.push({gameId,fileKey:result.fileKey,buildId:result.buildId,fileName:result.fileName,platform:build.platform});
        }
        delete build.file; builds.push(build);
      }
      const result = await api('/api/owner/game-builds','PUT',{gameId,builds});
      applyOwnerPosts(result.content); renderPage(); toast('Game downloads have been saved.');
    } catch (error) {
      for (const upload of uploaded) await api('/api/owner/game-build-cleanup','POST',upload).catch(() => {});
      message.textContent = error.message; message.classList.add('is-error');
    } finally { button.disabled = false; }
  }
  function updateGameBuildRow(row) {
    const platform = $('[data-game-build-platform]',row).value, supported = $('[data-game-build-supported]',row).value === 'true';
    $('[data-game-build-file]',row).accept = gameBuildAccept[platform];
    $('[data-game-build-file-wrap]',row).hidden = !supported;
    $('.game-build-url-field',row).hidden=!supported;
    $('[data-game-build-field="downloadUrl"]',row).disabled=!supported;
    $('[data-game-build-unsupported-message]',row).hidden = supported;
    $('[data-game-build-os-name]',row).hidden = platform !== 'other';
    const hint = $('.game-build-file-hint',row); if (hint) hint.textContent = platform === 'windows' ? 'Windows installer · .exe or .msi' : platform === 'android' ? 'Android package · .apk' : 'Other OS package · .zip, .dmg, .AppImage, .deb, .rpm, .7z, .tar.gz, or .tar.xz';
    const file = $('[data-game-build-file]',row).files?.[0], fileName = $('[data-game-build-file-name]',row), outsideUrl = $('[data-game-build-field="downloadUrl"]',row)?.value.trim() || '';
    if (fileName && file) fileName.textContent = `${file.name} · ${formatGameBuildSize(file.size)}`;
    else if (fileName) {
      const currentName = $('[data-game-build-field="fileName"]',row)?.value || '', storagePath = $('[data-game-build-field="fileKey"]',row)?.value || $('[data-game-build-field="hasFile"]',row)?.value || '';
      if (storagePath && currentName) fileName.textContent = allowedFileNameForPlatform(currentName,platform) ? 'Leave empty to keep the current file.' : 'The current file uses another format. Choose a replacement for this operating system.';
      else fileName.textContent = supported ? (outsideUrl ? 'An outside download URL is set. Clear it to upload a file.' : 'Choose an installer or add an outside HTTPS URL.') : 'No file is needed for an unsupported operating system.';
    }
  }
  function allowedFileNameForPlatform(fileName,platform) { return {windows:/\.(exe|msi)$/i,android:/\.apk$/i,other:/\.(zip|dmg|appimage|deb|rpm|7z|tgz|tar\.gz|tar\.xz)$/i}[platform]?.test(fileName) || false; }
  async function compressOwnerImage(file) {
    if (!['image/png','image/jpeg','image/webp'].includes(file?.type)) throw new Error('Choose a PNG, JPG, or WebP image.');
    if (file.size > 15_000_000) throw new Error('Choose an image smaller than 15 MB.');
    const image = new Image(), data = await readAsDataUrl(file);
    await new Promise((resolve,reject) => { image.onload = resolve; image.onerror = () => reject(new Error('That image could not be opened.')); image.src = data; });
    const scale = Math.min(1,1800 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not prepare that image.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for (const quality of [.86,.78,.7,.62,.54,.46,.38]) { const output = canvas.toDataURL('image/webp',quality); if (output.length <= 760_000) return output; }
    throw new Error('That image is too large after resizing. Choose a smaller image.');
  }

  const views = {
    chat() {
      return `<div class="community-shell community-page-shell"><header class="community-header"><a href="index.html" class="community-brand"><img src="assets/golden-spiral-sun-icon.png" alt=""><span>Helunemi Community</span></a><div class="community-header-actions"><span class="community-presence"><i></i><span data-studio-presence>Studio community</span></span><a class="community-close" href="index.html" data-close-community aria-label="Close community">×</a></div></header><div class="community-layout"><aside class="community-sidebar" data-community-sidebar></aside><main class="community-main" data-community-main></main></div></div>`;
    },
    home() {
      const game = DATA.games[0];
      return `<section class="hero" aria-labelledby="hero-title"><div class="hero-in"><h1 id="hero-title">Helunemi</h1>
        <p class="lede">A new independent studio making worlds to explore. Our first game is in development.</p>
        <div class="actions"><a class="btn btn-primary" href="games.html">Explore our games</a><a class="btn btn-ghost" href="list.html">Meet the team</a></div></div><div class="sun-wrap" aria-hidden="true"><div class="rays"></div><div class="sun"></div></div></section>
        <div class="wrap"><section class="studio-story block" aria-labelledby="studio-story-title"><div class="studio-story-head"><span class="studio-story-eyebrow">Our community</span><h2 id="studio-story-title">A small studio built around a big dream</h2><p>Helunemi grew from a Minecraft server into a place to learn, create games, and share the worlds we hope to make.</p></div>
        <div class="studio-story-grid"><article class="studio-story-card"><span class="studio-story-number">01</span><h3>From SolarisSMP to Helunemi</h3><p>Our community began on Discord around SolarisSMP, my Minecraft server. Even as I played on and posted about it, its players stayed within the same circle of classmates and people I already knew. Since I love games, I started learning to code so I could make one for others to enjoy. After a year and several months, I turned the Discord server into a game development community, disconnected the Minecraft server, and shut it down.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">02</span><h3>What the sun means</h3><p>The sun is a light for gamers beginning to grow and achieve what they want. For Helunemi, it also means a new beginning: this is our first major project beyond school projects.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">03</span><h3>Why we make games</h3><p>Making games is something we want and dream to achieve. We hope to give gamers more challenges and new worlds to enjoy, and make experiences that help people have fun, feel happy, and feel better.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">04</span><h3>Mods and add-ons belong</h3><p>We support add-ons, game modifications, plugins, and tools for our games. Use them on a local server on your computer; public-server use is welcome when the changes are appropriate and safe.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">05</span><h3>A team of two active members</h3><p>For the past three months, two of us—me and a friend—have been the ones actively working. Other developers are mostly inactive; some check in briefly before going offline again.</p></article></div></section>
        <section class="block" aria-labelledby="h-feat"><div class="sec-head"><h2 id="h-feat">Now in development</h2><a class="more" href="games.html">All projects</a></div>
        <article class="feature"><div class="cover cover-${game.cover}" aria-hidden="true">${gameBannerImage(game)}<span class="cover-kicker">${esc(game.subtitle)}</span><strong>${esc(game.name)}</strong></div>
        <div class="feature-body"><div>${badge(game.status)}</div><h3>${esc(game.name)}: ${esc(game.subtitle)}</h3><p>${esc(game.blurb)}</p><p class="meta">${esc(game.genre)} · ${esc(game.version)}</p><a class="btn btn-primary" href="project.html?id=${encodeURIComponent(game.id)}">Project details</a></div></article></section>
        <section class="block" aria-labelledby="h-projects"><div class="sec-head"><h2 id="h-projects">Studio projects</h2><a class="more" href="games.html">Browse games</a></div><div class="grid">${DATA.games.map(projectCard).join('')}</div></section>
        <section class="band" aria-labelledby="h-team"><div><h2 id="h-team">Meet the Helunemi team</h2><p>Helunemi is currently built by two active members.</p></div><a class="btn" href="list.html">View the team</a></section></div>`;
    },
    list() {
      return `<div class="wrap"><div class="page-head"><h1>List</h1><p>Meet the active members of Helunemi.</p></div>
        <section class="member-directory" aria-label="Search and filter members"><label class="member-search-wrap"><span class="visually-hidden">Search by member, role, or project</span><span class="member-search-icon" aria-hidden="true">⌕</span><input id="member-search" type="search" data-member-search placeholder="Search members, roles, or games…" autocomplete="off"></label>
        <div class="member-filter-bar" role="group" aria-label="Filter members by role or project"><button class="member-filter-chip" type="button" data-member-filter="All" aria-pressed="true">All</button>${memberFilterOptions.map(tag => `<button class="member-filter-chip" type="button" data-member-filter="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`).join('')}</div></section>
        <div class="members" id="member-results"></div><p class="empty member-empty" id="member-no-results">Studio team profiles appear here when the Owner assigns Assistant, AI Assistant, or Developer roles.</p><p class="form-message" id="member-load-message" role="status"></p><div class="page-end"></div></div>`;
    },
    members() {
      return `<div class="wrap"><div class="page-head"><span class="section-eyebrow">MEET THE COMMUNITY</span><h1>Members</h1><p>Member accounts make a Friend-Card in their own style. Cards appear here only after the member chooses to post them. Studio roles have their own profiles on the List page.</p></div><section class="member-directory friend-directory" aria-label="Search member Friend-Cards"><label class="member-search-wrap"><span class="visually-hidden">Search member Friend-Cards</span><span class="member-search-icon" aria-hidden="true">⌕</span><input type="search" data-friend-search placeholder="Search posted cards…" autocomplete="off"></label></section><div class="friend-card-grid" id="member-card-grid"></div><p class="empty member-empty" id="member-card-empty">No custom Friend-Cards have been posted yet.</p><p class="form-message" id="member-card-message" role="status"></p><div class="page-end"></div></div>`;
    },
    games() { return `<div class="wrap">${ownerPageHeading('games','Games','Helunemi is new, with one game in development and one planned for the future.')}<div class="grid">${DATA.games.map(projectCard).join('')}</div><div class="page-end"></div></div>`; },
    updates() {
      const updates = [...ownerPosts.updates].sort((a,b)=>Number(b.publishedAt||0)-Number(a.publishedAt||0));
      return `<div class="wrap">${ownerPageHeading('updates','Updates','News and development updates from Helunemi.')}<ol class="updates-timeline">${updates.map(update => { const date = update.publishedAt ? new Date(Number(update.publishedAt)).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : ''; const game = gameById(update.gameId); return `<li class="update-timeline-item"><span class="update-timeline-node" aria-hidden="true"></span><article class="update-timeline-card" id="update-${esc(update.id)}">${contentMenu('updates',update.id)}<div class="update-timeline-meta"><span class="section-eyebrow">${esc(update.category || 'Studio')}</span>${date ? `<time>${esc(date)}</time>` : ''}</div><h2>${esc(update.title)}</h2>${paragraphs(update.content)}${game ? `<a class="text-link" href="project.html?id=${encodeURIComponent(game.id)}">${esc(game.name)} project details <span aria-hidden="true">↗</span></a>` : ''}</article></li>`; }).join('')}</ol><div class="page-end"></div></div>`;
    },
    arts() { return `<div class="wrap">${ownerPageHeading('arts','Arts','Artwork and visuals from Helunemi projects.')}<div class="artwork-grid">${DATA.arts.map(artworkCard).join('')}</div>${DATA.arts.length ? '' : '<p class="empty">No artwork has been posted yet.</p>'}<div class="page-end"></div></div>`; },
    groups() { return `<div class="wrap"><div class="page-head"><h1>Groups</h1><p>Join the Helunemi community and find our official group links here.</p></div><section class="group-intro"><span class="section-eyebrow">ABOUT OUR COMMUNITY</span><h2>Small team, big dreams.</h2><p>Helunemi is an early-stage game development community with two active developers. We make games to bring the things we dream of creating to life.</p></section><section class="account-panel groups-panel"><h2>Helunemi communities</h2><a class="group-link" href="https://discord.gg/Wg6Y9Yc4JA" target="_blank" rel="noopener noreferrer"><span class="group-link-icon" aria-hidden="true">◉</span><span><strong>Helunemi Discord</strong><small>Join the community</small></span><span class="group-link-arrow" aria-hidden="true">↗</span></a></section><div class="page-end"></div></div>`; },
    download() {
      const downloadAccess = currentUser ? '<p class="download-access-note">Signed-in accounts can open the available extras. Guests need to log in before downloading.</p>' : '<div class="download-guest-gate"><p>Guests can browse these extras, but a Helunemi account is required to download.</p><a class="btn btn-ghost btn-sm" href="account.html?mode=login">Log in to access downloads</a></div>';
      const downloadCard = item => { const game = gameById(item.gameId); return `<article class="download-item-card">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : ''}<div class="download-item-copy"><span class="section-eyebrow">${esc(item.category)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div class="download-item-meta">${game ? `<span>${esc(game.name)}</span>` : ''}${item.version ? `<span>${esc(item.version)}</span>` : ''}</div>${currentUser ? `<a class="btn btn-primary btn-sm" href="${esc(item.downloadUrl)}" target="_blank" rel="noopener noreferrer">Download <span aria-hidden="true">↗</span></a>` : '<a class="btn btn-ghost btn-sm" href="account.html?mode=login">Log in to download</a>'}</div></article>`; };
      const categoryCards = (category,title) => { const items = ownerPosts.downloads.filter(item => category.includes(item.category)); return `<section class="download-category"><h2>${title}</h2>${items.length ? `<div class="download-items-grid">${items.map(downloadCard).join('')}</div>` : `<p>No ${title.toLowerCase()} are available yet.</p>`}</section>`; };
      return `<div class="wrap">${ownerPageHeading('downloads','Download','Extras and add-ons for Helunemi games.')}<section class="download-intro"><span class="section-eyebrow">PLUGINS · MODS · EXTRAS</span><h2>Make each game your own</h2><p>This page is a home for extras created for Helunemi games: character skins, add-ons, mods, plugins, modding apps, and other useful tools. These creations can give players new ways to personalize a game, try new ideas, and build on the experience. Game builds themselves will be shared on their own project detail pages; this page is for the tools and community-made additions around them.</p><p>We welcome creativity while asking everyone to use modifications thoughtfully: local servers on your own computer are supported, and public-server use is welcome when the modification is appropriate and safe.</p><h3>Why we support game modification tools</h3><ul class="download-reasons"><li><strong>Personalize your characters.</strong> Use skins and visual add-ons to make a character feel like your own.</li><li><strong>Explore more ways to play.</strong> Mods, plugins, and add-ons can introduce new ideas, features, and experiences to Helunemi games.</li><li><strong>Celebrate creativity and hard work.</strong> Modding apps give players a way to experiment, make things, and share the care they put into their creations.</li></ul>${downloadAccess}</section><div class="download-categories">${categoryCards(['Plugins & tools'],'Plugins & tools')}${categoryCards(['Mods & add-ons','Skins'],'Mods & add-ons')}${categoryCards(['Other'],'Other extras')}</div><div class="project-download-links"><h2>Game pages</h2>${DATA.games.map(game => `<a class="text-link" href="project.html?id=${encodeURIComponent(game.id)}">${esc(game.name)} project details <span aria-hidden="true">↗</span></a>`).join('')}</div><div class="page-end"></div></div>`;
    },
    publish() {
      const params = new URLSearchParams(location.search), section = params.get('type');
      const requestedEdit=params.get('edit'),allowed=currentUser?.accountRole==='owner'||section==='game-builds'&&contentPermissions.games.includes(params.get('gameId'))||contentPermissions[section]?.includes(requestedEdit);
      if (!allowed) return `<div class="wrap"><div class="page-head"><h1>Owner publishing</h1><p>This page is available to the Helunemi Owner account.</p></div><section class="account-panel"><h2>Owner access required</h2><p>Sign in with the Owner account to publish site content.</p><a class="btn btn-primary" href="account.html?mode=login">Log in</a></section></div>`;
      if (section === 'game-builds') {
        const game = gameById(params.get('gameId')) || DATA.games[0];
        return `<div class="wrap publish-page"><div class="page-head"><a class="publish-back" href="project.html?id=${encodeURIComponent(game.id)}">← Back to ${esc(game.name)}</a><span class="section-eyebrow">OWNER PUBLISHING</span><h1>Game downloads</h1><p>Import installers and choose which operating systems Helunemi supports.</p></div>${ownerGameBuildManager(game.id)}</div>`;
      }
      const target = Object.hasOwn(ownerPostSectionLabels,section) ? section : 'games';
      return `<div class="wrap publish-page"><div class="page-head"><a class="publish-back" href="${target === 'downloads' ? 'download.html' : `${target === 'arts' ? 'arts' : target}.html`}">← Back to ${esc(ownerPostSectionLabels[target])}</a><span class="section-eyebrow">OWNER PUBLISHING</span><h1>${esc(ownerPostActionLabels[target])}</h1><p>Create and manage content for the ${esc(ownerPostSectionLabels[target].toLowerCase())} page.</p></div>${ownerContentManager(target)}</div>`;
    },
    'explore-ais'() {
      return `<div class="wrap ai-explore-page"><div class="page-head"><h1>Explore AIs</h1></div><section class="ai-explore-grid" aria-label="Upcoming AIs"><article class="ai-explore-card"><h2>Hene</h2><p class="ai-development-note">Soon to be developed</p></article><article class="ai-explore-card"><h2>Lumi</h2><p class="ai-development-note">Soon to be developed</p></article></section><section class="ai-name-origin" aria-labelledby="ai-name-origin-title"><span class="section-eyebrow">From the name Helunemi</span><h2 id="ai-name-origin-title">Where Hene and Lumi come from</h2><p>Hene and Lumi come from the website title itself. Split <strong>Helunemi</strong> into syllables:</p><p class="ai-syllable-sequence">He · lu · ne · mi</p><p>Swap <strong>lu</strong> and <strong>ne</strong> to get:</p><p class="ai-syllable-sequence">He · ne · lu · mi</p><p>Pair the syllables as <strong>He + ne</strong> and <strong>Lu + mi</strong> to create <strong>Hene</strong> and <strong>Lumi</strong>.</p></section></div>`;
    },
    'create-post'() { return '<div class="wrap"><p class="social-loading">Opening post editor…</p></div>'; },
    'shop-product'() { return '<div class="wrap"><p class="social-loading">Opening product editor…</p></div>'; },
    shop() { return '<div class="wrap"><p class="social-loading">Loading shop…</p></div>'; },
    project() {
      const requestedId = new URLSearchParams(location.search).get('id');
      const game = gameById(requestedId) || DATA.games[0];
      const currentProject = `<a class="project-switch-card is-current" href="project.html?id=${encodeURIComponent(game.id)}" aria-current="page">${projectIcon(game)}<span class="project-switch-copy"><strong>${esc(game.name)}</strong><small>${esc(game.subtitle)}</small><span class="project-switch-status">${esc(game.status)}</span></span><span class="project-switch-arrow" aria-hidden="true">↗</span></a>`;
      const otherProjects = DATA.games.filter(project => project.id !== game.id).map(project => `<a class="project-switch-card" data-switch-project data-project-text="${esc([project.name,project.subtitle,project.genre,project.status].join(' '))}" href="project.html?id=${encodeURIComponent(project.id)}">${projectIcon(project)}<span class="project-switch-copy"><strong>${esc(project.name)}</strong><small>${esc(project.subtitle)}</small><span class="project-switch-status">${esc(project.status)}</span></span><span class="project-switch-arrow" aria-hidden="true">↗</span></a>`).join('');
      const relatedArtworks = DATA.arts.filter(art => art.projectId === game.id);
      const artworkSection = relatedArtworks.length ? `<section class="project-copy related-artwork-section"><h2>Related artwork</h2><div class="related-artwork-list">${relatedArtworks.map(art => `<a class="related-artwork-link" href="${artworkHref(art)}"><img src="${esc(art.image)}" alt=""><span><strong>${esc(art.title)}</strong><small>${esc(art.mainTag)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>` : '';
      const worldIntro = game.worldIntro ? `<section class="project-copy project-story"><h2>Short introduction</h2>${paragraphs(game.worldIntro)}</section>` : '';
      const playerIntro = game.playerIntro ? `<section class="project-copy project-story"><h2>Your story begins</h2>${paragraphs(game.playerIntro)}</section>` : '';
      const releasePlan = game.releasePlan ? `<section class="project-copy project-release"><h2>Early access plans</h2><p>${esc(game.releasePlan)}</p></section>` : '';
      const extraText = (game.textContainers || []).map(item => `<section class="project-copy project-story"><h2>${esc(item.title)}</h2>${paragraphs(item.body)}</section>`).join('');
      const builds = game.gameDownloads || [];
      const groups = [{id:'windows',name:'Windows'},{id:'android',name:'Android'},{id:'other',name:'Other OS'}];
      const platformHint = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`;
      const defaultPlatform = /android/i.test(platformHint) ? 'android' : /windows/i.test(platformHint) ? 'windows' : 'other';
      const gameDownloads = `<div class="game-os-downloads"><div class="game-os-tabs" role="tablist" aria-label="Choose your operating system">${groups.map(group => `<button class="game-os-tab" type="button" role="tab" data-game-os-select="${group.id}" aria-selected="${group.id === defaultPlatform}" aria-controls="game-os-panel-${group.id}">${group.name}</button>`).join('')}</div>${groups.map(group => { const entries = builds.filter(item => item.platform === group.id); return `<section class="game-os-group game-os-panel" id="game-os-panel-${group.id}" role="tabpanel" data-game-os-panel="${group.id}"${group.id !== defaultPlatform ? ' hidden' : ''}><h3>${group.name}</h3>${entries.length ? entries.map(item => `<article class="game-build-card"><div><strong>${esc(item.title)}</strong><span>${esc([item.version,item.osName && group.id === 'other' ? item.osName : group.name].filter(Boolean).join(' · '))}${item.supported && item.fileName ? ` · ${formatGameBuildSize(item.size)}` : ''}</span></div>${item.supported ? currentUser ? `${gameBuildDownloadButton(item)}` : `<a class="btn btn-ghost btn-sm" href="account.html?mode=login">Log in to download</a>` : `<p class="game-build-unsupported">${esc(item.unsupportedMessage || 'This operating system is not supported yet.')}</p>`}</article>`).join('') : `<p class="game-build-empty">No ${group.name} build has been posted yet.</p>`}</section>`; }).join('')}</div>`;
      const manageDownloads = currentUser?.accountRole === 'owner' || contentPermissions.games.includes(game.id) ? `<a class="btn btn-ghost btn-sm" href="publish.html?type=game-builds&amp;gameId=${encodeURIComponent(game.id)}">Manage game downloads</a>` : '';
      return `<div class="project-page"><div class="project-banner project-banner-${esc(game.cover)}" role="img" aria-label="${esc(game.name)} project banner">${gameBannerImage(game)}<div class="project-banner-mark">${esc(game.name)}</div></div><div class="wrap project-layout"><main class="project-detail-main"><div class="project-detail-actions"><a class="project-back" href="games.html">← All projects</a>${manageDownloads}</div><div class="project-heading">${projectIcon(game)}<div><div class="project-status-row">${badge(game.status)}${game.version ? `<span class="project-version">${esc(game.version)}</span>` : ''}</div><h1>${esc(game.name)}</h1><p class="project-subtitle">${esc(game.subtitle)} · ${esc(game.genre)}</p></div></div><section class="project-copy"><h2>About this project</h2><p>${esc(game.details)}</p><p>${esc(game.blurb)}</p></section>${worldIntro}${playerIntro}${releasePlan}${extraText}${game.screenshots?.length?`<section class="project-copy"><h2>Screenshots</h2><div class="project-screenshots">${game.screenshots.map(image=>`<img src="${esc(image)}" alt="${esc(game.name)} screenshot" loading="lazy">`).join('')}</div></section>`:''}<section class="project-copy project-extra"><h2>Downloads</h2>${gameDownloads}<a class="text-link" href="download.html">Browse plugins, mods, and extras <span aria-hidden="true">↗</span></a></section>${artworkSection}</main><aside class="project-switcher" aria-label="Helunemi projects"><label class="project-search-wrap"><span class="project-search-icon" aria-hidden="true">⌕</span><span class="visually-hidden">Search other games</span><input type="search" data-project-search placeholder="Search other games…" autocomplete="off"></label><section class="project-selected-section"><span class="section-eyebrow">Selected Game</span>${currentProject}</section><div class="project-switch-divider"><span>Explore other games</span></div><div class="project-switch-list">${otherProjects}</div><p class="project-no-results" data-project-empty hidden>No other games match that search.</p></aside></div></div>`;
    },
    artwork() {
      const artwork = artById(new URLSearchParams(location.search).get('id')) || DATA.arts[0];
      const project = gameById(artwork.projectId);
      const currentArt = `<a class="artwork-switch-card is-current" href="${artworkHref(artwork)}" aria-current="page"><img src="${esc(artwork.image)}" alt=""><span><strong>${esc(artwork.title)}</strong><small>${esc(artwork.type)}</small></span></a>`;
      const otherArt = DATA.arts.filter(art => art.id !== artwork.id).map(art => `<a class="artwork-switch-card" data-switch-artwork data-artwork-text="${esc([art.title,art.type,art.mainTag,...art.tags].join(' '))}" href="${artworkHref(art)}"><img src="${esc(art.image)}" alt=""><span><strong>${esc(art.title)}</strong><small>${esc(art.type)}</small></span></a>`).join('');
      return `<div class="wrap artwork-detail-layout"><main class="artwork-detail-main"><a class="project-back" href="arts.html">← Back to Arts</a><figure class="artwork-detail-image artwork-detail-image-${esc(artwork.shape)}"><img src="${esc(artwork.image)}" alt="${esc(artwork.title)}"><figcaption>${esc(artwork.title)}</figcaption></figure><span class="artwork-main-tag">${esc(artwork.mainTag)}</span><h1>${esc(artwork.title)}</h1><p class="artwork-detail-type">${esc(artwork.type)}${project ? ` · <a href="project.html?id=${encodeURIComponent(project.id)}">${esc(project.name)}</a>` : ''}</p><section class="artwork-detail-section"><h2>Artwork details</h2>${artwork.description?paragraphs(artwork.description):''}<dl><dt>Type</dt><dd>${esc(artwork.type)}</dd><dt>Credit</dt><dd>${esc(artwork.credit || 'Not credited yet')}</dd><dt>Project</dt><dd>${project ? esc(project.name) : 'Helunemi'}</dd></dl></section><section class="artwork-detail-section"><h2>Tags</h2><div class="artwork-tags artwork-tags-detail">${artwork.tags.map(tag => `<span class="artwork-tag">${esc(tag)}</span>`).join('')}</div></section></main><aside class="artwork-switcher" aria-label="Browse artwork"><label class="project-search-wrap"><span class="project-search-icon" aria-hidden="true">⌕</span><span class="visually-hidden">Search other artwork</span><input type="search" data-artwork-search placeholder="Search other artwork…" autocomplete="off"></label><section class="project-selected-section"><span class="section-eyebrow">Selected Artwork</span>${currentArt}</section><div class="project-switch-divider"><span>Explore other art</span></div><div class="artwork-switch-list">${otherArt}</div><p class="project-no-results" data-artwork-empty hidden>No other artwork matches that search.</p></aside></div>`;
    },
    account() { return '<div class="wrap"><div class="page-head"><h1>Profile</h1><p>Loading your Helunemi account…</p></div></div>'; }
  };
  function renderPage() {
    app.innerHTML = (views[page] || views.home)();
    const selectedProject = page === 'project' ? gameById(new URLSearchParams(location.search).get('id')) || DATA.games[0] : null;
    const selectedArtwork = page === 'artwork' ? artById(new URLSearchParams(location.search).get('id')) || DATA.arts[0] : null;
    document.title = selectedProject ? `${selectedProject.name} | Helunemi` : selectedArtwork ? `${selectedArtwork.title} | Helunemi` : `${titles[page] ? `${titles[page]} | ` : ''}Helunemi`;
    if ($('#nav-list')) $('#nav-list').innerHTML = ROUTES.map(([id,label,href]) => `<li><a href="${href}"${id === page ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
    ensureGlobalSearch();
    ensureCommunityMessenger();
    if (page === 'shop') window.SolarisShop?.mount(app);
  }
  function ensureGlobalSearch() {
    const slot = $('.top-in');
    const profile = slot?.querySelector('.profile-wrap');
    if (!slot || !profile || $('#global-search')) return;
    profile.insertAdjacentHTML('beforebegin',`<div class="global-search" id="global-search"><button class="global-search-toggle" type="button" data-global-search-toggle aria-label="Search games, artwork, members, and developers" aria-expanded="false" aria-controls="global-search-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg></button><section class="global-search-panel" id="global-search-panel" data-global-search-panel hidden><label class="global-search-input-wrap"><span class="visually-hidden">Search games, artwork, members, and developers</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input type="search" data-global-search-input placeholder="Search games, artwork, people…" autocomplete="off"></label><div class="global-search-results" data-global-search-results aria-live="polite"><p class="global-search-hint">Search across Helunemi.</p></div></section></div>`);
  }
  function closeGlobalSearch() {
    const panel = $('[data-global-search-panel]');
    const toggle = $('[data-global-search-toggle]');
    if (panel) panel.hidden = true;
    toggle?.setAttribute('aria-expanded','false');
  }
  function updateGlobalSearchResults() {
    const results = $('[data-global-search-results]');
    const input = $('[data-global-search-input]');
    if (!results || !input) return;
    const query = input.value.trim().toLowerCase();
    if (!query) { results.innerHTML = '<p class="global-search-hint">Search games, artwork, members, and developers.</p>'; return; }
    const matches = (items, textFor) => items.filter(item => textFor(item).toLowerCase().includes(query)).slice(0,5);
    const groups = [];
    const games = matches(DATA.games,game => [game.name,game.subtitle,game.genre,game.status,game.blurb,game.details].join(' '));
    if (games.length) groups.push(['Games',games.map(game => `<a class="global-search-result" href="project.html?id=${encodeURIComponent(game.id)}">${projectIcon(game,'global-search-thumb')}<span><strong>${esc(game.name)}</strong><small>${esc(game.status)}${game.subtitle ? ` · ${esc(game.subtitle)}` : ''}</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    const artworks = matches(DATA.arts,art => [art.title,art.type,art.mainTag,...art.tags].join(' '));
    if (artworks.length) groups.push(['Artworks',artworks.map(art => `<a class="global-search-result" href="${artworkHref(art)}"><span class="global-search-thumb"><img src="${esc(art.image)}" alt=""></span><span><strong>${esc(art.title)}</strong><small>${esc(art.mainTag)} · ${esc(art.type)}</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    const members = matches(memberProfiles,member => [member.username].join(' '));
    if (members.length) groups.push(['Members',members.map(member => `<a class="global-search-result" href="account.html?user=${encodeURIComponent(member.id)}">${avatar(member.username,'global-search-avatar',member.avatarImage)}<span><strong>${esc(member.username)}</strong><small>Member profile</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    const developers = matches(DATA.members,member => [member.online,member.real,member.primaryRole,...(member.roles || []),...(member.projects || [])].join(' '));
    if (developers.length) groups.push(['Developers & studio team',developers.map(member => `<a class="global-search-result" href="account.html?user=${encodeURIComponent(member.id)}">${avatar(member.online,'global-search-avatar',member.avatarImage)}<span><strong>${esc(member.online)}</strong><small>${esc(member.primaryRole || member.roles?.[0] || 'Studio profile')}${member.real ? ` · ${esc(member.real)}` : ''}</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    results.innerHTML = groups.length ? groups.map(([title,items]) => `<section class="global-search-group"><h2>${title}</h2>${items}</section>`).join('') : '<p class="global-search-hint">No matches found.</p>';
  }
  function toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3400);
  }
  async function api(path, method = 'GET', body) {
    const response = await fetch(path, { method, credentials: 'same-origin', headers: body ? {'Content-Type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(result.error || 'The account request could not be completed.');
    return result;
  }
  async function loadFirebaseSettings() {
    try {
      const setup = await api('/api/firebase-config');
      firebaseSetupKnown = true;
      firebaseEnabled = setup.enabled === true;
      firebaseMissingSettings = Array.isArray(setup.missingSettings) ? setup.missingSettings : [];
      firebasePublicConfig = setup.config || null;
      return true;
    } catch (error) {
      firebaseSetupKnown = true;
      if (!firebasePublicConfig) firebaseEnabled = false;
      firebaseSetupError = error.message;
      return false;
    }
  }
  async function getFirebaseClient() {
    if (!firebaseEnabled || !firebasePublicConfig) throw new Error(firebaseSetupError || 'Firebase Authentication is not configured yet.');
    if (firebaseClient) return firebaseClient;
    if (!firebaseClientPromise) firebaseClientPromise = (async () => {
      const version = '12.19.0';
      const [appSdk, authSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`)
      ]);
      const firebaseApp = appSdk.getApps().find(item => item.name === 'solaris-site') || appSdk.initializeApp(firebasePublicConfig, 'solaris-site');
      const auth = authSdk.getAuth(firebaseApp);
      await new Promise(resolve => {
        let unsubscribe = null;
        unsubscribe = authSdk.onAuthStateChanged(auth, () => { unsubscribe?.(); resolve(); });
      });
      firebaseClient = { app: firebaseApp, auth, sdk: authSdk };
      return firebaseClient;
    })().catch(error => {
      firebaseClientPromise = null;
      firebaseSetupError = `Firebase could not load: ${error.message}`;
      throw new Error(firebaseSetupError);
    });
    return firebaseClientPromise;
  }
  function readPendingSignup() {
    try { return JSON.parse(localStorage.getItem('solaris-pending-signup') || 'null'); } catch (_) { return null; }
  }
  async function finishFirebaseSignup(metadata, password = '') {
    const client = await getFirebaseClient();
    const user = client.auth.currentUser;
    if (!user || !user.emailVerified) throw new Error('Verify your email before finishing account setup.');
    const result = await api('/api/signup','POST',{
      username:metadata.username,
      password,
      idToken:await user.getIdToken(true),
      profile:{}
    });
    try { localStorage.removeItem('solaris-pending-signup'); } catch (_) {}
    currentUser = result.user;
    leaveGuestMode();
    editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false;
    profilePreview();
    if (page === 'account') showAccount();
    else renderPage();
    toast(result.message || 'Your verified Helunemi account is ready.');
  }
  async function resumePendingFirebaseSignup() {
    if (!firebaseEnabled || currentUser) return;
    const pending = readPendingSignup();
    if (!pending?.username) return;
    const client = await getFirebaseClient();
    const user = client.auth.currentUser;
    if (!user || (pending.email && user.email?.toLowerCase() !== pending.email.toLowerCase())) return;
    await user.reload();
    if (!user.emailVerified) return;
    try { await finishFirebaseSignup(pending); }
    catch (error) {
      if (page === 'account') { app.innerHTML = authView('signup',error.message); const form = $('#signup-form'); if (form) { form.elements.username.value = pending.username; form.elements.email.value = user.email || ''; } }
    }
  }
  async function finishFirebaseLogin(user, password) {
    await user.reload();
    if (!user.emailVerified) {
      try { await firebaseClient.sdk.sendEmailVerification(user,{url:`${location.origin}/account.html?mode=login`}); }
      catch (error) { if (error.code !== 'auth/too-many-requests') throw error; }
      throw new Error('Verify your email first. We sent another verification link if one was needed.');
    }
    const result = await api('/api/login','POST',{idToken:await user.getIdToken(true),password});
    currentUser = result.user;
    leaveGuestMode();
    editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false;
    profilePreview();
    showAccount();
    toast(`Welcome back, ${currentUser.username}.`);
  }
  async function sendFirebasePasswordReset(email, target) {
    if (!email) throw new Error('Enter your email address first.');
    const client = await getFirebaseClient();
    await client.sdk.sendPasswordResetEmail(client.auth,email,{url:`${location.origin}/account.html?mode=login`});
    if (target) setMessage(target,'Password reset email sent. Check your inbox and spam folder.',false);
    else setMessage('#auth-message','Password reset email sent. Check your inbox and spam folder.',false);
  }
  async function getShopTicket(button) {
    const ticketType = button.dataset.shopTicket;
    button.disabled = true;
    try {
      const result = await api('/api/shop/purchase-ticket','POST',{ticketType});
      currentUser = result.user;
      profilePreview();
      renderPage();
      toast(result.message);
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  }
  function closeProfile() {
    const popover = $('#profile-popover');
    if (!popover) return;
    popover.hidden = true;
    $('#profile-button').setAttribute('aria-expanded','false');
    $$('[data-note-toggle]',popover).forEach(button => {
      const bubble = button.nextElementSibling;
      if (bubble) bubble.hidden = true;
      button.hidden = false;
      button.closest('.note-control')?.classList.remove('is-expanded');
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-label','Show profile note');
    });
  }
  window.addEventListener('pagehide', () => {
    $$('[data-note-toggle]').forEach(button => {
      const bubble = button.nextElementSibling;
      if (bubble) bubble.hidden = true;
      button.hidden = false;
      button.closest('.note-control')?.classList.remove('is-expanded');
    });
  });
  function favoriteControl(type, current) {
    const options = type === 'game' ? DATA.games.map(game => [game.name,game.name]) : type === 'developer' ? DATA.members.map(member => [member.online,member.online]) : DATA.arts.map(art => [art.title,art.title]);
    const emptyText = type === 'artwork' && !options.length ? 'No Helunemi artwork is available to favorite yet.' : 'None';
    const disabled = !options.length ? ' disabled' : '';
    return `<label>Favorite ${esc(type)}<select name="favorite-${type}"${disabled}><option value="">${esc(emptyText)}</option>${options.map(([value,label]) => `<option value="${esc(value)}"${current?.title === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
      <label class="favorite-comment-label">Your comment<textarea name="favorite-${type}-comment" rows="2" maxlength="240" placeholder="What do you like about it?"${disabled}>${esc(current?.comment || '')}</textarea></label>`;
  }
  function socialRowsMarkup(socials) {
    const rows = socials?.length ? socials : [{label:'',url:''}];
    return rows.map(item => `<div class="social-editor-row"><label>Account name<input name="social-label" maxlength="30" placeholder="Instagram, Discord, website…" value="${esc(item.label || '')}"></label><label>Profile link<input name="social-url" type="url" maxlength="240" placeholder="https://…" value="${esc(item.url || '')}"></label><button class="icon-btn social-remove" type="button" data-remove-social aria-label="Remove social account">Remove</button></div>`).join('');
  }
  function ownerTeamManager() {
    return `<section class="account-panel account-panel-wide owner-team-manager"><div class="panel-heading"><div><span class="section-eyebrow">OWNER CONTROLS</span><h2>Assign account roles</h2><p>Your account appears here for your own secondary role tags. Assign another account’s roles from their profile.</p></div></div><p class="form-message" id="team-admin-message" role="status"></p><div class="team-admin-list" id="team-admin-list"><p class="empty-inline">Loading your account…</p></div></section>`;
  }
  async function loadOwnerAccounts() {
    const list = $('#team-admin-list');
    if (!list) return;
    const account = currentUser?.accountRole === 'owner' ? currentUser : null;
    list.innerHTML = account ? `<div class="team-admin-row team-role-row team-role-row-owner" data-role-row data-account-id="${esc(account.id)}"><span class="team-admin-identity">${avatar(account.username,'team-admin-avatar',account.avatarImage)}<span><strong>${esc(account.username)}</strong><small>Your protected Owner account</small></span></span><strong class="profile-role-chip">Owner</strong><input type="hidden" data-primary-role value="owner"><label>My secondary role tags<input data-secondary-roles maxlength="640" value="${esc((account.secondaryRoles || []).join(', '))}" placeholder="Coder, Modeler, Tester…"><small>Separate roles with commas.</small></label><button class="btn btn-primary btn-sm" type="button" data-save-account-roles>Save my tags</button></div>` : '<p class="empty-inline">Your Owner account could not be loaded.</p>';
  }
  async function saveAccountRoles(button) {
    const row = button.closest('[data-role-row]');
    if (!row) return;
    button.disabled = true;
    try {
      const result = await api('/api/admin/account-roles','PUT',{
        accountId:row.dataset.accountId,
        primaryRole:$('[data-primary-role]',row).value,
        secondaryRoles:$('[data-secondary-roles]',row).value
      });
      if (currentUser?.id === result.account.id) currentUser.secondaryRoles = result.account.secondaryRoles;
      setMessage('#team-admin-message','Account roles saved.',false);
      await Promise.all([loadOwnerAccounts(),loadTeamMembers()]);
      if (currentUser?.id === result.account.id) {
        showAccount();
        setMessage('#team-admin-message','Account roles saved.',false);
      }
    } catch (error) { setMessage('#team-admin-message',error.message); }
    finally { button.disabled = false; }
  }
  function viewedUserRoleManager(user) {
    if (currentUser?.accountRole !== 'owner' || user.accountRole === 'owner') return '';
    const assignableRoles = [['assistant','Assistant'],['ai-assistant','AI Assistant'],['developer','Developer'],['member','Member']];
    const currentRole = PRIMARY_ROLE_LABELS[user.primaryRole] || 'Member';
    const secondaryHelp = user.primaryRole === 'member' ? 'Available when this account has a studio role.' : 'Separate staff roles with commas.';
    return `<section class="account-panel account-panel-wide profile-role-manager"><div class="panel-heading"><div><span class="section-eyebrow">OWNER CONTROLS</span><h2>Manage account roles</h2><p>Set this account’s primary studio role and optional secondary role tags. Visitor and Owner cannot be assigned.</p></div></div><div class="team-admin-row team-role-row profile-role-row" data-role-row data-account-id="${esc(user.id)}"><span class="team-admin-identity">${avatar(user.username,'profile-role-avatar',user.avatarImage)}<span><strong>${esc(user.username)}</strong><small>Current role: ${esc(currentRole)}</small></span></span><label>Primary role<select data-primary-role aria-label="Primary role for ${esc(user.username)}">${assignableRoles.map(([value,label]) => `<option value="${value}"${user.primaryRole === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label>Secondary role tags<input data-secondary-roles maxlength="640" value="${esc((user.secondaryRoles || []).join(', '))}" placeholder="Scripter, Modeler, Tester…"${user.primaryRole === 'member' ? ' disabled' : ''}><small data-secondary-role-help>${secondaryHelp}</small></label><button class="btn btn-primary btn-sm" type="button" data-save-viewed-user-roles>Save role changes</button><p class="form-message profile-role-message" data-viewed-role-message role="status"></p></div></section>`;
  }
  async function saveViewedUserRoles(button) {
    const row = button.closest('[data-role-row]');
    if (!row) return;
    button.disabled = true;
    const status = $('[data-viewed-role-message]',row);
    try {
      await api('/api/admin/account-roles','PUT',{
        accountId:row.dataset.accountId,
        primaryRole:$('[data-primary-role]',row).value,
        secondaryRoles:$('[data-secondary-roles]',row).value
      });
      const result = await api(`/api/public-profile?id=${encodeURIComponent(row.dataset.accountId)}`);
      app.innerHTML = profileDashboard(result.user,false);
      toast('Account roles saved.');
      await loadTeamMembers();
      await loadMemberProfiles();
    } catch (error) {
      if (status) { status.textContent = error.message; status.classList.add('is-error'); }
      else toast(error.message);
    } finally { button.disabled = false; }
  }
  function dangerZone() {
    return `<section class="account-panel account-panel-wide danger-zone"><span class="danger-eyebrow">ACCOUNT MANAGEMENT</span><h2>Danger zone</h2><p>Pause your account for 30 days, or permanently delete it and its Helunemi pause backups.</p><div class="danger-actions"><button class="danger-button danger-button-pause" type="button" data-account-action="pause"><strong>Pause account</strong><span>Hide your profile and block logins for 30 days.</span></button><button class="danger-button danger-button-delete" type="button" data-account-action="delete"><strong>Delete account</strong><span>Permanently remove your account and its Helunemi backups.</span></button></div><p class="danger-retention-note">Deletion clears account data and pause backups held by Helunemi. Git history and backups retained separately by the hosting or database provider follow their own retention policies.</p><div class="account-danger-footer"><button class="btn btn-ghost btn-sm" data-logout>Log out</button></div></section>`;
  }
  function dangerDialog() {
    return `<dialog class="account-danger-dialog" id="account-danger-dialog" aria-labelledby="account-danger-title"><div class="account-danger-dialog-inner"><button class="icon-btn danger-dialog-close" type="button" data-cancel-danger aria-label="Close confirmation">×</button><span class="danger-eyebrow">ACCOUNT MANAGEMENT</span><h2 id="account-danger-title">Confirm account action</h2><p id="account-danger-copy"></p><form id="account-danger-form"><label>Confirm your password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label><label>Type <strong id="account-danger-word"></strong> to confirm<input name="confirmation" required autocomplete="off"></label><p class="form-message" id="danger-action-message" role="status"></p><div class="danger-dialog-actions"><button class="btn btn-ghost" type="button" data-cancel-danger>Cancel</button><button class="btn btn-danger" id="account-danger-submit" type="submit">Confirm</button></div></form></div></dialog>`;
  }
  function accountSecurityPanel(user) {
    if (!firebaseSetupKnown) return '';
    if (!firebaseEnabled) {
      const missing = firebaseMissingSettings.length ? `<p>Render is missing: <strong>${esc(firebaseMissingSettings.join(', '))}</strong>.</p>` : '';
      return `<section class="account-panel account-panel-wide account-security-panel"><span class="section-eyebrow">SIGN-IN &amp; RECOVERY</span><h2>Email security</h2><p>Firebase Authentication has not been detected by the server. Follow the Firebase and Render setup steps in the README.</p>${missing}</section>`;
    }
    if (user.emailVerified && user.authEmail) return `<section class="account-panel account-panel-wide account-security-panel"><span class="section-eyebrow">SIGN-IN &amp; RECOVERY</span><h2>Email security</h2><p class="security-email"><strong>Verified email</strong><span>${esc(user.authEmail)}</span></p><p>Firebase manages your sign-in password. Send yourself a password reset email whenever you need one.</p><button class="btn btn-ghost btn-sm" type="button" data-password-reset data-reset-email="${esc(user.authEmail)}">Send password reset email</button><p class="form-message" data-security-message role="status"></p></section>`;
    return `<section class="account-panel account-panel-wide account-security-panel"><span class="section-eyebrow">SIGN-IN &amp; RECOVERY</span><h2>Connect a verified email</h2><p>Connect this Helunemi profile to Firebase so you can verify your email and recover your password. This keeps your existing profile and username.</p><form id="link-email-form" class="security-link-form"><label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email" value="${esc(user.authEmail || '')}"></label><label>Firebase password<input name="password" type="password" required minlength="10" maxlength="200" autocomplete="new-password" placeholder="At least 10 characters"></label><p class="form-message" id="link-email-message" role="status"></p><button class="btn btn-primary" type="submit">Connect email</button></form></section>`;
  }
  function profileDashboard(user, isOwn = false) {
    requestAnimationFrame(()=>{const root=document.querySelector('[data-profile-account-id]');if(root?.dataset.profileAccountId===user.id)window.SolarisSocial?.mount(root,user,isOwn);});
    const favorites = favoritesFor(user);
    const favoriteCards = [['game',favorites.game],['developer',favorites.developer],['artwork',favorites.artwork]].map(([type,item]) => favoriteCard(type,item)).filter(Boolean);
    const installed=installedGameCards(user);
    const roleLabel = user.accountRole === 'owner' ? 'Helunemi Owner' : (PRIMARY_ROLE_LABELS[user.primaryRole] || 'Member');
    const canEditFriendCard = user.accountRole !== 'owner' && user.primaryRole === 'member';
    const profileOptions = isOwn ? `<div class="profile-options-wrap"><button class="profile-options-button" type="button" data-profile-options aria-label="Profile options" aria-expanded="false" aria-controls="profile-options">⋮</button><div class="profile-options-menu" id="profile-options" hidden><button type="button" data-edit-account>Edit Profile</button><button type="button" data-view-personal-info>View Personal Profile Information</button>${canEditFriendCard ? '<button type="button" data-edit-friend-card>Edit Custom friend card</button>' : ''}</div></div>` : '';
    const admin = isOwn && user.accountRole === 'owner' ? ownerTeamManager() : '';
    const viewedRoleManager = !isOwn ? viewedUserRoleManager(user) : '';
    const roleKey = user.accountRole === 'owner' ? 'owner' : user.primaryRole;
    const profileRoles = ['owner','assistant','ai-assistant','developer'].includes(roleKey) ? `<section class="account-panel account-panel-wide profile-roles-panel"><h2>Roles</h2><div class="member-tags"><span class="tag member-tag">${roleKey === 'owner' ? 'Owner' : esc(PRIMARY_ROLE_LABELS[roleKey])}</span>${(user.secondaryRoles || []).map(tag => `<span class="tag member-tag">${esc(tag)}</span>`).join('')}</div><p>${esc(PRIMARY_ROLE_EXPLANATIONS[roleKey])}</p></section>` : '';
    const ownerClaim = isOwn && user.canClaimOwner ? `<section class="account-panel account-panel-wide owner-claim-panel"><span class="section-eyebrow">STUDIO SETUP</span><h2>Claim the Helunemi Owner role</h2><p>Your signed-in username is reserved for the Owner account. Enter the one-time setup code configured on the Helunemi server to manage registered account roles.</p><form id="owner-claim-form"><label>Owner setup code<input name="ownerSetupCode" type="password" maxlength="200" autocomplete="off" required></label><p class="form-message" id="owner-claim-message" role="status"></p><button class="btn btn-primary" type="submit">Claim Owner role</button></form></section>` : '';
    const security = isOwn ? accountSecurityPanel(user) : '';
    const ownFriendCard = '';
    return `<div class="wrap account-wrap" data-profile-account-id="${esc(user.id)}">
      <section class="account-hero"><div class="account-banner ${bannerRatioClass(user.bannerRatio)}">${bannerImage(user.bannerImage)}</div>
        ${profileOptions}<div class="account-hero-row">${avatar(user.username,'avatar-large',user.avatarImage)}${noteControl(user.notes,'note-control-full')}<div class="account-hero-name"><h2>${esc(user.username)}</h2><p>${user.realName ? esc(user.realName) : 'Real name not shared'}${user.pronouns ? ` <span class="account-pronouns">· ${esc(user.pronouns)}</span>` : ''}</p><span class="profile-role-chip">${esc(roleLabel)}</span></div></div></section>
      <div class="account-grid">
        <section class="account-panel"><h2>About</h2><dl class="profile-facts"><dt>Username</dt><dd>${esc(user.username)}</dd><dt>Real name</dt><dd>${user.realName ? esc(user.realName) : 'Not shared'}</dd><dt>Pronouns</dt><dd>${user.pronouns ? esc(user.pronouns) : 'Not shared'}</dd></dl><h3>Bio</h3><p>${esc(user.bio || 'No bio added yet.')}</p></section>
        <section class="account-panel"><h2>Social accounts</h2>${socialsMarkup(user.socials)}</section>
        <section class="account-panel"><h2>Likes</h2><p>${esc(user.likes || 'No likes added yet.')}</p></section>
        <section class="account-panel"><h2>Dislikes</h2><p>${esc(user.dislikes || 'No dislikes added yet.')}</p></section>
        <section class="account-panel account-panel-wide"><h2>Favorites</h2>${favoriteCards.length ? `<div class="favorite-grid">${favoriteCards.join('')}</div>` : '<p class="empty-inline">No favorites added yet. Edit your profile to choose favorites.</p>'}</section>
        <section class="account-panel account-panel-wide"><h2>Installed games</h2><p class="installed-games-note">Games this member added to their profile. The website cannot verify local installations.</p>${installed}</section>${ownFriendCard}${profileRoles}${security}${admin}${viewedRoleManager}${ownerClaim}
      </div>${isOwn ? `<p class="account-footnote">Your profile is saved by the Helunemi server. Real name and profile details are optional.</p>${dangerZone()}${dangerDialog()}` : ''}</div>`;
  }
  function installedGameCards(user) {
    if(!user.installedGames?.length)return '<p class="empty-inline">No games have been added to this profile.</p>';
    return `<div class="installed-game-grid">${user.installedGames.map(name=>{
      const game=gameByName(name)||gameById(name);
      const content=`${game?projectIcon(game):'<span class="project-icon">🎮</span>'}<span><strong>${esc(game?.name||name)}</strong><small>${esc(game?.version?'Project '+game.version:'Version not provided')}</small>${game?.gameDownloads?.some(build=>build.supported)?`<small>Available for ${esc([...new Set(game.gameDownloads.filter(build=>build.supported).map(build=>({windows:'Windows',android:'Android',other:build.osName||'Other OS'})[build.platform]))].join(' · '))}</small>`:''}<small>Added by member</small>${game?'<small>View game ↗</small>':''}</span>`;
      return game?`<a class="installed-game-card" href="project.html?id=${encodeURIComponent(game.id)}">${content}</a>`:`<div class="installed-game-card">${content}</div>`;
    }).join('')}</div>`;
  }
  async function captureProfileCard(member) {
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:800px;pointer-events:none';host.innerHTML=friendCardMarkup(member,false,false,'own');document.body.append(host);
    try{return await exportFriendCardPng({stage:host.querySelector('.friend-card'),download:false,design:normalizedFriendCardDesign(member.friendCard.design,member.friendCard)});}finally{host.remove();}
  }
  function personalInfoPage(user) {
    const email = user.authEmail || '';
    const verification = email ? (user.emailVerified ? 'Verified' : 'Not verified') : 'No email connected';
    const passwordRecovery = firebaseEnabled && email ? `<button class="btn btn-ghost btn-sm" type="button" data-password-reset data-reset-email="${esc(email)}">Send password reset email</button>` : '<p class="panel-help">Password recovery is available after Firebase email sign-in is connected.</p>';
    return `<div class="wrap account-wrap personal-info-page"><div class="page-head"><h1>Personal Profile Information</h1><p>Private account details are visible only to you.</p></div><div class="account-grid"><section class="account-panel account-panel-wide personal-info-security"><div><span class="section-eyebrow">SIGN-IN DETAILS</span><h2>Email and password</h2></div><dl class="profile-facts"><dt>Email address</dt><dd>${esc(email || 'Not connected')}</dd><dt>Email status</dt><dd>${verification}</dd><dt>Password</dt><dd><span class="password-masked" aria-label="Password hidden">••••••••••••</span><small>Passwords are stored as secure one-way hashes, so they cannot be viewed or revealed with a code.</small></dd><dt>Account ID</dt><dd>${esc(user.id || 'Unavailable')}</dd><dt>Helunemi role</dt><dd>${esc(user.accountRole === 'owner' ? 'Owner' : (PRIMARY_ROLE_LABELS[user.primaryRole] || 'Member'))}</dd></dl>${passwordRecovery}<p class="form-message" data-security-message role="status"></p></section><form id="personal-info-form" class="account-panel account-panel-wide"><span class="section-eyebrow">GENERAL INFORMATION</span><h2>Country and contact details</h2><p class="panel-help">These details stay private and are never shown on your public profile.</p>${window.SolarisShop.countryControl(user.personalInfo?.countryCode || '')}<label>Phone number <span class="optional">optional</span><input name="phoneNumber" type="tel" maxlength="40" autocomplete="tel" value="${esc(user.personalInfo?.phoneNumber || '')}" placeholder="Add a phone number"></label><label>Secondary email <span class="optional">optional</span><input name="secondaryEmail" type="email" maxlength="254" autocomplete="email" value="${esc(user.personalInfo?.secondaryEmail || '')}" placeholder="Add a recovery or contact email"></label><p class="form-message" id="personal-info-message" role="status"></p><div class="actions"><button class="btn btn-primary" type="submit">Save personal information</button><button class="btn btn-ghost" type="button" data-cancel-edit>Back to profile</button></div></form></div></div>`;
  }
  function friendCardEditorPage(user) {
    return `<div class="friend-card-editor-page">${friendCardEditorSection({...user,friendCard:friendCardEditorContext?.friendCard || user.friendCard})}</div>`;
  }
  function prepareFriendCardEditorView() {
    const form = $('#friend-card-form'), workspace = $('.friend-card-workspace'), left = $('.friend-editor-left'), right = $('.friend-editor-right'), toolbar = $('.friend-editor-toolbar');
    if (!form || !workspace || !left || !right || !toolbar) return;
    document.body.classList.add('friend-card-edit-mode');
    const back = document.createElement('button');
    back.type = 'button'; back.className = 'btn btn-ghost btn-sm friend-editor-back'; back.dataset.cancelEdit = ''; back.textContent = '← Back to profile';
    toolbar.prepend(back);
    const canvasTools = $('.friend-tool-mode');
    if (canvasTools && !canvasTools.querySelector('[data-transform-mode]')) {
      for (const [mode,label,key] of [['move','Move','G'],['rotate','Rotate','R'],['scale','Scale / crop','S']]) {
        const button = document.createElement('button'); button.type='button'; button.dataset.transformMode=mode; button.setAttribute('aria-pressed',String(mode === friendCardTransformMode)); button.innerHTML=`${label} <kbd>${key}</kbd>`;
        canvasTools.append(button);
      }
    }
    const actions = $('.friend-editor-toolbar-actions',toolbar), post = $('[data-post-friend-card]'), publish = $('.friend-card-publish-row'), message = $('#friend-card-post-message');
    if (post && actions) actions.append(post);
    if (message) toolbar.append(message);
    publish?.remove();
    const globalStyle = $('.friend-global-style',right);
    const leftChildren = [...left.children];
    const panelHead = leftChildren[0];
    const paneSetup = document.createElement('div'), paneLayers = document.createElement('div'), paneAssets = document.createElement('div');
    paneSetup.className = 'friend-editor-pane'; paneSetup.dataset.leftPaneContent = 'setup';
    paneLayers.className = 'friend-editor-pane friend-editor-layer-pane'; paneLayers.dataset.leftPaneContent = 'layers'; paneLayers.hidden = true;
    paneAssets.className = 'friend-editor-pane'; paneAssets.dataset.leftPaneContent = 'assets'; paneAssets.hidden = true;
    const panes = [paneSetup,paneLayers,paneAssets];
    const panels = leftChildren.slice(1);
    for (const item of panels) {
      if (item.classList.contains('friend-frame-section') || item.querySelector('.friend-card-asset-list,.friend-font-list')) paneAssets.append(item);
      else if (item.classList.contains('friend-layer-panel') || item.querySelector('[data-insert-layer]')) paneLayers.append(item);
      else paneSetup.append(item);
    }
    if (globalStyle) paneSetup.append(globalStyle);
    const addPanel = [...paneLayers.children].find(item => item.querySelector('[data-insert-layer]'));
    const layerPanel = [...paneLayers.children].find(item => item.classList.contains('friend-layer-panel'));
    const innerTabs = document.createElement('nav'); innerTabs.className = 'friend-editor-subtabs'; innerTabs.setAttribute('aria-label','Layer categories');
    const innerBody = document.createElement('div'); innerBody.className = 'friend-editor-subtab-body';
    const makeInnerPane = (key,label) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.dataset.layerPaneTab = key; tab.setAttribute('aria-pressed',String(key === 'elements')); tab.textContent = label; innerTabs.append(tab);
      const pane = document.createElement('div'); pane.className = 'friend-editor-subpane'; pane.dataset.layerPaneContent = key; pane.hidden = key !== 'elements'; innerBody.append(pane); return pane;
    };
    const elementPane = makeInnerPane('elements','Text & buttons');
    const shapePane = makeInnerPane('shapes','Shapes');
    const stickerPane = makeInnerPane('stickers','Images & stickers');
    const listPane = makeInnerPane('list','Layer list');
    const addSection = addPanel?.querySelector('.friend-tool-grid');
    if (addSection) {
      const toolGrid = addSection;
      const elementBox = document.createElement('section'); elementBox.className = 'friend-editor-section'; elementBox.innerHTML = '<h3>Text &amp; buttons</h3><div class="friend-tool-grid"></div>';
      const elementGrid = $('.friend-tool-grid',elementBox);
      toolGrid.querySelectorAll('[data-insert-layer="text"],[data-insert-layer="button"]').forEach(button => elementGrid.append(button));
      for(const [type,label] of [['avatar','Profile picture'],['username','Username'],['textbox','Text box']]){const button=document.createElement('button');button.type='button';button.dataset.insertLayer=type;button.textContent='+ '+label;elementGrid.append(button);}
      for(const [key,label] of [['likes','What I like'],['dislikes','What I dislike'],['favorite','Favorite thing'],['lookingFor','Friend I’m looking for']]){const button=document.createElement('button');button.type='button';button.dataset.insertTextbox=key;button.textContent='+ '+label;elementGrid.append(button);}
      const shapeBox = document.createElement('section'); shapeBox.className = 'friend-editor-section'; shapeBox.innerHTML = '<h3>Shapes</h3><p class="panel-help">Add a shape, then choose its color and size in Properties.</p><div class="friend-tool-grid friend-shape-grid"></div>';
      const shapeGrid = $('.friend-shape-grid',shapeBox);
      for (const [style,label,icon] of [['rectangle','Rectangle','▭'],['square','Square','□'],['rounded','Rounded square','▢'],['circle','Circle','○'],['triangle','Triangle','△'],['diamond','Diamond','◇'],['star','Star','☆'],['hexagon','Hexagon','⬡']]) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.insertShape = style; button.textContent = `${icon} ${label}`; shapeGrid.append(button);
      }
      const stickerBox = document.createElement('section'); stickerBox.className = 'friend-editor-section'; stickerBox.innerHTML = '<h3>Stickers &amp; images</h3><div class="friend-tool-grid"></div>';
      const stickerGrid = $('.friend-tool-grid',stickerBox);
      toolGrid.querySelectorAll('[data-insert-image],[data-insert-sticker],[data-insert-sticker-url]').forEach(button => stickerGrid.append(button));
      elementPane.append(elementBox); shapePane.append(shapeBox); stickerPane.append(stickerBox);
      const stickerLibrary = addPanel.querySelector('[data-friend-sticker-library]');
      if (stickerLibrary) stickerPane.append(stickerLibrary);
      for (const input of addPanel.querySelectorAll('[data-cfc-image-input],[data-sticker-input]')) stickerPane.append(input);
      addPanel.remove();
    }
    if (layerPanel) listPane.append(layerPanel);
    paneLayers.replaceChildren(innerTabs,innerBody);
    const tabs = document.createElement('nav');
    tabs.className = 'friend-editor-panel-tabs'; tabs.setAttribute('aria-label','Friend-Card editor sections');
    for (const [key,label] of [['setup','Card'],['layers','Layers'],['assets','Assets']]) {
      const button = document.createElement('button'); button.type='button'; button.dataset.leftPaneTab=key; button.setAttribute('aria-pressed',String(key === 'setup')); button.textContent=label; tabs.append(button);
    }
    const panelBody = document.createElement('div'); panelBody.className='friend-editor-panel-body'; panelBody.append(...panes);
    left.replaceChildren(panelHead,tabs,panelBody);
    const propertyBody = $('[data-friend-properties]',right); if (propertyBody) propertyBody.classList.add('friend-editor-properties-scroll');
    for (const input of $$('input[type="color"]',form)) {
      if (input.closest('.friend-color-picker')) continue;
      const picker = document.createElement('span'); picker.className = 'friend-color-picker';
      const hex = document.createElement('input'); hex.type='text'; hex.className='friend-color-hex'; hex.dataset.friendColorHex=''; hex.maxLength=7; hex.spellcheck=false; hex.inputMode='text'; hex.value=input.value.toUpperCase(); hex.setAttribute('aria-label',`${input.getAttribute('aria-label') || input.closest('label')?.textContent.trim() || 'Color'} HEX code`); hex.placeholder='#302344';
      input.replaceWith(picker); picker.append(input,hex);
    }
    updateFriendCardEditorPreview();
    requestAnimationFrame(fitFriendCardCanvas);
  }
  function fitFriendCardCanvas() {
    const frame = $('.friend-canvas-scroll'), size = $('.friend-canvas-size');
    if (!frame || !size || !friendCardDesignState) return;
    const design = friendCardDesignState, ratio = design.width / Math.max(1,design.height);
    // Frame changes only change available pan space, never the card's display size.
    const width = Math.max(1,Math.floor(Math.min(design.width,Math.max(1,frame.clientWidth - 24),Math.max(1,frame.clientHeight - 24) * ratio)));
    const height = width / ratio, insets = friendCardFrameInsets(design);
    const horizontal = Math.max(insets.left,insets.right) * width / 100 + 16;
    const vertical = Math.max(insets.top,insets.bottom) * height / 100 + 16;
    const key = [width,height,horizontal,vertical,frame.clientWidth,frame.clientHeight].join(':');
    if (size.dataset.cfcFit === key) return;
    const beforeWidth = frame.scrollWidth, beforeHeight = frame.scrollHeight, initialized = Boolean(size.dataset.cfcFit);
    size.style.width = `${width}px`;
    frame.style.gridTemplateColumns = `minmax(${Math.ceil(width + 2 * horizontal)}px,1fr)`;
    frame.style.gridTemplateRows = `minmax(${Math.ceil(height + 2 * vertical)}px,1fr)`;
    size.dataset.cfcFit = key;
    if (initialized) {
      frame.scrollLeft += (frame.scrollWidth - beforeWidth) / 2;
      frame.scrollTop += (frame.scrollHeight - beforeHeight) / 2;
    } else {
      frame.scrollLeft = Math.max(0,(frame.scrollWidth - frame.clientWidth) / 2);
      frame.scrollTop = Math.max(0,(frame.scrollHeight - frame.clientHeight) / 2);
    }
  }

  window.addEventListener('resize',() => { if ($('#friend-card-form')) fitFriendCardCanvas(); });
  function setFriendCardTransformMode(mode) {
    if (!['move','rotate','scale'].includes(mode)) return;
    friendCardTransformMode = mode;
    friendCardActiveTool = 'select';
    $$('[data-editor-tool]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.editorTool === 'select')));
    $$('[data-transform-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.transformMode === mode)));
  }
  function friendCardSelectionBox(layers = friendCardSelection()) {
    if (!layers.length || !friendCardDesignState) return null;
    const design = friendCardDesignState;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const layer of layers) {
      const width = layer.width * design.width / 100;
      const height = friendCardSquareLayer(layer) ? width : layer.height * design.height / 100;
      const x = layer.x * design.width / 100 + width / 2, y = layer.y * design.height / 100 + height / 2;
      const angle = layer.rotation * Math.PI / 180;
      const halfWidth = (Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle))) / 2;
      const halfHeight = (Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle))) / 2;
      left = Math.min(left,x-halfWidth); right = Math.max(right,x+halfWidth);
      top = Math.min(top,y-halfHeight); bottom = Math.max(bottom,y+halfHeight);
    }
    return {x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
  }
  function friendCardSelectionBoundsMarkup() {
    if (friendCardSelection().length < 2) return '';
    const box = friendCardSelectionBox(); if (!box) return '';
    return `<div class="friend-multi-selection" data-cfc-selection-bounds aria-hidden="true" style="left:${box.x/friendCardDesignState.width*100}%;top:${box.y/friendCardDesignState.height*100}%;width:${box.width/friendCardDesignState.width*100}%;height:${box.height/friendCardDesignState.height*100}%"></div>`;
  }
  function refreshFriendCardSelectionBounds() {
    const box = friendCardSelectionBox(), element = $('[data-cfc-selection-bounds]');
    if (!box || !element) return;
    element.style.left = `${box.x/friendCardDesignState.width*100}%`; element.style.top = `${box.y/friendCardDesignState.height*100}%`;
    element.style.width = `${box.width/friendCardDesignState.width*100}%`; element.style.height = `${box.height/friendCardDesignState.height*100}%`;
  }
  function captureFriendCardTransform(mode, startX, startY) {
    const layers = friendCardSelection(), stage = $('#friend-card-editor-stage .friend-card');
    if (!layers.length || !stage) { toast('Select one or more layers first.'); return null; }
    if (layers.some(layer => layer.locked)) { toast('Unlock the selected layers before transforming them.'); return null; }
    const box = friendCardSelectionBox(layers), bounds = stage.getBoundingClientRect();
    const centerX = bounds.left + (box.x + box.width/2) / friendCardDesignState.width * bounds.width;
    const centerY = bounds.top + (box.y + box.height/2) / friendCardDesignState.height * bounds.height;
    return {mode,startX,startY,centerX,centerY,startAngle:Math.atan2(startY-centerY,startX-centerX),bounds,box,layers:structuredClone(layers),snapshot:friendCardSnapshot(),axis:'both'};
  }
  function beginFriendCardTransform(mode) {
    if (friendCardActiveTransform) commitFriendCardTransform();
    const transform = captureFriendCardTransform(mode,friendCardPointer.x,friendCardPointer.y);
    if (!transform) return;
    setFriendCardTransformMode(mode); friendCardActiveTransform = transform;
    document.body.classList.add('friend-transform-active');
    const status = $('[data-friend-save-status]');
    if (status) status.textContent = `${mode[0].toUpperCase()+mode.slice(1)} ${transform.layers.length > 1 ? transform.layers.length+' layers' : 'layer'} · click or Enter to apply · Esc to cancel`;
  }
  function updateFriendCardTransformElement(layer) {
    const element = $(`[data-editor-layer="${CSS.escape(layer.id)}"]`);
    if (element) {
      element.style.left=`${layer.x}%`; element.style.top=`${layer.y}%`; element.style.width=`${layer.width}%`;
      element.style.height=friendCardSquareLayer(layer)?`${layer.width}cqw`:`${layer.height}%`;
      element.style.transform=`rotate(${layer.rotation}deg)`; element.style.fontSize=`calc(${layer.fontSize} * 1cqw)`;
    }
    if (friendCardSelection().length === 1) $$('[data-layer-property]').forEach(input => { if(input.dataset.layerProperty in layer) input.value=layer[input.dataset.layerProperty]; });
  }
  function applyFriendCardSelectionTransform(transform, event) {
    const design = friendCardDesignState, box = transform.box;
    let dx = (event.clientX-transform.startX)/transform.bounds.width*100;
    let dy = (event.clientY-transform.startY)/transform.bounds.height*100;
    const selectedIds = new Set(transform.layers.map(layer => layer.id));
    if (transform.mode === 'move') {
      dx = snapFriendCardPosition(box.x/design.width*100+dx,box.width/design.width*100,'x',selectedIds)-box.x/design.width*100;
      dy = snapFriendCardPosition(box.y/design.height*100+dy,box.height/design.height*100,'y',selectedIds)-box.y/design.height*100;
    }
    let fx = transform.axis === 'y' ? 1 : Math.max(.01,(box.width+dx*design.width/100)/box.width);
    let fy = transform.axis === 'x' ? 1 : Math.max(.01,(box.height+dy*design.height/100)/box.height);
    if (transform.layers.length === 1 && friendCardSquareLayer(transform.layers[0])) {
      const factor = transform.axis === 'x' ? fx : transform.axis === 'y' ? fy : Math.abs(fx-1)>=Math.abs(fy-1)?fx:fy;
      fx = factor; fy = factor;
    }
    const radians = Math.atan2(event.clientY-transform.centerY,event.clientX-transform.centerX)-transform.startAngle;
    const cos = Math.cos(radians), sin = Math.sin(radians);
    const groupX = box.x+box.width/2, groupY = box.y+box.height/2;
    for (const original of transform.layers) {
      const layer = design.layers.find(item => item.id === original.id); if (!layer) continue;
      if (transform.mode === 'move') {
        layer.x=friendCardLimit(original.x+dx); layer.y=friendCardLimit(original.y+dy);
      } else {
        const width = original.width*design.width/100;
        const height = friendCardSquareLayer(original) ? width : original.height*design.height/100;
        const centerX = original.x*design.width/100+width/2, centerY = original.y*design.height/100+height/2;
        if (transform.mode === 'rotate') {
          const offsetX = centerX-groupX, offsetY = centerY-groupY;
          layer.x=friendCardLimit((groupX+offsetX*cos-offsetY*sin-width/2)/design.width*100);
          layer.y=friendCardLimit((groupY+offsetX*sin+offsetY*cos-height/2)/design.height*100);
          layer.rotation=((original.rotation+radians*180/Math.PI+180)%360+360)%360-180;
        } else {
          let newWidth=width*fx,newHeight=height*fy;
          if (friendCardSquareLayer(original)) {
            const factor=transform.axis==='x'?fx:transform.axis==='y'?fy:Math.abs(fx-1)>=Math.abs(fy-1)?fx:fy;
            newWidth=width*factor; newHeight=newWidth;
          }
          layer.width=friendCardSize(newWidth/design.width*100);
          layer.height=friendCardSquareLayer(original)?layer.width:friendCardSize(newHeight/design.height*100);
          layer.x=friendCardLimit((box.x+(centerX-box.x)*fx-newWidth/2)/design.width*100);
          layer.y=friendCardLimit((box.y+(centerY-box.y)*fy-newHeight/2)/design.height*100);
          if (transform.layers.length>1) layer.fontSize=Math.max(1,Math.min(14,original.fontSize*Math.min(fx,fy)));
        }
      }
      updateFriendCardTransformElement(layer);
    }
    refreshFriendCardSelectionBounds();
  }
  function updateFriendCardActiveTransform(event) {
    if (friendCardActiveTransform) applyFriendCardSelectionTransform(friendCardActiveTransform,event);
  }
  function rememberFriendCardTransform(snapshot) {
    if (friendCardSnapshot() === snapshot) return false;
    friendCardUndoStack.push(snapshot); if(friendCardUndoStack.length>80) friendCardUndoStack.shift(); friendCardRedoStack=[];
    return true;
  }
  function commitFriendCardTransform() {
    if (!friendCardActiveTransform) return;
    const changed = rememberFriendCardTransform(friendCardActiveTransform.snapshot);
    friendCardActiveTransform=null; document.body.classList.remove('friend-transform-active');
    setFriendCardTransformMode('move'); repaintFriendCardEditor({dirty:changed});
  }
  function cancelFriendCardTransform() {
    if (!friendCardActiveTransform) return false;
    friendCardDesignState=normalizedFriendCardDesign(JSON.parse(friendCardActiveTransform.snapshot),friendCardFromForm($('#friend-card-form'))||currentUser.friendCard);
    friendCardActiveTransform=null; document.body.classList.remove('friend-transform-active');
    setFriendCardTransformMode('move'); repaintFriendCardEditor({dirty:false}); return true;
  }

  function profileEditor(user) {
    const socials = socialRowsMarkup(user.socials);
    const favs = favoritesFor(user);
    const ticketCounts = user.tickets || { namecard: 0, who: 0 };
    const namecardOption = ticketCounts.namecard > 0 ? `<label class="ticket-choice"><input type="checkbox" name="useNamecardTicket"><span>Use a Namecard ticket (${ticketCounts.namecard} available)</span></label>` : `<p class="panel-help">Namecard tickets in your inventory: ${ticketCounts.namecard || 0}. <a class="text-link" href="shop.html">Get one in the Shop</a>.</p>`;
    const realNameNotice = user.realName ? (ticketCounts.who > 0 ? `<p class="panel-help">Your saved real name is permanent unless you use a WHO? ticket (${ticketCounts.who} available).</p><label class="ticket-choice"><input type="checkbox" name="useWhoTicket"><span>Use a WHO? ticket for this change</span></label>` : `<p class="panel-help">Your saved real name is permanent. <a class="text-link" href="shop.html">Get a WHO? ticket in the Shop</a> if you need to change it.</p>`) : '<p class="real-name-warning">Warning: the first real name you save becomes permanent. To change it later, you will need a WHO? ticket from the Shop.</p>';
    return `<div class="wrap account-wrap"><div class="page-head"><h1>Edit profile</h1><p>Choose what to share on your Helunemi profile. Only your username is required for your account.</p></div>
      <form id="profile-form" class="account-editor">
        <div class="account-grid">
          <section class="account-panel account-panel-wide image-settings"><h2>Profile appearance</h2><p class="panel-help">Click either image to choose a photo, then drag, zoom, and rotate it to fit.</p>
            <div class="appearance-pickers"><button class="banner-picker ${bannerRatioClass(user.bannerRatio)}" type="button" data-open-image="banner" aria-label="Change profile banner"><span class="banner-picker-image">${bannerImage(user.bannerImage)}</span><span class="picker-caption">Change banner</span></button>
              <button class="avatar-picker" type="button" data-open-image="avatar" aria-label="Change profile picture">${avatar(user.username,'avatar-edit-large',user.avatarImage)}<span class="avatar-picker-scrim" aria-hidden="true"></span><span class="picker-caption">Change</span></button></div>
            <input type="file" accept="image/png,image/jpeg,image/webp" data-image-input="banner" hidden><input type="hidden" name="bannerImage" value="${esc(user.bannerImage || '')}"><input type="hidden" name="bannerRatio" value="${esc(user.bannerRatio || '21:9')}">
            <input type="file" accept="image/png,image/jpeg,image/webp" data-image-input="avatar" hidden><input type="hidden" name="avatarImage" value="${esc(user.avatarImage || '')}"></section>
            <section class="account-panel"><h2>About you</h2><label>Username<input name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*" autocomplete="username" value="${esc(user.username)}"></label><p class="panel-help">Username changes have a seven-day cooldown. A Namecard ticket skips the wait.</p>${namecardOption}<label>Real name <span class="optional">optional</span><input name="realName" maxlength="80" autocomplete="name" value="${esc(user.realName || '')}"></label>${realNameNotice}<label>Pronouns <span class="optional">optional</span><input name="pronouns" maxlength="32" placeholder="e.g. they/them" value="${esc(user.pronouns || '')}"></label>
            <label>Bio<textarea name="bio" rows="4" maxlength="500" placeholder="A little about you…">${esc(user.bio || '')}</textarea></label><label>Profile note<textarea name="notes" rows="2" maxlength="160" placeholder="A short note shown in a speech bubble by your picture…">${esc(user.notes || '')}</textarea></label></section>
          <section class="account-panel"><h2>Likes &amp; dislikes</h2><label>Likes<textarea name="likes" rows="4" maxlength="400" placeholder="Games, genres, things you enjoy…">${esc(user.likes || '')}</textarea></label><label>Dislikes<textarea name="dislikes" rows="4" maxlength="400" placeholder="Anything you prefer to avoid…">${esc(user.dislikes || '')}</textarea></label></section>
          <section class="account-panel account-panel-wide"><div class="panel-heading"><div><h2>Social accounts</h2><p>Add links you want to share. Only secure https links are accepted.</p></div><button class="btn btn-ghost btn-sm" type="button" data-add-social>Add account</button></div><div class="social-editor" id="social-editor">${socials}</div></section>
          <section class="account-panel account-panel-wide"><h2>Favorites</h2><p class="panel-help">Add an optional comment to each favorite.</p><div class="favorite-editor-grid">
            <div class="favorite-editor-item">${favoriteControl('game',favs.game)}</div><div class="favorite-editor-item">${favoriteControl('developer',favs.developer)}</div><div class="favorite-editor-item">${favoriteControl('artwork',favs.artwork)}</div></div></section>
          <section class="account-panel account-panel-wide"><h2>Installed games</h2><p class="panel-help">List the Helunemi games you have installed, separated by commas. You can leave this blank.</p><label class="visually-hidden" for="installed-games">Installed Helunemi games</label><input id="installed-games" name="installedGames" maxlength="500" value="${esc((user.installedGames || []).join(', '))}" placeholder="e.g. Gamma Frost"></section>
        </div><p class="form-message" id="profile-message" role="status"></p><div class="actions editor-actions"><button class="btn btn-primary" type="submit">Save profile</button><button class="btn btn-ghost" type="button" data-cancel-edit>Cancel</button></div>
      </form></div>`;
  }
  function authView(mode = 'signup', error = '') {
    const signupSelected = mode !== 'login';
    const firebaseReady = firebaseSetupKnown && firebaseEnabled;
    const emailField = `<label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="you@example.com"></label>`;
    return `<div class="wrap account-wrap"><div class="page-head"><h1>Helunemi account</h1><p>Create a member profile or log in to manage your account.</p></div>
      <section class="auth-card"><div class="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" data-auth-mode="signup" aria-selected="${signupSelected}">Sign up</button><button type="button" role="tab" data-auth-mode="login" aria-selected="${!signupSelected}">Log in</button></div>
      <p class="form-message" id="auth-message" role="status">${esc(error)}</p>
      <form id="signup-form" class="form auth-form"${signupSelected ? '' : ' hidden'}><h2>Create your account</h2>${firebaseReady ? emailField : ''}<label>Username<input name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*" autocomplete="username" placeholder="3–24 characters; spaces allowed"></label>
      <label>Password<input name="password" type="password" required minlength="10" maxlength="200" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm password<input name="confirmPassword" type="password" required minlength="10" maxlength="200" autocomplete="new-password"></label><button class="btn btn-primary" type="submit">Create account</button></form>
      <form id="login-form" class="form auth-form"${!signupSelected ? '' : ' hidden'}><h2>Welcome back</h2>${firebaseReady ? emailField : '<label>Username<input name="username" required maxlength="24" autocomplete="username"></label>'}<label>Password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label>${firebaseReady ? '<button class="text-link auth-reset-link" type="button" data-reset-auth>Password forgotten? Send a reset email</button>' : ''}<button class="btn btn-primary" type="submit">Log in</button>${firebaseReady ? '<button class="btn btn-ghost guest-entry" type="button" data-legacy-login-toggle>Use an older Helunemi username account</button>' : ''}</form>
      ${firebaseReady ? '<div id="legacy-login-panel" hidden><form id="legacy-login-form" class="form auth-form"><h2>Older Helunemi account</h2><label>Username<input name="username" required maxlength="24" autocomplete="username"></label><label>Password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label><button class="btn btn-primary" type="submit">Log in to existing account</button><button class="btn btn-ghost guest-entry" type="button" data-legacy-login-toggle>Back to email sign-in</button></form></div>' : ''}
      ${signupSelected ? '<button class="btn btn-ghost guest-entry" type="button" data-view-guest>View site as guest</button>' : ''}
      <p class="auth-note">${firebaseReady ? 'A verified email is required. Firebase securely manages email verification and password recovery.' : firebaseSetupKnown && firebaseMissingSettings.length ? `Firebase setup is incomplete. Render is missing: ${esc(firebaseMissingSettings.join(', '))}.` : 'Email verification and password recovery become available after Firebase is configured. Until then, existing username accounts continue to work.'}</p></section></div>`;
  }
  function showAccount() {
    const params = new URLSearchParams(location.search);
    if (!editingFriendCard) { friendCardActiveTransform = null; document.body.classList.remove('friend-transform-active'); }
    document.body.classList.toggle('friend-card-edit-mode',Boolean(currentUser && editingFriendCard));
    const publicId = params.get('user');
    if (publicId && publicId !== currentUser?.id) {
      app.innerHTML = `<div class="wrap account-wrap"><p class="empty-inline">Loading profile…</p></div>`;
      api(`/api/public-profile?id=${encodeURIComponent(publicId)}`).then(result => { app.innerHTML = profileDashboard(result.user,false); }).catch(error => { app.innerHTML = `<div class="wrap account-wrap"><div class="page-head"><h1>Profile unavailable</h1><p>${esc(error.message)}</p><a class="btn btn-ghost" href="list.html">Back to the List</a></div></div>`; });
      return;
    }
    if (!currentUser) {
      const mode = params.get('mode') || 'signup';
      if (isGuest && !params.has('mode')) app.innerHTML = guestDashboard();
      else app.innerHTML = authView(mode === 'login' ? 'login' : 'signup');
    } else {
      app.innerHTML = editingFriendCard ? friendCardEditorPage(currentUser) : viewingPersonalInfo ? personalInfoPage(currentUser) : editingProfile ? profileEditor(currentUser) : profileDashboard(currentUser,true);
      if (editingFriendCard) prepareFriendCardEditorView();
      if (viewingPersonalInfo) window.SolarisShop?.fillCountries(app);
      if (!editingProfile && !editingFriendCard && !viewingPersonalInfo && currentUser.accountRole === 'owner') loadOwnerAccounts();
    }
  }
  function setMessage(id, message, isError = true) {
    const element = $(id);
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', isError);
    element.classList.toggle('is-success', !isError);
  }
  function toggleAuthMode(mode) {
    const signup = mode === 'signup';
    $('#signup-form').hidden = !signup;
    $('#login-form').hidden = signup;
    const legacyPanel = $('#legacy-login-panel');
    if (legacyPanel) legacyPanel.hidden = true;
    $$('[data-auth-mode]').forEach(button => button.setAttribute('aria-selected',String(button.dataset.authMode === mode)));
    setMessage('#auth-message','',false);
  }
  function guestDashboard() {
    return `<div class="wrap account-wrap guest-account-wrap"><section class="account-hero guest-account-hero"><div class="account-banner banner-ratio-21-9 guest-account-banner"><span>VISITOR</span></div><div class="account-hero-row">${avatar('Visitor','avatar-large guest-avatar')}<div class="account-hero-name"><h2>Visitor</h2><span class="profile-role-chip">Visitor</span></div></div></section><section class="account-panel guest-gate-card"><h2>Wish to Log In and access downloads?</h2><p>Click here to fully log in to access downloads and others.</p><div class="actions"><a class="btn btn-primary" href="account.html?mode=login">Log In</a><a class="btn btn-ghost" href="account.html?mode=signup">Create an account</a></div></section></div>`;
  }
  function leaveGuestMode() {
    isGuest = false;
    try { sessionStorage.removeItem('solaris-guest'); } catch (_) {}
  }
  function accountFromForm(form) {
    const get = name => $( `[name="${name}"]`, form)?.value?.trim() || '';
    const socials = $$('.social-editor-row',form).map(row => ({label:$('[name="social-label"]',row).value.trim(),url:$('[name="social-url"]',row).value.trim()})).filter(item => item.label && item.url);
    const favorites = {};
    for (const type of ['game','developer','artwork']) {
      const title = get(`favorite-${type}`);
      if (title) favorites[type] = {title,comment:get(`favorite-${type}-comment`)};
    }
    const installedGames = get('installedGames').split(',').map(item => item.trim()).filter(Boolean);
    return {username:get('username'),realName:get('realName'),pronouns:get('pronouns'),bio:get('bio'),notes:get('notes'),avatarImage:get('avatarImage'),bannerImage:get('bannerImage'),bannerRatio:get('bannerRatio'),likes:get('likes'),dislikes:get('dislikes'),socials,favorites,installedGames,useNamecardTicket:form.elements.useNamecardTicket?.checked === true,useWhoTicket:form.elements.useWhoTicket?.checked === true};
  }
  function ensureCropDialog() {
    if (cropDialog) return cropDialog;
    cropDialog = document.createElement('dialog');
    cropDialog.id = 'image-crop-dialog';
    cropDialog.className = 'image-crop-dialog';
    cropDialog.setAttribute('aria-labelledby','crop-title');
    cropDialog.innerHTML = `<div class="crop-head"><div><p class="profile-kicker">PROFILE IMAGE</p><h2 id="crop-title">Adjust image</h2></div><button type="button" class="icon-btn" data-crop-cancel>Cancel</button></div>
      <p class="crop-help">Drag the image to choose the crop. Use zoom and rotation to fine-tune it.</p>
      <div class="crop-ratios" role="group" aria-label="Banner crop ratio" hidden><button type="button" data-crop-ratio="16:9">16:9</button><button type="button" data-crop-ratio="21:9">21:9</button></div>
      <div class="crop-viewport"><canvas id="crop-canvas" aria-label="Image crop preview"></canvas></div>
      <div class="crop-control-grid"><label>Zoom<input id="crop-zoom" type="range" min="1" max="3" step="0.01" value="1"></label>
        <div class="crop-rotation"><span>Rotate</span><div><button type="button" class="icon-btn" data-crop-rotate="-90">−90°</button><input id="crop-rotation" type="range" min="-180" max="180" step="1" value="0" aria-label="Fine-tune rotation"><button type="button" class="icon-btn" data-crop-rotate="90">+90°</button></div></div></div>
      <p class="crop-message" id="crop-message" role="status"></p><div class="crop-actions"><button type="button" class="btn btn-ghost" data-crop-cancel>Cancel</button><button type="button" class="btn btn-primary" data-crop-save>Use this image</button></div>`;
    document.body.append(cropDialog);
    const canvas = $('#crop-canvas',cropDialog);
    canvas.addEventListener('pointerdown',event => {
      if (!cropSession) return;
      cropSession.drag = {x:event.clientX,y:event.clientY};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event => {
      if (!cropSession?.drag) return;
      const rect = canvas.getBoundingClientRect();
      cropSession.offsetX += (event.clientX - cropSession.drag.x) * canvas.width / rect.width;
      cropSession.offsetY += (event.clientY - cropSession.drag.y) * canvas.height / rect.height;
      cropSession.drag = {x:event.clientX,y:event.clientY};
      paintCrop();
    });
    canvas.addEventListener('pointerup',() => { if (cropSession) cropSession.drag = null; });
    canvas.addEventListener('pointercancel',() => { if (cropSession) cropSession.drag = null; });
    cropDialog.addEventListener('cancel',() => discardCrop());
    cropDialog.addEventListener('click',event => { if (event.target === cropDialog) discardCrop(); });
    return cropDialog;
  }
  function cropDimensions(kind, ratio) {
    if (kind === 'avatar') return {width:800,height:800};
    return ratio === '16:9' ? {width:960,height:540} : {width:1050,height:450};
  }
  function drawCrop(ctx,width,height,session,previewScale=1) {
    const bitmap = session.bitmap;
    const radians = session.rotation * Math.PI / 180;
    const cosine = Math.abs(Math.cos(radians)), sine = Math.abs(Math.sin(radians));
    const rotatedWidth = bitmap.width * cosine + bitmap.height * sine;
    const rotatedHeight = bitmap.width * sine + bitmap.height * cosine;
    const scale = Math.max(width / rotatedWidth,height / rotatedHeight) * session.zoom;
    const drawWidth = bitmap.width * scale, drawHeight = bitmap.height * scale;
    const extentX = (drawWidth * cosine + drawHeight * sine) / 2;
    const extentY = (drawWidth * sine + drawHeight * cosine) / 2;
    const offsetX = Math.max(-(extentX-width/2),Math.min(extentX-width/2,session.offsetX * previewScale));
    const offsetY = Math.max(-(extentY-height/2),Math.min(extentY-height/2,session.offsetY * previewScale));
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = '#171018'; ctx.fillRect(0,0,width,height);
    ctx.save(); ctx.translate(width/2+offsetX,height/2+offsetY); ctx.rotate(radians);
    ctx.drawImage(bitmap,-drawWidth/2,-drawHeight/2,drawWidth,drawHeight); ctx.restore();
    return {extentX,extentY};
  }
  function paintCrop() {
    if (!cropSession) return;
    const canvas = $('#crop-canvas',cropDialog);
    const {width,height} = cropDimensions(cropSession.kind,cropSession.ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext('2d');
    const extents = drawCrop(ctx,width,height,cropSession);
    cropSession.offsetX = Math.max(-(extents.extentX-width/2),Math.min(extents.extentX-width/2,cropSession.offsetX));
    cropSession.offsetY = Math.max(-(extents.extentY-height/2),Math.min(extents.extentY-height/2,cropSession.offsetY));
    $('#crop-zoom',cropDialog).value = cropSession.zoom;
    $('#crop-rotation',cropDialog).value = cropSession.rotation;
    $$('[data-crop-ratio]',cropDialog).forEach(button => button.setAttribute('aria-pressed',String(button.dataset.cropRatio === cropSession.ratio)));
  }
  async function openCrop(file,kind) {
    if (!file || !/^image\/(?:jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
    if (typeof createImageBitmap !== 'function') throw new Error('Image editing is not supported in this browser.');
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > 12000 || bitmap.height > 12000 || bitmap.width * bitmap.height > 60_000_000) {
      bitmap.close?.();
      throw new Error('That image is too large to edit. Choose one with smaller dimensions.');
    }
    if (cropSession?.bitmap) cropSession.bitmap.close?.();
    const selectedRatio = $('[name="bannerRatio"]',$('#profile-form'))?.value || currentUser.bannerRatio;
    cropSession = {bitmap,kind,ratio:kind === 'banner' && selectedRatio === '16:9' ? '16:9' : (kind === 'banner' ? '21:9' : '1:1'),zoom:1,rotation:0,offsetX:0,offsetY:0,drag:null};
    const dialog = ensureCropDialog();
    $('#crop-title',dialog).textContent = kind === 'banner' ? 'Adjust profile banner' : 'Adjust profile picture';
    $('.crop-ratios',dialog).hidden = kind !== 'banner';
    $('#crop-message',dialog).textContent = '';
    paintCrop();
    dialog.showModal();
  }
  function discardCrop() {
    if (cropSession?.bitmap) cropSession.bitmap.close?.();
    cropSession = null;
    if (cropDialog?.open) cropDialog.close();
  }
  function saveCroppedImage() {
    if (!cropSession) return;
    const session = cropSession;
    const kind = session.kind;
    const base = kind === 'avatar' ? {width:800,height:800} : (session.ratio === '16:9' ? {width:1920,height:1080} : {width:1680,height:720});
    let result = '';
    for (const scale of [1,.82,.66,.5]) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(base.width*scale); canvas.height = Math.round(base.height*scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      drawCrop(ctx,canvas.width,canvas.height,session,canvas.width/$('#crop-canvas',cropDialog).width);
      for (const quality of [.84,.72,.6]) {
        const data = canvas.toDataURL('image/webp',quality);
        if (data.length <= 900_000 && /^data:image\/(?:webp|jpeg|png);base64,/.test(data)) { result = data; break; }
      }
      if (result) break;
    }
    if (!result) { $('#crop-message',cropDialog).textContent = 'This image could not be compressed enough. Try a smaller image.'; return; }
    const form = $('#profile-form');
    $(`[name="${kind}Image"]`,form).value = result;
    if (kind === 'banner') {
      $('[name="bannerRatio"]',form).value = session.ratio;
      const button = $('[data-open-image="banner"]',form);
      button.className = `banner-picker ${bannerRatioClass(session.ratio)}`;
      button.innerHTML = `<span class="banner-picker-image">${bannerImage(result)}</span><span class="picker-caption">Change banner</span>`;
    } else {
      $('[data-open-image="avatar"]',form).innerHTML = `${avatar(currentUser.username,'avatar-edit-large',result)}<span class="picker-caption">Change picture</span>`;
    }
    discardCrop();
  }
  async function logout() {
    try {
      await api('/api/logout','POST',{});
      if (firebaseEnabled) { try { const client = await getFirebaseClient(); await client.sdk.signOut(client.auth); } catch (_) {} }
      closeFriendCardChooser(); currentUser = null;friendCardEditorContext=null;friendCardClipboard=null; leaveGuestMode(); editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false; closeProfile(); profilePreview(); if (page === 'account') showAccount(); if (page === 'shop') window.SolarisShop.mount(app); toast('You are logged out.');
    }
    catch (error) { toast(error.message); }
  }
  function projectDialog(id) {
    const game = gameById(id); if (!game) return;
    const dialog = $('#dlg');
    $('#dlg-body').innerHTML = `<div class="cover cover-${game.cover} dialog-cover" aria-hidden="true"><span class="cover-kicker">${esc(game.subtitle)}</span><strong>${esc(game.name)}</strong></div><div class="dlg-text"><div>${badge(game.status)}</div><h2>${esc(game.name)}</h2><p class="meta">${esc(game.subtitle)} · ${esc(game.genre)}${game.version ? ` · ${esc(game.version)}` : ''}</p><p>${esc(game.details)}</p><a class="btn btn-ghost btn-sm" href="updates.html" data-close>Studio updates</a></div>`;
    dialog.showModal();
  }

  renderPage();
  profilePreview();
  try { const theme = localStorage.getItem('solaris-theme'); if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme',theme); } catch (_) {}
  loadTeamMembers();
  loadMemberProfiles();
  loadOwnerPosts().catch(error => console.warn('Could not load published site content:',error.message));
  Promise.all([api('/api/me'),loadFirebaseSettings()]).then(async ([result]) => {
    currentUser = result.user;
    if (currentUser) leaveGuestMode();
    profilePreview();
    if (page === 'account') showAccount();
    if (page === 'chat') await initializeCommunityPage();
    if (page === 'create-post') await window.SolarisSocial.mountPostPage(app);
    if (page === 'shop-product') await window.SolarisShop.editor(app);
    if (['home','games','project','arts','artwork','updates','download','shop','publish'].includes(page)) renderPage();
    try { await resumePendingFirebaseSignup(); }
    catch (error) { if (page === 'account' && !currentUser) setMessage('#auth-message',error.message); }
  }).catch(error => {
    currentUser = null;
    profilePreview();
    if (page === 'chat') renderCommunityUI();
    if (page === 'account') app.innerHTML = isGuest && !new URLSearchParams(location.search).has('mode') ? guestDashboard() : authView('signup','Could not reach the account server. Start the site with node server.js and reload.');
  });

  let friendCardCanvasPointerHandled = false;
  document.addEventListener('pointerdown',event => {
    friendCardCanvasPointerHandled=false;
    const stage=$('#friend-card-editor-stage .friend-card');
    if(!stage||!friendCardDesignState||event.button!==0||$('#friend-card-form')?.inert||$('dialog[open]'))return;
    if(friendCardActiveTransform){
      if(event.target.closest('#friend-card-editor-stage')){event.preventDefault();friendCardCanvasPointerHandled=true;commitFriendCardTransform();return;}
      commitFriendCardTransform();
    }
    const element=event.target.closest('[data-editor-layer]');
    if(element&&friendCardActiveTool==='select'){
      event.preventDefault(); friendCardCanvasPointerHandled=true;
      const id=element.dataset.editorLayer;
      if(event.shiftKey){selectFriendCardLayer(id,{toggle:true,individual:true});$(`[data-editor-layer="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return;}
      selectFriendCardLayer(id,{preserve:!event.altKey,individual:event.altKey});
      $(`[data-editor-layer="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
      const mode=event.target.closest('[data-rotate-layer]')?'rotate':event.target.closest('[data-resize-layer]')?'scale':friendCardTransformMode;
      friendCardDrag=captureFriendCardTransform(mode,event.clientX,event.clientY);
      return;
    }
    const scroller=event.target.closest('.friend-canvas-scroll');
    if(scroller&&friendCardTransformMode==='move'&&!event.target.closest('button,input,textarea,select,a')){
      friendCardPan={scroller,startX:event.clientX,startY:event.clientY,scrollLeft:scroller.scrollLeft,scrollTop:scroller.scrollTop};
      scroller.classList.add('is-panning');event.preventDefault();
    }
  });
  document.addEventListener('pointermove',event=>{
    friendCardPointer={x:event.clientX,y:event.clientY};
    if(friendCardActiveTransform){updateFriendCardActiveTransform(event);event.preventDefault();}
    else if(friendCardPan){friendCardPan.scroller.scrollLeft=friendCardPan.scrollLeft-(event.clientX-friendCardPan.startX);friendCardPan.scroller.scrollTop=friendCardPan.scrollTop-(event.clientY-friendCardPan.startY);event.preventDefault();}
    else if(friendCardDrag){
      if(!friendCardDrag.moved&&Math.hypot(event.clientX-friendCardDrag.startX,event.clientY-friendCardDrag.startY)<3)return;
      friendCardDrag.moved=true;applyFriendCardSelectionTransform(friendCardDrag,event);event.preventDefault();
    }
  });
  document.addEventListener('pointerup',()=>{
    if(friendCardPan){friendCardPan.scroller.classList.remove('is-panning');friendCardPan=null;}
    if(friendCardDrag){
      const changed=friendCardDrag.moved&&rememberFriendCardTransform(friendCardDrag.snapshot);
      friendCardDrag=null;setFriendCardTransformMode('move');repaintFriendCardEditor({dirty:Boolean(changed)});
    }
  });
  function cancelFriendCardPointerGesture(){
    if(friendCardPan){friendCardPan.scroller.classList.remove('is-panning');friendCardPan=null;}
    if(friendCardDrag){
      friendCardDesignState=normalizedFriendCardDesign(JSON.parse(friendCardDrag.snapshot),friendCardFromForm($('#friend-card-form'))||currentUser.friendCard);
      friendCardDrag=null;setFriendCardTransformMode('move');repaintFriendCardEditor({dirty:false});
    }
    cancelFriendCardTransform();
  }
  document.addEventListener('pointercancel',cancelFriendCardPointerGesture);
  window.addEventListener('blur',cancelFriendCardPointerGesture);

  document.addEventListener('click', async event => {
    const selectGroup=event.target.closest('[data-select-group]');
    if(selectGroup){selectFriendCardGroup(selectGroup.dataset.selectGroup,event.shiftKey);return;}
    const toggleGroup=event.target.closest('[data-toggle-group]');
    if(toggleGroup){const group=friendCardDesignState?.groups?.find(item=>item.id===toggleGroup.dataset.toggleGroup);if(group){recordFriendCardHistory();group.collapsed=!group.collapsed;repaintFriendCardEditor();}return;}
    const groupAction=event.target.closest('[data-group-action]');
    if(groupAction){if(friendCardActiveTransform)commitFriendCardTransform();if(groupAction.dataset.groupId)selectFriendCardGroup(groupAction.dataset.groupId);if(groupAction.dataset.groupAction==='group')groupFriendCardLayers();else ungroupFriendCardLayers();return;}
    if(event.target.closest('[data-selection-lock]')){setFriendCardSelectionLocked();return;}
    if(event.target.closest('[data-selection-visible]')){setFriendCardSelectionVisible();return;}

    if(event.target.closest('[data-cfc-choose-existing]')){openFriendCardChooser('existing');return;}
    if(event.target.closest('[data-cfc-choose-back]')){openFriendCardChooser();return;}
    if(event.target.closest('[data-cfc-close]')){closeFriendCardChooser();return;}
    if(event.target.closest('[data-cfc-create-new]')){createNewFriendCard();return;}
    const resumeDraft=event.target.closest('[data-resume-cfc-draft]');if(resumeDraft){try{const draftId=resumeDraft.dataset.resumeCfcDraft;if(!/^(?:new-|collection-)[a-f0-9-]{36}$/i.test(draftId))return;const saved=JSON.parse(localStorage.getItem(`solaris-friend-card-draft:${currentUser.id}:${draftId}`));if(!saved?.design||!saved?.friendCard)throw new Error('This local draft is unavailable.');enterFriendCardEditor({id:null,draftId,revision:0,friendCard:normalizedFriendCard({...saved.friendCard,design:saved.design,published:false,revision:0})});}catch(error){toast(error.message);}return;}
    const editLibrary=event.target.closest('[data-edit-library-card]');if(editLibrary){await editLibraryFriendCard(editLibrary.dataset.editLibraryCard);return;}
    const editCollection=event.target.closest('[data-edit-collection-card]');if(editCollection){await editCollectionFriendCard(editCollection.dataset.editCollectionCard);return;}
    const viewMode=event.target.closest('[data-cfc-view-mode]');if(viewMode){setFriendCardView(viewMode.dataset.cfcViewMode);return;}
    const textbox=event.target.closest('[data-insert-textbox]');if(textbox){addFriendCardLayer('textbox');const layer=friendCardDesignState?.layers.find(item=>item.id===friendCardSelectedLayer);if(layer){layer.label=({likes:'What I like',dislikes:'What I dislike',favorite:'Favorite thing',lookingFor:'Friend I’m looking for'})[textbox.dataset.insertTextbox];layer.text='';repaintFriendCardEditor();}return;}
    const quickMenuToggle = event.target.closest('[data-quick-menu-toggle]');
    if (quickMenuToggle) { setQuickMenuOpen($('#quick-menu-panel')?.hidden === true); return; }
    if (!event.target.closest('#site-quick-menu') || event.target.closest('[data-quick-menu-link]')) closeQuickMenu();
    const gameOsTab = event.target.closest('[data-game-os-select]');
    if (gameOsTab) {
      const downloads = gameOsTab.closest('.game-os-downloads'), selected = gameOsTab.dataset.gameOsSelect;
      $$('[data-game-os-select]',downloads).forEach(button => button.setAttribute('aria-selected',String(button === gameOsTab)));
      $$('[data-game-os-panel]',downloads).forEach(panel => { panel.hidden = panel.dataset.gameOsPanel !== selected; });
      return;
    }
    const ownerPostEdit = event.target.closest('[data-owner-post-edit]');
    const ownerPostDelete = event.target.closest('[data-owner-post-delete]');
    const ownerPostCancel = event.target.closest('[data-owner-post-cancel]');
    if (ownerPostEdit) { fillOwnerPostForm(ownerPostEdit); return; }
    if (ownerPostDelete) { await deleteOwnerPost(ownerPostDelete); return; }
    if (ownerPostCancel) { const form = ownerPostCancel.closest('[data-owner-content-form]'); if (form) resetOwnerPostForm(form); return; }
    if (event.target.closest('[data-add-game-text-container]')) { const form = $('[data-owner-content-form][data-section="games"]'); $('[data-game-text-list]',form)?.insertAdjacentHTML('beforeend',ownerTextContainerMarkup()); return; }
    if (event.target.closest('[data-remove-game-text]')) { event.target.closest('[data-game-text-container]')?.remove(); return; }
    if(event.target.closest('[data-copy-update]')){const id=event.target.closest('[data-copy-update]').dataset.copyUpdate;await window.SolarisSocial.copyLink(new URL('updates.html#update-'+encodeURIComponent(id),location.href).href);return;}
    if(event.target.closest('[data-remove-screenshot]')){event.target.closest('.owner-screenshot-item').remove();return;}
    if(event.target.closest('[data-migrate-game-builds]')){const button=event.target.closest('[data-migrate-game-builds]');button.disabled=true;button.textContent='Moving existing files…';try{const result=await api('/api/owner/game-build-migrate','POST',{});await loadOwnerPosts();toast(result.message);}catch(error){toast(error.message);button.disabled=false;button.textContent='Retry moving files';}return;}
    if (event.target.closest('[data-add-game-build]')) { const form = $('[data-owner-game-build-form]'), list = $('[data-game-build-list]',form); list?.insertAdjacentHTML('beforeend',ownerGameBuildRowMarkup()); const row = list?.lastElementChild; if (row) updateGameBuildRow(row); return; }
    if (event.target.closest('[data-remove-game-build]')) { event.target.closest('[data-game-build-row]')?.remove(); return; }
    const clearOwnerImage = event.target.closest('[data-owner-image-clear]');
    if (clearOwnerImage) { const form = clearOwnerImage.closest('[data-owner-content-form]'); setOwnerImagePreview(form,clearOwnerImage.dataset.ownerImageClear,''); return; }
    const communityPaneButton = event.target.closest('[data-community-pane]');
    const communityChatButton = event.target.closest('[data-community-chat]');
    const communityAddFriend = event.target.closest('[data-community-add-friend]');
    const communityRespond = event.target.closest('[data-community-respond]');
    const chatFileOpen = event.target.closest('[data-chat-file-open]');
    const chatSticker = event.target.closest('[data-chat-sticker]');
    const chatVoice = event.target.closest('[data-chat-voice]');
    const removeFramePiece = event.target.closest('[data-remove-frame-piece]');
    const removeFont = event.target.closest('[data-remove-friend-font]');
    const useSticker = event.target.closest('[data-use-friend-sticker]');
    const removeSticker = event.target.closest('[data-remove-friend-sticker]');
    const loadFramePreset = event.target.closest('[data-load-frame-preset]');
    const removeFramePreset = event.target.closest('[data-remove-frame-preset]');
    if (event.target.closest('[data-close-community]')) { $('#community-dialog')?.close(); return; }
    if (chatFileOpen) { $(`[data-chat-file="${chatFileOpen.dataset.chatFileOpen}"]`)?.click(); return; }
    if (chatSticker) { await sendCommunitySticker(chatSticker.dataset.chatSticker); return; }
    if (event.target.closest('[data-chat-sticker-toggle]')) { const panel = $('[data-chat-sticker-panel]'); if (panel) panel.hidden = !panel.hidden; return; }
    if (event.target.closest('[data-chat-settings]')) { const panel = $('[data-chat-settings-panel]'); if (panel) { renderCommunityChatSettings(); panel.hidden = false; } return; }
    if (event.target.closest('[data-chat-settings-close]')) { $('[data-chat-settings-panel]')?.setAttribute('hidden',''); return; }
    if (event.target.closest('[data-chat-wallpaper-clear]')) { communityChatSettings.wallpaper = ''; saveCommunityChatSettings(); renderCommunityChatSettings(); return; }
    if (chatVoice) {
      if (communityRecorder?.state === 'recording') { communityRecorder.stop(); chatVoice.textContent = '🎙'; chatVoice.classList.remove('is-recording'); $('[data-chat-voice-status]').textContent = 'Finishing voice message…'; return; }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast('Voice recording is not supported in this browser.'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        communityRecorderChunks = [];
        communityRecorder = new MediaRecorder(stream);
        communityRecorder.ondataavailable = event => { if (event.data.size) communityRecorderChunks.push(event.data); };
        communityRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const blob = new Blob(communityRecorderChunks,{type:communityRecorder.mimeType || 'audio/webm'});
          communityRecorder = null; communityRecorderChunks = [];
          if (blob.size) await sendCommunityMedia(new File([blob],`voice-message.${blob.type.includes('ogg') ? 'ogg' : 'webm'}`,{type:blob.type}),'voice');
        };
        communityRecorder.start(); chatVoice.textContent = '■'; chatVoice.classList.add('is-recording'); $('[data-chat-voice-status]').textContent = 'Recording… click ■ to send';
      } catch (error) { toast(error.name === 'NotAllowedError' ? 'Allow microphone access to record a voice message.' : 'The microphone could not be opened.'); }
      return;
    }
    if (communityPaneButton) { communityPane = communityPaneButton.dataset.communityPane; communityConversationId = ''; renderCommunitySidebar(); await renderCommunityPane(); return; }
    if (communityChatButton) { communityPane = 'chat'; communityConversationId = communityChatButton.dataset.communityChat; renderCommunitySidebar(); await loadCommunityConversation(communityConversationId); return; }
    if (communityAddFriend) { await updateCommunityFriendRequest(communityAddFriend); return; }
    if (communityRespond) { await respondToCommunityRequest(communityRespond); return; }
    if (removeFont && friendCardDesignState) { const id = removeFont.dataset.removeFriendFont; recordFriendCardHistory(); friendCardDesignState.fonts = friendCardDesignState.fonts.filter(font => font.id !== id); friendCardDesignState.layers.forEach(layer => { if (layer.fontId === id) { layer.fontId = ''; layer.fontFamily = 'DM Sans'; } }); repaintFriendCardEditor(); return; }
    if (useSticker && friendCardDesignState) { const sticker = friendCardDesignState.stickerLibrary.find(item => item.id === useSticker.dataset.useFriendSticker); if (sticker) { addFriendCardLayer('sticker'); const layer = friendCardDesignState.layers.find(item => item.id === friendCardSelectedLayer); if (layer) { layer.image = sticker.image; layer.label = sticker.name; repaintFriendCardEditor(); } } return; }
    if (removeSticker && friendCardDesignState) { recordFriendCardHistory(); friendCardDesignState.stickerLibrary = friendCardDesignState.stickerLibrary.filter(item => item.id !== removeSticker.dataset.removeFriendSticker); repaintFriendCardEditor(); return; }
    if (event.target.closest('[data-save-frame-preset]') && friendCardDesignState) {
      const name = window.prompt('Name this frame preset (up to 60 characters):');
      if (!name?.trim()) return;
      recordFriendCardHistory();
      const {presets:oldPresets,...framePreset} = friendCardDesignState.frame;
      friendCardDesignState.frame.presets = [...(oldPresets || []),{...JSON.parse(JSON.stringify(framePreset)),name:name.trim().slice(0,60)}].slice(-8);
      repaintFriendCardEditor(); return;
    }
    if (loadFramePreset && friendCardDesignState) {
      const preset = friendCardDesignState.frame.presets?.[Number(loadFramePreset.dataset.loadFramePreset)];
      if (!preset) return;
      recordFriendCardHistory();
      const presets = friendCardDesignState.frame.presets;
      const {name:_name,...frameValues} = JSON.parse(JSON.stringify(preset));
      friendCardDesignState.frame = {...frameValues,presets}; repaintFriendCardEditor(); return;
    }
    if (removeFramePreset && friendCardDesignState) {
      recordFriendCardHistory(); friendCardDesignState.frame.presets.splice(Number(removeFramePreset.dataset.removeFramePreset),1); repaintFriendCardEditor(); return;
    }
    if (removeFramePiece && friendCardDesignState) { const [group,key] = removeFramePiece.dataset.removeFramePiece.split('.'); recordFriendCardHistory(); if (friendCardDesignState.frame[group]) friendCardDesignState.frame[group][key] = ''; repaintFriendCardEditor(); return; }
    const menuButton = event.target.closest('[data-menu]');
    const globalSearchToggle = event.target.closest('[data-global-search-toggle]');
    const themeButton = event.target.closest('[data-theme-toggle]');
    const profileButton = event.target.closest('#profile-button');
    const closeButton = event.target.closest('[data-close]');
    const gameButton = event.target.closest('[data-game]');
    const authMode = event.target.closest('[data-auth-mode]');
    const shopTicket = event.target.closest('[data-shop-ticket]');
    const guestEntry = event.target.closest('[data-view-guest]');
    const saveRoles = event.target.closest('[data-save-account-roles]');
    const saveViewedRoles = event.target.closest('[data-save-viewed-user-roles]');
    const postFriendCard = event.target.closest('[data-post-friend-card]');
    const saveFriendCard = event.target.closest('[data-save-friend-card],[data-friend-save],[data-friend-save-secondary]');
    const addSocial = event.target.closest('[data-add-social]');
    const removeSocial = event.target.closest('[data-remove-social]');
    const openFriendCard = event.target.closest('[data-open-friend-card]');
    const openOwnFriendCard = event.target.closest('[data-open-own-friend-card]');
    const closeFriendCard = event.target.closest('[data-close-friend-card]');
    const copyMemberLink = event.target.closest('[data-copy-member-link]');
    const chooseFriendCardImage = event.target.closest('[data-choose-friend-card-image]');
    const removeFriendCardImage = event.target.closest('[data-remove-friend-card-image]');
    const exportStk = event.target.closest('[data-export-stk]');
    const profileOptions = event.target.closest('[data-profile-options]');
    const accountAction = event.target.closest('[data-account-action]');
    const cancelDanger = event.target.closest('[data-cancel-danger]');
    const memberFilterButton = event.target.closest('[data-member-filter]');
    const openImage = event.target.closest('[data-open-image]');
    const cropCancel = event.target.closest('[data-crop-cancel]');
    const cropSave = event.target.closest('[data-crop-save]');
    const cropRatio = event.target.closest('[data-crop-ratio]');
    const cropRotate = event.target.closest('[data-crop-rotate]');
    const legacyLoginToggle = event.target.closest('[data-legacy-login-toggle]');
    const authPasswordReset = event.target.closest('[data-reset-auth]');
    const profilePasswordReset = event.target.closest('[data-password-reset]');
    const propertyPaneTab = event.target.closest('[data-property-pane-tab]');
    if (propertyPaneTab) {
      friendCardPropertiesTab = propertyPaneTab.dataset.propertyPaneTab === 'assets' ? 'assets' : 'properties';
      $$('[data-property-pane-tab]').forEach(button => button.setAttribute('aria-pressed',String(button === propertyPaneTab)));
      $$('[data-property-pane-content]').forEach(section => { section.hidden = section.dataset.propertyPaneContent !== friendCardPropertiesTab; });
      return;
    }
    const leftPaneTab = event.target.closest('[data-left-pane-tab]');
    if (leftPaneTab) {
      const pane = leftPaneTab.dataset.leftPaneTab;
      $$('[data-left-pane-tab]').forEach(button => button.setAttribute('aria-pressed',String(button === leftPaneTab)));
      $$('[data-left-pane-content]').forEach(section => { section.hidden = section.dataset.leftPaneContent !== pane; });
      return;
    }
    const layerPaneTab = event.target.closest('[data-layer-pane-tab]');
    if (layerPaneTab) {
      const pane = layerPaneTab.dataset.layerPaneTab;
      $$('[data-layer-pane-tab]').forEach(button => button.setAttribute('aria-pressed',String(button === layerPaneTab)));
      $$('[data-layer-pane-content]').forEach(section => { section.hidden = section.dataset.layerPaneContent !== pane; });
      return;
    }
    if (menuButton) { closeGlobalSearch(); const nav = $('#nav'), open = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded',String(open)); return; }
    const canvasLayer = event.target.closest('[data-editor-layer]');
    if (canvasLayer) {
      event.preventDefault();
      const layerId = canvasLayer.dataset.editorLayer;
      if(friendCardCanvasPointerHandled){friendCardCanvasPointerHandled=false;return;}
      selectFriendCardLayer(layerId,{toggle:event.shiftKey,individual:event.shiftKey||event.altKey});
      return;
    }
    const insertLayer = event.target.closest('[data-insert-layer]');
    if (event.target.closest('[data-insert-image]')) { $('[data-cfc-image-input]')?.click(); return; }
    const chooseSticker = event.target.closest('[data-insert-sticker]');
    const chooseStickerUrl = event.target.closest('[data-insert-sticker-url]');
    const insertShape = event.target.closest('[data-insert-shape]');
    const editorTool = event.target.closest('[data-editor-tool]');
    if (insertLayer) { addFriendCardLayer(insertLayer.dataset.insertLayer); return; }
    if (insertShape) { addFriendCardLayer('shape'); const layer = friendCardDesignState?.layers.find(item => item.id === friendCardSelectedLayer); if (layer) { const style = insertShape.dataset.insertShape; layer.shapeStyle = style; if(style!=='rectangle')layer.height=layer.width*friendCardDesignState.width/friendCardDesignState.height; layer.label = `${style === 'rounded' ? 'Rounded square' : style[0].toUpperCase() + style.slice(1)}`; repaintFriendCardEditor(); } return; }
    if (chooseSticker) { $('[data-sticker-input]')?.click(); return; }
    if (chooseStickerUrl) { const value = window.prompt('Paste an HTTPS image link. The image will be copied into your Friend-Card assets.'); if (!value) return; try { const image = await importFriendCardImageUrl(value.trim()); const layer = addFriendCardLayer('image'); if (layer) { layer.image = image; layer.label = 'Imported image'; repaintFriendCardEditor(); } } catch (error) { toast(error.message); } return; }
    if (editorTool) { friendCardActiveTool = editorTool.dataset.editorTool; $$('[data-editor-tool]').forEach(button => button.setAttribute('aria-pressed',String(button === editorTool))); if (friendCardActiveTool === 'select') $$('[data-transform-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.transformMode === friendCardTransformMode))); return; }
    const transformMode = event.target.closest('[data-transform-mode]');
    if (transformMode) { beginFriendCardTransform(transformMode.dataset.transformMode); return; }
    if (event.target.closest('[data-friend-undo]')) { undoFriendCard(false); return; }
    if (event.target.closest('[data-friend-redo]')) { undoFriendCard(true); return; }
    if (event.target.closest('[data-friend-export]')) { exportFriendCardDesign(); return; }
    if (event.target.closest('[data-friend-png]')) { await exportFriendCardPng(); return; }
    if (event.target.closest('[data-friend-save]') || event.target.closest('[data-friend-save-secondary]')) { await saveFriendCardChanges(false,event.target.closest('[data-friend-save],[data-friend-save-secondary]')); return; }
    const importInput = event.target.closest('[data-friend-import]');
    if (importInput) { return; }
    if (event.target.closest('[data-preview-card]')) { openFriendCardDialog({...currentUser,friendCard:friendCardFromForm($('#friend-card-form'))},friendCardViewMode==='preview'?'preview':'full'); return; }
    const selectLayer = event.target.closest('[data-select-layer]');
    if (selectLayer) { selectFriendCardLayer(selectLayer.dataset.selectLayer,{toggle:event.shiftKey,individual:true}); return; }
    const toggleLayer = event.target.closest('[data-toggle-layer]');
    if (toggleLayer) { const layer = friendCardDesignState?.layers.find(item => item.id === toggleLayer.dataset.toggleLayer); if (layer) { recordFriendCardHistory(); layer.visible = !layer.visible; repaintFriendCardEditor(); } return; }
    const duplicateLayer = event.target.closest('[data-duplicate-layer]');
    if (duplicateLayer) { pasteFriendCardLayer(duplicateLayer.dataset.duplicateLayer); return; }
    const deleteLayer = event.target.closest('[data-delete-layer]');
    if (deleteLayer) { deleteFriendCardLayer(deleteLayer.dataset.deleteLayer); return; }
    const lockLayer = event.target.closest('[data-lock-layer]');
    if (lockLayer) { const layer = friendCardDesignState?.layers.find(item => item.id === lockLayer.dataset.lockLayer); if (layer) { recordFriendCardHistory(); layer.locked = !layer.locked; repaintFriendCardEditor(); } return; }
    const layerOrder = event.target.closest('[data-layer-order]');
    if (layerOrder) { reorderFriendCardLayer(layerOrder.dataset.layerId,layerOrder.dataset.layerOrder); return; }
    const zoomButton = event.target.closest('[data-zoom]');
    if (zoomButton) { setFriendCardZoom(zoomButton.dataset.zoom); return; }
    const collapsePanel = event.target.closest('[data-collapse-editor-panel]');
    if (collapsePanel) { $('.friend-card-workspace')?.classList.toggle(`friend-panel-${collapsePanel.dataset.collapseEditorPanel}-collapsed`); requestAnimationFrame(fitFriendCardCanvas); return; }
    if (globalSearchToggle) {
      const panel = $('[data-global-search-panel]');
      const open = panel.hidden;
      panel.hidden = !open;
      globalSearchToggle.setAttribute('aria-expanded',String(open));
      if (open) $('[data-global-search-input]')?.focus();
      return;
    }
    if (themeButton) {
      closeGlobalSearch();
      const root = document.documentElement; const current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme',next); try { localStorage.setItem('solaris-theme',next); } catch (_) {} return;
    }
    if (profileButton) { closeGlobalSearch(); const popover = $('#profile-popover'); if (!popover.hidden) closeProfile(); else { popover.hidden = false; profileButton.setAttribute('aria-expanded','true'); } return; }
    if (saveFriendCard) {
      await saveFriendCardChanges(false,saveFriendCard);
      return;
    }
    if (postFriendCard) { await saveFriendCardChanges(true,postFriendCard); return; }
    if (openFriendCard) {
      const member = memberProfiles.find(item => item.id === openFriendCard.dataset.openFriendCard);
      if (member) openFriendCardDialog(member);
      return;
    }
    if (openOwnFriendCard && currentUser) { openFriendCardDialog(currentUser); return; }
    if (closeFriendCard) { $('#friend-card-dialog')?.close(); return; }
    if (copyMemberLink) {
      const url = new URL(`account.html?user=${encodeURIComponent(copyMemberLink.dataset.copyMemberLink)}`,location.href).href;
      try { await navigator.clipboard.writeText(url); toast('Profile link copied.'); }
      catch (_) { window.prompt('Copy this profile link:',url); }
      return;
    }
    if (chooseFriendCardImage) {
      const field = chooseFriendCardImage.dataset.chooseFriendCardImage;
      $$('[data-friend-card-image]').find(input => input.dataset.friendCardImage === field)?.click();
      return;
    }
    if (removeFriendCardImage) {
      const field = removeFriendCardImage.dataset.removeFriendCardImage;
      const form = $('#friend-card-form');
      if (form?.elements[field]) form.elements[field].value = '';
      if (Object.prototype.hasOwnProperty.call(friendCardAssetValues,field)) friendCardAssetValues[field] = '';
      const row = removeFriendCardImage.closest('[data-friend-card-asset-row]');
      const thumb = $('[data-friend-card-thumb]',row);
      if (thumb) { thumb.className = 'friend-card-image-thumb friend-card-image-empty'; thumb.style.backgroundImage = ''; thumb.textContent = 'No image selected'; }
      removeFriendCardImage.hidden = true;
      $('[data-export-stk]',row)?.setAttribute('disabled','');
      updateFriendCardEditorPreview();
      return;
    }
    if (exportStk) { exportFriendCardStk(exportStk.dataset.exportStk); return; }
    const noteToggle = event.target.closest('[data-note-toggle]');
    if (noteToggle) {
      const bubble = noteToggle.nextElementSibling;
      noteToggle.hidden = true;
      if (bubble) bubble.hidden = false;
      noteToggle.parentElement?.classList.add('is-expanded');
      return;
    }
    if (memberFilterButton) {
      activeMemberTag = memberFilterButton.dataset.memberFilter;
      $$('[data-member-filter]').forEach(button => button.setAttribute('aria-pressed',String(button === memberFilterButton)));
      updateMemberResults();
      return;
    }
    if (profileOptions) {
      const menu = $('#profile-options'), open = menu.hidden;
      menu.hidden = !open; profileOptions.setAttribute('aria-expanded',String(open)); return;
    }
    if (accountAction) {
      const action = accountAction.dataset.accountAction;
      const dialog = $('#account-danger-dialog');
      const form = $('#account-danger-form');
      const pause = action === 'pause';
      form.dataset.action = action;
      form.reset();
      setMessage('#danger-action-message','',false);
      $('#account-danger-title').textContent = pause ? 'Pause your account?' : 'Permanently delete your account?';
      $('#account-danger-copy').textContent = pause
        ? 'Your profile will be removed from the site and kept in a private backup for 30 days. You cannot log in during that time. After 30 days, the account and profile will be restored so you can log in again.'
        : 'This permanently removes your account and any Helunemi pause backups. This cannot be undone. Hosting-provider or repository backups have separate retention rules.';
      $('#account-danger-word').textContent = pause ? 'PAUSE' : 'DELETE';
      $('#account-danger-submit').textContent = pause ? 'Pause account' : 'Delete account';
      $('#account-danger-submit').classList.toggle('btn-danger',!pause);
      $('#account-danger-submit').classList.toggle('btn-pause',pause);
      dialog.showModal();
      $('[name="password"]',form)?.focus();
      return;
    }
    if (cancelDanger) { $('#account-danger-dialog')?.close(); return; }
    if (openImage) {
      const input = $(`[data-image-input="${openImage.dataset.openImage}"]`,$('#profile-form'));
      input?.click(); return;
    }
    if (cropCancel) { discardCrop(); return; }
    if (cropSave) { saveCroppedImage(); return; }
    if (cropRatio && cropSession?.kind === 'banner') { cropSession.ratio = cropRatio.dataset.cropRatio; cropSession.offsetX = 0; cropSession.offsetY = 0; paintCrop(); return; }
    if (cropRotate && cropSession) { cropSession.rotation = (cropSession.rotation + Number(cropRotate.dataset.cropRotate) + 360) % 360; if (cropSession.rotation > 180) cropSession.rotation -= 360; paintCrop(); return; }
    if (shopTicket) { getShopTicket(shopTicket); return; }
    if (guestEntry) {
      isGuest = true;
      try { sessionStorage.setItem('solaris-guest','1'); } catch (_) {}
      location.href = 'index.html?guest=1';
      return;
    }
    if (saveRoles) { saveAccountRoles(saveRoles); return; }
    if (saveViewedRoles) { saveViewedUserRoles(saveViewedRoles); return; }
    if (event.target.closest('[data-logout]')) { logout(); return; }
    if (closeButton) { $('#dlg').close(); return; }
    if (gameButton) { projectDialog(gameButton.dataset.game); return; }
    if (authMode) { toggleAuthMode(authMode.dataset.authMode); return; }
    if (legacyLoginToggle) { const panel = $('#legacy-login-panel'); if (panel) { panel.hidden = !panel.hidden; $('#login-form').hidden = !panel.hidden; } return; }
    if (authPasswordReset) { authPasswordReset.disabled = true; try { await sendFirebasePasswordReset($('#login-form [name="email"]')?.value.trim(),'#auth-message'); } catch (error) { setMessage('#auth-message',error.message); } finally { authPasswordReset.disabled = false; } return; }
    if (profilePasswordReset) { profilePasswordReset.disabled = true; try { await sendFirebasePasswordReset(profilePasswordReset.dataset.resetEmail,'[data-security-message]'); } catch (error) { setMessage('[data-security-message]',error.message); } finally { profilePasswordReset.disabled = false; } return; }
    if (addSocial) { const box = $('#social-editor'); if (box) { box.insertAdjacentHTML('beforeend',socialRowsMarkup([{label:'',url:''}])); $('[name="social-label"]',box.lastElementChild)?.focus(); } return; }
    if (removeSocial) { const row = removeSocial.closest('.social-editor-row'); const editor = $('#social-editor'); if (editor.children.length === 1) { $$('input',row).forEach(input => input.value = ''); } else row.remove(); return; }
    if (!event.target.closest('.profile-options-wrap')) {
      const options = $('#profile-options');
      if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
    }
    if (event.target.closest('[data-edit-account]')) { friendCardChoiceMode=''; editingProfile = true; editingFriendCard = false; viewingPersonalInfo = false; showAccount(); return; }
    if (event.target.closest('[data-view-personal-info]')) { friendCardChoiceMode=''; editingProfile = false; editingFriendCard = false; viewingPersonalInfo = true; showAccount(); return; }
    if (event.target.closest('[data-edit-friend-card]')) { openFriendCardChooser();return; }
    if (event.target.closest('[data-cancel-edit]')) { editingProfile=false;editingFriendCard=false;viewingPersonalInfo=false;friendCardChoiceMode='';friendCardEditorContext=null;showAccount();return; }
    if (!event.target.closest('.profile-wrap')) closeProfile();
    if (!event.target.closest('.global-search')) closeGlobalSearch();
    if (!event.target.closest('.top')) { const nav = $('#nav'), menu = $('[data-menu]'); nav?.classList.remove('open'); menu?.setAttribute('aria-expanded','false'); }
  });
  document.addEventListener('submit', async event => {
    if (event.target.matches('[data-owner-game-build-form]')) {
      event.preventDefault();
      await saveOwnerGameBuilds(event.target);
      return;
    }
    if (event.target.matches('[data-owner-content-form]')) {
      event.preventDefault();
      await saveOwnerPostForm(event.target);
      return;
    }
    if (event.target.id === 'community-message-form') {
      event.preventDefault();
      const form = event.target, input = form.elements.text, button = $('button[type="submit"]',form);
      if (!communityConversationId || !input.value.trim()) return;
      button.disabled = true;
      try {
        await api('/api/community/message','POST',{recipientId:communityConversationId,text:input.value});
        input.value = '';
        const result = await api(`/api/community/messages?with=${encodeURIComponent(communityConversationId)}`);
        renderCommunityMessages(result.messages || []); input.focus();
      } catch (error) { toast(error.message); }
      finally { button.disabled = false; }
      return;
    }
    if (event.target.id === 'community-report-form') {
      event.preventDefault();
      const form = event.target, button = $('button[type="submit"]',form), message = $('[data-community-report-message]',form);
      button.disabled = true;
      try {
        const result = await api('/api/community/bug-report','POST',{title:form.elements.title.value,details:form.elements.details.value,page:form.elements.page.value});
        message.textContent = result.message; message.classList.remove('is-error'); message.classList.add('is-success'); form.reset(); form.elements.page.value = location.pathname + location.search;
      } catch (error) { message.textContent = error.message; message.classList.add('is-error'); }
      finally { button.disabled = false; }
      return;
    }
    if (event.target.id === 'signup-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), password = data.get('password');
      if (password !== data.get('confirmPassword')) { setMessage('#auth-message','The passwords do not match.'); return; }
      const submit = $('button[type="submit"]',form); submit.disabled = true;
      try {
        if (firebaseEnabled) {
          const email = String(data.get('email') || '').trim().toLowerCase();
          const client = await getFirebaseClient();
          let user = client.auth.currentUser;
          if (!user || user.email?.toLowerCase() !== email) {
            try { user = (await client.sdk.createUserWithEmailAndPassword(client.auth,email,password)).user; }
            catch (error) {
              if (error.code !== 'auth/email-already-in-use') throw error;
              user = (await client.sdk.signInWithEmailAndPassword(client.auth,email,password)).user;
            }
          }
          const pending = {username:data.get('username'),email};
          try { localStorage.setItem('solaris-pending-signup',JSON.stringify(pending)); } catch (_) {}
          await user.reload();
          if (!user.emailVerified) {
            await client.sdk.sendEmailVerification(user,{url:`${location.origin}/account.html?mode=login`});
            setMessage('#auth-message','Check your email and verify your address. This page can finish creating your Helunemi account after you return.',false);
            return;
          }
          await finishFirebaseSignup(pending,password);
          return;
        }
        const result = await api('/api/signup','POST',{username:data.get('username'),password,profile:{}});
        currentUser = result.user; leaveGuestMode(); editingProfile = false; profilePreview(); showAccount(); toast(result.message);
      } catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'login-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form); submit.disabled = true;
      try {
        if (firebaseEnabled) {
          const client = await getFirebaseClient();
          const credential = await client.sdk.signInWithEmailAndPassword(client.auth,String(data.get('email') || '').trim(),data.get('password'));
          await finishFirebaseLogin(credential.user,data.get('password'));
        } else {
          const result = await api('/api/login','POST',{username:data.get('username'),password:data.get('password')}); currentUser = result.user; leaveGuestMode(); profilePreview(); showAccount(); toast(`Welcome back, ${currentUser.username}.`);
        }
      }
      catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'legacy-login-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/login','POST',{username:data.get('username'),password:data.get('password')}); currentUser = result.user; leaveGuestMode(); profilePreview(); showAccount(); toast(`Welcome back, ${currentUser.username}.`); }
      catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'link-email-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form), email = String(data.get('email') || '').trim().toLowerCase(), password = data.get('password');
      submit.disabled = true;
      try {
        const client = await getFirebaseClient();
        let user = client.auth.currentUser;
        if (!user || user.email?.toLowerCase() !== email) {
          try { user = (await client.sdk.createUserWithEmailAndPassword(client.auth,email,password)).user; }
          catch (error) {
            if (error.code !== 'auth/email-already-in-use') throw error;
            user = (await client.sdk.signInWithEmailAndPassword(client.auth,email,password)).user;
          }
        } else await client.sdk.reauthenticateWithCredential(user,client.sdk.EmailAuthProvider.credential(email,password));
        await user.reload();
        if (!user.emailVerified) {
          await client.sdk.sendEmailVerification(user,{url:`${location.origin}/account.html?mode=login`});
          setMessage('#link-email-message','We sent a verification email. After verifying it, return to this profile and submit the same email and password again.',false);
          return;
        }
        const result = await api('/api/auth/link','POST',{idToken:await user.getIdToken(true),password});
        currentUser = result.user; profilePreview(); showAccount(); toast(result.message);
      } catch (error) { setMessage('#link-email-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'profile-form') {
      event.preventDefault();
      const form = event.target;
      const nextRealName = form.elements.realName.value.trim();
      if (!currentUser.realName && nextRealName && !window.confirm('Real name warning: after you save this name, it becomes permanent. Changing it later requires a WHO? ticket from the Shop. Save this real name?')) return;
      const submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/profile','PUT',accountFromForm(form)); currentUser = result.user; editingProfile = false; profilePreview(); showAccount(); toast('Your profile has been saved.'); }
      catch (error) { setMessage('#profile-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'personal-info-form') {
      event.preventDefault();
      const form = event.target, submit = $('button[type="submit"]',form);
      submit.disabled = true;
      try {
        const result = await api('/api/personal-info','PUT',{phoneNumber:form.elements.phoneNumber.value,secondaryEmail:form.elements.secondaryEmail.value,countryCode:form.elements.countryCode.value});
        currentUser = result.user;
        setMessage('#personal-info-message',result.message,false);
        toast(result.message);
      } catch (error) { setMessage('#personal-info-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'account-danger-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('#account-danger-submit');
      const action = form.dataset.action;
      submit.disabled = true;
      try {
        const endpoint = action === 'pause' ? '/api/account/pause' : '/api/account/delete';
        const password = data.get('password');
        let authProof = {};
        if (currentUser?.emailVerified) {
          const client = await getFirebaseClient();
          const user = client.auth.currentUser;
          if (!user || user.email?.toLowerCase() !== currentUser.authEmail?.toLowerCase()) throw new Error('Please sign in with your verified email again before changing account status.');
          await client.sdk.reauthenticateWithCredential(user,client.sdk.EmailAuthProvider.credential(user.email,password));
          authProof.idToken = await user.getIdToken(true);
        }
        const result = await api(endpoint,'POST',{password,confirmation:data.get('confirmation'),...authProof});
        $('#account-danger-dialog').close();
        if (firebaseEnabled) { try { const client = await getFirebaseClient(); await client.sdk.signOut(client.auth); } catch (_) {} }
        currentUser = null; editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false; profilePreview();
        history.replaceState({},'',`${location.pathname}?mode=login`);
        app.innerHTML = authView('login',result.message);
        setMessage('#auth-message',result.message,false);
      } catch (error) { setMessage('#danger-action-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'owner-claim-form') {
      event.preventDefault();
      const form = event.target, submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/owner/claim','POST',{ownerSetupCode:form.elements.ownerSetupCode.value}); currentUser = result.user; profilePreview(); showAccount(); toast('Helunemi Owner role claimed.'); }
      catch (error) { setMessage('#owner-claim-message',error.message); }
      finally { submit.disabled = false; }
    }
  });
  document.addEventListener('change', async event => {
    const groupName=event.target.closest('[data-cfc-group-name]');
    if(groupName){const group=friendCardDesignState?.groups?.find(item=>item.id===groupName.dataset.cfcGroupName);if(group){recordFriendCardHistory();group.name=groupName.value.trim().slice(0,80)||'Group';repaintFriendCardEditor();}return;}

    const screenshots=event.target.closest('[data-owner-screenshot-import]');
    if(screenshots){const form=screenshots.closest('form'),list=$('[data-owner-screenshots]',form);try{for(const file of screenshots.files){if(list.children.length>=12)throw new Error('A game can have up to 12 screenshots.');list.insertAdjacentHTML('beforeend',ownerScreenshotMarkup(await compressOwnerImage(file)));}}catch(error){toast(error.message);}screenshots.value='';return;}
    const gameBuildControl = event.target.closest('[data-game-build-platform],[data-game-build-supported],[data-game-build-file],[data-game-build-field="downloadUrl"]');
    if (gameBuildControl) { updateGameBuildRow(gameBuildControl.closest('[data-game-build-row]')); return; }
    const ownerImage = event.target.closest('[data-owner-image-import]');
    if (ownerImage) {
      const file = ownerImage.files?.[0], key = ownerImage.dataset.ownerImageImport, form = ownerImage.closest('[data-owner-content-form]');
      ownerImage.value = '';
      if (!file || !form) return;
      try {
        if (currentUser?.accountRole !== 'owner') throw new Error('Only the Owner account can import publishing images.');
        setOwnerImagePreview(form,key,await compressOwnerImage(file));
      } catch (error) { toast(error.message); }
      return;
    }
    const chatFile = event.target.closest('[data-chat-file]');
    if (chatFile) {
      const file = chatFile.files?.[0], kind = chatFile.dataset.chatFile, caption = $('#community-message-input')?.value || '';
      chatFile.value = '';
      if (file) await sendCommunityMedia(file,kind === 'gif' ? 'gif' : kind === 'sticker' ? 'sticker' : 'image',caption);
      return;
    }
    const wallpaperFile = event.target.closest('[data-chat-wallpaper]');
    if (wallpaperFile) {
      const file = wallpaperFile.files?.[0]; wallpaperFile.value = '';
      if (!file) return;
      try { if (file.size > 2_000_000) throw new Error('Choose a wallpaper smaller than 2 MB.'); communityChatSettings.wallpaper = await compressChatImage(await readAsDataUrl(file)); saveCommunityChatSettings(); renderCommunityChatSettings(); }
      catch (error) { toast(error.message); }
      return;
    }
    const chatSetting = event.target.closest('[data-chat-setting]');
    if (chatSetting) {
      const key = chatSetting.dataset.chatSetting;
      communityChatSettings[key] = chatSetting.type === 'checkbox' ? chatSetting.checked : key === 'fontSize' ? Number(chatSetting.value) : chatSetting.value;
      const output = $('[data-chat-font-output]'); if (output) output.textContent = `${communityChatSettings.fontSize}px`;
      saveCommunityChatSettings();
      return;
    }
    const changedLayerProperty = event.target.closest('[data-layer-property]');
    if (changedLayerProperty && friendCardLayerBefore) {
      friendCardUndoStack.push(friendCardLayerBefore); friendCardLayerBefore = null;
      if (friendCardUndoStack.length > 80) friendCardUndoStack.shift(); friendCardRedoStack = [];
      if ($('[data-friend-undo]')) $('[data-friend-undo]').disabled = false;
      saveFriendCardDraftLocally(); return;
    }
    if (event.target.closest('[data-layer-content-field]') && friendCardLayerBefore) {
      friendCardUndoStack.push(friendCardLayerBefore); friendCardLayerBefore = null;
      if (friendCardUndoStack.length > 80) friendCardUndoStack.shift(); friendCardRedoStack = [];
      if ($('[data-friend-undo]')) $('[data-friend-undo]').disabled = false;
      saveFriendCardDraftLocally(); return;
    }
    const backgroundProperty = event.target.closest('[data-background-property]');
    if (backgroundProperty && friendCardDesignState) {
      if (friendCardBackgroundBefore) {
        friendCardUndoStack.push(friendCardBackgroundBefore); friendCardBackgroundBefore = null;
        if (friendCardUndoStack.length > 80) friendCardUndoStack.shift(); friendCardRedoStack = [];
        $('[data-friend-undo]') && ($('[data-friend-undo]').disabled = false);
      }
      saveFriendCardDraftLocally();
      return;
    }
    const lockBackground = event.target.closest('[data-background-locked]');
    if (lockBackground && friendCardDesignState) { recordFriendCardHistory(); friendCardDesignState.backgroundLocked = lockBackground.checked; saveFriendCardDraftLocally(); return; }
    const roleSelect = event.target.closest('select[data-primary-role]');
    if (roleSelect) {
      const row = roleSelect.closest('[data-role-row]');
      const secondaryRoles = row?.querySelector('[data-secondary-roles]');
      if (secondaryRoles) {
        secondaryRoles.disabled = roleSelect.value === 'member';
        if (secondaryRoles.disabled) secondaryRoles.value = '';
        const help = row.querySelector('[data-secondary-role-help]');
        if (help) help.textContent = secondaryRoles.disabled ? 'Available when this account has a studio role.' : 'Separate staff roles with commas.';
      }
      return;
    }
    const ratioSelect = event.target.closest('[data-design-ratio]');
    if (ratioSelect && friendCardDesignState) {
      recordFriendCardHistory(); friendCardDesignState.aspectRatio = ratioSelect.value;
      if (ratioSelect.value !== 'custom') {
        const [ratioWidth,ratioHeight] = ratioSelect.value.split(':').map(Number), minScale = Math.max(320 / ratioWidth,320 / ratioHeight), maxScale = Math.min(1600 / ratioWidth,1200 / ratioHeight);
        const scale = Math.min(maxScale,Math.max(minScale,friendCardDesignState.width / ratioWidth));
        friendCardDesignState.width = Math.round(ratioWidth * scale); friendCardDesignState.height = Math.round(ratioHeight * scale);
        const width = $('[data-design-dimension="width"]'), height = $('[data-design-dimension="height"]');
        if (width) width.value = friendCardDesignState.width; if (height) height.value = friendCardDesignState.height;
      }
      repaintFriendCardEditor(); return;
    }
    const dimension = event.target.closest('[data-design-dimension]');
    if (dimension) { updateFriendEditorDimension(dimension.dataset.designDimension,dimension.value); return; }
    const frameProperty = event.target.closest('[data-frame-property]');
    if (frameProperty && friendCardDesignState) { if (!frameProperty.dataset.overlapHistory) recordFriendCardHistory(); delete frameProperty.dataset.overlapHistory; const key = frameProperty.dataset.frameProperty; if (key.startsWith('alignments.')) friendCardDesignState.frame.alignments[key.split('.')[1]] = frameProperty.value; else if (key.startsWith('cornerSizes.')) friendCardDesignState.frame.cornerSizes[key.split('.')[1]] = Number(frameProperty.value); else if (key === 'cornerSize') { friendCardDesignState.frame.cornerSize = Number(frameProperty.value); for (const corner of ['topLeft','topRight','bottomLeft','bottomRight']) friendCardDesignState.frame.cornerSizes[corner] = Number(frameProperty.value); } else friendCardDesignState.frame[key] = key === 'visible' ? frameProperty.checked : ['sideMode','placement'].includes(key) ? frameProperty.value : Number(frameProperty.value); repaintFriendCardEditor(); return; }
    const framePieceVisible = event.target.closest('[data-frame-piece-visible]');
    if (framePieceVisible && friendCardDesignState) { recordFriendCardHistory(); friendCardDesignState.frame.visiblePieces[framePieceVisible.dataset.framePieceVisible] = framePieceVisible.checked; repaintFriendCardEditor(); return; }
    const showGuides = event.target.closest('[data-show-guides]');
    if (showGuides && friendCardDesignState) { recordFriendCardHistory(); friendCardDesignState.showGuides = showGuides.checked; repaintFriendCardEditor(); return; }
    const importFile = event.target.closest('[data-friend-import]');
    if (importFile) { const file = importFile.files?.[0]; importFile.value = ''; if (!file) return; try { await importFriendCardDesign(file); } catch (error) { toast(error.message || 'This Friend-Card file could not be imported.'); } return; }
    const fontInput = event.target.closest('[data-friend-font-input]');
    if (fontInput) { const file = fontInput.files?.[0]; fontInput.value = ''; if (!file) return; try { const font = await importFriendCardFont(file); recordFriendCardHistory(); friendCardDesignState.fonts.push(font); ensureFriendCardFontFaces([font]); repaintFriendCardEditor(); toast(`${font.name} is ready to use.`); } catch (error) { toast(error.message); } return; }
    const imageInput = event.target.closest('[data-cfc-image-input],[data-sticker-input]');
    if (imageInput) {
      const files = Array.from(imageInput.files || []), type = imageInput.hasAttribute('data-cfc-image-input') ? 'image' : 'sticker';
      const context = friendCardDraftKey(); imageInput.value = ''; imageInput.disabled = true;
      try {
        for (const file of files) {
          if (!$('#friend-card-form') || $('#friend-card-form').inert || context !== friendCardDraftKey() || !canAddFriendCardLayer({type})) break;
          const image = await importFriendCardImage(file);
          if (!$('#friend-card-form') || $('#friend-card-form').inert || context !== friendCardDraftKey()) break;
          let aspect = 1;
          if (type === 'image') {
            const bitmap = await createImageBitmap(file);
            try { aspect = bitmap.width / bitmap.height; }
            finally { bitmap.close?.(); }
          }
          if (!$('#friend-card-form') || $('#friend-card-form').inert || context !== friendCardDraftKey()) break;
          const layer = addFriendCardLayer(type); if (!layer) break;
          layer.image = image; layer.label = file.name.replace(/\.[^.]+$/,'').slice(0,80);
          if (type === 'image') {
            layer.height = friendCardSize(Math.min(65,40 * friendCardDesignState.width / friendCardDesignState.height / aspect));
            layer.width = friendCardSize(layer.height * friendCardDesignState.height / friendCardDesignState.width * aspect);
          }
          friendCardPropertiesTab = 'assets'; repaintFriendCardEditor();
        }
      } catch (error) { toast(error.message); }
      finally { imageInput.disabled = false; }
      return;
    }
    const layerImageInput = event.target.closest('[data-layer-image-input]');
    if (layerImageInput) { const file = layerImageInput.files?.[0], id = layerImageInput.dataset.layerImageInput; layerImageInput.value = ''; if (!file) return; try { const image = await readFriendCardAsset(file), layer = friendCardDesignState.layers.find(item => item.id === id); if (layer) { recordFriendCardHistory(); layer.image = image; layer.label = file.name.replace(/\.[^.]+$/,'').slice(0,80); repaintFriendCardEditor(); } } catch (error) { toast(error.message); } return; }
    const frameInput = event.target.closest('[data-frame-piece]');
    if (frameInput) { const file = frameInput.files?.[0], key = frameInput.dataset.framePiece.split('.'); frameInput.value = ''; if (!file) return; try { const data = await importFriendCardImage(file); recordFriendCardHistory(); friendCardDesignState.frame[key[0]][key[1]] = data; repaintFriendCardEditor(); } catch (error) { toast(error.message); } return; }
    if (event.target.closest('#profile-form') && event.target.name?.startsWith('friendCard')) { updateFriendCardEditorPreview(); return; }
    if (event.target.closest('#friend-card-form') && event.target.name?.startsWith('friendCard')) { recordFriendCardHistory(); updateFriendCardEditorPreview(); saveFriendCardDraftLocally(); return; }
    const friendImage = event.target.closest('[data-friend-card-image]');
    if (friendImage && currentUser) {
      const file = friendImage.files?.[0];
      const field = friendImage.dataset.friendCardImage;
      friendImage.value = '';
      if (!file) return;
      try {
        const data = await readFriendCardAsset(file);
        if (Object.prototype.hasOwnProperty.call(friendCardAssetValues,field)) friendCardAssetValues[field] = data;
        const form = $('#friend-card-form');
        form.elements[field].value = data;
        const row = friendImage.closest('[data-friend-card-asset-row]');
        const thumb = $('[data-friend-card-thumb]',row);
        if (thumb) { thumb.className = 'friend-card-image-thumb'; thumb.style.backgroundImage = `url("${data}")`; thumb.textContent = ''; }
        $('[data-remove-friend-card-image]',row).hidden = false;
        const exportButton = $('[data-export-stk]',row);
        if (exportButton) exportButton.disabled = false;
        updateFriendCardEditorPreview();
      } catch (error) { toast(file.name.toLowerCase().endsWith('.stk') ? 'That .stk file is not valid. Use a Helunemi Friend-Card stroke export.' : error.message); }
      return;
    }
    const input = event.target.closest('[data-image-input]');
    if (!input || !currentUser) return;
    const form = $('#profile-form');
    const file = input.files?.[0];
    input.value = '';
    if (!file || !form) return;
    const kind = input.dataset.imageInput;
    try {
      await openCrop(file,kind);
    } catch (error) {
      toast(error.message);
    }
  });
  document.addEventListener('input',event => {
    const overlap = event.target.closest('[data-frame-property="overlap"]');
    if (overlap && friendCardDesignState) {
      if (!overlap.dataset.overlapHistory) { recordFriendCardHistory(); overlap.dataset.overlapHistory = 'true'; }
      friendCardDesignState.frame.overlap = Math.max(0,Math.min(100,Number(overlap.value) || 0));
      updateFriendCardEditorPreview(); saveFriendCardDraftLocally(); return;
    }
    if (event.target.matches('[data-member-search]')) { updateMemberResults(); return; }
    if (event.target.matches('[data-global-search-input]')) { updateGlobalSearchResults(); return; }
    const hexColor = event.target.closest('[data-friend-color-hex]');
    if (hexColor) {
      const match = /^#?([0-9a-f]{6})$/i.exec(hexColor.value.trim());
      if (!match) return;
      const picker = hexColor.closest('.friend-color-picker')?.querySelector('input[type="color"]');
      if (picker) { picker.value = `#${match[1]}`; picker.dispatchEvent(new Event('input',{bubbles:true})); }
      return;
    }
    const colorPicker = event.target.closest('.friend-color-picker input[type="color"]');
    if (colorPicker) {
      const hex = colorPicker.closest('.friend-color-picker')?.querySelector('[data-friend-color-hex]');
      if (hex) hex.value = colorPicker.value.toUpperCase();
    }
    const backgroundProperty = event.target.closest('[data-background-property]');
    if (backgroundProperty && friendCardDesignState) {
      if (!friendCardBackgroundBefore) friendCardBackgroundBefore = friendCardSnapshot();
      friendCardDesignState.background[backgroundProperty.dataset.backgroundProperty] = Number(backgroundProperty.value);
      updateFriendCardEditorPreview(); saveFriendCardDraftLocally();
      const output = backgroundProperty.parentElement?.querySelector('output'); if (output) output.textContent = `${backgroundProperty.value}%`;
      return;
    }
    if (event.target.matches('[data-friend-search]')) {
      filterFriendCards(event.target.value);
      return;
    }
    if (event.target.closest('#profile-form') && event.target.name?.startsWith('friendCard')) { updateFriendCardEditorPreview(); return; }
    const layerProperty = event.target.closest('[data-layer-property]');
    if (layerProperty) { if (!friendCardLayerBefore) friendCardLayerBefore = friendCardSnapshot(); updateFriendCardLayer(friendCardSelectedLayer,layerProperty.dataset.layerProperty,layerProperty.type === 'checkbox' ? layerProperty.checked : layerProperty.value,false); return; }
    const layerContent = event.target.closest('[data-layer-content-field]');
    if (layerContent) { if (!friendCardLayerBefore) friendCardLayerBefore = friendCardSnapshot(); updateFriendCardLayerContent(layerContent.value); return; }
    if (event.target.matches('[data-design-name]') && friendCardDesignState) { friendCardDesignState.name = event.target.value.slice(0,80); saveFriendCardDraftLocally(); const status = $('[data-friend-save-status]'); if (status) status.textContent = 'Unsaved changes'; return; }
    if (event.target.closest('#friend-card-form') && event.target.name?.startsWith('friendCard')) {
      if (friendCardDesignState && event.target.name === 'friendCardButtonColor') friendCardDesignState.layers.filter(layer => layer.type === 'button').forEach(layer => { layer.fill = event.target.value; });
      if (friendCardDesignState && event.target.name === 'friendCardButtonTextColor') friendCardDesignState.layers.filter(layer => layer.type === 'button').forEach(layer => { layer.color = event.target.value; });
      updateFriendCardEditorPreview(); saveFriendCardDraftLocally(); const status = $('[data-friend-save-status]'); if (status) status.textContent = 'Unsaved changes'; return;
    }
    if (event.target.matches('[data-project-search]')) {
      const query = event.target.value.trim().toLowerCase();
      let shown = 0;
      $$('[data-switch-project]').forEach(card => { card.hidden = !card.dataset.projectText.toLowerCase().includes(query); if (!card.hidden) shown++; });
      const empty = $('[data-project-empty]');
      if (empty) empty.hidden = shown > 0;
      return;
    }
    if (event.target.matches('[data-artwork-search]')) {
      const query = event.target.value.trim().toLowerCase();
      let shown = 0;
      $$('[data-switch-artwork]').forEach(card => { card.hidden = !card.dataset.artworkText.toLowerCase().includes(query); if (!card.hidden) shown++; });
      const empty = $('[data-artwork-empty]');
      if (empty) empty.hidden = shown > 0;
      return;
    }
    if (!cropSession) return;
    if (event.target.id === 'crop-zoom') { cropSession.zoom = Number(event.target.value); paintCrop(); }
    else if (event.target.id === 'crop-rotation') { cropSession.rotation = Number(event.target.value); paintCrop(); }
  });
  document.addEventListener('keydown', event => {
    if($('dialog[open]'))return;
    if (friendCardShortcut(event)) return;
    const typing = event.target.matches('input,textarea,select,[contenteditable="true"]');
    if ($('#friend-card-form') && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const mode = ({g:'move',r:'rotate',s:'scale'})[event.key.toLowerCase()];
      if (mode && !event.repeat) { event.preventDefault(); beginFriendCardTransform(mode); return; }
      if (friendCardActiveTransform?.mode === 'scale' && ['x','y','b'].includes(event.key.toLowerCase())) {
        friendCardActiveTransform.axis = event.key.toLowerCase() === 'b' ? 'both' : event.key.toLowerCase();
        const status = $('[data-friend-save-status]'); if (status) status.textContent = `Scale ${friendCardActiveTransform.axis === 'both' ? 'freely' : `along ${friendCardActiveTransform.axis.toUpperCase()}`} · click the card to apply, Esc to cancel`;
        event.preventDefault(); return;
      }
    }
    if ($('#friend-card-form') && friendCardDesignState && !typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); undoFriendCard(event.shiftKey); return;
    }
    if ($('#friend-card-form') && friendCardDesignState && !typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault(); undoFriendCard(true); return;
    }
    if (event.key !== 'Escape') return;
    if (closeQuickMenu(true)) return;
    if (cancelFriendCardTransform()) return;
    closeProfile();
    closeGlobalSearch();
    const options = $('#profile-options');
    if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
  });
  $('#dlg')?.addEventListener('click', event => { if (event.target === $('#dlg')) $('#dlg').close(); });
})();
