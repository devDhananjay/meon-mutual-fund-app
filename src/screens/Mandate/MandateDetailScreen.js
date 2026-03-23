import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {pickStatus} from './mandateFieldUtils';
import {buildClientDataRows, buildBseDataRows, formatDetailTimestamp} from './mandateDetailLayout';
import {authenticateMandate} from './mandateAuthFlow';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const PRIMARY = '#1A73E8';

function StatusBadge({label}) {
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

function TabBar({active, onChange}) {
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

function DetailGrid({rows}) {
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
  const mandate = route.params?.mandate;

  const [tab, setTab] = useState('client');
  const [authBusy, setAuthBusy] = useState(false);

  const status = useMemo(() => pickStatus(mandate || {}), [mandate]);

  const clientRows = useMemo(() => buildClientDataRows(mandate), [mandate]);
  const bseRows = useMemo(() => buildBseDataRows(mandate), [mandate]);

  const created = useMemo(() => formatDetailTimestamp(mandate?.created_at), [mandate]);
  const updated = useMemo(() => formatDetailTimestamp(mandate?.updated_at ?? mandate?.modified_at), [mandate]);

  const onAuth = useCallback(async () => {
    if (!mandate) {
      return;
    }
    setAuthBusy(true);
    try {
      await authenticateMandate(navigation, mandate);
    } finally {
      setAuthBusy(false);
    }
  }, [mandate, navigation]);

  const tabTitle = tab === 'client' ? 'Client Data' : 'BSE Data';

  if (!mandate || typeof mandate !== 'object') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.missingBox}>
          <Text style={[Textstyles.medium, styles.missingTxt]}>No mandate data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mandate Details</Text>
        <TouchableOpacity
          style={styles.authLink}
          onPress={onAuth}
          disabled={authBusy}
          hitSlop={8}>
          {authBusy ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <Text style={styles.authLinkTxt}>Authenticate</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TabBar active={tab} onChange={setTab} />

        <View style={styles.subHead}>
          <Text style={styles.subHeadTitle}>{tabTitle}</Text>
          <StatusBadge label={status} />
        </View>

        {tab === 'client' ? <DetailGrid rows={clientRows} /> : <DetailGrid rows={bseRows} />}

        <View style={styles.footer}>
          <Text style={styles.footerLine}>Created at: {created}</Text>
          <Text style={styles.footerLine}>Updated on: {updated}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4},
  backChevron: {fontSize: 28, color: PRIMARY, marginRight: 2, marginTop: -2, fontWeight: '400'},
  backLabel: {fontSize: 16, color: PRIMARY, fontWeight: '600'},
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  authLink: {minWidth: 88, alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 4},
  authLinkTxt: {fontSize: 15, fontWeight: '700', color: PRIMARY},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingBottom: 32},
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    borderRadius: 10,
    padding: 4,
    marginTop: 12,
    marginBottom: 12,
  },
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8},
  tabOn: {backgroundColor: PRIMARY},
  tabTxt: {fontSize: 14, fontWeight: '600', color: '#5F6368'},
  tabTxtOn: {color: Colors.white},
  subHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subHeadTitle: {fontSize: 16, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  badge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8},
  badgeTxt: {fontSize: 11, fontWeight: '700', textTransform: 'capitalize'},
  gridCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 16,
  },
  gridRow: {flexDirection: 'row', marginHorizontal: -6, marginBottom: 12},
  gridHalf: {flex: 1, paddingHorizontal: 6, minWidth: 0},
  cellLabel: {fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4},
  cellVal: {fontSize: 14, color: '#111827'},
  footer: {marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB'},
  footerLine: {fontSize: 12, color: '#9CA3AF', marginBottom: 4},
  missingBox: {flex: 1, justifyContent: 'center', padding: 24},
  missingTxt: {textAlign: 'center', color: Colors.GREY},
});
