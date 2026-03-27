import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import AppColors from '../../../theme/colors';
import {radius} from '../../../theme/radius';
import {shadows} from '../../../theme/shadows';

const RISK_RED = '#DC2626';

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
    return AppColors.textSecondary;
  }
  return n >= 0 ? AppColors.success : AppColors.danger;
}

function FundLogo({logoUrl, name, size}) {
  if (logoUrl) {
    return <Image source={{uri: logoUrl}} style={[styles.logo, {width: size, height: size}]} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase?.() ?? '?';
  return (
    <View style={[styles.logo, styles.logoPlaceholder, {width: size, height: size}]}>
      <Text style={styles.logoLetter}>{letter}</Text>
    </View>
  );
}

export default function FundCard({fund, variant = 'popular', onPress}) {
  const name = fund?.name ?? '';
  const rating = fund?.rating ?? 4;
  const riskLabel = fund?.riskLabel ?? 'High Risk';
  const returnVal = fund?.return1y ?? fund?.return1yr ?? fund?.return1 ?? 0;

  const isRecent = variant === 'recent';

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.card, isRecent && styles.cardRecent]}>
      <View style={styles.topRow}>
        <FundLogo logoUrl={fund?.logo_url} name={name} size={isRecent ? 32 : 40} />
        <View style={styles.nameCol}>
          <Text style={styles.fundName} numberOfLines={2}>
            {name}
          </Text>
        </View>
        <View style={styles.returnCol}>
          <Text style={styles.period}>1 Yr.</Text>
          <Text style={[styles.returnVal, {color: returnColor(returnVal)}]}>
            {formatPct(returnVal)}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.ratingTxt}>{rating}</Text>
        </View>
        <View style={[styles.riskBadge, {backgroundColor: RISK_RED}]}>
          <Text style={styles.riskTxt} numberOfLines={1}>
            {riskLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 12,
    ...shadows.card,
  },
  cardRecent: {
    width: 220,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {borderRadius: 10, backgroundColor: '#F3F4F6'},
  logoPlaceholder: {alignItems: 'center', justifyContent: 'center'},
  logoLetter: {fontSize: 13, fontWeight: '500', color: AppColors.primary},
  nameCol: {flex: 1, minWidth: 0},
  fundName: {fontSize: 12, fontWeight: '500', color: AppColors.textPrimary, lineHeight: 16},
  returnCol: {alignItems: 'flex-end'},
  period: {fontSize: 10, color: AppColors.textSecondary, fontWeight: '500'},
  returnVal: {fontSize: 13, fontWeight: '500', marginTop: 2},
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  star: {color: '#9CA3AF', fontSize: 11},
  ratingTxt: {color: '#9CA3AF', fontSize: 11, fontWeight: '500'},
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 120,
  },
  riskTxt: {color: '#FFFFFF', fontSize: 10, fontWeight: '500'},
});

