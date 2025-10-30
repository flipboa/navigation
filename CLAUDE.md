# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI工具目录 (AI Tools Directory) is a full-stack Next.js 15 application for discovering and sharing AI tools. It's built with TypeScript, uses Supabase for backend services (PostgreSQL database + authentication), and features a modern UI with Radix UI components and Tailwind CSS.

**Key Technologies:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Supabase (PostgreSQL + Auth)
- Radix UI + Tailwind CSS
- React Hook Form + Zod

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (runs on http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Database Setup

The database schema consists of 5 core tables. Execute SQL scripts in this order in the Supabase SQL Editor:

```bash
# Execute these in Supabase SQL Editor in order:
1. database/profiles.sql       # User profiles table
2. database/categories.sql     # Tool categories table
3. database/tools.sql          # AI tools table
4. database/submissions.sql    # User submission records
5. database/storage.sql        # Storage buckets configuration
6. database/init-missing-functions.sql  # Required database functions
```

**Important Database Functions:**
- `upsert_profile(user_id, user_email, user_nickname, user_role)` - Create/update user profiles
- `get_user_profile(user_id)` - Get user profile by ID
- `is_nickname_available(check_nickname, exclude_user_id)` - Check nickname availability
- `increment_tool_view_count(tool_id)` - Increment tool view counter
- `increment_tool_click_count(tool_id)` - Increment tool click counter

## Architecture

### Supabase Client Patterns

The project uses three different Supabase client configurations:

1. **Client-side** (`@/lib/supabase/client.ts`): For client components and browser operations
   ```typescript
   import { createClient } from '@/lib/supabase/client'
   const supabase = createClient()
   ```

2. **Server-side** (`@/lib/supabase/server.ts`): For Server Components and API routes
   ```typescript
   import { createClient } from '@/lib/supabase/server'
   const supabase = await createClient()
   ```

3. **Middleware** (`@/lib/supabase/middleware.ts`): For authentication middleware
   - Used in `middleware.ts` for session management
   - Public routes: `/`, `/login`, `/signup`, `/tool/*`
   - Protected routes require authentication

### Database Service Pattern

Database operations are organized in service modules under `lib/services/`:

- `lib/services/profiles.ts` - User profile operations
- `lib/services/categories.ts` - Category operations
- `lib/services/tools.ts` - Tool CRUD operations
- `lib/services/admin.ts` - Admin-specific operations

**Important Pattern**: Service functions include fallback to static data (`lib/data.ts`) if database queries fail, ensuring the app remains functional during development or database issues.

### Data Flow

```
User Action → Service Function → Supabase RPC/Query → Database
                ↓ (if error)
            Fallback to lib/data.ts (static data)
```

### TypeScript Interfaces

Each service module defines:
1. **Database interface** - Matches database schema exactly (e.g., `Tool`)
2. **UI interface** - Simplified version for components (e.g., `ToolForUI`)
3. **Parameter interfaces** - For function inputs (e.g., `UpsertProfileParams`)

### Authentication Flow

1. User signs up/logs in → Supabase Auth creates user in `auth.users`
2. Profile auto-created in `profiles` table via trigger or manual `upsertProfile()`
3. Session managed via cookies (handled by middleware)
4. Row Level Security (RLS) enforces permissions

**User Roles:**
- `user` - Can submit tools, view own submissions
- `reviewer` - Can review submissions
- `admin` - Full access (managed via `database/set-admin-user.sql`)

### File Upload Pattern

Storage buckets (configured in `database/storage.sql`):
- `category-icons` - Category icons (2MB limit)
- `tool-logos` - Tool logos (5MB limit)
- `tool-previews` - Tool screenshots (10MB limit)

All buckets have RLS policies for secure access.

## Project Structure

```
app/
├── page.tsx                    # Home page (tool listings)
├── layout.tsx                  # Root layout with providers
├── loading.tsx                 # Global loading state
├── login/page.tsx              # Login page
├── signup/page.tsx             # Registration page
├── tool/[slug]/page.tsx        # Tool detail page (dynamic route)
├── user/                       # User dashboard (protected)
│   ├── layout.tsx              # User section layout
│   ├── UserLayoutClient.tsx    # Client-side layout logic
│   ├── profile/page.tsx        # User profile management
│   ├── submit/page.tsx         # Tool submission form
│   └── submissions/page.tsx    # User's submission history
└── admin/                      # Admin panel (protected)
    └── page.tsx                # Admin dashboard

components/
├── ui/                         # Radix UI components (30+ components)
├── auth-provider.tsx           # Authentication context
├── category-sidebar.tsx        # Category navigation
├── file-uploader.tsx           # File upload component
├── header.tsx                  # Site header/navigation
├── theme-provider.tsx          # Dark mode support
└── tool-card.tsx               # Tool display card

lib/
├── supabase/                   # Supabase client configs
│   ├── client.ts               # Browser client
│   ├── server.ts               # Server client
│   └── middleware.ts           # Auth middleware
├── services/                   # Database service layer
│   ├── profiles.ts             # User profile operations
│   ├── categories.ts           # Category operations
│   ├── tools.ts                # Tool operations
│   └── admin.ts                # Admin operations
├── data.ts                     # Static/fallback data
└── utils.ts                    # Utility functions (cn, clsx)
```

## Key Conventions

### Path Aliases

Configure in `tsconfig.json`:
- `@/*` maps to project root
- Always use `@/` imports: `import { createClient } from '@/lib/supabase/client'`

### Component Naming

- React components: PascalCase (`ToolCard.tsx`, `CategorySidebar.tsx`)
- Files: kebab-case for routes (`tool-card.tsx`)
- Server components by default (no `'use client'` unless needed)

### Database Naming

- Tables: plural snake_case (`tools`, `categories`, `submissions`)
- Columns: snake_case (`logo_url`, `created_at`, `is_hot`)
- Foreign keys: `{table}_id` pattern (`category_id`, `submitted_by`)
- Enums: lowercase with underscores (`tool_status`, `tool_type`)

### TypeScript Patterns

**Always define types for:**
- Database query results
- Component props
- API responses
- Form data (use Zod schemas)

**Example:**
```typescript
// Database type
export interface Tool {
  id: string
  name: string
  slug: string
  // ... matches database exactly
}

// UI type (simplified)
export interface ToolForUI {
  id: string
  name: string
  logo: string  // mapped from logo_url
}
```

### Error Handling

Service functions follow this pattern:
```typescript
try {
  const { data, error } = await supabase...
  if (error) {
    console.error('Error description:', error)
    // Return fallback data or null
  }
  return data
} catch (error) {
  console.error('Failed operation:', error)
  // Return fallback or null
}
```

## Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` for reference.

## Common Tasks

### Adding a New Tool (Manual)

While the app has a submission form, you can also add tools directly via SQL or Supabase dashboard:

```sql
INSERT INTO tools (name, slug, description, website_url, category_id, status, is_hot, is_new)
VALUES ('Tool Name', 'tool-slug', 'Description', 'https://example.com', 'category-uuid', 'published', false, true);
```

### Creating an Admin User

```bash
# Execute in Supabase SQL Editor
# Edit database/set-admin-user.sql with the user's email
# Then run the script
```

### Adding New Database Functions

If you add new database functions, document them in `database/init-missing-functions.sql` and ensure they're included in setup instructions.

### Modifying RLS Policies

All tables have RLS enabled. When modifying policies:
1. Update the corresponding SQL file in `database/`
2. Test with different user roles
3. Document any permission changes

## UI Component Library (shadcn/ui)

The project uses shadcn/ui (Radix UI + Tailwind). Configuration in `components.json`:

- Style: default
- Base color: neutral
- CSS variables: enabled
- Icon library: lucide-react

**Available components** (30+): button, card, dialog, form, input, select, toast, dropdown-menu, etc.

### Adding New UI Components

```bash
# Example: Add a new shadcn/ui component
npx shadcn-ui@latest add [component-name]
```

### Styling Utilities

Use the `cn()` utility from `lib/utils.ts` to merge Tailwind classes:

```typescript
import { cn } from '@/lib/utils'

<div className={cn("base-class", conditional && "conditional-class", className)} />
```

## Testing

The project includes test scripts:
- `test-registration-final.js` - Tests user registration flow
- `test-login-debug.js` - Tests login functionality
- `test-set-admin.js` - Tests admin user setup

Run with Node.js:
```bash
node test-registration-final.js
```

## Important Notes

### Database Functions Dependency

Many service operations depend on Supabase database functions (RPC). If you see errors like:
- "function does not exist"
- "PGRST202" error code

Run `database/init-missing-functions.sql` to create missing functions.

### Static Data Fallback

The app uses static data from `lib/data.ts` as fallback when database queries fail. This ensures the UI remains functional during development. In production, ensure all database tables are properly seeded.

### Next.js 15 Patterns

- Uses App Router (not Pages Router)
- Server Components by default
- Client Components marked with `'use client'`
- Async Server Components supported
- `cookies()` must be awaited in Next.js 15

### Row Level Security (RLS)

All database tables have RLS enabled. Common policies:
- Public read for published content
- Authenticated users can insert
- Users can only update/delete their own records
- Admins bypass most restrictions

When querying from client-side, ensure the user has proper permissions or queries will fail silently.

## Debugging Tips

### Authentication Issues

Check:
1. Supabase env vars are correct
2. Middleware is properly configured
3. User session exists (`supabase.auth.getUser()`)
4. RLS policies allow the operation

### Database Query Failures

1. Check Supabase logs in dashboard
2. Verify table/function exists
3. Test query in SQL Editor
4. Check RLS policies
5. Ensure user is authenticated for protected queries

### Build/Type Errors

```bash
# Check TypeScript errors
npx tsc --noEmit

# Clear Next.js cache
rm -rf .next
pnpm dev
```
