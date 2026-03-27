import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import AppColors from '../../../theme/colors';
import {radius} from '../../../theme/radius';

const RISK_RED = '#DC2626';

function safeParsePct(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }
  const s = String(raw).trim().replace('%', '').replace(',', '');
  if (!s) {
    return null;
  }
  const n = Number(s);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

function returnColor(raw) {
  const n = safeParsePct(raw);
  if (n === null) {
    return AppColors.textSecondary;
  }
  return n >= 0 ? AppColors.success : RISK_RED;
}

function formatPctSigned(raw) {
  const n = safeParsePct(raw);
  if (n === null) {
    return '—';
  }
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function FundLogo({logoUrl, name}) {
  if (logoUrl) {
    return <Image source={{uri: logoUrl}} style={styles.logo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase?.() ?? '?';
  return (
    <View style={[styles.logo, styles.logoPlaceholder]}>
      <Text style={styles.logoLetter}>{letter}</Text>
    </View>
  );
}

export default function FundListItem({fund, onPress, returnPeriodKey = '3y'}) {
  const name = fund?.name ?? '';
  const rating = fund?.rating ?? 4;
  const meta = fund?.metaText ?? '';
  const returnVal =
    returnPeriodKey === '1y'
      ? fund?.return1y
      : returnPeriodKey === '5y'
        ? fund?.return5y
        : returnPeriodKey === '7y'
          ? fund?.return7y
          : fund?.return3y;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.row}>
      <View style={styles.left}>
        <FundLogo logoUrl={fund?.logo_url} name={name} />
        <View style={styles.middle}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta} · ★ {rating}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.returnVal, {color: returnColor(returnVal)}]} numberOfLines={1}>
          {formatPctSigned(returnVal)}
        </Text>
        <Text style={styles.period}>
          {returnPeriodKey === '1y' ? '1Y' : returnPeriodKey === '5y' ? '5Y' : returnPeriodKey === '7y' ? '7Y' : '3Y'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  left: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  logo: {width: 38, height: 38, borderRadius: radius.input, backgroundColor: '#F3F4F6'},
  logoPlaceholder: {alignItems: 'center', justifyContent: 'center'},
  logoLetter: {fontSize: 14, fontWeight: '500', color: AppColors.primary},
  middle: {flex: 1, minWidth: 0},
  name: {fontSize: 13, fontWeight: '500', color: AppColors.textPrimary},
  meta: {fontSize: 12, color: AppColors.textSecondary, marginTop: 4},
  right: {alignItems: 'flex-end', minWidth: 92},
  returnVal: {fontSize: 13, fontWeight: '500'},
  period: {fontSize: 11, color: AppColors.textSecondary, marginTop: 4, fontWeight: '500'},
});

