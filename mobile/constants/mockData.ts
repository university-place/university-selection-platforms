// Mock data for student system

export const mockStudent = {
  id: 'STU-2024-002',
  name: 'Almaz Getnet',
  firstName: 'Almaz',
  lastName: 'Getnet',
  examId: 'EXM-2024-002',
  email: 'almaz.getnet@example.com',
  phone: '+251-911-234567',
  region: 'Addis Ababa',
  stream: 'Natural Science',
  totalScore: 705,
  examScore: 705,
  dateOfBirth: '2006-05-10',
  gender: 'Female',
  photo: 'https://via.placeholder.com/150',
};

// Application Journey Status
export const mockApplicationJourney = [
  {
    id: 1,
    title: 'Profile',
    status: 'Complete',
    statusColor: '#34C759',
    icon: '✓',
  },
  {
    id: 2,
    title: 'Documents',
    status: '0/1',
    statusColor: '#FF9500',
    icon: '📄',
    current: true,
  },
  {
    id: 3,
    title: 'Preferences',
    status: '2 added',
    statusColor: '#007AFF',
    icon: '❤️',
  },
  {
    id: 4,
    title: 'Placement',
    status: 'Pending',
    statusColor: '#999',
    icon: '⏳',
  },
];

export const mockStats = [
  {
    id: 1,
    title: 'Exam Score',
    value: '705',
    icon: '🎓',
    bgColor: '#E3F2FD',
    valueColor: '#007AFF',
  },
  {
    id: 2,
    title: 'Preferences',
    value: '2',
    icon: '❤️',
    bgColor: '#E8F5E9',
    valueColor: '#34C759',
  },
  {
    id: 3,
    title: 'Documents',
    value: '1',
    icon: '📄',
    bgColor: '#F3E5F5',
    valueColor: '#9C27B0',
  },
  {
    id: 4,
    title: 'Unread',
    value: '0',
    icon: '🔔',
    bgColor: '#FFF3E0',
    valueColor: '#FF9500',
  },
];

export const mockInvitations = [
  {
    id: 1,
    universityName: 'Addis Ababa University',
    eventType: 'Interview',
    date: 'May 20, 2024',
    time: '10:00 AM',
    location: 'Online',
    status: 'Pending',
  },
  {
    id: 2,
    universityName: 'Jimma University',
    eventType: 'Exam',
    date: 'May 25, 2024',
    time: '2:00 PM',
    location: 'Campus',
    status: 'Pending',
  },
];

export const mockInvitationHistory = [
  {
    id: 3,
    universityName: 'Bahir Dar University',
    eventType: 'Interview',
    date: 'May 15, 2024',
    time: '11:00 AM',
    location: 'Online',
    status: 'ACCEPTED',
  },
  {
    id: 4,
    universityName: 'Gondar University',
    eventType: 'Exam',
    date: 'May 10, 2024',
    time: '9:00 AM',
    location: 'Campus',
    status: 'DECLINED',
  },
];

export const mockRecentApplications = [
  {
    id: 1,
    universityName: 'Addis Ababa University',
    program: 'Computer Science',
    status: 'ACCEPTED',
    decisionDate: 'June 1, 2024',
    message: 'Congratulations!',
  },
  {
    id: 2,
    universityName: 'Bahir Dar University',
    program: 'Software Engineering',
    status: 'PENDING',
    decisionDate: null,
    message: null,
  },
  {
    id: 3,
    universityName: 'Jimma University',
    program: 'Information Technology',
    status: 'REJECTED',
    decisionDate: 'May 25, 2024',
    message: 'Not enough score',
  },
];

export const mockApplications = [
  {
    id: 1,
    universityName: 'Addis Ababa University',
    program: 'Computer Science',
    status: 'ACCEPTED',
    decisionDate: 'June 1, 2024',
    message: 'Congratulations!',
  },
  {
    id: 2,
    universityName: 'Bahir Dar University',
    program: 'Software Engineering',
    status: 'WAITLISTED',
    decisionDate: 'May 28, 2024',
    message: null,
  },
  {
    id: 3,
    universityName: 'Jimma University',
    program: 'Information Technology',
    status: 'REJECTED',
    decisionDate: 'May 25, 2024',
    message: 'Not enough score',
  },
  {
    id: 4,
    universityName: 'Gondar University',
    program: 'Software Engineering',
    status: 'PENDING',
    decisionDate: null,
    message: null,
  },
  {
    id: 5,
    universityName: 'Mekelle University',
    program: 'Computer Science',
    status: 'PENDING',
    decisionDate: null,
    message: null,
  },
];

// Color mapping for status badges
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACCEPTED':
      return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'REJECTED':
      return { bg: '#FFEBEE', text: '#C62828' };
    case 'PENDING':
      return { bg: '#FFF3E0', text: '#E65100' };
    case 'WAITLISTED':
      return { bg: '#F3E5F5', text: '#6A1B9A' };
    default:
      return { bg: '#E0E0E0', text: '#424242' };
  }
};
