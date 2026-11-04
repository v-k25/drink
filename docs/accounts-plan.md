# Accounts: sign in and sign up (email code, phone code)

Status (2026-11-01): **approved; A1–A2 built, not committed.** A3 (end to end with a real code) waits for P1, the email template change in Supabase. Checkpoints A0–A5.

## Owner decisions, 2026-11-01

- O1: accounts unlock **nothing yet**; sign-in exists for bookings later. Planner stays device-only.
- O3: **email codes only for now.** Phone codes are built but off (`PHONE_CODES_ENABLED = false` in `app/account/rules.ts`) until an SMS provider is chosen.
- O4: account deletion **later, with bookings.**
- O7: built on `socifer/launch-form-copy`.
- O2, O5, O6 took the recommendations (phone first once on; CAPTCHA before launch; sign-in says "no account found").

## Where this sits

- 2026-10-12: owner dropped OTP save from the Party Planner. The list stays on the device with print/copy/share. This plan does **not** bring that back unless the owner says so (decision O1).
- 2026-10-31: phone code was chosen as the sign-in for the future booking flow (B11). `supabase/migrations/20261030_booking_phase1.sql` already expects `auth.users` and returns `not_authenticated`.
- `public.profiles` (migration `20260801000001_profiles_baseline.sql`) already exists with owner-only RLS and an `on_auth_user_created` trigger, so **no new table or migration is needed** for sign-in itself.
- The site has no Supabase SDK. `app/early-access/actions.ts` calls PostgREST with `fetch` and the server-only `SUPABASE_URL` / `SUPABASE_ANON_KEY`. Accounts follow the same pattern: server actions call Supabase Auth (GoTrue) REST with `fetch`. **No new dependency, no new environment variable.** The early-access action is not touched.

## Provider

Supabase Auth on the existing EkQuarter project, both methods as a 6-digit code:

| Method | Supabase endpoint | Needs |
|---|---|---|
| Email code | `POST /auth/v1/otp` `{ email, create_user }` → `POST /auth/v1/verify` `{ type: 'email', email, token }` | Email template "Magic link" edited to show `{{ .Token }}` (a code, not a link). Custom SMTP before launch: the built-in sender is for testing only and heavily rate limited. |
| Phone code | `POST /auth/v1/otp` `{ phone, create_user }` → `POST /auth/v1/verify` `{ type: 'sms', phone, token }` | Phone provider enabled with an SMS provider (below). |

A code instead of a magic link for email: one code screen for both methods, works when the email is opened on another device, and no redirect URL or PKCE handling.

### SMS provider for Indian numbers

India requires DLT registration (TRAI) of the sender, the entity and each SMS template. Two realistic routes:

1. **Twilio Verify (recommended to start).** Built into Supabase (Auth → Providers → Phone → Twilio Verify): Account SID, Auth Token, Verify Service SID. Twilio generates the code and adds its own fraud guard and rate limits. Cost: $0.05 per successful verification plus Twilio's India SMS rate (check twilio.com/verify/pricing for India before enabling). Setup in about a day. To confirm with Twilio: that Verify in India sends on their pre-registered DLT templates so Socifer needs no own DLT registration.
2. **MSG91 (or another Indian gateway) via Supabase's Send SMS Hook.** Much cheaper per SMS (published Indian OTP rates are roughly ₹0.15–0.45 plus GST), but needs Socifer's own DLT entity, sender ID and template approval (days to weeks, a one-time fee), plus a small Edge Function for the hook. Better once volume is real.

**Testing without real SMS:** Supabase "Test phone numbers" (a fixed number → fixed code, no SMS sent) once a provider is configured; the built-in email sender can reach team addresses. End-to-end testing uses these.

## Screens (Black Tie)

One route group under `app/account/`, dark tool theme, `ToolHeader`/`ToolFooter`:

- **`/sign-in`**: heading "SIGN IN". Two tabs, Phone (default, `+91` prefix shown, 10 digits) and Email. One solid pink action, "Send code". Link: "New here? Create an account".
- **`/sign-up`**: heading "CREATE AN ACCOUNT". Same tabs plus one required checkbox: "I'm 21 or older and agree to the [privacy note]." Action "Send code". Link back to sign in.
- **Code entry** (same page, next step): "Enter the code we sent to +91 98••• ••210". One 6-digit field (`inputmode="numeric"`, `autocomplete="one-time-code"`), pink "Continue". "Resend code" after 60 s (countdown shown), "Use a different number/email".
- **Signed in**: the tool header shows an account button (initial or phone icon, lit pink on hover) linking to `/account`, which shows the phone/email, "Sign out" and "Delete my account" (see O4). Signed out, the header shows "Sign in" (outline, not pink; the pink stays the page's one action).
- Busy buttons use `.sf-spinner`; slow route loads use the existing `LoadingScreen`/`NavPending`. Errors are inline under the field, `aria-live="polite"`, plain words ("That code didn't work. Check it and try again.").
- WCAG 2.2 AA: 44px targets, visible focus, labels on every field, no timeout on the code page beyond the code's own expiry, paste allowed (3.3.8 accessible authentication).

Sign-in sends `create_user: false`, so an unknown number gets "We couldn't find an account. Create one?" instead of a silent sign-up. Sign-up sends `create_user: true` and only after the consent box is ticked.

## Where accounts are used

Decision O1. Recommendation: **sign in only, nothing gated yet.** The account exists for the booking flow (B11) and the planner assistant (B10). Party Planner stays device-only, Find My Drink stays open. The header no longer shows a saved-on-device note (owner, 2026-11-04).

## Sessions (Next 16)

Following `node_modules/next/dist/docs/01-app/02-guides/authentication.md`:

- `app/account/session.ts` (`import 'server-only'`): the data access layer. `verifySession()` wrapped in React `cache()` reads the cookies, checks the access token with `GET /auth/v1/user`, refreshes once on 401 with `POST /auth/v1/token?grant_type=refresh_token`.
- Cookies `sf_access` and `sf_refresh`: `httpOnly`, `secure` in production, `sameSite: 'lax'`, `path: '/'`; refresh cookie 30 days, access cookie its token lifetime. Set and cleared only in server actions.
- Server actions in `app/account/actions.ts` (`'use server'`): `sendCode`, `verifyCode`, `signOut`. They validate input on the server, never return tokens to the client.
- Pages can't write cookies, so a page that finds an expired access token redirects to `/account/refresh` (a route handler), which rotates the tokens and sends the browser back. Refreshing during render would rotate the refresh token without saving it.
- The tool header is shared with client pages (the Planner), so it doesn't read the session. A non-secret `sf_signed_in=1` cookie, set and cleared with the session, tells it to show "Account" instead of "Sign in"; `/account` checks the real session. The Planner stays static.
- No `proxy.ts` for now: nothing is gated, so there is nothing to redirect. When bookings arrive, `proxy.ts` does an optimistic cookie check only; the real check stays in the DAL.

## Rate limiting and abuse

- Supabase Auth limits (dashboard → Auth → Rate limits): codes sent per hour (email and SMS separately), 60 s minimum between codes to one address, verify attempts per hour per IP, code expiry 10 minutes. Proposed: SMS 30/hour project-wide during testing, raised at launch.
- Indian mobile numbers only (`+91`, 10 digits starting 6–9): stops SMS-pumping to premium foreign numbers.
- Honeypot field (same as the early-access form); the server answers bots with a fake "code sent".
- A 60 s resend cooldown in the UI mirrors the server limit.
- **Known limit:** the server calls Supabase, so Supabase's per-IP limits see one IP for all users. A per-browser counter (`sf_code_tries`, httpOnly, 5 wrong codes per code sent) adds friction but can be cleared. Before launch, set Supabase's per-address limits tight and add the CAPTCHA (O5).
- Optional before launch (O5): Cloudflare Turnstile through Supabase's CAPTCHA setting. Needs a site key in the client and the secret in Supabase, so it is an env and settings change for approval.
- Twilio Verify fraud guard on (route 1).
- Errors never say whether an email/phone has an account on the sign-up route; sign-in says so (plainer for users; acceptable because sign-up is open anyway). Owner can choose the stricter wording (O6).

## Privacy and consent copy

Sign-up consent (required, unticked): "I'm 21 or older and agree to the privacy note."
Privacy note addition (landing `#privacy`):
> To sign in we keep your phone number or email address and when you last signed in. We use it only to sign you in and, later, for your bookings. We don't share it or send marketing. Codes are sent by our SMS provider [Twilio]. You can delete your account at any time from the account page.

The legal drinking age in Rajasthan is 21; the D11 legal review (age threshold, DPDP) still applies before launch. The consent version is stored as `user_metadata.consent = 'account-v1'` at sign-up (no schema change).

## What needs owner approval

| # | Item | Type |
|---|---|---|
| P1 | Supabase Auth settings: enable email code (edit template to `{{ .Token }}`), enable phone, code length 6, expiry 10 min, rate limits, site URL | Supabase settings |
| P2 | SMS provider account and keys (Twilio Verify recommended), entered by the owner in the Supabase dashboard, never in the repo | Provider, cost, secrets |
| P3 | Test phone numbers and codes in Supabase for end-to-end tests | Supabase settings |
| P4 | Custom SMTP sender for email codes (before launch; testing works on the built-in sender to team addresses) | Provider, secrets |
| P5 | Account deletion: needs the service-role key in the server env (`SUPABASE_SERVICE_ROLE_KEY`) or a `security definer` function `delete_my_account()` via migration | Env or migration |
| P6 | Optional Turnstile CAPTCHA (site key env + Supabase secret) | Env, settings |

No migration, new table, dependency or env change is needed for A0–A3.

## Open decisions

- **O1** What accounts unlock now: nothing (recommended), Party Planner cloud save (reverses 2026-10-12), or Find My Drink favourites.
- **O2** Which method is default on the screens: phone (recommended, matches the booking decision) or email.
- **O3** SMS provider: Twilio Verify now (recommended), or MSG91 with own DLT registration.
- **O4** Account deletion in this checkpoint (P5) or later with bookings.
- **O5** CAPTCHA now or before launch.
- **O6** Sign-in tells "no account found" (recommended) or stays vague.
- **O7** Base branch: `main`, or on top of `socifer/launch-form-copy` (PR #7).

## Checkpoints

| # | Work | Done when |
|---|---|---|
| A0 | Owner approves this plan and P1–P3 are set in Supabase | Owner confirms settings |
| A1 | `session.ts` DAL, `actions.ts` (send, verify, sign out), input rules in a pure module with a node check script | `tsc`, build, script passes with mocked fetch |
| A2 | Sign-in, sign-up, code entry screens; header account state; `/account` page | Screens match Black Tie; AA checks; keyboard flow |
| A3 | End to end on test numbers / team email against the real project; production-server smoke | Sign up, sign out, sign in by phone and email work; cookies httpOnly; no tokens in client JS |
| A4 | (if approved) account deletion | Deleted user can't sign in; profile row gone via cascade |
| A5 | Privacy copy, progress log, Graphify refresh | Logged in `docs/implementation-progress.md` |
