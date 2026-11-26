import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError, me } from '@tstack/sdk';

import { getAuthClient } from '../../../lib/auth-client';
import { getApiUrl } from '../../../lib/api-config';

type Profile = Awaited<ReturnType<typeof me>>;

export function AuthScreen() {
  const auth = getAuthClient();
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = auth.useSession();
  const [mode, setMode] = useState<'signin' | 'signup' | 'otp'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [rejectedSession, setRejectedSession] = useState<string | null>(null);
  const logoutCookie = useRef<string | null>(null);
  const [logoutRequired, setLogoutRequired] = useState(false);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const sessionId = session?.session.id;
  const expiresAt = session?.session.expiresAt.getTime();
  const expired = expiresAt !== undefined && expiresAt <= checkedAt;
  const signedIn = Boolean(
    sessionId && sessionId !== rejectedSession && !sessionError && !expired,
  );

  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = setTimeout(
      () => {
        setCheckedAt(Date.now());
        void refetch().catch(() => undefined);
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt, refetch]);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setProfileError(null);
    if (!signedIn || !sessionId) return;

    async function loadProfile() {
      try {
        const cookie = await auth.getCookie();
        const result = await me({
          baseUrl: getApiUrl(),
          headers: { Cookie: cookie },
          credentials: 'omit',
        });
        if (active) setProfile(result);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          setRejectedSession(sessionId ?? null);
          setError('Your session expired. Please sign in again.');
          // Never retain protected content while the server rejects this session.
          void refetch().catch(() => undefined);
        } else {
          setProfileError(
            'Unable to load your profile. Check your connection and retry.',
          );
        }
      }
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [auth, refetch, retry, sessionId, signedIn]);

  async function requestCode() {
    if (pending) return;
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setPending(true);
    setSendingCode(true);
    try {
      const result = await auth.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      });
      if (result.error) {
        setError(
          result.error.message || 'Unable to send code. Please try again.',
        );
      } else {
        setEmail(email.trim());
        setOtp('');
        setCodeSent(true);
      }
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setPending(false);
      setSendingCode(false);
    }
  }

  async function submit() {
    if (pending) return;
    setError(null);
    if (mode === 'otp' && !/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code.');
      return;
    }
    if (
      !email.trim() ||
      (mode !== 'otp' && !password) ||
      (mode === 'signup' && !name.trim())
    ) {
      setError('Complete all fields.');
      return;
    }
    if (mode === 'signup' && password.length < 12) {
      setError('Use at least 12 characters for your password.');
      return;
    }
    setPending(true);
    try {
      const result =
        mode === 'otp'
          ? await auth.signIn.emailOtp({ email: email.trim(), otp })
          : mode === 'signup'
            ? await auth.signUp.email({
                name: name.trim(),
                email: email.trim(),
                password,
              })
            : await auth.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(
          result.error.message || 'Authentication failed. Please try again.',
        );
      } else {
        setPassword('');
        setOtp('');
        setCodeSent(false);
        if (mode === 'otp') setMode('signin');
        await refetch();
      }
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(null);
    // Hide protected content immediately, even if logout cannot reach the server.
    setRejectedSession(sessionId ?? null);
    setProfile(null);
    setLogoutRequired(true);
    try {
      // The Expo plugin clears its cookie before sending the request. Keep a
      // memory-only credential so an interrupted request can actually be retried.
      logoutCookie.current ||= await auth.getCookie();
      const result = await auth.signOut({
        fetchOptions: {
          headers: { cookie: logoutCookie.current },
        },
      });
      if (result.error) {
        setError('Sign-out could not be confirmed. Please retry.');
        return;
      }
      logoutCookie.current = null;
      setLogoutRequired(false);
    } catch {
      setError(
        'Sign-out could not be confirmed. Check your connection and retry.',
      );
    } finally {
      setPending(false);
      setPassword('');
    }
  }

  if (isPending) {
    return (
      <View style={styles.container}>
        <ActivityIndicator accessibilityLabel="Restoring session" />
        <Text>Restoring session…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>TSTACK / MOBILE</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {signedIn
            ? 'Your account'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </Text>
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {sessionError && (
          <View style={styles.group}>
            <Text accessibilityRole="alert" style={styles.error}>
              Unable to verify your session. Check your connection.
            </Text>
            <Button
              title="Retry session"
              disabled={pending}
              onPress={() => {
                void refetch().catch(() =>
                  setError('Unable to verify your session.'),
                );
              }}
            />
          </View>
        )}
        {signedIn ? (
          <View style={styles.group}>
            {profile && profile.id === session?.user.id ? (
              <>
                <Text style={styles.name}>{profile.name || 'Welcome'}</Text>
                <Text selectable>{profile.email}</Text>
                <Text>
                  {profile.emailVerified
                    ? 'Email verified'
                    : 'Email not verified'}
                </Text>
              </>
            ) : profileError ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  {profileError}
                </Text>
                <Button
                  title="Retry profile"
                  onPress={() => setRetry((value) => value + 1)}
                />
              </>
            ) : (
              <ActivityIndicator accessibilityLabel="Loading profile" />
            )}
            <Button
              title={pending ? 'Signing out…' : 'Sign out'}
              disabled={pending}
              onPress={() => {
                void signOut();
              }}
            />
          </View>
        ) : logoutRequired ? (
          <View style={styles.group}>
            <Text>Complete sign-out before signing in again.</Text>
            <Button
              title={pending ? 'Signing out…' : 'Retry sign out'}
              disabled={pending}
              onPress={() => {
                void signOut();
              }}
            />
          </View>
        ) : (
          <View style={styles.group}>
            {mode === 'otp' ? (
              <>
                {codeSent ? (
                  <>
                    <Text>
                      Enter the 6-digit code sent to {email}. It expires in 5
                      minutes.
                    </Text>
                    <Text style={styles.label}>Verification code</Text>
                    <TextInput
                      accessibilityLabel="Verification code"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                      editable={!pending}
                      style={styles.input}
                      onSubmitEditing={() => {
                        void submit();
                      }}
                    />
                    <Button
                      title={
                        pending && !sendingCode
                          ? 'Verifying…'
                          : 'Verify and sign in'
                      }
                      disabled={pending}
                      onPress={() => {
                        void submit();
                      }}
                    />
                    <Button
                      title={sendingCode ? 'Sending code…' : 'Resend code'}
                      disabled={pending}
                      onPress={() => {
                        void requestCode();
                      }}
                    />
                    <Button
                      title="Change email"
                      disabled={pending}
                      onPress={() => {
                        setCodeSent(false);
                        setOtp('');
                        setError(null);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Text>
                      Sign in or create an account with a code. No password
                      required.
                    </Text>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      accessibilityLabel="Email"
                      autoComplete="email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      editable={!pending}
                      style={styles.input}
                      onSubmitEditing={() => {
                        void requestCode();
                      }}
                    />
                    <Button
                      title={pending ? 'Sending code…' : 'Send code'}
                      disabled={pending}
                      onPress={() => {
                        void requestCode();
                      }}
                    />
                  </>
                )}
                <Button
                  title="Back to password sign-in"
                  disabled={pending}
                  onPress={() => {
                    setMode('signin');
                    setCodeSent(false);
                    setOtp('');
                    setError(null);
                  }}
                />
              </>
            ) : (
              <>
                {mode === 'signup' && (
                  <>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      accessibilityLabel="Name"
                      autoComplete="name"
                      value={name}
                      onChangeText={setName}
                      editable={!pending}
                      style={styles.input}
                    />
                  </>
                )}
                <Text style={styles.label}>Email</Text>
                <TextInput
                  accessibilityLabel="Email"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!pending}
                  style={styles.input}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  accessibilityLabel="Password"
                  autoComplete={
                    mode === 'signup' ? 'new-password' : 'current-password'
                  }
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!pending}
                  style={styles.input}
                  onSubmitEditing={() => {
                    void submit();
                  }}
                />
                {mode === 'signup' && (
                  <Text>Use at least 12 characters for your password.</Text>
                )}
                <Button
                  title={
                    pending
                      ? 'Please wait…'
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Sign in'
                  }
                  disabled={pending}
                  onPress={() => {
                    void submit();
                  }}
                />
                <Button
                  title={
                    mode === 'signup'
                      ? 'Already have an account? Sign in'
                      : 'New here? Create an account'
                  }
                  disabled={pending}
                  onPress={() => {
                    setMode(mode === 'signup' ? 'signin' : 'signup');
                    setError(null);
                    setPassword('');
                  }}
                />
                <Button
                  title="Continue with email code"
                  disabled={pending}
                  onPress={() => {
                    setMode('otp');
                    setError(null);
                    setPassword('');
                  }}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 20 },
  group: { gap: 14 },
  eyebrow: {
    color: '#3857a6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: { color: '#182237', fontSize: 36, fontWeight: '700' },
  name: { color: '#182237', fontSize: 24, fontWeight: '600' },
  label: { color: '#182237', fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#6b7890',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fff',
    color: '#182237',
    fontSize: 16,
  },
  error: { color: '#a02121', fontSize: 16 },
});
