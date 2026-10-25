# Helunemi security and reporting

Report a suspected vulnerability privately to Fritzz Xenon through the official Discord community linked in `terms.html`, or the signed-in Community report inbox. Reports are visible to authorized studio staff. Include the affected URL, a clear description, and safe reproduction steps. Do not include passwords, verification codes, private keys, or another person's personal data. Stop when you identify the issue. This policy does not authorize disruption, social engineering, access to another account, or a reward.

## Deployment responsibilities

- Keep the source repository private if unpublished source must remain private. Browser-delivered files can always be inspected or captured. Copyright notices and terms describe reuse permissions, not technical copy prevention.
- Keep Firebase Admin keys, database URLs, object-storage credentials, and Owner setup secrets in hosting secrets. Never place them in public HTML, frontend JavaScript, uploads, screenshots, reports, or Git. Rotate any credential that has already been exposed; removing it from the latest commit is not sufficient.
- Set `SITE_ORIGIN` to the exact HTTPS public origin. Production mode enables Secure cookies and HSTS. Review any custom domain before enabling HSTS; this implementation does not preload or include subdomains.
- Only set `SECURITY_TRUST_PROXY_HOPS` after verifying the full proxy path to this service. Defaults do not trust forwarded client IP headers. Rate limits are bounded in-memory controls, shared by users behind the same unconfigured proxy; they are not distributed denial-of-service protection. An edge firewall/limiter and shared counters are needed when scaling beyond one process.
- Retain the static-file allowlist. Never serve the repository root, server source, `.git`, secrets, account files, or raw database backups as a directory. New public files must be explicitly listed.
- Keep server-side permission checks on private accounts, role assignment, posts, media, game builds, and shop operations. Hiding a button does not authorize a request. Do not weaken Firebase Storage rules to work around upload failures.
- Review dependency security advisories and install supported patched versions deliberately. Retain lockfiles. Check uploaded game packages before publishing them; file-signature checks do not establish that a program is malware-free.
- Use durable configured database and file storage with restricted access. Provider backups and retention need their own review. Confirm restoration and deletion procedures and keep the privacy notice accurate.
- Review logs with access controls and retention limits. Do not add request-body, password, authorization-token, cookie, or environment dumps to logs. Share redacted diagnostics only.
- Keep the public contact methods, copyright credits, and Terms/Privacy notice current. Obtain suitable legal review before commercial launches or changing personal-data/payment practices. Do not claim ownership of third-party or AI-generated material solely because it is hosted here.

## Implemented browser protections

The server applies CSP without inline scripts or eval, denies framing, blocks cross-site resource embedding in supporting browsers, restricts sensitive browser permissions, and limits referrer information. Inline styles, data/blob assets, HTTPS media imports, Google Fonts, and Firebase SDK/auth frames remain permitted for existing editor and chat features. This compatibility allowance is not a strict zero-external-network policy. Media downloads use a separate sandboxed policy.

Account mutations require a custom same-origin request header and pass Origin/Referer and Fetch Metadata checks. No cross-origin mutation permission is granted. This protects browser requests; a non-browser client can reproduce the header and still must pass authentication and authorization. Session tokens are random; database session records store token hashes. New signups must explicitly acknowledge the current terms version, which is timestamped on the server and kept out of public profile responses.

These controls reduce risk. They cannot make a public website impossible to copy, guarantee that an upload is safe, or replace security monitoring and incident response.

Implementation guidance: [OWASP HTTP headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
