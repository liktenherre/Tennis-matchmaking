// Collects the minimum profile, tennis, location, and preference data in four steps.

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { use, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Chip, DisplayTitle, Eyebrow, Field, Screen } from '@/components/ui';
import { toggleMatchFormats } from '@/features/matching/formats';
import type { MatchFormat, TennisLevel } from '@/features/matching/matching';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { SessionContext } from '@/providers/session-provider';
import { Pressable, Text, View } from '@/tw';
import { Image } from '@/tw/image';

const cities = ['Nice', 'Antibes', 'Cannes', 'Cagnes-sur-Mer', 'Menton', 'Grasse'];
const courts = [
  'Nice Lawn Tennis Club',
  'Parc Impérial',
  'Tennis Club Antibes',
  'ASLM Cannes',
  'Tennis Club Cagnes-sur-Mer',
  'Tennis Club Menton',
];
const availabilityOptions = [
  'weekday_morning',
  'weekday_evening',
  'weekend_morning',
  'weekend_afternoon',
] as const;

type FormState = {
  firstName: string;
  birthYear: string;
  bio: string;
  photoUri: string;
  gender: 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';
  genderPreference: 'women' | 'men' | 'everyone';
  level: TennisLevel;
  formats: MatchFormat[];
  city: string;
  latitude: number | null;
  longitude: number | null;
  courts: string[];
  availability: string[];
  maximumDistanceKm: number;
  minimumAge: number;
  maximumAge: number;
};

const initialState: FormState = {
  firstName: '',
  birthYear: '',
  bio: '',
  photoUri: '',
  gender: 'prefer_not_to_say',
  genderPreference: 'everyone',
  level: 'intermediate',
  formats: ['either'],
  city: 'Nice',
  latitude: null,
  longitude: null,
  courts: [],
  availability: [],
  maximumDistanceKm: 25,
  minimumAge: 18,
  maximumAge: 70,
};

const toggle = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { session, refreshProfile } = use(SessionContext);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [error, setError] = useState('');
  const draftKey = session?.user.id
    ? `cote-tennis:onboarding-draft:${session.user.id}`
    : null;

  const progress = useMemo(() => `${step + 1} / 4`, [step]);
  const birthYear = Number(form.birthYear);
  const validBirthYear =
    /^\d{4}$/.test(form.birthYear) &&
    birthYear >= 1900 &&
    birthYear <= new Date().getFullYear() - 18;

  // Restores interrupted onboarding so phone calls or app closes do not lose progress.
  useEffect(() => {
    if (!draftKey) return;
    setIsDraftHydrated(false);
    void AsyncStorage.getItem(draftKey).then((draft) => {
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as { step: number; form: FormState };
          setStep(Math.min(Math.max(parsed.step, 0), 3));
          setForm({ ...initialState, ...parsed.form });
        } catch {
          void AsyncStorage.removeItem(draftKey);
        }
      }
      setIsDraftHydrated(true);
    });
  }, [draftKey]);

  // Persists only onboarding inputs; authentication remains in the Supabase session store.
  useEffect(() => {
    if (!isDraftHydrated || !draftKey) return;
    void AsyncStorage.setItem(draftKey, JSON.stringify({ step, form }));
  }, [draftKey, isDraftHydrated, step, form]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled) setForm({ ...form, photoUri: result.assets[0]?.uri ?? '' });
  };

  const useLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        t('onboarding.locationOptional'),
        t('onboarding.locationOptionalBody'),
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setForm({
      ...form,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };

  const canContinue =
    (step !== 0 ||
      (form.firstName.trim().length >= 2 &&
        validBirthYear)) &&
    (step !== 2 || form.city.length > 0) &&
    (step !== 3 || form.availability.length > 0);

  const complete = async () => {
    if (!session?.user.id) return;
    setIsSaving(true);
    setError('');
    let photoPath: string | null = null;

    try {
      if (form.photoUri) {
        const image = await fetch(form.photoUri);
        const bytes = await image.arrayBuffer();
        photoPath = `${session.user.id}/primary.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(photoPath, bytes, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
      }

      const { error: onboardingError } = await supabase.rpc('complete_onboarding', {
        first_name_input: form.firstName.trim(),
        birth_year_input: Number(form.birthYear),
        bio_input: form.bio.trim(),
        gender_input: form.gender,
        level_input: form.level,
        formats_input: form.formats,
        city_input: form.city,
        longitude_input: form.longitude,
        latitude_input: form.latitude,
        photo_path_input: photoPath,
        court_names_input: form.courts,
        availability_input: form.availability,
        maximum_distance_input: form.maximumDistanceKm,
        minimum_age_input: form.minimumAge,
        maximum_age_input: form.maximumAge,
        gender_preference_input: form.genderPreference,
      });

      if (onboardingError) {
        if (photoPath) await supabase.storage.from('profile-photos').remove([photoPath]);
        throw onboardingError;
      }

      await refreshProfile();
      if (draftKey) await AsyncStorage.removeItem(draftKey);
      void track('onboarding_completed', { steps: 4 });
      router.replace('/free');
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : t('onboarding.completeError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[12px] uppercase tracking-[0.14em] text-lime">
          Côte Tennis
        </Text>
        <Text className="font-score text-[18px] text-ink">{progress}</Text>
      </View>

      {step === 0 ? (
        <>
          <DisplayTitle>{t('onboarding.profileTitle')}</DisplayTitle>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.addPhoto')}
            onPress={pickPhoto}
            className="self-center"
          >
            {form.photoUri ? (
              <Image
                source={form.photoUri}
                className="h-40 w-32 rounded-md object-cover"
              />
            ) : (
              <View className="h-40 w-32 items-center justify-center rounded-md border border-dashed border-border bg-surface">
                <Text className="font-sans-bold text-ink">{t('onboarding.addPhoto')}</Text>
              </View>
            )}
          </Pressable>
          <Field
            label={t('onboarding.firstName')}
            value={form.firstName}
            onChangeText={(firstName) => setForm({ ...form, firstName })}
            textContentType="givenName"
          />
          <Field
            label={t('onboarding.birthYear')}
            value={form.birthYear}
            onChangeText={(birthYear) =>
              setForm({ ...form, birthYear: birthYear.replace(/\D/g, '').slice(0, 4) })
            }
            keyboardType="number-pad"
          />
          <Field
            label={t('onboarding.about')}
            value={form.bio}
            onChangeText={(bio) => setForm({ ...form, bio: bio.slice(0, 180) })}
            multiline
            placeholder={t('onboarding.aboutPlaceholder')}
          />
          <Eyebrow>{t('onboarding.identity')}</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                ['woman', t('onboarding.woman')],
                ['man', t('onboarding.man')],
                ['non_binary', t('onboarding.nonBinary')],
                ['prefer_not_to_say', t('onboarding.undisclosed')],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={form.gender === value}
                onPress={() => setForm({ ...form, gender: value })}
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <DisplayTitle>{t('onboarding.tennisTitle')}</DisplayTitle>
          <Eyebrow>{t('onboarding.currentLevel')}</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {(['beginner', 'intermediate', 'advanced', 'competition'] as TennisLevel[]).map(
              (level) => (
                <Chip
                  key={level}
                  label={
                    {
                      beginner: t('onboarding.beginner'),
                      intermediate: t('onboarding.intermediate'),
                      advanced: t('onboarding.advanced'),
                      competition: t('onboarding.competition'),
                    }[level]
                  }
                  selected={form.level === level}
                  onPress={() => setForm({ ...form, level })}
                />
              ),
            )}
          </View>
          <Eyebrow>{t('onboarding.preferredFormat')}</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {(['singles', 'doubles', 'either'] as MatchFormat[]).map((format) => (
              <Chip
                key={format}
                label={{
                  singles: t('onboarding.singles'),
                  doubles: t('onboarding.doubles'),
                  either: t('onboarding.either'),
                }[format]}
                selected={form.formats.includes(format)}
                onPress={() =>
                  setForm({ ...form, formats: toggleMatchFormats(form.formats, format) })
                }
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <DisplayTitle>{t('onboarding.locationTitle')}</DisplayTitle>
          <View className="flex-row flex-wrap gap-2">
            {cities.map((city) => (
              <Chip
                key={city}
                label={city}
                selected={form.city === city}
                onPress={() => setForm({ ...form, city })}
              />
            ))}
          </View>
          <Button
            label={
              form.latitude ? t('onboarding.locationAdded') : t('onboarding.useLocation')
            }
            onPress={useLocation}
            variant="secondary"
          />
          <Eyebrow>{t('onboarding.preferredCourts')}</Eyebrow>
          <View className="gap-2">
            {courts.map((court) => (
              <Chip
                key={court}
                label={court}
                selected={form.courts.includes(court)}
                onPress={() => setForm({ ...form, courts: toggle(form.courts, court) })}
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <DisplayTitle>{t('onboarding.availabilityTitle')}</DisplayTitle>
          <View className="flex-row flex-wrap gap-2">
            {availabilityOptions.map((value) => (
              <Chip
                key={value}
                label={t(
                  {
                    weekday_morning: 'onboarding.weekdayMorning',
                    weekday_evening: 'onboarding.weekdayEvening',
                    weekend_morning: 'onboarding.weekendMorning',
                    weekend_afternoon: 'onboarding.weekendAfternoon',
                  }[value],
                )}
                selected={form.availability.includes(value)}
                onPress={() =>
                  setForm({ ...form, availability: toggle(form.availability, value) })
                }
              />
            ))}
          </View>
          <Text className="font-sans text-[15px] text-muted">
            {t('onboarding.preferenceHint')}
          </Text>
          <Eyebrow>{t('onboarding.partnerPreference')}</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                ['everyone', t('onboarding.everyone')],
                ['women', t('onboarding.women')],
                ['men', t('onboarding.men')],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={form.genderPreference === value}
                onPress={() => setForm({ ...form, genderPreference: value })}
              />
            ))}
          </View>
        </>
      ) : null}

      {error ? (
        <Text selectable accessibilityRole="alert" className="font-sans text-danger">
          {error}
        </Text>
      ) : null}

      <View className="mt-auto gap-2">
        <Button
          label={step === 3 ? t('onboarding.seePlayers') : t('common.continue')}
          variant="lime"
          disabled={!canContinue}
          loading={isSaving}
          onPress={() => (step === 3 ? void complete() : setStep(step + 1))}
        />
        {step > 0 ? (
          <Button
            label={t('onboarding.back')}
            variant="secondary"
            onPress={() => setStep(step - 1)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
