// LoginScreen logic tests — validates the role mismatch detection and error
// handling that caused the "wrong account type" false positive during the
// RLS infinite recursion regression.

import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// We extract the *logic* from handleLogin to test it without rendering the
// full component (which would require mocking navigation, SafeAreaView, etc.)
// ---------------------------------------------------------------------------

// Simulates the handleLogin logic extracted from LoginScreen.tsx
async function simulateHandleLogin({
  email,
  password,
  userType, // portal chosen by user ('nurse' | 'patient')
  loginFn,
  logoutFn,
  tFn,
}: {
  email: string;
  password: string;
  userType: string;
  loginFn: (email: string, password: string) => Promise<{ userType: string | null }>;
  logoutFn: () => Promise<void>;
  tFn: (key: string) => string;
}): Promise<{ alertTitle?: string; alertMessage?: string }> {
  if (!email || !password) {
    Alert.alert(tFn('common.error'), tFn('auth.fillAllFields'));
    return { alertTitle: tFn('common.error'), alertMessage: tFn('auth.fillAllFields') };
  }

  try {
    const { userType: actualUserType } = await loginFn(email, password);

    const isMismatch =
      userType === 'nurse'
        ? actualUserType !== 'nurse'
        : actualUserType !== 'patient' && actualUserType !== 'family';

    if (isMismatch) {
      try {
        await logoutFn();
      } catch {
        // best-effort
      }
      const title = tFn('auth.roleMismatch');
      const message =
        actualUserType === 'nurse'
          ? tFn('auth.nurseAccountRequired')
          : tFn('auth.patientAccountRequired');
      Alert.alert(title, message);
      return { alertTitle: title, alertMessage: message };
    }

    return {};
  } catch (error: any) {
    const title = tFn('common.error');
    const message = error.message;
    Alert.alert(title, message);
    return { alertTitle: title, alertMessage: message };
  }
}

// Simple translation function for tests
const t = (key: string) => key;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LoginScreen handleLogin logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Regression test: RLS error must NOT show "role mismatch" ---
  it('shows common.error (not roleMismatch) when profile fetch fails with RLS error', async () => {
    const loginFn = jest.fn().mockRejectedValue(
      new Error('infinite recursion detected in policy for relation "patient_files"'),
    );

    const result = await simulateHandleLogin({
      email: 'nurse@test.com',
      password: 'pass',
      userType: 'nurse',
      loginFn,
      logoutFn: jest.fn(),
      tFn: t,
    });

    // Must use common.error title, NOT auth.roleMismatch
    expect(result.alertTitle).toBe('common.error');
    expect(result.alertMessage).toContain('infinite recursion');
  });

  // --- Correct nurse account on nurse portal → no error ---
  it('succeeds silently when nurse logs in via nurse portal', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: 'nurse' });

    const result = await simulateHandleLogin({
      email: 'nurse@test.com',
      password: 'pass',
      userType: 'nurse',
      loginFn,
      logoutFn: jest.fn(),
      tFn: t,
    });

    expect(result.alertTitle).toBeUndefined();
    expect(result.alertMessage).toBeUndefined();
  });

  // --- Patient account on nurse portal → role mismatch ---
  it('shows roleMismatch when patient logs in via nurse portal', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: 'patient' });
    const logoutFn = jest.fn().mockResolvedValue(undefined);

    const result = await simulateHandleLogin({
      email: 'patient@test.com',
      password: 'pass',
      userType: 'nurse',
      loginFn,
      logoutFn,
      tFn: t,
    });

    expect(result.alertTitle).toBe('auth.roleMismatch');
    expect(result.alertMessage).toBe('auth.patientAccountRequired');
    expect(logoutFn).toHaveBeenCalled();
  });

  // --- Nurse account on patient portal → role mismatch ---
  it('shows roleMismatch when nurse logs in via patient portal', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: 'nurse' });
    const logoutFn = jest.fn().mockResolvedValue(undefined);

    const result = await simulateHandleLogin({
      email: 'nurse@test.com',
      password: 'pass',
      userType: 'patient',
      loginFn,
      logoutFn,
      tFn: t,
    });

    expect(result.alertTitle).toBe('auth.roleMismatch');
    expect(result.alertMessage).toBe('auth.nurseAccountRequired');
    expect(logoutFn).toHaveBeenCalled();
  });

  // --- Patient account on patient portal → success ---
  it('succeeds when patient logs in via patient portal', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: 'patient' });

    const result = await simulateHandleLogin({
      email: 'patient@test.com',
      password: 'pass',
      userType: 'patient',
      loginFn,
      logoutFn: jest.fn(),
      tFn: t,
    });

    expect(result.alertTitle).toBeUndefined();
  });

  // --- Family account on patient portal → success ---
  it('succeeds when family logs in via patient portal', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: 'family' });

    const result = await simulateHandleLogin({
      email: 'family@test.com',
      password: 'pass',
      userType: 'patient',
      loginFn,
      logoutFn: jest.fn(),
      tFn: t,
    });

    expect(result.alertTitle).toBeUndefined();
  });

  // --- Empty fields ---
  it('shows fillAllFields error when email is empty', async () => {
    const result = await simulateHandleLogin({
      email: '',
      password: 'pass',
      userType: 'nurse',
      loginFn: jest.fn(),
      logoutFn: jest.fn(),
      tFn: t,
    });

    expect(result.alertTitle).toBe('common.error');
    expect(result.alertMessage).toBe('auth.fillAllFields');
  });

  it('shows fillAllFields error when password is empty', async () => {
    const result = await simulateHandleLogin({
      email: 'test@test.com',
      password: '',
      userType: 'nurse',
      loginFn: jest.fn(),
      logoutFn: jest.fn(),
      tFn: t,
    });

    expect(result.alertTitle).toBe('common.error');
    expect(result.alertMessage).toBe('auth.fillAllFields');
  });

  // --- Logout failure during mismatch → still shows alert ---
  it('still shows mismatch alert when logout fails', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: 'patient' });
    const logoutFn = jest.fn().mockRejectedValue(new Error('logout failed'));

    const result = await simulateHandleLogin({
      email: 'patient@test.com',
      password: 'pass',
      userType: 'nurse',
      loginFn,
      logoutFn,
      tFn: t,
    });

    expect(result.alertTitle).toBe('auth.roleMismatch');
    expect(result.alertMessage).toBe('auth.patientAccountRequired');
  });

  // --- Invalid credentials ---
  it('shows error message on invalid credentials', async () => {
    const loginFn = jest.fn().mockRejectedValue(
      new Error('Invalid login credentials'),
    );

    const result = await simulateHandleLogin({
      email: 'bad@test.com',
      password: 'wrong',
      userType: 'nurse',
      loginFn,
      logoutFn: jest.fn(),
      tFn: t,
    });

    expect(result.alertTitle).toBe('common.error');
    expect(result.alertMessage).toBe('Invalid login credentials');
  });

  // --- userType=null (profile fetch returned nothing) on nurse portal ---
  it('treats null userType as mismatch on nurse portal', async () => {
    const loginFn = jest.fn().mockResolvedValue({ userType: null });
    const logoutFn = jest.fn().mockResolvedValue(undefined);

    const result = await simulateHandleLogin({
      email: 'unknown@test.com',
      password: 'pass',
      userType: 'nurse',
      loginFn,
      logoutFn,
      tFn: t,
    });

    // null !== 'nurse' → mismatch
    expect(result.alertTitle).toBe('auth.roleMismatch');
  });
});
