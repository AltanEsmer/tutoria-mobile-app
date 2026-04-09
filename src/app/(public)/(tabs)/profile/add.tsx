import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createProfile } from '@/services/api';
import { useProfileStore } from '@/stores/useProfileStore';

const COLORS = {
  navy: '#1F3A5F',
  orange: '#FF9F1C',
  cream: '#FDFBF7',
  charcoal: '#2B2D42',
  coral: '#E71D36',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  lightGray: '#E5E7EB',
};

const AGE_MIN = 3;
const AGE_MAX = 18;
const NAME_MAX = 30;

export default function AddProfileScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { addProfile } = useProfileStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validateFields(): boolean {
    let valid = true;

    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    } else {
      setNameError(null);
    }

    if (age !== '') {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < AGE_MIN || ageNum > AGE_MAX) {
        setAgeError(`Age must be between ${AGE_MIN} and ${AGE_MAX}.`);
        valid = false;
      } else {
        setAgeError(null);
      }
    } else {
      setAgeError(null);
    }

    return valid;
  }

  async function handleCreate() {
    if (!validateFields()) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const profileId = await createProfile({ name: name.trim() });
      addProfile({
        id: profileId,
        name: name.trim(),
        user_id: userId ?? '',
        created_at: new Date().toISOString(),
      });
      router.back();
    } catch {
      setSubmitError('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (nameError) setNameError(null);
            }}
            placeholder="Enter name"
            placeholderTextColor={COLORS.gray}
            maxLength={NAME_MAX}
            autoCapitalize="words"
            returnKeyType="next"
            editable={!loading}
          />
          {nameError ? <Text style={styles.inlineError}>{nameError}</Text> : null}
          <Text style={styles.charCount}>
            {name.length}/{NAME_MAX}
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Age (optional)</Text>
          <TextInput
            style={[styles.input, ageError ? styles.inputError : null]}
            value={age}
            onChangeText={(text) => {
              const numeric = text.replace(/[^0-9]/g, '');
              setAge(numeric);
              if (ageError) setAgeError(null);
            }}
            placeholder={`${AGE_MIN}–${AGE_MAX}`}
            placeholderTextColor={COLORS.gray}
            keyboardType="numeric"
            maxLength={2}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            editable={!loading}
          />
          {ageError ? <Text style={styles.inlineError}>{ageError}</Text> : null}
        </View>

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <Pressable
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.createButtonText}>{loading ? 'Creating…' : 'Create Profile'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: COLORS.navy,
  },
  headerTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 24,
    color: COLORS.navy,
    flex: 1,
  },
  form: {
    padding: 20,
    gap: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 14,
    color: COLORS.charcoal,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: COLORS.charcoal,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.coral,
  },
  inlineError: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: COLORS.coral,
  },
  charCount: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'right',
  },
  submitError: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: COLORS.coral,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    paddingVertical: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: COLORS.white,
  },
});
