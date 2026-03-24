import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <View style={[styles.wrapper, style]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'outline' && styles.outline,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'outline' ? '#1F3A5F' : '#FFFFFF'} size="small" />
        ) : (
          <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 48,
  },
  base: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: '#FF9F1C',
  },
  secondary: {
    backgroundColor: '#1F3A5F',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#1F3A5F',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: 'Lexend_700Bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  outlineText: {
    color: '#1F3A5F',
  },
});
