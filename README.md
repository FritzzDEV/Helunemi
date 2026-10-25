# Helunemi website

Helunemi is an early game development community. The site introduces the studio and its projects, shares artwork and updates, and provides member accounts with public profiles.

## Projects

- **Gamma Frost** is the studio’s work in progress, currently at **v0.0.2**. *Hollow Shift* is its secondary title. Its project page includes the Granvoil setting, the player’s opening story, and the plan for a smaller early access release before the game becomes an MMORPG.
- **OmiWo: Collide** (Ominous World) is a future open-world gacha project. It is not currently in development.

Game builds will be linked from their project pages. The Download page is for extras such as skins, mods, add-ons, plugins, modding applications, and tools. The Shop starts with a ₱90 Namecard ticket and a ₱350 WHO? ticket. The owner can manage products and peso prices. Payment checkout is not configured, so paid purchases are unavailable.

## Run locally

1. Install Node.js 20 or later.
2. In this folder, run `npm install`.
3. Run `npm start`.
4. Open [http://localhost:4173](http://localhost:4173).

The site serves its separate HTML pages with shared `styles.css` and `app.js` files. Accounts use HTTP-only session cookies. PostgreSQL is used when `DATABASE_URL` is set; otherwise, the server writes to `data/accounts.json`.

## Accounts and Firebase email setup

Firebase Authentication handles email verification, email/password sign-in, and password reset after the Firebase project is configured. The website remains in its existing username/password mode until the Firebase web settings and server credentials are all present. In that setup mode, every new account must verify its email before its Helunemi profile is created. Password reset emails are sent by Firebase; users sign in again with the new password afterward.

### Create and configure the Firebase project

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Settings → Authorized domains**, add the Render hostname for the site (for example, `your-site.onrender.com`) and `localhost` for local development.
4. In **Project settings → General**, register a Web app and copy its public web configuration values: API key, Auth domain, Project ID, App ID, and Storage bucket. The messaging sender ID is optional.
5. In **Build → Storage**, create a Firebase Storage bucket. Deploy the rules in [`storage.rules`](storage.rules) to the bucket. Helunemi uploads Friend-Card assets through the server, which assigns an account-specific object path and download token; client-side direct writes are disabled.
6. In **Project settings → Service accounts**, generate a private key for the Firebase Admin SDK. Treat the downloaded JSON as a secret. Do not commit it, upload it to the repository, or paste it into chat.
7. Add these variables to the Render web service’s **Environment** settings. Use the exact values from the Firebase Web app and service account. For the private key, paste the full PEM value; if Render requires a single line, preserve newlines as `\n`.

| Render variable | Firebase value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Project ID (used by the web app and Admin SDK) |
| `FIREBASE_WEB_API_KEY` | Web app API key |
| `FIREBASE_AUTH_DOMAIN` | Web app Auth domain |
| `FIREBASE_APP_ID` | Web app App ID |
| `FIREBASE_MESSAGING_SENDER_ID` | Web app sender ID (optional) |
| `FIREBASE_STORAGE_BUCKET` | Web app storage bucket; required for Friend-Card image uploads |
| `FIREBASE_CLIENT_EMAIL` | Service account `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account `private_key` (secret; paste as an environment variable) |
| `FIREBASE_PRIVATE_KEY_FILE` | Optional path to a secret file containing only the PEM private key |
| `FIREBASE_SERVICE_ACCOUNT_FILE` | Optional path to a secret file containing the downloaded service-account JSON |

8. In **Authentication → Templates**, review the email verification and password reset messages and sender details. Save the settings, then redeploy or restart the Render service. The website exposes only the Firebase Web app settings to browsers; the Admin private key stays in the Render environment.

If you store the private key as a Render Secret File, Render mounts it at `/etc/secrets/<filename>`; a secret file named `FIREBASE_PRIVATE_KEY` is detected automatically. For another filename, add `FIREBASE_PRIVATE_KEY_FILE=/etc/secrets/<filename>` as an environment variable. If the secret file contains the full downloaded JSON, set `FIREBASE_SERVICE_ACCOUNT_FILE=/etc/secrets/<filename>` instead. Render secret files are files, so adding one does not create a same-named environment variable.

Firebase sends verification and password reset messages directly, so Helunemi does not need a separate email server. For local testing, use the same environment variables and make sure `localhost` is an authorized Firebase domain.

### Existing Helunemi accounts

Existing username accounts keep working after Firebase is configured. While signed in, open the profile’s **Email security** section, enter an email and a Firebase password, and choose **Connect email**. Verify the address, return to the profile, and submit the same email and password again. The existing Helunemi profile, roles, tickets, and posts remain attached. After the connection, use the verified email and Firebase password to log in. If a password is reset, the updated password is synchronized after the next successful Firebase login.

New sign-ups verify their email before the Helunemi account is activated. Use the same browser when returning from the verification link so it can finish the pending profile setup. The Owner setup code is entered only from an eligible existing account’s profile; it is not part of sign-up.

If the Firebase variables are missing or incomplete, the site stays in legacy username/password mode. In that mode, email verification and password recovery are unavailable until Firebase is configured.

## The Helunemi Owner

To set up the Owner role, add these variables in the server’s hosting settings. Keep the setup code private and do not put it in source files.

| Variable | Purpose |
| --- | --- |
| `SOLARIS_OWNER_USERNAME` | Reserved Owner username. Defaults to `Fritzz Xenon`. |
| `SOLARIS_OWNER_SETUP_TOKEN` | A long, private, one-time setup code. |

If `Fritzz Xenon` already has an account, log into it after setting the variables and use **Claim the Helunemi Owner role** on that account’s profile. If the account does not exist yet, sign up with the reserved username, then claim Owner from the profile using the setup code. The sign-up form does not ask for an Owner code. The first eligible claim becomes Owner. Remove `SOLARIS_OWNER_SETUP_TOKEN` after the role is claimed. The server prevents a second Owner claim, including while the first Owner account is paused.

The Owner assigns primary roles and secondary role tags from the role controls on another user’s full profile. The Owner profile’s **Assign account roles** panel only manages the Owner’s own secondary role tags. The assignable primary roles are **Assistant**, **AI Assistant**, **Developer**, and **Member**. The Owner permission is protected and separate from those choices. **Visitor** is reserved for guest browsing and cannot be assigned to a registered account. The List shows the Owner plus accounts assigned Assistant, AI Assistant, or Developer; Member accounts stay off the studio team directory. Secondary tags such as Scripter, Modeler, Tester, Updater, Announcer, Debugger, App tester, and Artist appear on the List as tags. Assistant, AI Assistant, Developer, and Owner profiles show role tags; only studio-role accounts have secondary role tags.

Members can open the Friend-Card chooser popup from the profile options menu, then create a new card or pick an existing design without leaving the profile. The Canva-inspired workspace has a canvas, element and layer panel, and properties panel. Layers can be added, renamed, moved, resized, rotated, styled, hidden, locked, duplicated, reordered, or deleted. It includes linked account details, text, image layers, stickers, shapes, buttons, custom fonts, reusable stickers, and imported design artwork. Use Layers → Images & stickers → Image to upload one or more JPG, PNG, or WebP images. Imported images keep their proportions, support crop/fit/mask controls in Properties → Assets, and are saved and exported with the design. Canvas zoom, pan, fit, undo/redo, custom dimensions, preview, PNG export, and `.hcfc` import/export are available. The `.hcfc` file is a versioned ZIP package with a manifest and portable image and font assets; importing a design does not publish it. The editor supports the 1:1, 2:3, 3:2, 4:5, and 5:4 presets as well as custom dimensions. A custom frame has four separate square corners and four side images. It defaults to placement behind the entire card, including its background. Overlap behind card (0–100%) tucks frame pieces under the card edges; exterior space is reserved in previews and PNG exports. The card stroke, including its legacy image stroke, is temporarily disabled while any frame piece is visible; hiding or removing the frame restores the saved stroke settings. Side modes are Stretch, Repeat, and Connected; connection alignment controls appear only in Connected mode, where each side can join either or both adjacent corners. Frame horizontal/vertical position and rotation use sliders; presets and exports preserve the transforms. Placement can be Very back or Very front, with frame images ignoring pointer input so buttons remain clickable. A local recovery draft is kept in the browser; use **Save** to sync the design to the account. A revision check warns if another session saved the same Friend-Card first. New cards start with only a profile picture and username. Preview and Full view must each include at least one visible PFP and username layer to save or post. Separate Preview only and Full view only copies are allowed; each type allows up to three instances. This rule is enforced by both the editor and server. Older `.scfc` packages can still be imported; new exports use `.hcfc`. Existing saved layer designs remain editable. Shift-click layers on the canvas or in the layer list to build a selection. Use Group selected or Ctrl+G to create an expandable group with an item count; Ctrl+Shift+G ungroups the selection. Groups keep a shared stacking position, can be renamed, and are saved with the editable design. Copy, cut, paste, duplicate, delete, nudge, and transforms apply to the selection. Copy labels use “copy”, “copy 1”, “copy 2”, and so on. The layer list shows the foreground first, with a live total, visible-in-view count, and selection count. Move to front/back preserves the internal order of a selection. G is the default Move tool; applying or cancelling Scale/Rotate returns to Move. Expanded CFC previews use a transparent full-screen viewer with a centered card. Card fitting in the viewer and editor depends only on the card dimensions; changing frame size changes pan space without resizing the card surface. Images and fonts uploaded in the editor use the server’s account-specific asset routes and configured file storage (see Neon Object Storage below). Older Firebase assets remain supported. A card stays private until its owner selects **Post custom friend card**. The Members page shows only posted Friend-Cards; members can search profiles from the shared header search, even before a card is posted. Other roles use their studio profiles instead.

The fixed bottom-right **Menu** button uses the imported menu icon and opens **Community** and **Explore AIs** links. It uses a black-and-white palette that follows the site theme and has a smaller mobile size. Click outside or press Escape to dismiss it; keyboard users can open it with Enter/Space or focus a link with Arrow Down/Up. The **Community** link opens the full-screen chat page. Members can send and accept friend requests from posted Member Friend-Cards, chat with accepted friends, and send bug reports to the studio team. The report inbox is limited to Owner, Assistant, AI Assistant, and Developer accounts. Friend connections, messages, and reports are stored with account data, so use PostgreSQL or a persistent disk on Render to keep them across service restarts.

Card and button stroke images can be imported or exported as `.stk` files. A Helunemi `.stk` is a JSON file with the `solaris-stroke-v1` format and an embedded PNG, JPEG, or WebP data URL; ordinary image files work too. Helunemi resizes the images in the browser before saving them. Private account information, including phone numbers and secondary email addresses, is available from **View Personal Profile Information** and is not included in public profiles. Passwords cannot be viewed: Helunemi and Firebase store password credentials in forms that cannot be reversed into the original password. Use Firebase’s reset email to choose a new password.

The profile options menu also links to **Edit Profile**, **View Personal Profile Information**, and—on Member accounts—**Edit Custom Friend-Card**. Email verification, password reset, and password management are handled by Firebase when it is configured.

Visitors can browse the site pages, but they cannot download games or extras or buy Shop tickets. Their top-right guest profile opens a simple prompt to log in or create an account. The home page is public whether or not a visitor has selected guest mode.

Real name is optional. A warning appears before the first save because that value becomes permanent; a WHO? ticket is required to change it later. Usernames can be changed once every seven days, or sooner by using a Namecard ticket. Previously acquired tickets are kept when their shop prices change.

## Shop products and country currency

The shop’s three-dot menu lets the Owner open **Add a product**. Each product’s menu offers **Edit product** and **Delete product**. The dedicated `shop-product.html` editor supports names, descriptions, imported transparent images, peso prices, and either a general inventory product or a Namecard/WHO? ticket benefit. There can be one listed product per ticket benefit. Deleting a listing does not delete existing inventory, and an empty shop stays empty after a restart. Products are saved with the same PostgreSQL or persistent-file store as accounts.

Members can save their **Country / region of residence** in **Personal Profile Information → General information**, or in the shop’s **Your price display** section. Country stays private. Original prices are in PHP; the shop shows estimated local currency prices and the original peso amount. Conversion uses [Frankfurter’s daily reference-rate API](https://frankfurter.dev/), with server caching, timeouts, rate dates, and a peso fallback when a rate is unavailable. No API key is required. Country-to-currency mappings come from [Unicode CLDR](https://github.com/unicode-org/cldr-json), recorded as of October 24, 2026; its license is included in `country-currencies.LICENSE.txt`.

**Payment processing is not configured.** Paid products show **Checkout coming soon**. Both the new product claim endpoint and the legacy ticket endpoint reject paid claims using the stored server price. Free products can be claimed up to 99 per product; ticket benefits add to the existing ticket inventory. No currency balance or simulated payment is used.

At the bottom of a profile, a member can pause their account for 30 days or permanently delete it. Pausing removes the account from the active site, blocks login, and keeps a private backup that is restored after 30 days. Deletion removes the account and any Helunemi-managed pause backup. Backups retained separately by Git or the hosting/database provider follow their own retention policies.

## Render and persistent account storage

Render free web services spin down after 15 minutes without incoming traffic and wake when a new request arrives. Their local filesystem is ephemeral, so account file changes do not survive a spin-down, restart, or redeploy. Use PostgreSQL for account storage and set `DATABASE_URL` to the database’s internal connection URL; keep the database and web service in the same region. The server creates its tables at startup and imports `data/accounts.json` on the first start only when the database has no account record. Active accounts and 30-day pause backups are stored together, so restoring an account does not depend on the web service’s local filesystem. See Render’s [free instance](https://render.com/docs/free) and [PostgreSQL connection](https://render.com/docs/postgresql-creating-connecting) guides.

Set the service build command to `npm install` and its start command to `npm start`. Render’s free PostgreSQL databases expire after 30 days, so use a database plan that does not expire for ongoing account storage. A paid web service with a [persistent disk](https://render.com/docs/disks) is another option: mount the disk at a path such as `/var/data` and set `SOLARIS_DATA_DIR=/var/data`.

When using the local file store, the server creates `data/accounts.json` on first save. Keep account data out of Git. If you are moving an existing file store to PostgreSQL, the server imports it when the database account store is empty.

## Before public launch

Run the site behind HTTPS, set `NODE_ENV=production`, keep protected backups, and use a PostgreSQL plan with a retention period that meets your needs. The Owner setup code belongs in the hosting provider’s environment settings, never in source files.

## Profile tabs and community content

Profiles now have **General**, **Posts**, **Stickers**, **GIFs**, and **Custom Friend Card (CFC)** tabs, in that order. General preserves profile information, favorites, social links, roles, email security, and account management. The Installed Games cards identify games added by the member; they do not claim the website has detected local installations. A profile tab can be linked with `account.html?user=ACCOUNT_ID&tab=posts` (also `general`, `stickers`, `gifs`, and `cfc`).

Posts support formatted text, images, GIFs, stickers, MP4/WebM video, and announcements. The server sanitizes rich HTML using an explicit formatting allowlist. Authors can edit/delete their posts, change visibility, and copy permanent post links. Signed-in viewers with access can like/unlike and comment; comment authors, the post author, the Owner, and Assistants can delete comments. Feeds load 15 posts per page.

**Create post**, **Edit Post**, **Change Visibility**, and featuring gallery media open `create-post.html`. Changes are protected by the browser’s unsaved-changes warning on navigation, refresh, or closing the page. The Cancel button also asks before leaving. **Save draft** stores a draft in this browser tab without publishing it; typing also keeps a recovery copy. Reopening the editor in the same tab offers **Restore draft** or **Discard draft**. Drafts are scoped to the account and edited post. They are removed after successful publication and are not a substitute for server-saved posts. Upload failures and publish errors keep the editor open. Browser-level exit warnings require browser support and prior interaction with the page.

Visibility is enforced on the server for post reads, direct links, interactions, and attached files:

| Audience | Access |
| --- | --- |
| Public | Public-profile visitors |
| Friends | Author and accepted friends |
| Party | Author and current members of the selected party |
| Self | Author only |

There was no on-site party/group membership system before this expansion. **General → Parties & groups** now supplies one membership model with two types: parties for post audiences and groups for CFC sharing. Creators invite accepted friends; invitees must accept. Removing a member or leaving revokes the related access immediately. This does not alter the Groups page’s existing Discord invitation.

Sticker and GIF galleries separate **Free** and **Store** content. **Upload Only** publishes a gallery item without a post. **Upload and Announce** also creates one release announcement. Identical uploads reuse the creator’s stored asset, and announcements retain their IDs to prevent duplicates. Creators can edit details, remove items, and feature existing uploads in a manually composed post.

Sticker, GIF, and CFC store prices remain metadata in USD. **Payment processing is not configured.** Priced items display locked, server-generated blurred previews; there is no fake purchase or currency balance. Free items can be added to an account’s collection. Public APIs and file routes withhold priced originals from unauthorized viewers. These creator galleries are separate from the Owner-managed product shop, whose base currency is PHP.

The CFC tab shows **My CFCs**, **Shared With Me**, and **Group CFCs** only to the profile owner. Other profiles show only publicly listed cards and the member’s current posted card. Members can save visual snapshots of their current CFC, set names, profile visibility and prices, and grant access to accepted friends or joined groups. Saving a snapshot preserves that version’s appearance rather than changing it when the editor’s current design is updated. Public paid snapshots expose only an independently generated blurred image until access is granted.

Every CFC in a profile, including an expanded card, stays in **Preview Mode**. Live card DOM is inert and ignores pointer/keyboard interaction. Saved versions are images, so embedded buttons, inputs, navigation, and other card actions cannot operate in a profile preview. The existing Member Friend-Card editor remains available from profile options.

## Persistent website-hosted uploads

New **game binaries are never uploaded to Firebase Storage**. Games use Helunemi backend upload and download routes, with metadata saved alongside existing site records. New post media and gallery/CFC previews also use the website’s controlled storage. Firebase Authentication, existing Friend-Card editor assets/fonts, and existing chat uploads continue using their existing Firebase integrations.

Choose one persistent upload backend:

| Configuration | File location |
| --- | --- |
| `DATABASE_URL` set; `SOLARIS_UPLOAD_DIR` unset | PostgreSQL, in `solaris_files` and `solaris_file_chunks` tables. Binaries are streamed in bounded 1 MiB chunks. This works without a writable web-service disk. |
| `SOLARIS_UPLOAD_DIR` set | The configured directory. On Render, it must be inside an actual attached persistent disk mount. A disk at `/var/data` can use `SOLARIS_UPLOAD_DIR=/var/data/solaris-uploads`. |
| Local development, neither set | `data/uploads/`, alongside the local account store. |

**For a disk deployment, persist the metadata too:** use `DATABASE_URL`, or set `SOLARIS_DATA_DIR=/var/data/solaris-data` on the same attached disk. A persistent binary directory with an ephemeral account store is insufficient.

For Render:

1. Run `npm install` as the build command and `npm start` as the start command. New dependencies include `sanitize-html` and `sharp`.
2. Keep your existing persistent `DATABASE_URL` to store accounts, posts, collections, memberships, and file metadata. With no upload directory configured, file contents also use that database.
3. For larger installers, prefer a paid web service with an attached persistent disk. Set `SOLARIS_UPLOAD_DIR` inside the mount and keep account metadata persistent as described above. The server checks the actual Linux mount on Render instead of treating an ordinary application directory as persistent.
4. If there is no persistent database or attached disk, production uploads return a clear setup error. Render Free web services cannot attach persistent disks and lose local changes on restarts. See [Render persistent disks](https://render.com/docs/disks) and [free service storage limitations](https://render.com/docs/free).
5. Use a database that does not expire and has enough storage for your uploads. Database-backed binaries consume database capacity; disk-backed binaries consume the attached disk. Keep both file content and metadata in your backup plan.

Existing Firebase game builds are retained as migration records. When persistent website storage is available, the server attempts to stream them into the new backend. It saves each new reference before deleting that build’s old Firebase object. If migration is blocked by storage configuration or Firebase access, the Owner can retry using **Manage game downloads → Move existing builds to website storage**. A build awaiting migration is not delivered from Firebase; its download route shows an explanatory error until it has moved. Existing outside HTTPS download links remain supported with an **Outside download** button.

Downloads use stable `/api/game-build/BUILD_ID` links, require sign-in, stream without loading the full installer into memory, support HEAD/byte ranges, and use attachment/nosniff headers. Uploads enforce studio permissions, filename/type checks, format signatures, size limits, random storage identifiers, and SHA-256 metadata. Failed uploads are removed; replacing/removing builds deletes obsolete stored binaries. Abandoned uploads older than 24 hours that have no saved reference are pruned on startup.

The game upload limit defaults to **2 GiB**, configurable with `SOLARIS_MAX_GAME_BUILD_BYTES` (50 MiB–4 GiB). Post images/GIFs/stickers/CFC snapshots allow 20 MiB per upload and 40 megapixels; videos allow 100 MiB. SVG/HTML uploads are not accepted as community media. Paid thumbnails are separately rasterized/blurred on the server, so CSS removal cannot reveal the original.

## Content management permissions

Games, Arts, Updates, and social posts use consistent vertical-dot menus. Studio staff (Owner, Assistant, AI Assistant, Developer) can edit games and manage game downloads. Artwork/update creators can edit and remove their own entries; the Owner can manage every entry. New studio content is still published by the Owner. The original built-in games, two artworks, and studio update are now persisted/editable records; deleting a built-in item records a tombstone so it does not reappear after restart.

Public site-content responses omit internal file identifiers and storage paths. Management endpoints validate authorization independently from visible menus. Existing account IDs, roles, friendships, profile details, authentication and file/database stores are reused. The existing account-store JSON gains a `social` object with safe empty defaults for older saves; migrations do not replace existing account data.

## Verification

Run `npm test` for isolated backend integration checks. The tests use temporary accounts and a temporary local store; they do not contact your Firebase project or production database. They cover post audiences and direct links, comment/like ownership, HTML sanitization, media protection, CFC sharing/revocation, content management, file downloads/ranges/replacement, pagination, upload validation, and persistence across a server restart. Desktop/mobile browser checks should also be performed when changing UI behavior. A local disk restart check does not verify your actual Render mount, database capacity, or a live Firebase migration; confirm those in the deployed environment.

## Explore AIs

`explore-ais.html` lists **Hene** and **Lumi**, each marked **Soon to be developed**. Their names come from Helunemi: split **He · lu · ne · mi**, swap **lu** and **ne**, then pair **He + ne** and **Lu + mi**. The page contains no AI functionality or additional AI details yet.

## Neon Object Storage

When the complete Neon S3 environment is configured, new social uploads, chat media, Friend-Card images and fonts, and game builds are written to the private useruploads bucket under generated keys in images/. The existing solaris_files metadata and authorization checks remain in use. Existing PostgreSQL chunks and older Firebase URLs continue to be read through their current paths; deployment does not copy or rewrite those PostgreSQL rows.

Add these values to the Render web service environment. Take the four AWS values from the Helunemi production branch's Neon Object Storage integration, and set the bucket name exactly as shown:

| Environment variable | Value source |
| --- | --- |
| AWS_ENDPOINT_URL_S3 | Neon production branch storage endpoint |
| AWS_REGION | Neon production branch storage region |
| AWS_ACCESS_KEY_ID | Neon production branch storage credential |
| AWS_SECRET_ACCESS_KEY | Neon production branch storage credential |
| NEON_STORAGE_BUCKET | useruploads |

Keep AWS credentials in Render's encrypted environment settings or secret files. Render mounts secret files under /etc/secrets/<filename>; the service reads a raw-text file named AWS_SECRET_ACCESS_KEY from /etc/secrets/AWS_SECRET_ACCESS_KEY. For another filename, set the non-secret AWS_SECRET_ACCESS_KEY_FILE variable to its mounted path. The endpoint, region, access key ID, bucket, and DATABASE_URL still need to be configured for the service. Do not commit .env files or paste secret values into chat. Uploads continue through the authenticated server so it can enforce account access, size limits, and file signatures before writing. The authenticated game-download endpoint uses a five-minute presigned GET for private installer downloads. Images, chat media, and range requests stay on the same-origin server path. Direct presigned PUT is not used because it would bypass the site's current validation and ownership checks.

## Friend-Card editor workflow

**Edit Custom Friend-Card** opens two choices: **Edit existing CFC** (a list of saved designs and collection cards) or **Create new CFC**. New designs contain only the profile picture and username. Saving a new design keeps it privately in **My CFCs**; it does not replace a different posted card. **Post custom friend card** selects that design for the Members page. Previously current designs are preserved when a new one is created. Up to 50 designs are stored per account, each with its own revision to detect conflicting edits. Unsaved new-card drafts can be resumed from the existing-card chooser in the same browser.

The eight frame pieces use one full-width row per piece. Stars, triangles, diamonds, hexagons, rectangles, squares, rounded squares, and circles use explicit shape geometry. The profile picture, square, rounded-square and circle layers retain a physical 1:1 ratio on every card aspect ratio. Text boxes provide independently editable headings and body text; ready-made headings include What I like, What I dislike, Favorite thing, and Friend I am looking for.

Layers can extend beyond the card edges. **All layers** exposes the working area beyond the card; **Preview** and **Full view** apply the same visibility rules and clipping as the displayed card. The expanded preview also switches between both views. Preview-only layers are omitted from full view, full-view-only layers are omitted from preview, and Both layers appear in both. The layer eye toggle also applies to profile picture and username layers.

The profile picture and username may be hidden, duplicated, cut, or deleted. Each permits one original plus two duplicates (three total). Their layer names stay fixed. Both the browser and server reject Save/Post unless at least one of each layer exists; the editor shows a reminder with instructions to restore missing layers. Other layers retain the existing total limit of 80.

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd+C, V, X | Copy, paste, cut the selected layer within the editor |
| Ctrl/Cmd+D | Duplicate the selected layer |
| Backspace / Delete | Delete the selected unlocked layer |
| Ctrl/Cmd+S | Save the current CFC |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo |
| Arrow keys / Shift+Arrow | Move by 1 / 10 design pixels |
| G, R, S | Move, rotate, scale with the pointer |
| X / Y during scale | Constrain scaling to one axis |
| Escape | Cancel the current transform |

Typing fields retain their normal copy/paste/cut and undo behavior. Pasted layers keep their images, styles, visibility settings, and uploaded font references. The saved-design APIs are restricted to the signed-in Member account; private library sources are not returned to public profile visitors. Asset retention includes saved designs, collection source designs, and paused accounts.

Collection snapshots saved before editable sources were stored contain only rendered images. The chooser clearly labels those cards and can reuse the saved image as a new card background; the original layers cannot be reconstructed. New collection snapshots preserve an editable source for their owner. PNG export follows the selected preview/full mode and embeds uploaded assets rather than depending on external image fetches during rendering.


### CFC button actions and expanded viewer

Button layers choose Open CFC, Add friend, Invite to party, Invite to group, View profile, or Message. Open CFC is always Preview-only; every other button action is Full-view-only. Saving/updating/posting requires at least one visible, non-transparent Open CFC button intersecting the Preview card. The browser and server share this rule in `friend-card-rules.js`. Existing button layers migrate to Open CFC / Preview-only. Party/group invitations use the viewer’s owned circles and require an accepted friendship; existing server ownership and membership checks still apply.

Opening a live CFC outside the editor shows Full view only. The editor preview retains a Preview/Full view switch for inspection. Expanded cards normalize their design once per open, coalesce fitting work, avoid a full-screen backdrop blur, pause background animations while the underlying directory stays visible, defer directory rebuilds, and release the expanded card DOM on close. Frame image rows synchronize thumbnails and Remove buttons after uploads, preset changes, Undo/Redo, and save.


### Community workspace and frame piece controls

Each of the eight frame pieces has a collapsible image/transform panel with its own X/Y offset and rotation sliders. Individual transforms combine with the whole-frame position, rotation, overlap, and placement controls, and are preserved by presets, account storage, recovery drafts, and exports. Expanded CFCs keep the underlying Members/Groups page visible; background animations pause while the card is open.

Community and Explore AIs share a full-height messaging layout with sidebar navigation and no global top header. Appearance controls are grouped into Colors, Typography & layout, and Wallpaper; manual HEX values, bubble radius, dimming, and reset apply only to the selected friend chat in the current browser. Existing messages are retained between refreshes, so audio playback and scroll position are preserved. On-site chat media URLs and storage keys survive account normalization.

The studio report inbox supports replies and Open/Resolved status changes. Reporters can follow and reply through My reports. Authentication and server-side ownership/staff checks protect every report thread; messages and status changes are saved with account storage. Older reports retain their history and gain an empty reply list. No email server is required.


## Security, content permissions, and Terms

The bottom-right quick menu links to `terms.html`, a public Terms of Service page with content permissions, community rules, privacy information, and reporting contacts. Its header contains only Helunemi, Home, and the account picture. Community and Explore AIs also link to it. New signups explicitly accept the current terms, including Firebase signups resumed after email verification; the server records the version and timestamp. Existing accounts are not silently opted in. Keep the terms version in `security-policy.js`, `app.js`, and `terms.html` synchronized when updating the policy.

`security-policy.js` applies a Content Security Policy, anti-framing headers, same-origin resource restrictions, a referrer policy, restricted browser permissions, and HSTS in production. Microphone and camera use remain available on this origin. The card editor still supports inline styles and HTTPS image imports; the policy deliberately allows those existing features. Uploaded files keep their stricter sandboxed response policy. Private workspace pages use no-store and noindex responses.

State-changing API calls require the same-origin `X-Helunemi-Request` header. Origin/referer and Fetch Metadata checks reject cross-origin browser mutations; no permissive CORS is granted. The shared API helper and both upload paths set the header. Outdated open tabs may need a refresh. JSON handlers reject non-JSON bodies. Session cookies remain HTTP-only, SameSite=Strict, and Secure in production. Sign-in, owner setup, and sensitive account actions have bounded temporary rate limits; slow connections have explicit timeouts. These are local to each Node process and reset on restart, so use an upstream limiter for a multi-instance service.

Optional deployment settings:

| Setting | Purpose |
| --- | --- |
| `SITE_ORIGIN` | Exact public origin, such as `https://your-site.onrender.com`, without a path. Recommended to pin browser origin checks. |
| `SECURITY_TRUST_PROXY_HOPS` | Optional number of trusted reverse-proxy hops for rate-limit IP extraction. Default `0` trusts only the socket address. Configure only after verifying the deployed proxy chain; never blindly trust user-provided forwarding headers. Without this setting, visitors sharing a proxy share the coarse rate limit. |

Production is detected by `NODE_ENV=production` or Render's `RENDER=true`. These settings do not replace HTTPS at the hosting layer. Preserve secrets outside the repository, use the existing static-file allowlist, and review `SECURITY.md` before deployment. `LICENSE` reserves rights only in protected original Helunemi material and preserves third-party licenses and user ownership.

Public HTML, CSS, JavaScript, images, and screenshots can be copied. These measures reduce security risks, restrict casual cross-site embedding, and clarify reuse rights; they do not provide DRM, automatic takedowns, a malware scanner, or legal registration. To protect unpublished source, keep the repository private. Review and maintain the policy and public support contacts as the service changes.
