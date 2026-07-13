import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Appointment } from '../utils/supabase';
import { SIZES } from '../utils/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function extractMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // "YYYY-MM"
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTHS_FR[idx]} ${year}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MonthYearFilterProps {
  appointments: Appointment[];
  selectedMonth: string | null;      // "YYYY-MM" | null = "Tout"
  onSelectMonth: (month: string | null) => void;
  accentColor: string;
  lightColor: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MonthYearFilter: React.FC<MonthYearFilterProps> = ({
  appointments,
  selectedMonth,
  onSelectMonth,
  accentColor,
  lightColor,
}) => {
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    appointments.forEach((a) => keys.add(extractMonthKey(a.date)));
    return Array.from(keys).sort().reverse();
  }, [appointments]);

  if (monthKeys.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "Tout" chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            selectedMonth === null
              ? { backgroundColor: accentColor }
              : { backgroundColor: lightColor },
          ]}
          onPress={() => onSelectMonth(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              selectedMonth === null
                ? { color: '#FFFFFF' }
                : { color: accentColor },
            ]}
          >
            Tout
          </Text>
        </TouchableOpacity>

        {/* Month chips */}
        {monthKeys.map((key) => {
          const active = selectedMonth === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: accentColor }
                  : { backgroundColor: lightColor },
              ]}
              onPress={() => onSelectMonth(active ? null : key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  active
                    ? { color: '#FFFFFF' }
                    : { color: accentColor },
                ]}
              >
                {formatMonthLabel(key)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scrollContent: {
    paddingHorizontal: SIZES.LG,
    paddingVertical: SIZES.SM,
    gap: SIZES.SM,
  },
  chip: {
    paddingHorizontal: SIZES.MD,
    paddingVertical: SIZES.SM,
    borderRadius: SIZES.BORDER_RADIUS_FULL,
  },
  chipText: {
    fontSize: SIZES.FONT_SM,
    fontWeight: '600',
  },
});

export default MonthYearFilter;
