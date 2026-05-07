# MOE Student Authentication System - Testing Guide

This guide explains how to test the MOE Data Synchronization and Student Authentication APIs using Postman.

## Prerequisites

1. PostgreSQL database is running
2. Prisma is set up and migrations are applied
3. Next.js dev server is running (`npm run dev`)
4. Postman is installed

## Setup Steps

### 1. Initialize Prisma Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 2. Start the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

---

## FEATURE 1: MOE Data Synchronization

### Endpoint
- **URL**: `http://localhost:3000/api/admin/moe-sync`
- **Method**: `POST`
- **Authentication**: None (for testing - add authentication in production)

### Request Format

Use `multipart/form-data` with:
- **file**: CSV or JSON file containing student data
- **dataVersion**: (Optional) Version identifier. If not provided, current ISO timestamp is used.

### Sample CSV File Format

Create a file named `moe_students_v1.csv`:

```csv
examID,dateOfBirth,studentNationalID,firstName,lastName,email,phone,region,examResults
EXM-2024-001,2004-05-15,1234567890123,Abebe,Kebede,abebe.kebede@example.com,+251911222333,Addis Ababa,"{""mathematics"":85,""english"":78}"
EXM-2024-002,2003-08-22,1234567890124,Almaz,Getnet,almaz.getnet@example.com,+251921333444,Dire Dawa,"{""mathematics"":92,""english"":88}"
EXM-2024-003,2005-02-10,1234567890125,Habtamu,Tadesse,habtamu.tadesse@example.com,+251931444555,Bahir Dar,"{""mathematics"":76,""english"":82}"
EXM-2024-004,2004-11-30,1234567890126,Letehiwot,Misganaw,letehiwot.misganaw@example.com,+251941555666,Adama,"{""mathematics"":88,""english"":85}"
EXM-2024-005,2003-03-14,1234567890127,Senayit,Wolde,senayit.wolde@example.com,+251951666777,Hawassa,"{""mathematics"":79,""english"":81}"
```

### Sample JSON File Format

Create a file named `moe_students_v1.json`:

```json
[
  {
    "examID": "EXM-2024-001",
    "dateOfBirth": "2004-05-15",
    "studentNationalID": "1234567890123",
    "firstName": "Abebe",
    "lastName": "Kebede",
    "email": "abebe.kebede@example.com",
    "phone": "+251911222333",
    "region": "Addis Ababa",
    "examResults": "{\"mathematics\": 85, \"english\": 78}"
  },
  {
    "examID": "EXM-2024-002",
    "dateOfBirth": "2003-08-22",
    "studentNationalID": "1234567890124",
    "firstName": "Almaz",
    "lastName": "Getnet",
    "email": "almaz.getnet@example.com",
    "phone": "+251921333444",
    "region": "Dire Dawa",
    "examResults": "{\"mathematics\": 92, \"english\": 88}"
  }
]
```

### Testing in Postman

#### Step 1: Upload MOE Data

1. **Create a new POST request**
   - URL: `http://localhost:3000/api/admin/moe-sync`
   - Method: POST

2. **Set up the body**
   - Select `Body` tab
   - Choose `form-data`
   - Add fields:
     - Key: `file`, Type: `File`, Value: Select your CSV or JSON file
     - Key: `dataVersion`, Type: `Text`, Value: `v1-2024-02-22` (or any version identifier)

3. **Send the request**

#### Expected Success Response (200)

```json
{
  "success": true,
  "message": "MOE data synchronized successfully",
  "summary": {
    "totalRecords": 5,
    "addedRecords": 5,
    "updatedRecords": 0,
    "unchangedRecords": 0,
    "deactivatedRecords": 0
  },
  "dataVersion": "v1-2024-02-22"
}
```

#### Expected Partial Response (207 - Some errors)

```json
{
  "success": false,
  "message": "MOE data synchronized with some errors",
  "summary": {
    "totalRecords": 5,
    "addedRecords": 4,
    "updatedRecords": 0,
    "unchangedRecords": 0,
    "deactivatedRecords": 0
  },
  "dataVersion": "v1-2024-02-22",
  "errors": [
    {
      "rowIndex": 3,
      "error": "Missing required fields: examID, dateOfBirth, studentNationalID"
    }
  ]
}
```

#### Expected Error Response (400)

```json
{
  "success": false,
  "message": "No file provided. Please upload a CSV or JSON file.",
  "summary": {
    "totalRecords": 0,
    "addedRecords": 0,
    "updatedRecords": 0,
    "unchangedRecords": 0,
    "deactivatedRecords": 0
  },
  "dataVersion": ""
}
```

### Viewing Sync History

#### Step 1: Get recent syncs

1. **Create a new GET request**
   - URL: `http://localhost:3000/api/admin/moe-sync`
   - Method: GET

2. **Send the request**

#### Expected Response

```json
{
  "success": true,
  "message": "Retrieved recent MOE sync logs",
  "data": [
    {
      "id": 1,
      "dataVersion": "v1-2024-02-22",
      "fileName": "moe_students_v1.csv",
      "totalRecords": 5,
      "addedRecords": 5,
      "updatedRecords": 0,
      "unchangedRecords": 0,
      "deactivatedRecords": 0,
      "syncStatus": "success",
      "syncMessage": "All records synced successfully",
      "syncedAt": "2024-02-22T10:30:45.123Z",
      "createdAt": "2024-02-22T10:30:45.123Z"
    }
  ]
}
```

---

## FEATURE 2: Student Authentication

### Endpoint
- **URL**: `http://localhost:3000/api/auth/login`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Format

```json
{
  "examID": "EXM-2024-001",
  "dateOfBirth": "2004-05-15"
}
```

### Testing in Postman

#### Step 1: Successful Login

1. **Create a new POST request**
   - URL: `http://localhost:3000/api/auth/login`
   - Method: POST

2. **Set up headers**
   - Content-Type: application/json

3. **Set up the body**
   - Select `raw` format
   - Choose `JSON` from dropdown
   - Paste request body:

```json
{
  "examID": "EXM-2024-001",
  "dateOfBirth": "2004-05-15"
}
```

4. **Send the request**

#### Expected Success Response (200)

```json
{
  "success": true,
  "message": "Authentication successful.",
  "data": {
    "studentId": 1,
    "examID": "EXM-2024-001",
    "firstName": "Abebe",
    "lastName": "Kebede",
    "email": "abebe.kebede@example.com",
    "phone": "+251911222333",
    "region": "Addis Ababa",
    "dateOfBirth": "2004-05-15"
  }
}
```

#### Test Case 2: Invalid Exam ID

**Request:**
```json
{
  "examID": "INVALID-ID",
  "dateOfBirth": "2004-05-15"
}
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials. Student not found in MOE database."
}
```

#### Test Case 3: Incorrect Date of Birth

**Request:**
```json
{
  "examID": "EXM-2024-001",
  "dateOfBirth": "2000-01-01"
}
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials. Date of birth does not match our records."
}
```

#### Test Case 4: Missing Fields

**Request:**
```json
{
  "examID": "EXM-2024-001"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields: examID and dateOfBirth are required."
}
```

#### Test Case 5: Invalid Date Format

**Request:**
```json
{
  "examID": "EXM-2024-001",
  "dateOfBirth": "15-05-2004"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid date format. Please use YYYY-MM-DD."
}
```

---

## Complete Postman Workflow

### Step-by-Step Process:

1. **Upload MOE Data**
   - POST to `/api/admin/moe-sync` with CSV/JSON file
   - Verify all 5 students are added

2. **Test Successful Login**
   - POST to `/api/auth/login` with correct credentials
   - Verify student data is returned

3. **Test Invalid Credentials**
   - Test with wrong exam ID
   - Test with wrong date of birth
   - Verify proper error messages

4. **Update MOE Data (Second Sync)**
   - Create updated CSV with some modified records
   - Use different dataVersion (e.g., `v2-2024-02-22`)
   - Verify counts show updated/unchanged records

5. **View Sync History**
   - GET to `/api/admin/moe-sync`
   - Verify both sync operations are logged

---

## SQL Queries for Manual Testing

### Check synced students in database:

```sql
SELECT * FROM "Student" ORDER BY "createdAt" DESC;
```

### Check sync logs:

```sql
SELECT * FROM "MoESyncLog" ORDER BY "syncedAt" DESC;
```

### Check specific student:

```sql
SELECT * FROM "Student" WHERE "examID" = 'EXM-2024-001';
```

### Check deactivated students:

```sql
SELECT * FROM "Student" WHERE "isActive" = false;
```

---

## Troubleshooting

### Issue: "PRISMA_QUERY_MISSING_FIELDS" error

**Solution**: Run `npx prisma generate` to regenerate Prisma client

### Issue: "relation "Student" does not exist"

**Solution**: Run `npx prisma migrate dev --name init` to create tables

### Issue: File upload returns 400

**Solution**: 
- Ensure file is CSV or JSON format
- Check file header column names match schema
- Ensure dates are in YYYY-MM-DD format

### Issue: Login returns 500 error

**Solution**:
- Check Prisma database connection
- Verify student record exists in database
- Check date format is exactly YYYY-MM-DD

---

## Notes for Production

Before going to production:

1. **Add Authentication** to `/api/admin/moe-sync` endpoint (only allow authorized admins)
2. **Add Rate Limiting** to prevent brute force attacks on login
3. **Hash sensitive data** - consider not returning phone numbers or sensitive fields
4. **Use HTTPS only**
5. **Add request validation** using a schema library like Zod
6. **Add audit logging** for all authentication attempts
7. **Implement session management** after successful login
8. **Add CORS** configuration as needed
