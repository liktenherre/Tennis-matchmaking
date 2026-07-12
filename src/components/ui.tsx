// Provides the small accessible component set used by Côte Tennis screens.

import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        gap: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.canvas,
      }}
    >
      {children}
    </ScrollView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
}: ButtonProps) {
  const backgroundColor =
    variant === 'primary'
      ? colors.court
      : variant === 'danger'
        ? colors.danger
        : colors.surface;
  const textColor = variant === 'secondary' ? colors.ink : colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        backgroundColor,
        borderColor: variant === 'secondary' ? colors.border : backgroundColor,
        borderWidth: 1,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
      })}
    >
      {loading ? <ActivityIndicator color={textColor} /> : icon}
      <Text style={{ color: textColor, fontSize: 17, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, ...inputProps }: FieldProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...inputProps}
        style={[
          {
            minHeight: 52,
            borderRadius: radius.sm,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            color: colors.ink,
            fontSize: 17,
            paddingHorizontal: spacing.md,
          },
          inputProps.style,
        ]}
      />
      {error ? (
        <Text selectable accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.court : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.court : colors.border,
      }}
    >
      <Text style={{ color: selected ? colors.surface : colors.ink, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
