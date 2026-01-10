# Supabase Authentication Setup Guide

## Overview
The application has been migrated from NextAuth to Supabase for user authentication. This provides a more robust and managed solution for sign-up, sign-in, and user session management.

## Prerequisites

You already have Supabase credentials in your `.env` file:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Schema

Create the following table in your Supabase project:

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

-- Create index on id for faster lookups
CREATE INDEX idx_users_id ON users(id);
```

## How It Works

### Authentication Flow

1. **Sign Up** (`/api/auth/signup`)
   - User provides email and password
   - Supabase Auth creates the user account
   - A user record is created in the `users` table
   - Returns auth session and user data

2. **Sign In** (`/api/auth/signin`)
   - User provides email and password
   - Supabase Auth validates credentials
   - Returns session with JWT token
   - Session is stored in cookies (via SSR)

3. **Session Management**
   - Server-side session is maintained via cookies
   - `createServerSupabaseClient()` handles cookie management
   - Client-side can use `createClient()` for browser operations

4. **Sign Out** (`/api/auth/logout`)
   - Clears the user session
   - Removes authentication cookies
   - Redirects to home page

### Key Files

- **`lib/supabase-server.ts`** - Server-side Supabase client with cookie handling
- **`lib/supabase-client.ts`** - Client-side Supabase client for browser
- **`app/api/auth/signup/route.ts`** - Sign up endpoint
- **`app/api/auth/signin/route.ts`** - Sign in endpoint
- **`app/api/auth/logout/route.ts`** - Sign out endpoint
- **`app/api/auth/session/route.ts`** - Get current session
- **`components/Form/sign-in.tsx`** - Sign in form component
- **`components/Form/sign-up.tsx`** - Sign up form component
- **`app/[locale]/sign-in/page.tsx`** - Sign in page
- **`app/[locale]/sign-up/page.tsx`** - Sign up page

## Features

### Email/Password Authentication
- Users can register with email and password
- Password validation (minimum 6 characters)
- Email validation
- Duplicate account prevention

### Session Persistence
- Sessions are automatically persisted via cookies
- Server-side rendering (SSR) support
- Automatic session refresh

### User Data
- User info stored in `users` table
- Automatic user record creation on sign up
- Email and name stored with user profile

## API Endpoints

### POST `/api/auth/signup`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": { /* Supabase user object */ }
}
```

### POST `/api/auth/signin`
Sign in an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Signed in successfully",
  "user": { /* Supabase user object */ },
  "session": { /* JWT session */ }
}
```

### POST `/api/auth/logout`
Sign out the current user.

**Response (200):**
```json
{
  "message": "Signed out successfully"
}
```

### GET `/api/auth/session`
Get the current user session.

**Response (200):**
```json
{
  "session": { /* JWT session */ }
}
```

## Usage Examples

### Getting User Session (Server Component)

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function MyComponent() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/sign-in')
  }
  
  return <div>Welcome, {session.user.email}</div>
}
```

### Getting User Session (Client Component)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export default function MyComponent() {
  const [user, setUser] = useState(null)
  const supabase = createClient()
  
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    
    getSession()
  }, [])
  
  return <div>Welcome, {user?.email}</div>
}
```

### Making Authenticated Requests

```typescript
// Sign in
const { data, error } = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
})

// Sign out
await fetch('/api/auth/logout', { method: 'POST' })
```

## Removed Dependencies

The following have been removed as they're no longer needed:
- `next-auth` - Replaced with Supabase Auth
- `@auth/prisma-adapter` - Not needed with Supabase

## Environment Variables

Make sure you have these in your `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

1. Navigate to `http://localhost:3002/sign-up`
2. Create a new account with email and password
3. You should be redirected to sign-in page
4. Sign in with your credentials
5. You should be logged in and able to access protected routes

## Security Notes

- All passwords are hashed by Supabase Auth
- Sessions are JWT-based and signed
- Cookies are httpOnly and secure
- Row-level security (RLS) policies protect user data
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client

## Troubleshooting

### Session not persisting
- Clear browser cookies and try again
- Check that cookies are enabled in your browser
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

### Sign up fails
- Check that user doesn't already exist (email must be unique)
- Verify password is at least 6 characters
- Check browser console for detailed error messages

### RLS errors when accessing user data
- Ensure you're using `createServerSupabaseClient()` for authenticated requests
- Verify RLS policies are correctly configured
- Check that `auth.uid()` matches the user ID in the table

