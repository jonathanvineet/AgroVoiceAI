# Supabase Users Table Migration - Fix Missing Columns

Your Supabase `users` table is missing several columns. This guide will help you update your table schema.

## Quick Fix (Recommended)

### Option 1: Recreate the Table (Clean Start)

If you don't have production data, the easiest fix is to recreate the table:

1. **Go to Supabase Dashboard**
   - Navigate to **SQL Editor**
   - Click **New Query**

2. **Drop and Recreate the Table**
   - Copy and paste the SQL below
   - Click **Run**

```sql
-- Drop existing table (WARNING: This deletes all data!)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create the complete users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  user_name TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user',
  phone TEXT UNIQUE,
  age TEXT,
  user_district TEXT,
  gender TEXT,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  pest_image TEXT,
  chatbot_preference TEXT,
  page_shown BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_id ON public.users(id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_district ON public.users(user_district);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all"
  ON public.users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
```

### Option 2: Add Missing Columns (Keep Existing Data)

If you have existing data you want to keep:

```sql
-- Add missing columns one by one
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_name TEXT UNIQUE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS age TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS user_district TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pest_image TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS chatbot_preference TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS page_shown BOOLEAN DEFAULT false;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_district ON public.users(user_district);

-- Verify RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Verify the Fix

After running the SQL:

1. **Check columns exist:**
   - Go to **Database** → **Tables** → `users`
   - You should see all columns including:
     - `page_shown` ✓
     - `chatbot_preference` ✓
     - `user_district` ✓
     - `phone`, `age`, `gender`, etc.

2. **Test the application:**
   - Go to http://localhost:3000/sign-up
   - Create a new account
   - Complete onboarding (location, preferences)
   - You should **NOT** see the "Could not find the 'pageShown' column" error

## What Changed in the Code

- Fixed `updatePageShown()` to use `page_shown` (snake_case)
- Fixed `getLocation()` to use `user_district` (snake_case)
- All Supabase queries now use proper snake_case column names

## Column Name Mapping

| Prisma Schema | Supabase Table |
|--------------|----------------|
| id | id |
| email | email |
| name | name |
| userName | user_name |
| password | password |
| role | role |
| phone | phone |
| age | age |
| userDistrict | user_district |
| gender | gender |
| emailVerified | email_verified |
| image | image |
| pestImage | pest_image |
| chatbotPreference | chatbot_preference |
| pageShown | page_shown |
| createdAt | created_at |
| updatedAt | updated_at |

## Troubleshooting

### Error: "relation 'public.users' does not exist"
- The table doesn't exist. Use **Option 1** to create it.

### Error: "Could not find the 'pageShown' column"
- Run **Option 2** to add missing columns.

### Error: "Cannot insert due to RLS policy"
- Make sure you have the correct RLS policies. Run the policy creation SQL from Option 1.

## Need Help?

Check these files for more information:
- [SUPABASE_TABLE_SETUP.md](./SUPABASE_TABLE_SETUP.md) - Complete table setup guide
- [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) - Authentication setup
- [MIGRATION_TO_SUPABASE.md](./MIGRATION_TO_SUPABASE.md) - Migration notes
