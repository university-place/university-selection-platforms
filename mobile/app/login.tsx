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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { apiClient } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const [examId, setExamId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ examId: false, password: false });
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const validateInputs = () => {
    setLoginError('');
    const newErrors = {
      examId: examId.trim() === '',
      password: password.trim() === '',
    };
    setErrors(newErrors);
    return !newErrors.examId && !newErrors.password;
  };

  const handleLogin = async () => {
    if (validateInputs()) {
      setLoading(true);
      try {
        const result = await apiClient.login(examId, password);

        if (result.success && result.token && result.student) {
          // Save to auth context
          await login(result.token, result.student);
          
          // Navigate directly on success
          router.replace('/(tabs)/dashboard');
        } else {
          setLoginError(result.message || 'Invalid credentials');
        }
      } catch (error: any) {
        setLoginError(error.message || 'Network error occurred');
      } finally {
        setLoading(false);
      }
    }
  };

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotExamId, setForgotExamId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const handleForgotPassword = () => {
    setForgotExamId(examId);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setShowForgotModal(true);
  };

  const submitChangePassword = async () => {
    if (!forgotExamId.trim() || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setForgotError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('New passwords do not match');
      return;
    }

    setIsSubmittingForgot(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const result = await apiClient.changePasswordDirect(forgotExamId, currentPassword, newPassword);
      if (result.success) {
        setForgotSuccess('Password updated successfully. You can now login.');
        setTimeout(() => {
          setShowForgotModal(false);
          setPassword('');
        }, 2000);
      } else {
        setForgotError(result.message || 'Failed to update password');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Network error occurred');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: '#111' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoPlaceholder, isDarkMode && { backgroundColor: '#222' }]}>
            <Text style={styles.logoText}>🎓</Text>
          </View>
          <Text style={[styles.appTitle, isDarkMode && { color: '#fff' }]}>Student Login</Text>
          <Text style={[styles.appSubtitle, isDarkMode && { color: '#aaa' }]}>Sign in to your account</Text>
        </View>

        {/* Form Section */}
        <View style={[styles.formSection, isDarkMode && { backgroundColor: '#222' }]}>
          {loginError ? (
            <View style={styles.globalErrorContainer}>
              <Text style={styles.globalErrorText}>{loginError}</Text>
            </View>
          ) : null}

          {/* Exam ID Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDarkMode && { color: '#ddd' }]}>Exam ID</Text>
            <TextInput
              style={[styles.input, isDarkMode && { backgroundColor: '#333', color: '#fff', borderColor: '#444' }, errors.examId && styles.inputError]}
              placeholder="EXM-2024-002"
              placeholderTextColor={isDarkMode ? "#777" : "#999"}
              value={examId}
              onChangeText={setExamId}
              editable={!loading}
            />
            {errors.examId && <Text style={styles.errorText}>Exam ID is required</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDarkMode && { color: '#ddd' }]}>Password</Text>
            <View style={[styles.passwordContainer, isDarkMode && { backgroundColor: '#333', borderColor: '#444' }, errors.password && styles.inputError]}>
              <TextInput
                style={[styles.passwordInput, isDarkMode && { color: '#fff' }]}
                placeholder="Enter your password"
                placeholderTextColor={isDarkMode ? "#777" : "#999"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>Password is required</Text>}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          {/* Register Link */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={handleRegister} disabled={loading}>
              <Text style={styles.registerLink}>Register here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && { backgroundColor: '#222' }]}>
            <Text style={[styles.modalTitle, isDarkMode && { color: '#fff' }]}>Change Default Password</Text>
            <Text style={[styles.modalSubtitle, isDarkMode && { color: '#aaa' }]}>Please update your password before logging in</Text>

            {forgotError ? (
              <View style={styles.globalErrorContainer}>
                <Text style={styles.globalErrorText}>{forgotError}</Text>
              </View>
            ) : null}

            {forgotSuccess ? (
              <View style={[styles.globalErrorContainer, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.globalErrorText, { color: '#10B981' }]}>{forgotSuccess}</Text>
              </View>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Exam ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="EXM-2024-..."
                  value={forgotExamId}
                  onChangeText={setForgotExamId}
                  editable={!isSubmittingForgot}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!isSubmittingForgot}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isSubmittingForgot}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isSubmittingForgot}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowForgotModal(false)}
                disabled={isSubmittingForgot}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={submitChangePassword}
                disabled={isSubmittingForgot}
              >
                {isSubmittingForgot ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 6,
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
  forgotPasswordLink: {
    fontSize: 13,
    color: '#0066ff',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: '#0066ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 18,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 10,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: '#666',
  },
  registerLink: {
    fontSize: 13,
    color: '#0066ff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalCancelText: {
    color: '#333',
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0066ff',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
