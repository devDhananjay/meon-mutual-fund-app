import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import Textstyles from '../../utils/text';
import {pickStatus, isEnachMandate} from './mandateFieldUtils';
import {buildClientDataRows, buildBseDataRows, formatDetailTimestamp} from './mandateDetailLayout';
import {authenticateMandate} from './mandateAuthFlow';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';
import {selectCanPostToBse} from '../../store/slices/authSlice';

function StatusBadge({label, styles, isDark}) {
  const raw = label || '—';
  const key = raw.replace(/\s+/g, '_').toUpperCase();
  let bg = '#F3F4F6';
  let fg = '#374151';

  if (key.includes('EXPIR') || key.includes('FAIL') || key.includes('REJECT') || key.includes('CANCEL')) {
    bg = '#FEE2E2';
    fg = '#DC2626';
  } else if (
    key.includes('SUCCESS') ||
    key.includes('ACTIVE') ||
    key.includes('APPROVED') ||
    key.includes('COMPLETE')
  ) {
    bg = '#DCFCE7';
    fg = '#15803D';
  } else if (key.includes('PROGRESS') || key.includes('PENDING') || key.includes('PROCESS')) {
    bg = '#FEF3C7';
    fg = '#D97706';
  }

  return (
    <View style={[styles.badge, {backgroundColor: bg}]}>
      <Text style={[styles.badgeTxt, {color: fg}]} numberOfLines={1}>
        {raw}
      </Text>
    </View>
  );
}

function TabBar({active, onChange, styles}) {
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, active === 'client' && styles.tabOn]}
        onPress={() => onChange('client')}
        activeOpacity={0.85}>
        <Text style={[styles.tabTxt, active === 'client' && styles.tabTxtOn]}>Client Data</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, active === 'bse' && styles.tabOn]}
        onPress={() => onChange('bse')}
        activeOpacity={0.85}>
        <Text style={[styles.tabTxt, active === 'bse' && styles.tabTxtOn]}>BSE Data</Text>
      </TouchableOpacity>
    </View>
  );
}

function DetailGrid({rows, styles}) {
  return (
    <View style={styles.gridCard}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((cell, ci) => {
            if (!cell.label && !cell.value) {
              return <View key={ci} style={styles.gridHalf} />;
            }
            return (
              <View key={ci} style={styles.gridHalf}>
                <Text style={styles.cellLabel}>{cell.label}</Text>
                <Text style={[Textstyles.medium, styles.cellVal]} numberOfLines={4}>
                  {cell.value || '—'}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function MandateDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => getMandateDetailStyles(colors, isDark), [colors, isDark]);
  const mandate = route.params?.mandate;
  const canPostToBse = useSelector(selectCanPostToBse);

  const [tab, setTab] = useState('client');
  const [authBusy, setAuthBusy] = useState(false);

  const status = useMemo(() => pickStatus(mandate || {}), [mandate]);
  const showAuthenticate = useMemo(() => isEnachMandate(mandate || {}), [mandate]);

  const clientRows = useMemo(() => buildClientDataRows(mandate), [mandate]);
  const bseRows = useMemo(() => buildBseDataRows(mandate), [mandate]);

  const created = useMemo(() => formatDetailTimestamp(mandate?.created_at), [mandate]);
  const updated = useMemo(() => formatDetailTimestamp(mandate?.updated_at ?? mandate?.modified_at), [mandate]);

  const onAuth = useCallback(async () => {
    if (!mandate || !canPostToBse || !showAuthenticate) {
      return;
    }
    setAuthBusy(true);
    try {
      await authenticateMandate(navigation, mandate);
    } finally {
      setAuthBusy(false);
    }
  }, [canPostToBse, mandate, navigation, showAuthenticate]);

  const tabTitle = tab === 'client' ? 'Client Data' : 'BSE Data';

  if (!mandate || typeof mandate !== 'object') {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={[styles.topBarSide, styles.topBarSideLeft]}>
            <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
          </View>
          <View style={styles.topBarFill} />
          <View style={[styles.topBarSide, styles.topBarSideRight]} />
        </View>
        <View style={styles.missingBox}>
          <Text style={[Textstyles.medium, styles.missingTxt]}>No mandate data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={[styles.topBarSide, styles.topBarSideLeft]}>
          <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
        </View>
        <Text style={styles.headerTitle}>Mandate Details</Text>
        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          {showAuthenticate ? (
            <TouchableOpacity
              style={[styles.authLink, !canPostToBse && styles.authLinkDisabled]}
              onPress={onAuth}
              disabled={authBusy || !canPostToBse}
              hitSlop={8}>
              {authBusy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.authLinkTxt, {color: canPostToBse ? colors.primary : colors.textSecondary}]}>
                  Authenticate
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TabBar active={tab} onChange={setTab} styles={styles} />

        <View style={styles.subHead}>
          <Text style={styles.subHeadTitle}>{tabTitle}</Text>
          <StatusBadge label={status} styles={styles} isDark={isDark} />
        </View>

        {tab === 'client' ? <DetailGrid rows={clientRows} styles={styles} /> : <DetailGrid rows={bseRows} styles={styles} />}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Created at: {created}</Text>
          <Text style={styles.footerLine}>Updated on: {updated}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getMandateDetailStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: c.background},
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 6,
      minHeight: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    topBarSide: {width: 88, height: 44, justifyContent: 'center'},
    topBarSideLeft: {alignItems: 'flex-start'},
    topBarSideRight: {alignItems: 'flex-end'},
    topBarFill: {flex: 1},
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
      marginHorizontal: 4,
    },
    authLink: {alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 4},
    authLinkDisabled: {opacity: 0.45},
    authLinkTxt: {fontSize: 15, fontWeight: '500', color: c.primary},
    scroll: {flex: 1},
    scrollContent: {paddingHorizontal: 16, paddingBottom: 32},
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#2C2C2C' : '#E8F0FE',
      borderRadius: 18,
      padding: 4,
      marginTop: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 15},
    tabOn: {backgroundColor: c.primary},
    tabTxt: {fontSize: 14, fontWeight: '600', color: c.textSecondary},
    tabTxtOn: {color: '#FFFFFF'},
    subHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    subHeadTitle: {fontSize: 16, fontWeight: '700', color: c.textPrimary},
    badge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8},
    badgeTxt: {fontSize: 11, fontWeight: '500', textTransform: 'capitalize'},
    gridCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      marginBottom: 16,
    },
    gridRow: {flexDirection: 'row', marginHorizontal: -6, marginBottom: 12},
    gridHalf: {flex: 1, paddingHorizontal: 6, minWidth: 0},
    cellLabel: {fontSize: 11, color: c.textSecondary, textTransform: 'uppercase', marginBottom: 4},
    cellVal: {fontSize: 14, color: c.textPrimary},
    footer: {marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border},
    footerLine: {fontSize: 12, color: c.textSecondary, marginBottom: 4},
    missingBox: {flex: 1, justifyContent: 'center', padding: 24},
    missingTxt: {textAlign: 'center', color: c.textSecondary},
  });
}
