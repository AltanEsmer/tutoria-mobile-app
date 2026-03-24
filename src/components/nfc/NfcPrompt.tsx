import { StyleSheet, Text, View } from 'react-native';

export function NfcPrompt() {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>📲</Text>
      <Text style={styles.heading}>Ready to learn?</Text>
      <Text style={styles.body}>Tap your NFC card to start a lesson</Text>
    </View>
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
});
