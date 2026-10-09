# Portech Portfolio Studio

A responsive portfolio builder with three live preview designs and Supabase cloud storage. Each signed-in user can create, retrieve, edit, and delete their own portfolio; profile photos are stored in Supabase Storage.

## Run locally

Serve this directory over HTTP (ES modules do not work reliably from a `file://` URL):

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Configure Supabase

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the `portfolios` table, enables row-level security, and creates the `profile-photos` bucket with per-user upload policies.
3. Copy your project URL and publishable/anon key from the Supabase project API settings into [`config.js`](config.js).
4. In Supabase Authentication settings, configure the site URL and allowed redirect URLs for both local development and your deployed site. Enable email confirmations if desired.
5. Publish this static site to any HTTPS web host. The browser uses only the publishable/anon key; never put a service-role key in `config.js`.

The project URL and anon key are browser-visible by design. Row Level Security policies in the supplied SQL limit portfolio operations to the authenticated owner. Keep the SQL policies enabled in production. Profile photos use a public-read storage bucket so generated portfolios can display them; do not upload sensitive images.

## Portfolio fields

Full name, profile photo, email, contact number, address, biography, education, skills, projects, work experience, social links, and one of three templates: Simple, Modern, or Creative. The editor updates the preview as you type. Project lines use `name | description | optional URL`; experience lines use `role | dates | description`; social links use `label | URL`.