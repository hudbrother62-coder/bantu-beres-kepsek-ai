# Security policy

## Secrets

- Never commit Gemini keys, Supabase service-role keys, or payment-provider secrets.
- Public Supabase publishable keys may be used by the browser because database access is protected by RLS.
- Gemini requests must only be made from the Vercel Functions in `/api`.
- Rotate a key immediately if it appears in logs, screenshots, commits, or browser source.

## School data

- Each school is a separate tenant identified by `school_id`.
- Database tables and private Storage objects are protected by Supabase RLS.
- AI endpoints validate both the Supabase user and school membership.
- Generated documents remain drafts until approved by a headteacher.

## Reporting

Before public launch, replace this section with a monitored security contact and response-time commitment.
