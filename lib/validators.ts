// lib/validators.ts - Client Safe

// ✅ Student Login Validator
export const validateLoginForm = (examId: string, password: string) => {
  const errors: Record<string, string> = {};
  
  if (!examId || examId.trim() === '') {
    errors.examId = 'Exam ID is required';
  }
  
  if (!password || password.trim() === '') {
    errors.password = 'Password is required';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ✅ Student Registration Validator
export const validateStudentRegisterForm = (
  examId: string,
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string
) => {
  const errors: Record<string, string> = {};
  
  if (!examId || examId.trim() === '') {
    errors.examId = 'Exam ID is required';
  }
  
  if (!firstName || firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }
  
  if (!lastName || lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Valid email is required';
  }
  
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8 || password.length > 10) {
    errors.password = 'Password must be 8-10 characters';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain an uppercase letter';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain a lowercase letter';
  } else if (!/\d/.test(password)) {
    errors.password = 'Password must contain a number';
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    errors.password = 'Password must contain a symbol';
  }
  
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ✅ ADD THIS - Admin/University Login Validator
export const validateAdminLoginForm = (email: string, password: string) => {
  const errors: Record<string, string> = {};
  
  if (!email || email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Valid email address is required';
  }
  
  if (!password || password.trim() === '') {
    errors.password = 'Password is required';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ✅ Optional: University Admin Login Validator (same as admin)
export const validateUniversityLoginForm = (email: string, password: string) => {
  return validateAdminLoginForm(email, password);
};

// ✅ Platform Admin Login Validator
export const validatePlatformLoginForm = (username: string, password: string) => {
  const errors: Record<string, string> = {};
  
  if (!username || username.trim() === '') {
    errors.username = 'Username is required';
  }
  
  if (!password || password.trim() === '') {
    errors.password = 'Password is required';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ✅ Platform Admin Register Validator
export const validatePlatformRegisterForm = (
  name: string,
  username: string,
  password: string,
  confirmPassword: string
) => {
  const errors: Record<string, string> = {};
  
  if (!name || name.trim() === '') {
    errors.name = 'Full name is required';
  }
  
  if (!username || username.trim() === '') {
    errors.username = 'Username is required';
  }
  
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
// ============================================
// ✅ MOE CSV Upload Validators (Add this at the bottom)
// ============================================

export const validators = {
  // Validate CSV file (type, size, etc.)
  validateCSVFile: (file: File) => {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      return { valid: false, error: 'File must be a CSV file' };
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    return { valid: true, error: null };
  },
  
  // Validate CSV headers match required columns
  validateCSVHeaders: (headers: string[], requiredHeaders: string[]) => {
    const missing = requiredHeaders.filter(h => !headers.includes(h.toLowerCase()));
    return { valid: missing.length === 0, missing };
  },
  
  // Validate each student row data
  validateStudentRow: (row: Record<string, any>) => {
    const errors: string[] = [];
    const requiredFields = ['examid', 'firstname', 'lastname', 'email', 'stream', 'totalscore'];
    
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  },
};
// ============================================
// ✅ MOE Admin Registration Validator (Add this at the bottom)
// ============================================

export const validateAdminRegisterForm = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
) => {
  const errors: Record<string, string> = {};
  
  // Validate name
  if (!name || name.trim() === '') {
    errors.name = 'Full name is required';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  // Validate email
  if (!email || email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Valid email address is required';
  }
  
  // Validate password
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'Password must contain an uppercase letter';
  } else if (!/[a-z]/.test(password)) {
    errors.password = 'Password must contain a lowercase letter';
  } else if (!/\d/.test(password)) {
    errors.password = 'Password must contain a number';
  }
  
  // Validate confirm password
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};