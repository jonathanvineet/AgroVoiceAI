# Supabase Users Table Setup

Copy and paste this SQL into your Supabase SQL Editor to create the users table.

## Step-by-Step Instructions

1. Go to your Supabase Project Dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire SQL below and paste it into the editor
5. Click **Run**

## SQL Script

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Allow service role to insert users (for signup)
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.users TO authenticated;
```

## Verify Setup

After running the SQL, verify everything is set up correctly:

1. **Check the table exists:**
   - Navigate to **Database** → **Tables** in the sidebar
   - You should see the `users` table listed

2. **Check Row Level Security is enabled:**
   - Click on the `users` table
   - Go to the **RLS** tab
   - You should see RLS is "Enabled"

3. **Check policies are in place:**
   - You should see 3 policies:
     - "Users can read own data"
     - "Users can update own data"
     - "Service role can insert users"

## Enable Email/Password Auth

1. Go to **Authentication** in the left sidebar
2. Click on **Providers**
3. Find **Email** provider
4. Toggle it **ON**
5. Under "Confirm email" settings, you can choose:
   - **Confirm email** (requires email verification)
   - **Autoconfirm** (no verification needed - good for development)

For development, select **Autoconfirm**. For production, use **Confirm email**.

## Test the Setup

After creating the table and enabling email auth:

1. Navigate to http://localhost:3002/sign-up
2. Create a new account with:
   - Email: test@example.com
   - Password: password123
3. You should see success message
4. Navigate to http://localhost:3002/sign-in
5. Sign in with the same credentials
6. You should be logged in

## Common Issues

### "Relation 'public.users' does not exist"
- The table wasn't created successfully
- Check the SQL for syntax errors
- Make sure you ran the entire SQL script

### "RLS violation" errors
- Make sure RLS policies are correctly configured
- Verify `auth.uid()` is used in policies
- Check that the user ID in the table matches `auth.uid()`

### Can't sign up
- Verify Email/Password auth is enabled
- Check that autoconfirm is enabled (or email verification is set up)
- Check browser console for error messages

### Users can't update their profile
- Make sure the "Users can update own data" policy exists
- Verify the policy uses `auth.uid() = id`

## Next Steps

Once the table is set up:

1. Test sign-up at `/sign-up`
2. Test sign-in at `/sign-in`
3. Test logout from the navbar
4. Build additional features that use the user data

The application is now ready to use Supabase for authentication!

