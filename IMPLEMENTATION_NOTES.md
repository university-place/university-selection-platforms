# Implementation Notes - MOE Authentication System

Technical implementation details for developers.

## Architecture Overview

```
Client (Postman/Frontend)
    ↓
Next.js API Routes
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

## File Structure & Purpose

### API Routes

#### `/app/api/admin/moe-sync/route.ts` (321 lines)
**Purpose**: Handle MOE data uploads and synchronization

**Key Functions**:
- `parseCSVFile()` - Parse CSV using papaparse
- `parseJSONFile()` - Parse JSON array
- `POST handler()` - Main sync logic
- `GET handler()` - Retrieve sync history

**Process Flow**:
```
1. Receive multipart form-data with file + dataVersion
2. Validate file type (CSV/JSON)
3. Check if version already exists
4. Parse file to StudentRecord array
5. Iterate through records:
   - Validate required fields
   - Check if student exists
   - Update or create student record
   - Track changes (added/updated/unchanged)
6. Deactivate students not in new file
7. Log sync operation to MoESyncLog
8. Return summary with statistics
```

**Data Transformation**:
```
CSV/JSON File
    ↓
StudentRecord[] (in-memory)
    ↓
Database insert/update operations
    ↓
MoESyncLog entry
```

#### `/app/api/auth/login/route.ts` (149 lines)
**Purpose**: Authenticate students against MOE database

**Key Logic**:
- Input validation (examID, dateOfBirth)
- Date format validation (YYYY-MM-DD)
- Database query using examID as unique key
- Date of birth comparison (day-level precision)
- Active status verification
- Return student info on success

**Authentication Flow**:
```
1. Parse JSON body
2. Validate required fields
3. Validate date format
4. Query Student table by examID
5. If not found → 401 error
6. If found, check isActive
7. If inactive → 403 error
8. Compare dateOfBirth (normalized)
9. If mismatch → 401 error
10. Success → Return student data
```

## Database Schema Decisions

### Student Table
```sql
CREATE TABLE "Student" (
  id INT PRIMARY KEY DEFAULT nextval('Student_id_seq'),
  examID VARCHAR(255) UNIQUE NOT NULL,
  dateOfBirth TIMESTAMP NOT NULL,
  studentNationalID VARCHAR(255) UNIQUE NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(255),
  region VARCHAR(255),
  examResults JSONB,
  dataVersion VARCHAR(255),
  lastSyncedAt TIMESTAMP,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Design Decisions**:
1. **examID as UNIQUE**: Allows fast lookup, prevents duplicates
2. **Composite indexes**: examID, studentNationalID for uniqueness
3. **JSONB for examResults**: Flexible schema, supports multiple subjects
4. **isActive flag**: Soft delete approach instead of hard delete
5. **dataVersion tracking**: Audit trail for each sync

### MoESyncLog Table
```sql
CREATE TABLE "MoESyncLog" (
  id INT PRIMARY KEY DEFAULT nextval('MoESyncLog_id_seq'),
  dataVersion VARCHAR(255) UNIQUE NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  totalRecords INT NOT NULL,
  addedRecords INT NOT NULL,
  updatedRecords INT NOT NULL,
  unchangedRecords INT NOT NULL,
  deactivatedRecords INT NOT NULL,
  syncStatus VARCHAR(255),
  syncMessage TEXT,
  syncedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**:
- Audit trail of all sync operations
- Statistics for reporting
- Duplicate version detection
- Historical analysis

## Error Handling Strategy

### Validation Errors (400)
- Missing required fields
- Invalid file format
- Malformed JSON/CSV
- Invalid date format
- Empty file

### Authentication Errors (401)
- Student not found (examID doesn't exist)
- Date of birth mismatch
- Invalid credentials

### State Errors (403)
- Student account deactivated
- Student marked inactive

### Conflict Errors (409)
- Duplicate data version on sync

### Server Errors (500)
- Database connection issues
- Unexpected exceptions
- File parsing failures

### Partial Success (207)
- Some records processed successfully
- Some records had errors
- Sync continues despite errors

## Date Handling

**Critical Implementation Detail**:
```typescript
// Normalize both dates to YYYY-MM-DD for comparison
const dbDate = student.dateOfBirth.toISOString().split('T')[0];
const requestDate = dateOfBirth.toISOString().split('T')[0];

if (dbDate !== requestDate) {
  // Mismatch error
}
```

**Why this approach**:
- Handles timezone differences
- Compares only date part (ignores time)
- String comparison after normalization
- Reliable across different locales

## CSV Parsing Implementation

Using **papaparse** library:

```typescript
Papa.parse<StudentRecord>(text, {
  header: true,           // Use first row as headers
  skipEmptyLines: true,   // Ignore blank rows
  complete: (results) => {}, // Success callback
  error: (error) => {}     // Error callback
});
```

**CSV Format Requirements**:
- Headers must match field names exactly
- One record per line
- Quoted fields for special characters
- Date format: YYYY-MM-DD

## Data Sync Algorithm

### Key Algorithm for Sync:

```
1. Collect all examIDs in new file → examIDsInFile Set
2. For each record in file:
   - Validate required fields
   - Find existing student by examID
   - If exists:
     - Compare all fields
     - If changed: UPDATE + increment updatedRecords
     - If unchanged: increment unchangedRecords
   - If not exists: CREATE + increment addedRecords

3. After processing all new records:
   - Query ALL active students
   - For each active student:
     - If examID NOT in examIDsInFile:
       - Set isActive = false
       - Increment deactivatedRecords

4. Log statistics to MoESyncLog
5. Return summary
```

### Why This Works:
- Handles updates and inserts
- Soft-deletes old records
- Prevents duplicate processing
- Tracks all changes
- Maintains data integrity

## Performance Considerations

### Database Queries

**MOE Sync - Potential N+1 Issue**:
```typescript
// Current approach - Could be slow with large files
for (const record of records) {
  const student = await prisma.student.findUnique({...})
  // Update or create
}
```

**Optimization for Production**:
```typescript
// Use batch operations
const studentIds = records.map(r => r.examID);
const existing = await prisma.student.findMany({
  where: { examID: { in: studentIds } }
});
// Create lookup map
// Single update/create operations
```

### CSV Parsing Performance
- papaparse is streaming-safe
- Can handle large files
- ~10K records typically process in <1 second
- Consider async processing for 100K+ records

## Testing Strategy

### Unit Test Coverage Needed:
1. CSV parsing with various formats
2. Date validation edge cases
3. Duplicate detection
4. Field comparison logic
5. Database operations

### Integration Test Coverage:
1. Full sync workflow
2. Authentication flow
3. Error scenarios
4. Concurrent requests

### Test Data Patterns:
- Valid records
- Missing fields
- Invalid dates
- Duplicate examIDs
- Special characters

## Security Implementation Notes

### Current Gaps (Development Only):
1. ❌ No admin authentication
2. ❌ No rate limiting
3. ❌ No request logging
4. ❌ No sensitive field encryption

### Production Requirements:

**1. Admin Endpoint Security**
```typescript
// Add middleware for admin routes
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization');
  if (!token) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  
  // Verify token
}
```

**2. Rate Limiting**
```typescript
// Implement per IP or per user
// Prevent brute force on login
const loginAttempts = new Map();
```

**3. Input Sanitization**
```typescript
// Use Zod for schema validation
const LoginSchema = z.object({
  examID: z.string().min(3).max(50),
  dateOfBirth: z.string().date()
});
```

**4. Sensitive Data**
```typescript
// Don't return unnecessary fields
delete student.studentNationalID;
delete student.email; // if not needed
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Prisma client generated
- [ ] Tests passing
- [ ] Error logging configured
- [ ] Rate limiting implemented
- [ ] Authentication on admin endpoints
- [ ] HTTPS enforced
- [ ] CORS configured
- [ ] Database backups scheduled
- [ ] Monitoring alerts set up
- [ ] Audit logging enabled

## Future Enhancements

### Short Term
- Add pagination to GET /moe-sync
- Add filtering to sync history
- Add data export functionality
- Add email notifications

### Medium Term
- Async processing for large files
- Webhook notifications
- Real-time validation
- Student session management

### Long Term
- Machine learning for fraud detection
- Real-time university integration
- Mobile app support
- Advanced analytics dashboard

## Troubleshooting Guide

### Database Issues

**Issue**: Prisma client not found
```
Solution: npx prisma generate
```

**Issue**: Table doesn't exist
```
Solution: npx prisma migrate dev --name init
```

### CSV Parsing Issues

**Issue**: "Headers do not match"
```
Solution: Verify CSV headers exactly match field names
Expected: examID, dateOfBirth, studentNationalID, firstName, lastName
```

**Issue**: Special characters broken
```
Solution: Ensure CSV file is UTF-8 encoded, quote fields with special chars
```

### Date Issues

**Issue**: "Invalid date format"
```
Solution: Use YYYY-MM-DD format, not DD-MM-YYYY or MM/DD/YYYY
```

## Code Quality Notes

### TypeScript Strict Mode
- All interfaces defined for request/response
- Proper error handling with type guards
- No implicit any types

### Error Messages
- User-friendly language
- Specific guidance for fix
- No sensitive information leaked

### Code Organization
- Single responsibility principle
- Clear function naming
- Inline comments for logic
- Proper resource cleanup (prisma.$disconnect)

---

**Maintainer**: Development Team
**Last Updated**: February 2024
**Version**: 1.0.0
