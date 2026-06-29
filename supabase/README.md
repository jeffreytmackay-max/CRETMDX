# Cloud backend setup (Supabase)

This connects CRETMDX to a free Supabase project so your portfolio lives in the
cloud with **sign-in** and **live sync across every device**. One person does
this once; everyone else just signs in.

## 1. Create the project
1. Go to <https://supabase.com> and sign up (free).
2. Click **New project**. Pick a name (e.g. `cretmdx`), set a strong database
   password, choose the region closest to you, and create it. Wait ~2 minutes.

## 2. Create the tables and security rules
1. In your project, open **SQL Editor → New query**.
2. Open [`schema.sql`](./schema.sql) from this repo, copy the whole file, paste
   it in, and click **Run**. You should see "Success". (Safe to re-run.)

## 3. Control who can sign up
Real lease/financial data should not be open to the public.
- Open **Authentication → Providers → Email** and make sure email is enabled.
- To keep it private, open **Authentication → Sign In / Providers** (or
  **Settings**) and **disable open sign-ups** once your own accounts exist, or
  leave **"Confirm email"** on so only people with a real inbox you approve can
  finish signing up. You can also invite users directly under
  **Authentication → Users → Add user**.

## 4. Connect the app
1. In Supabase, open **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon / public** key (a long `eyJ...` string)
2. Open the app → **Settings → Cloud Backend & Live Sync**.
3. Paste both values and click **Connect**. The app reloads and shows a
   **sign-in** screen.
4. Create your account (or sign in). You're now on the cloud backend.

> The anon key is meant to live in the app — it only allows what the security
> rules permit, and those require a signed-in user. Do **not** paste the
> `service_role` key anywhere.

## 5. Move your existing portfolio up
On the **one device that already has your real portfolio** (e.g. the 30
TransMedics sites):

1. Sign in, go to **Settings → Cloud Backend & Live Sync**.
2. Click **Upload this browser's data to the cloud**.
3. Reload. Every signed-in device now sees the same data.

Do this only once — running it again would create duplicates.

## Making every device auto-connect (optional, recommended)
So new devices only need to sign in (no pasting the URL/key), bake the values
into the hosted build as environment variables:

- `VITE_SUPABASE_URL` = your Project URL
- `VITE_SUPABASE_ANON_KEY` = your anon/public key

In GitHub: **repo → Settings → Secrets and variables → Actions → Variables**,
add those two. The deploy workflow passes them into the build automatically. Ask
and I'll wire any remaining piece.

## Notes
- **Attachments (lease PDFs)** are still stored per-device in this version; the
  structured portfolio data (properties, leases, transactions) is what syncs.
  Ask if you'd like PDF files moved to cloud storage too.
- Disconnecting a device (**Settings → Disconnect this device**) only detaches
  that browser; it never deletes cloud data.
