# University Selection Platform - Mobile App

## Overview

React Native Expo mobile app UI for university student system with **mock data only** (no API calls). This is a UI prototype with hardcoded example data for demonstration purposes.

## Features

### 🔐 Login Screen
- Exam ID and Password input fields with validation
- Styled input fields with error states
- Login button with mock alert (shows Demo Mode message)
- Register link (shows "Coming Soon" alert)
- University logo/icon placeholder
- No actual authentication - UI only

### 📊 Dashboard Screen (Home)
- Welcome greeting with student name: "Welcome, Habtamu Tadesse!"
- Three statistics cards:
  - ✅ **2 Accepted** (Green card)
  - ⏳ **1 Pending Invitation** (Orange card)
  - 📋 **3 Pending Applications** (Blue card)
- Pending Invitations section showing 2 mock invitations:
  - Addis Ababa University - Interview - May 20, 2024 - 10:00 AM - Online
  - Jimma University - Exam - May 25, 2024 - 2:00 PM - Campus
  - Each has Accept and Decline buttons
- Recent Applications section showing 3 applications with status badges
- Scrollable content with professional styling

### 📋 Applications Screen
- List of all 5 mock applications
- Stats overview showing counts:
  - Accepted applications
  - Pending applications
  - Rejected applications
- Each application card shows:
  - University name and program
  - Status badge (color-coded)
  - Decision date (if available)
  - Decision message (if available)
- Mock data:
  - AAU, Computer Science - ACCEPTED - June 1, 2024
  - Bahir Dar, Software Engineering - WAITLISTED - May 28, 2024
  - Jimma, Information Technology - REJECTED - May 25, 2024
  - Gondar, Software Engineering - PENDING
  - Mekelle, Computer Science - PENDING

### 💬 Invitations Screen
- Two tabs: "Pending" and "History"
- **Pending Tab** (2 items):
  - AAU Interview: May 20, 2024 - 10:00 AM - Online - [Accept][Decline]
  - Jimma Exam: May 25, 2024 - 2:00 PM - Campus - [Accept][Decline]
- **History Tab** (2 items):
  - Bahir Dar Interview - ACCEPTED - May 15, 2024
  - Gondar Exam - DECLINED - May 10, 2024
- Tab switching functionality
- Buttons show "Coming Soon" alerts

### 👤 Profile Screen
- Student photo placeholder with emoji
- Student name: Habtamu Tadesse
- Exam ID: EXM-2024-003
- Student information grid:
  - Email: habtamu@example.com
  - Phone: +251-912-345678
  - Region: Addis Ababa
  - Stream: Natural Science
  - Total Score: 486
- Action buttons:
  - ✏️ Edit Profile (shows alert)
  - 🔒 Change Password (shows alert)
  - 🚪 Logout (shows confirmation)

## Navigation

- **Bottom Tab Navigator** with 4 tabs:
  - 🏠 Dashboard (Home)
  - 📋 Applications
  - 💬 Invitations
  - 👤 Profile
- **Stack Navigator** for Login → Dashboard flow
- Login screen is the initial route
- After login, user navigates to Dashboard tab

## Design System

### Colors
- **Primary**: #007AFF (Blue)
- **Background**: #f5f5f5 (Light Gray)
- **Card Background**: #fff (White)
- **Success**: #34C759 (Green)
- **Warning**: #FF9500 (Orange)
- **Error**: #FF3B30 (Red)
- **Secondary**: #6A1B9A (Purple)
- **Text**: #11181C (Dark)
- **Secondary Text**: #687076 (Gray)

### Styling
- Rounded corners: 12px (borderRadius: 12)
- Shadows and elevation for depth
- Safe area support for notched phones
- Proper spacing and typography hierarchy
- Status badge colors:
  - ACCEPTED = Green (#34C759)
  - REJECTED = Red (#FF3B30)
  - PENDING = Orange (#FF9500)
  - WAITLISTED = Purple (#6A1B9A)

## Components

### `StatusCard`
Reusable component for displaying statistics with custom colors.

```tsx
<StatusCard
  title="Accepted"
  count={2}
  color="#34C759"
  bgColor="#E8F5E9"
/>
```

### `ApplicationCard`
Displays university application with status and decision information.

```tsx
<ApplicationCard
  universityName="Addis Ababa University"
  program="Computer Science"
  status="ACCEPTED"
  decisionDate="June 1, 2024"
  message="Congratulations!"
/>
```

### `InvitationCard`
Shows invitation details with optional action buttons.

```tsx
<InvitationCard
  universityName="AAU"
  eventType="Interview"
  date="May 20, 2024"
  time="10:00 AM"
  location="Online"
  status="Pending"
  showButtons={true}
/>
```

## Mock Data

All data is stored in `constants/mockData.ts`:
- `mockStudent` - Student profile information
- `mockStats` - Dashboard statistics
- `mockInvitations` - Pending invitations
- `mockInvitationHistory` - Past invitations
- `mockRecentApplications` - Recent 3 applications
- `mockApplications` - All 5 applications
- `getStatusColor()` - Helper function for status colors

## File Structure

```
mobile/
├── app/
│   ├── login.tsx                    # Login screen
│   ├── _layout.tsx                  # Root navigation layout
│   └── (tabs)/
│       ├── dashboard.tsx            # Dashboard/Home screen
│       ├── applications.tsx         # Applications list screen
│       ├── invitations.tsx          # Invitations with tabs
│       ├── profile.tsx              # Student profile screen
│       └── _layout.tsx              # Tab navigation layout
├── components/
│   ├── StatusCard.tsx               # Stats card component
│   ├── ApplicationCard.tsx          # Application card component
│   ├── InvitationCard.tsx           # Invitation card component
│   └── ui/
│       └── icon-symbol.tsx          # Icon component (updated)
├── constants/
│   ├── theme.ts                     # Theme colors
│   └── mockData.ts                  # Mock data (new)
└── hooks/
    └── use-color-scheme.ts          # Color scheme hook
```

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- React Native development environment

### Installation

```bash
cd mobile
npm install
```

### Running the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Web:**
```bash
npm run web
```

**Development Server:**
```bash
npm start
```

Then press:
- `a` for Android
- `i` for iOS
- `w` for web

## Important Notes

⚠️ **This is a UI prototype with mock data only:**
- ❌ No actual API calls
- ❌ No real authentication
- ❌ No database integration
- ✅ All buttons show "Coming Soon" alerts
- ✅ Navigation between screens works
- ✅ Tab switching works
- ✅ Mock data displays correctly

## Demo Flow

1. **Start App** → Login Screen appears
2. **Enter any Exam ID and Password** → Shows mock login alert
3. **Click "Continue"** → Navigates to Dashboard
4. **Explore Tabs** → Switch between Dashboard, Applications, Invitations, Profile
5. **Click Action Buttons** → Shows "Coming Soon" alerts

## Customization

To modify mock data, edit `constants/mockData.ts`:
- Change student information in `mockStudent`
- Update statistics in `mockStats`
- Modify applications and invitations arrays
- Add/remove items as needed

## License

This is a demo application for educational purposes.
