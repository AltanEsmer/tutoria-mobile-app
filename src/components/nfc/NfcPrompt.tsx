import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { NfcRing } from './NfcRing';

interface NfcPromptProps {
  onScan?: () => void;
  onManualSubmit?: (moduleId: string) => void;
  isScanning?: boolean;
  nfcSupported?: boolean;
  nfcEnabled?: boolean;
  error?: string | null;
}

/**
 * NFC prompt card shown on Home screen.
 * Adapts UI based on scanning state and NFC availability.
 */
export function NfcPrompt({
  onScan,
  onManualSubmit,
  isScanning = false,
  nfcSupported = true,
  nfcEnabled = true,
  error,
}: NfcPromptProps) {
  const [manualCode, setManualCode] = useState('');

  const handleOpenSettings = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.NFC_SETTINGS').catch(() => {});
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleManualSubmit = useCallback(() => {
    const code = manualCode.trim();
    if (code && onManualSubmit) {
      onManualSubmit(code);
      setManualCode('');
    }
  }, [manualCode, onManualSubmit]);

  // NFC not supported — manual code entry fallback
  if (!nfcSupported) {
    return (
      <View style={styles.card}>
        <Text style={styles.emoji}>⌨️</Text>
        <Text style={styles.heading}>Enter lesson code manually</Text>
        <Text style={styles.body}>
          NFC is not available on this device. Ask your teacher for a lesson code.
        </Text>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="e.g. module-a"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleManualSubmit}
        />
        <Pressable
          style={[styles.actionButton, !manualCode.trim() && styles.disabledButton]}
          onPress={handleManualSubmit}
          disabled={!manualCode.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Start Lesson</Text>
        </Pressable>
      </View>
    );
  }

  // NFC supported but disabled in device settings
  if (!nfcEnabled) {
    return (
      <View style={styles.card}>
        <Text style={styles.emoji}>📵</Text>
        <Text style={styles.heading}>NFC is disabled</Text>
        <Text style={styles.body}>Please enable NFC in your device settings to scan cards.</Text>
        <Pressable
          style={styles.actionButton}
          onPress={handleOpenSettings}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && !isScanning && styles.cardPressed]}
      onPress={!isScanning ? onScan : undefined}
      accessibilityRole="button"
      accessibilityLabel={isScanning ? 'Scanning for NFC card' : 'Tap to scan NFC card'}
    >
      {isScanning ? (
        <>
          <NfcRing isScanning />
          <Text style={styles.heading}>Scanning…</Text>
          <Text style={styles.body}>Hold your NFC card close to the device</Text>
        </>
      ) : (
        <>
          <Text style={styles.emoji}>📲</Text>
          <Text style={styles.heading}>Ready to learn?</Text>
          <Text style={styles.body}>Tap here, then hold your NFC card to start a lesson</Text>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1F3A5F',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FDFBF7',
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: '#F0EDE6',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heading: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 18,
    color: '#1F3A5F',
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: '#2B2D42',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: '#E71D36',
    textAlign: 'center',
    marginTop: 10,
  },
  input: {
    marginTop: 16,
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: '#2B2D42',
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    marginTop: 12,
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
