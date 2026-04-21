import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

interface LoadingSpinnerProps {
  style?: ViewStyle;
  testID?: string;
}

export function LoadingSpinner({ style, testID }: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <ActivityIndicator color="#FF9F1C" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
