import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {radius} from '../../../theme/radius';
import {shadows} from '../../../theme/shadows';
import {Textstyles} from '../../../utils';
import {useAppTheme} from '../../../theme/useAppTheme';
import {pickTrailingReturn} from './fundReturnDisplay';

function formatPct(raw) {
  const n = Number(raw);
  if (Number.isNaN(n)) {
    return '—';
  }
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function returnColor(raw) {
  const n = Number(raw);
  if (Number.isNaN(n)) {
    return '#9CA3AF';
  }
  return n >= 0 ? '#16A34A' : '#DC2626';
}

function riskColor(label, colors) {
  const t = String(label || '').toLowerCase();
  if (t.includes('high')) {
    return '#DC2626';
  }
  return colors.textSecondary;
}

function FundLogo({logoUrl, name, size, s}) {
  if (logoUrl) {
    return <Image source={{uri: logoUrl}} style={[s.logo, {width: size, height: size}]} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase?.() ?? '?';
  return (
    <View style={[s.logo, s.logoPlaceholder, {width: size, height: size}]}>
      <Text style={s.logoLetter}>{letter}</Text>
    </View>
  );
}

export default function FundCard({fund, variant = 'popular', onPress, cardWidth}) {
  const {colors, isDark} = useAppTheme();
  const styles = getStyles(colors, isDark);
  const name = fund?.name ?? '';
  const riskLabel = fund?.riskLabel ?? '—';
  const {period, value} = pickTrailingReturn(fund);

  const isRecent = variant === 'recent';
  const logoSize = 32;

  const widthStyle = isRecent
    ? cardWidth != null
      ? {width: cardWidth, alignSelf: 'flex-start'}
      : styles.cardRecent
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.card, !isRecent && styles.cardPopular, widthStyle]}>
      <View style={styles.topRow}>
        <FundLogo logoUrl={fund?.logo_url} name={name} size={logoSize} s={styles} />
        <View style={styles.nameCol}>
          <Text style={styles.fundName} numberOfLines={2}>
            {name}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
      <View style={styles.returnCol}>
          <Text style={styles.period}>{period}</Text>
          <Text style={[styles.returnVal, {color: returnColor(value)}]}>{value != null ? formatPct(value) : '—'}</Text>
        </View>
        <Text style={[styles.riskTxt, {color: riskColor(riskLabel, colors)}]} numberOfLines={1}>
          {riskLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    card: {
      minWidth: 0,
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      /* Match flat list rows in dark mode (border-only, no glow). */
      ...(isDark ? {} : shadows.card),
    },
    /** Grid: natural height (no stretch to row); same width as cell */
    cardPopular: {
      alignSelf: 'flex-start',
    },
    /** Fallback when parent does not pass `cardWidth` (e.g. horizontal list) */
    cardRecent: {
      width: 220,
      alignSelf: 'flex-start',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logo: {borderRadius: 10, backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6'},
    logoPlaceholder: {alignItems: 'center', justifyContent: 'center'},
    logoLetter: {fontSize: 13, fontWeight: '500', color: colors.primary},
    nameCol: {flex: 1, minWidth: 0},
    fundName: {fontSize: 12, fontWeight: '500', color: colors.textPrimary, lineHeight: 15},
    metricsRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
      minHeight: 28,
    },
    returnCol: {alignItems: 'flex-start', flexShrink: 0},
    period: {fontSize: 10, color: colors.textSecondary, fontWeight: '500'},
    returnVal: {fontSize: 13, fontWeight: '600', marginTop: 2},
    riskTxt: {
      ...Textstyles.medium,
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'right',
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },
  });
