// Accessible Broadcast Scoreboard UI primitives styled with NativeWind.

import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from '@/tw';
import type { TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-canvas"
      contentContainerClassName="grow gap-6 p-6"
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
  variant?: 'primary' | 'secondary' | 'danger' | 'lime';
  icon?: ReactNode;
  className?: string;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  className,
}: ButtonProps) {
  const variants = {
    primary: 'bg-ink border-ink',
    lime: 'bg-lime border-lime',
    secondary: 'bg-surface border-border',
    danger: 'bg-danger border-danger',
  } as const;

  const labelColors = {
    primary: 'text-canvas',
    lime: 'text-ink',
    secondary: 'text-ink',
    danger: 'text-surface',
  } as const;

  const spinner =
    variant === 'lime' || variant === 'secondary' ? colors.ink : colors.canvas;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      className={cn(
        'min-h-[52px] flex-row items-center justify-center gap-2 border px-6',
        'rounded-sm active:opacity-80',
        variants[variant],
        disabled && 'opacity-45',
        className,
      )}
    >
      {loading ? <ActivityIndicator color={spinner} /> : icon}
      <Text className={cn('font-sans-bold text-[17px]', labelColors[variant])}>
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, ...inputProps }: FieldProps) {
  return (
    <View className="gap-2">
      <Text className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...inputProps}
        className={cn(
          'min-h-[52px] rounded-sm border bg-surface px-4 font-sans text-[17px] text-ink',
          error ? 'border-danger' : 'border-border',
        )}
      />
      {error ? (
        <Text selectable accessibilityRole="alert" className="font-sans text-danger">
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
      className={cn(
        'min-h-11 items-center justify-center rounded-sm border px-4',
        selected ? 'border-ink bg-ink' : 'border-border bg-surface',
      )}
    >
      <Text
        className={cn(
          'font-sans-semibold text-[15px]',
          selected ? 'text-lime' : 'text-ink',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Eyebrow({ children, tone = 'muted' }: PropsWithChildren<{ tone?: 'muted' | 'lime' }>) {
  return (
    <Text
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.14em]',
        tone === 'lime' ? 'text-lime' : 'text-muted',
      )}
    >
      {children}
    </Text>
  );
}

export function DisplayTitle({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <Text className={cn('font-display text-[42px] leading-[0.9] tracking-[0.02em] text-ink', className)}>
      {children}
    </Text>
  );
}
