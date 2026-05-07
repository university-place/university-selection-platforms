# Quick Start Guide - MOE Student Authentication System

Get the system running in 5 minutes!

## Prerequisites
- PostgreSQL running
- Node.js 18+ installed
- npm/pnpm available

## Step 1: Setup Database Connection

```bash
# Create .env.local file
echo "DATABASE_URL=postgresql://user:password@localhost:5432/university_placement" > .env.local
```

Replace `user`, `password`, and database name as needed.

## Step 2: Install & Initialize Prisma

```bash
# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
```

## Step 3: Start the Server

```bash
npm run dev
```

Server runs at: `http://localhost:3000`

## Step 4: Test the System

### Option A: Using Postman (Recommended)

1. **Import Collection**
   - Open Postman
   - File → Import
   - Select `postman_collection.json`

2. **Upload Sample Data**
   - Run: "Upload MOE Data - CSV"
   - Response should show: 5 added records

3. **Test Login**
   - Run: "Login - Success"
   - Should return student data for EXM-2024-001

### Option B: Using curl

**Upload Data:**
```bash
curl -X POST http://localhost:3000/api/admin/moe-sync \
  -F "file=@sample-data/moe_students_v1.csv" \
  -F "dataVersion=v1-2024-02-22"
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "examID": "EXM-2024-001",
    "dateOfBirth": "2004-05-15"
  }'
```

## What's Working

✅ MOE Data Upload (CSV & JSON)
✅ Student Database Storage
✅ Sync History Tracking
✅ Student Login Authentication
✅ Error Handling & Validation
✅ Date of Birth Verification

## Sample Test Credentials

After uploading data, use any of these to login:

| Exam ID | Date of Birth | Name |
|---------|---------------|------|
| EXM-2024-001 | 2004-05-15 | Abebe Kebede |
| EXM-2024-002 | 2003-08-22 | Almaz Getnet |
| EXM-2024-003 | 2005-02-10 | Habtamu Tadesse |
| EXM-2024-004 | 2004-11-30 | Letehiwot Misganaw |
| EXM-2024-005 | 2003-03-14 | Senayit Wolde |

## File Locations

- **API Routes**: `/app/api/`
- **Database Schema**: `/prisma/schema.prisma`
- **Sample Data**: `/sample-data/`
- **Postman Collection**: `/postman_collection.json`
- **Full Documentation**: `/MOE_AUTHENTICATION_README.md`
- **Testing Guide**: `/TESTING_GUIDE.md`

## Common Issues

**Issue**: Database connection error
```
Solution: Check .env.local file, verify PostgreSQL is running
```

**Issue**: "relation Student does not exist"
```
Solution: Run: npx prisma migrate dev --name init
```

**Issue**: File upload fails
```
Solution: Ensure CSV has correct headers, dates are YYYY-MM-DD format
```

## Next Steps

1. ✅ Test both APIs with sample data
2. 📖 Read `MOE_AUTHENTICATION_README.md` for full details
3. 🧪 Review `TESTING_GUIDE.md` for comprehensive test cases
4. 🔒 Add authentication & security for production
5. 🚀 Deploy when ready

## Project Defense Points

### Key Implementation Features:
1. **MOE Integration** - Scheduled data sync from Ministry of Education
2. **Student Verification** - Multi-field validation (Exam ID + Date of Birth)
3. **Data Audit Trail** - Complete sync history with statistics
4. **Error Handling** - Comprehensive validation and error messages
5. **Database Design** - Optimized schema with indexes

### Architecture Highlights:
- RESTful API design
- Separation of concerns (sync vs auth)
- Scalable with indexed queries
- Comprehensive error responses
- Full transaction support

### Testing Coverage:
- Success scenarios
- Error cases (400, 401, 403, 500)
- Partial failure handling
- Data integrity validation

## Help & Documentation

- **Quick Issues**: Check this file
- **Testing Help**: See `TESTING_GUIDE.md`
- **Full Details**: See `MOE_AUTHENTICATION_README.md`
- **API Testing**: Import `postman_collection.json`

---

**You're all set! Start with Step 1 and work through to Step 4.** 🚀
