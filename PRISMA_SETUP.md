# Prisma Setup Guide - University Selection Platform

This project uses **Prisma 7+** with PostgreSQL, following the same setup pattern as the issue-tracker template.

---

## Step 1: Install Required Packages

```bash
npm install
```

This installs all dependencies including:
- `prisma` (dev)
- `@prisma/client`
- `@prisma/adapter-pg`
- `pg`
- `dotenv` (dev)

---

## Step 2: Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

**Example (local PostgreSQL):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/university_platform?schema=public"
```

**Example (with SSL):**
```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public&sslmode=require"
```

---

## Step 3: Create the Initial Migration

```bash
npx prisma migrate dev --name init
```

This creates the `prisma/migrations` folder and applies the Student + PlatformAdmin tables.

---

## Step 4: Generate Prisma Client

```bash
npx prisma generate
```

This generates the Prisma client based on your schema. With Prisma 7, this also uses the `prisma.config.ts` for datasource configuration.

---

## Step 5: Run the Dev Server and Test

```bash
npm run dev
```

Then open (or use curl):

```
http://localhost:3000/api/test
```

**Expected response (success):**
```json
{"ok": true, "count": 0}
```

**Expected response (connection error):**
```json
{"ok": false, "error": "..."}
```

---

## Verification Checklist

1. **Database connection:** `GET /api/test` returns `{"ok": true, "count": N}` (N = number of students, 0 initially)
2. **Prisma Studio (optional):** `npx prisma studio` to inspect data in the browser
3. **Migrations:** `prisma/migrations` folder exists with at least one migration

---

## Files Created (Issue-Tracker Pattern)

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Datasource, generator, Student + PlatformAdmin models |
| `prisma/client.ts` | Singleton Prisma client with pg adapter |
| `prisma.config.ts` | Prisma 7 config (schema path, migrations path, DATABASE_URL) |
| `app/api/test/route.ts` | Test endpoint that counts Student records |

---

## Important Notes

- **Use `npm run dev`** (not pnpm) as specified
- **No Issue model or Status enum** — only Student and PlatformAdmin
- The shared Prisma client is at `@/prisma/client`; import it instead of `new PrismaClient()` in API routes for correct adapter usage
- **Existing routes:** The `app/api/auth/login` and `app/api/admin/moe-sync` routes reference `isActive` and `MoESyncLog`, which were removed per spec. Update them to use `import prisma from '@/prisma/client'` and adapt logic to the new schema (Student without isActive, no MoESyncLog).
