import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/lib/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    examID: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
    setApiError('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.examID.trim()) {
      newErrors.examID = 'Exam ID is required';
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First Name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last Name is required';
    }
    
    // EMAIL IS NOW OPTIONAL - no validation required
    // Only validate email format if user entered something
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setApiError('');
    setSuccessMessage('');
    if (validateForm()) {
      setLoading(true);
      try {
        const registrationData = {
          examID: formData.examID,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email, // Always send email (empty string if not provided)
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };

        console.log('Sending registration data:', { 
          examID: registrationData.examID,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          email: registrationData.email || '(not provided)',
          phone: registrationData.phone || '(not provided)',
        });

        const result = await apiClient.register(registrationData);

        if (result.success) {
          setSuccessMessage('Your register is successful');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          if (result.message && result.message.toLowerCase().includes('already registered')) {
            setApiError('You are already registered. Please sign in instead.');
          } else {
            setApiError(result.message || 'Registration failed. Please try again.');
          }
        }
      } catch (error: any) {
        console.error('Registration error:', error);
        setApiError(error.message || 'An error occurred during registration');
      } finally {
        setLoading(false);
      }
    }
  };



  const clearForm = () => {
    setFormData({
      examID: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: '#111' }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && { color: '#fff' }]}>Register Student</Text>
          <Text style={[styles.subtitle, isDarkMode && { color: '#aaa' }]}>Ethiopian University Selection Platform</Text>
        </View>



        {/* Form Section */}
        <View style={[styles.formCard, isDarkMode && { backgroundColor: '#222' }]}>
          {apiError ? (
            <View style={styles.globalErrorContainer}>
              <Text style={styles.globalErrorText}>{apiError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Exam ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admission ID / Exam ID *</Text>
            <TextInput
              style={[styles.input, errors.examID && styles.inputError]}
              placeholder="EXM-2024-002"
              placeholderTextColor="#ccc"
              value={formData.examID}
              onChangeText={(value) => handleChange('examID', value)}
              editable={!loading}
            />
            {errors.examID && <Text style={styles.errorText}>{errors.examID}</Text>}
          </View>

          {/* First and Last Name */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                placeholder="First name"
                placeholderTextColor="#ccc"
                value={formData.firstName}
                onChangeText={(value) => handleChange('firstName', value)}
                editable={!loading}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                placeholder="Last name"
                placeholderTextColor="#ccc"
                value={formData.lastName}
                onChangeText={(value) => handleChange('lastName', value)}
                editable={!loading}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          {/* Email - NOW OPTIONAL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="your@email.com (optional)"
              placeholderTextColor="#ccc"
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <Text style={styles.helperText}>
              💡 Email is optional. You can register without it.
            </Text>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="09xxxxxxxx (optional)"
              placeholderTextColor="#ccc"
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor="#ccc"
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              secureTextEntry
              editable={!loading}
            />
            <Text style={styles.helperText}>
              Password must have: 6+ characters, uppercase, lowercase, and number
            </Text>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm your password"
              placeholderTextColor="#ccc"
              value={formData.confirmPassword}
              onChangeText={(value) => handleChange('confirmPassword', value)}
              secureTextEntry
              editable={!loading}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Clear Form Button */}
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearForm}
            disabled={loading}
          >
            <Text style={styles.clearBtnText}>Clear Form</Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.registerBtnText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  typeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
    flexWrap: 'wrap',
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeBtn: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  typeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  activeTypeText: {
    color: '#007AFF',
  },
  formCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 11,
    color: '#dc3545',
    marginTop: 4,
  },
  globalErrorContainer: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  globalErrorText: {
    color: '#dc3545',
    fontSize: 13,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#15803d',
    fontSize: 13,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  clearBtn: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearBtnText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  registerBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 13,
    color: '#666',
  },
  loginLink: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});