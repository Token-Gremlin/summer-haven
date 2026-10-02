# Security and privacy

Summer Haven runs in the browser. It does not require an account, API key or
backend. Saves and preferences stay in browser local storage. The interface
currently requests optional typefaces from Google Fonts; system fonts are the
fallback. Hosting providers may keep their own request logs.

## Report a vulnerability

Use the repository's **Security → Report a vulnerability** option when it is
available. If private reporting is unavailable, open an issue requesting a
private reporting channel without including the vulnerability details.

Do not publish credentials, personal saves, private contact information or an
exploit containing another person's data. Include the affected version, browser,
reproduction steps and impact through the private channel.

## Supported version

Security fixes target the current `main` branch. Development snapshots and old
asset experiments are retained for reproducibility, not maintained release lines.

## Contributor privacy

Use relative paths in shared diagnostics and a GitHub `noreply` commit email if
desired. Environment files, local caches, recordings outside the curated
documentation and browser profiles should stay outside Git. See
[Contributing](CONTRIBUTING.md#before-sharing-files).
