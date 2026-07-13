// Lets players update the discovery radius, age range, level, and availability.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Chip, Eyebrow, Field, Screen } from '@/components/ui';
import type { MatchFormat, TennisLevel } from '@/features/matching/matching';
import { supabase } from '@/lib/supabase';
import { Text, View } from '@/tw';

const allLevels: TennisLevel[] = ['beginner', 'intermediate', 'advanced', 'competition'];
const availabilityOptions = [
  ['weekday_morning', 'Semaine matin'],
  ['weekday_evening', 'Semaine soir'],
  ['weekend_morning', 'Week-end matin'],
  ['weekend_afternoon', 'Week-end après-midi'],
] as const;

const toggle = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export default function FiltersScreen() {
  const { t } = useTranslation();
  const [distance, setDistance] = useState('25');
  const [minimumAge, setMinimumAge] = useState('18');
  const [maximumAge, setMaximumAge] = useState('70');
  const [levels, setLevels] = useState<TennisLevel[]>(allLevels);
  const [format, setFormat] = useState<MatchFormat>('either');
  const [genderPreference, setGenderPreference] = useState<'women' | 'men' | 'everyone'>(
    'everyone',
  );
  const [availability, setAvailability] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void supabase
      .from('discovery_preferences')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setDistance(String(data.maximum_distance_km));
        setMinimumAge(String(data.minimum_age));
        setMaximumAge(String(data.maximum_age));
        setLevels(data.levels);
        setFormat(data.preferred_format);
        setGenderPreference(data.gender_preference);
        setAvailability(data.availability);
      });
  }, []);

  const save = async () => {
    const parsedDistance = Number(distance);
    const parsedMinimumAge = Number(minimumAge);
    const parsedMaximumAge = Number(maximumAge);
    const validRanges =
      Number.isFinite(parsedDistance) &&
      parsedDistance >= 2 &&
      parsedDistance <= 100 &&
      Number.isInteger(parsedMinimumAge) &&
      Number.isInteger(parsedMaximumAge) &&
      parsedMinimumAge >= 18 &&
      parsedMaximumAge <= 99 &&
      parsedMinimumAge <= parsedMaximumAge;
    if (!validRanges) {
      setError(t('filters.invalidRange'));
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    setIsSaving(true);

    const { error: saveError } = await supabase.from('discovery_preferences').upsert({
      user_id: user.user.id,
      maximum_distance_km: parsedDistance,
      minimum_age: parsedMinimumAge,
      maximum_age: parsedMaximumAge,
      levels,
      preferred_format: format,
      gender_preference: genderPreference,
      availability,
    });

    setIsSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.back();
  };

  return (
    <Screen>
      <Field
        label={t('filters.distance')}
        value={distance}
        keyboardType="number-pad"
        onChangeText={setDistance}
      />
      <View className="flex-row gap-4">
        <View className="flex-1">
          <Field
            label={t('filters.minimumAge')}
            value={minimumAge}
            keyboardType="number-pad"
            onChangeText={setMinimumAge}
          />
        </View>
        <View className="flex-1">
          <Field
            label={t('filters.maximumAge')}
            value={maximumAge}
            keyboardType="number-pad"
            onChangeText={setMaximumAge}
          />
        </View>
      </View>
      <Eyebrow>{t('filters.levels')}</Eyebrow>
      <View className="flex-row flex-wrap gap-2">
        {allLevels.map((level) => (
          <Chip
            key={level}
            label={{
              beginner: t('onboarding.beginner'),
              intermediate: t('onboarding.intermediate'),
              advanced: t('onboarding.advanced'),
              competition: t('onboarding.competition'),
            }[level]}
            selected={levels.includes(level)}
            onPress={() => setLevels(toggle(levels, level))}
          />
        ))}
      </View>
      <Eyebrow>{t('filters.format')}</Eyebrow>
      <View className="flex-row flex-wrap gap-2">
        {(['singles', 'doubles', 'either'] as MatchFormat[]).map((item) => (
          <Chip
            key={item}
            label={{
              singles: t('onboarding.singles'),
              doubles: t('onboarding.doubles'),
              either: t('onboarding.either'),
            }[item]}
            selected={format === item}
            onPress={() => setFormat(item)}
          />
        ))}
      </View>
      <Eyebrow>{t('filters.availability')}</Eyebrow>
      <View className="flex-row flex-wrap gap-2">
        {availabilityOptions.map(([value]) => (
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
            selected={availability.includes(value)}
            onPress={() => setAvailability(toggle(availability, value))}
          />
        ))}
      </View>
      <Eyebrow>{t('filters.partnerPreference')}</Eyebrow>
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
            selected={genderPreference === value}
            onPress={() => setGenderPreference(value)}
          />
        ))}
      </View>
      {error ? (
        <Text selectable accessibilityRole="alert" className="font-sans text-danger">
          {error}
        </Text>
      ) : null}
      <Button
        label={t('filters.save')}
        variant="lime"
        onPress={save}
        loading={isSaving}
        disabled={levels.length === 0}
      />
    </Screen>
  );
}
