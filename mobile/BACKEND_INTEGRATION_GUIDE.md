# Mobile App - Backend Integration Setup Guide

## ✅ Completed Setup

Your mobile app has been successfully connected to the Next.js backend! Here's what was implemented:

---

## 📁 Files Created/Modified

### New Files Created:
1. **`mobile/lib/api.ts`** - API client for communicating with backend
2. **`mobile/context/AuthContext.tsx`** - Authentication context for managing auth state and JWT token

### Files Updated:
1. **`mobile/app/_layout.tsx`** - Wrapped app with AuthProvider
2. **`mobile/app/login.tsx`** - Connected to `/api/students/login` route
3. **`mobile/app/register.tsx`** - Connected to `/api/students/register` route  
4. **`mobile/app/(tabs)/profile.tsx`** - Connected to `/api/students/profile` route
5. **`mobile/app/(tabs)/dashboard.tsx`** - Connected to `/api/students/profile` route
6. **`mobile/app/(tabs)/_layout.tsx`** - Added authentication guard
7. **`mobile/package.json`** - Added `@react-native-async-storage/async-storage` dependency

---

## 🔧 Configuration

### Step 1: Update API Base URL
Edit `mobile/lib/api.ts` and update the API_BASE_URL to match your backend:

```typescript
// Change this to your actual backend URL
const API_BASE_URL = 'http://localhost:3000/api';
```

For production:
```typescript
const API_BASE_URL = 'https://your-production-url.com/api';
```

### Step 2: Install Dependencies
Run the following command in the mobile folder:

```bash
cd mobile
npm install
# or
yarn install
```

---

## 🔄 How It Works

### Authentication Flow:
1. User opens app → lands on login screen
2. User enters Exam ID & password
3. Login request sent to `/api/students/login`
4. Backend validates and returns JWT token
5. Token stored in AsyncStorage (persistent)
6. User navigated to dashboard
7. All subsequent requests include token in Authorization header

### Data Fetching:
- **Profile Page**: Fetches from `/api/students/profile` with JWT token
- **Dashboard Page**: Fetches from `/api/students/profile` and displays applications, invitations, stats
- Both pages show real backend data instead of mock data

### Logout:
- Clears token from AsyncStorage
- Clears student data from Auth context
- Redirects to login screen

---

## 📱 Features Implemented

### Login Screen (`mobile/app/login.tsx`)
✅ Connects to `/api/students/login`
✅ Validates exam ID and password
✅ Stores JWT token on success
✅ Shows error messages from backend
✅ Displays loading state during auth

### Register Screen (`mobile/app/register.tsx`)
✅ Connects to `/api/students/register`
✅ Supports email and no-email registration flows
✅ Validates form before submission
✅ Shows backend error messages
✅ Redirects to login on success

### Dashboard (`mobile/app/(tabs)/dashboard.tsx`)
✅ Fetches real student data from `/api/students/profile`
✅ Displays student name and exam ID
✅ Shows applications count from backend
✅ Shows invitations count from backend
✅ Lists recent applications with status
✅ Lists recent interview invitations
✅ Protected route - requires authentication

### Profile (`mobile/app/(tabs)/profile.tsx`)
✅ Fetches real profile data from `/api/students/profile`
✅ Displays all student information
✅ Shows applications status
✅ Logout functionality with proper cleanup
✅ Protected route - requires authentication

---

## 🔐 Security Features

- JWT tokens stored securely in AsyncStorage
- Token included in all API requests via Authorization header
- Auth context checks token on app load
- Automatic redirection to login if token expires
- Session persistence across app restarts

---

## 📊 Data Returned by Backend

### Profile Route (`/api/students/profile`)
Returns the following data structure:
```typescript
{
  id: string;
  examID: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  region?: string;
  stream?: string;
  totalScore?: number;
  subjects?: Array<{name: string; score: number}>;
  applications?: Array<{
    university: {id, name, code};
    program: {id, name, code};
    status: string;
  }>;
  invitations?: Array<{
    id: string;
    type: string;
    date: string;
    status: string;
    university: {id, name, code};
  }>;
  // ... more fields
}
```

---

## ⚠️ Environment Setup

### Supported Endpoints:
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/students/login` | POST | No | Student login |
| `/api/students/register` | POST | No | Student registration |
| `/api/students/profile` | GET | Yes | Get student profile & data |
| `/api/universities` | GET | Yes | Get universities list |

### Required JWT Environment Variable:
Make sure your backend has `JWT_SECRET` environment variable set in `.env`

---

## 🧪 Testing

### Test Login:
1. Run the mobile app: `npm start`
2. Try login with test credentials
3. Check that JWT token is returned
4. Verify dashboard shows real data

### Test Registration:
1. Click "Register here" on login screen
2. Fill in student details
3. Submit registration
4. Should redirect to login

### Test Authentication:
1. Login successfully
2. Close and restart app
3. Should restore session automatically (stay logged in)
4. Click logout to clear session

---

## 🐛 Troubleshooting

### Issue: Network Error
**Solution**: Check that API_BASE_URL in `mobile/lib/api.ts` points to correct backend

### Issue: Invalid Credentials
**Solution**: Verify exam ID and password match backend records

### Issue: "Please verify your email"
**Solution**: Email verification is required after login. Check email for verification link

### Issue: Token Expired
**Solution**: App will automatically redirect to login. Re-authenticate to get new token

### Issue: AsyncStorage Not Found
**Solution**: Make sure dependencies are installed: `npm install`

---

## 📝 API Request Examples

### Login Request:
```typescript
POST /api/students/login
Content-Type: application/json

{
  "examID": "EXM-2024-002",
  "password": "Test@123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "student": {
    "examID": "EXM-2024-002",
    "firstName": "Almaz",
    "lastName": "Getnet",
    "email": "almaz@example.com"
  }
}
```

### Profile Request:
```typescript
GET /api/students/profile
Authorization: Bearer {token}

Response:
{
  "id": "...",
  "examID": "EXM-2024-002",
  "firstName": "Almaz",
  "lastName": "Getnet",
  // ... all student data
}
```

---

## 🎯 Next Steps

1. ✅ Test login/register with backend
2. ✅ Verify profile data displays correctly
3. ✅ Check dashboard shows real applications & invitations
4. ✅ Test logout functionality
5. ✅ Test persistence (close and reopen app)
6. ✅ Update API_BASE_URL for production when ready

---

## 📞 Notes

- **No web files were modified** - only mobile app
- **No backend files were modified** - only mobile integration layer
- **Backend routes remain unchanged** - they already work correctly
- **Mock data is still in constants** - can be removed if needed

All mobile pages now fetch real data from your Next.js backend!
