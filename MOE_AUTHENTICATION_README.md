# MOE Student Authentication System

A complete backend implementation for student authentication using Ministry of Education (MOE) verified data in an Ethiopian university placement platform.

## Overview

This system implements two main features:
1. **MOE Data Synchronization** - Import and manage student data from MOE via CSV/JSON files
2. **Student Authentication** - Verify students against synced MOE data using Exam ID and Date of Birth

## Architecture

### Database Schema

```
Student Table:
- id: Unique identifier
- examID: National exam ID (unique)
- dateOfBirth: Student's date of birth
- studentNationalID: National ID number (unique)
- firstName, lastName: Student name
- email, phone, region: Contact information
- examResults: JSON field for exam scores
- dataVersion: Tracks which MOE sync version this came from
- lastSyncedAt: When record was last updated
- isActive: Boolean to mark inactive/deactivated students
- createdAt, updatedAt: Timestamps

MoESyncLog Table:
- Logs all data synchronization operations
- Tracks statistics: added, updated, unchanged records
- Maintains audit trail for compliance
```

## Features

### 1. MOE Data Synchronization (`/api/admin/moe-sync`)

**Purpose**: Import and update student database from MOE

**HTTP Method**: POST

**Request Body** (multipart/form-data):
- `file`: CSV or JSON file with student data
- `dataVersion`: (Optional) Version identifier for the data

**Features**:
- Supports both CSV and JSON formats
- Validates required fields (examID, dateOfBirth, studentNationalID)
- Updates existing students if data changed
- Creates new student records
- Deactivates students not in new file
- Prevents duplicate version imports
- Comprehensive error reporting

**Response**:
```json
{
  "success": true,
  "message": "MOE data synchronized successfully",
  "summary": {
    "totalRecords": 100,
    "addedRecords": 85,
    "updatedRecords": 10,
    "unchangedRecords": 5,
    "deactivatedRecords": 0
  },
  "dataVersion": "v1-2024-02-22"
}
```

**Error Handling**:
- Validates file format and structure
- Reports specific row errors with details
- Partial success status (207) if some records fail
- Complete failure (400/500) with explanations

### 2. Student Authentication (`/api/auth/login`)

**Purpose**: Authenticate students against MOE data

**HTTP Method**: POST

**Request Body** (JSON):
```json
{
  "examID": "EXM-2024-001",
  "dateOfBirth": "2004-05-15"
}
```

**Authentication Process**:
1. Validates input fields and date format
2. Searches database for exam ID
3. Verifies date of birth matches exactly
4. Confirms student is active
5. Returns student information on success

**Success Response** (200):
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

**Error Cases**:
- Missing fields (400)
- Invalid date format (400)
- Student not found (401)
- Incorrect date of birth (401)
- Student deactivated (403)
- Server error (500)

## Installation & Setup

### Prerequisites
- Node.js 18+ (with pnpm)
- PostgreSQL database
- Postman (for testing)

### Steps

1. **Install Dependencies**
```bash
pnpm install
```

2. **Set Up Environment**
```bash
# Create .env.local file
echo "DATABASE_URL=postgresql://user:password@localhost:5432/university_placement" > .env.local
```

3. **Initialize Prisma**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. **Start Development Server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## File Structure

```
/app
  /api
    /admin
      /moe-sync
        route.ts          # MOE data sync endpoint
    /auth
      /login
        route.ts          # Student login endpoint

/prisma
  schema.prisma           # Database schema definition

/sample-data
  moe_students_v1.csv     # Sample CSV data
  moe_students_v1.json    # Sample JSON data

TESTING_GUIDE.md          # Complete testing documentation
MOE_AUTHENTICATION_README.md  # This file
```

## API Endpoints

### MOE Data Synchronization

**POST `/api/admin/moe-sync`** - Upload MOE data file
- Content-Type: multipart/form-data
- Returns: Sync summary and statistics
- Errors: 400, 409 (duplicate version), 500

**GET `/api/admin/moe-sync`** - Retrieve sync history
- Returns: Last 10 sync operations
- Errors: 500

### Student Authentication

**POST `/api/auth/login`** - Authenticate student
- Content-Type: application/json
- Required: examID, dateOfBirth (YYYY-MM-DD)
- Returns: Student data if successful
- Errors: 400, 401, 403, 500

## Testing

### Quick Test with Sample Data

1. **Start the server**:
```bash
npm run dev
```

2. **Upload sample data**:
   - Use Postman to POST to `/api/admin/moe-sync`
   - Upload `sample-data/moe_students_v1.csv`
   - Set dataVersion to `v1-2024-02-22`

3. **Test login**:
   - POST to `/api/auth/login` with:
   ```json
   {
     "examID": "EXM-2024-001",
     "dateOfBirth": "2004-05-15"
   }
   ```

See `TESTING_GUIDE.md` for comprehensive testing documentation.

## Key Features Explained

### Data Version Tracking
- Each sync is assigned a version identifier
- Prevents duplicate imports
- Allows rollback capability
- Maintains audit trail

### Student Activation Status
- New students are activated by default
- Students not in updated file are deactivated
- Deactivated students cannot login
- Helps identify stale records

### Exam Results Storage
- Stores exam results as JSON
- Flexible schema for multiple subjects
- Easy to extend without schema changes

### Error Recovery
- Partial success continues processing
- Detailed error messages per row
- Allows data inspection and correction

## Security Considerations

### Current Implementation (Development)
- No authentication on admin endpoints
- Basic input validation

### Production Recommendations
1. **Admin Endpoint Security**
   - Implement JWT authentication
   - Add role-based access control
   - Require admin verification

2. **Login Security**
   - Add rate limiting (prevent brute force)
   - Hash sensitive data before storage
   - Implement session management
   - Use HTTPS only

3. **Data Protection**
   - Encrypt sensitive fields (national ID)
   - Implement field-level encryption
   - Add audit logging for all access
   - Regular security audits

4. **Input Validation**
   - Use Zod or similar schema validation
   - Sanitize all inputs
   - Validate file sizes
   - Check for injection attacks

## Database Optimization

### Current Indexes
- examID on Student table (unique)
- studentNationalID on Student table (unique)
- dataVersion on MoESyncLog table

### Recommended for Production
```sql
CREATE INDEX idx_student_dob ON "Student"("dateOfBirth");
CREATE INDEX idx_student_active ON "Student"("isActive");
CREATE INDEX idx_synlog_status ON "MoESyncLog"("syncStatus");
```

## Troubleshooting

### Common Issues

**Error: "relation Student does not exist"**
- Solution: Run `npx prisma migrate dev`

**File upload fails with 400**
- Ensure CSV headers match expected field names
- Check date format is YYYY-MM-DD
- Verify file is valid CSV or JSON

**Login returns 500**
- Check database connection
- Verify student record exists
- Check Prisma client generation

## Performance Notes

- CSV parsing uses papaparse library for reliability
- Database queries use indexed fields
- Efficient bulk updates with Prisma
- Stateless API design for scalability

## Future Enhancements

1. **Batch Processing**
   - Handle large files asynchronously
   - Queue system for multiple uploads
   - Progress tracking

2. **Advanced Features**
   - Student password reset
   - Email verification
   - Two-factor authentication
   - Session management

3. **Analytics**
   - Login attempt tracking
   - Student demographic reports
   - Sync performance metrics

4. **Integration**
   - Webhook notifications
   - Real-time data validation
   - External university system integration

## Dependencies

- **@prisma/client**: ^5.0.0 - Database ORM
- **papaparse**: ^5.4.1 - CSV parsing library
- **next**: 16.1.6 - Framework

## Support

For issues or questions:
1. Check TESTING_GUIDE.md for common test cases
2. Review error messages in response
3. Check database schema with: `npx prisma studio`
4. Review logs in browser console and server output

## License

For Bahir Dar University - Industrial Project

---

**Last Updated**: February 2024
**Version**: 1.0.0
