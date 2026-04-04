-- Fraudchills PostgreSQL schema (NextAuth + app tables; single `users` store)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  email text UNIQUE,
  "emailVerified" timestamptz,
  image text,
  password text,
  role text DEFAULT 'CUSTOMER',
  credibility_score float8 DEFAULT 50.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "sessionToken" text UNIQUE NOT NULL,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier text NOT NULL,
  token text UNIQUE NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  logo_url text,
  website text,
  is_verified boolean DEFAULT false,
  claimed_by uuid REFERENCES users(id),
  gst_number text,
  verification_doc_url text,
  resolution_score float8 DEFAULT 0.0,
  avg_response_time float8 DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number text UNIQUE NOT NULL,
  type text NOT NULL,
  details text NOT NULL,
  status text DEFAULT 'PENDING',
  platform text,
  order_id text,
  amount float8 DEFAULT 0.0,
  brand_name text NOT NULL,
  brand_id uuid REFERENCES brands(id),
  score float8 DEFAULT 0.0,
  deadline timestamptz,
  proof_urls text[],
  external_links text[],
  image_url text,
  user_id uuid NOT NULL REFERENCES users(id),
  upvotes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaint_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, complaint_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  complaint_id uuid UNIQUE NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS known_fraudulent_brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text UNIQUE NOT NULL,
  name text,
  source text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
