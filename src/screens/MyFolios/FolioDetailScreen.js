import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import AppBackButton from '../../components/AppBackButton';
import Textstyles from '../../utils/text';
import {radius} from '../../theme/radius';
import {useAppTheme} from '../../theme/useAppTheme';

function headlineAccentBackgrounds(isDark) {
  return {
    gain: isDark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(22, 163, 74, 0.12)',
    loss: isDark ? 'rgba(248, 113, 113, 0.14)' : 'rgba(220, 38, 38, 0.1)',
    posPct: isDark ? 'rgba(30, 129, 242, 0.2)' : 'rgba(30, 129, 242, 0.09)',
    negPct: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(244, 63, 94, 0.1)',
  };
}

const TX_COLUMNS = [
  {key: 'folio_no', label: 'Folio No.'},
  {key: 'status', label: 'Status'},
  {key: 'transaction_date', label: 'Date'},
  {key: 'amount', label: 'Amount'},
  {key: 'units', label: 'Units'},
  {key: 'nav', label: 'NAV'},
  {key: 'order_no', label: 'Order No.'},
];

function formatInr(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  const isInt = Math.abs(n - Math.round(n)) < 0.000001;
  const digits = isInt ? 0 : 2;
  return `₹ ${n.toLocaleString('en-IN', {minimumFractionDigits: digits, maximumFractionDigits: digits})}`;
}

function formatPct(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return `${Number(value).toFixed(2)}%`;
}

function formatUnits(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return Number(value).toLocaleString('en-IN', {maximumFractionDigits: 4});
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
}

function renderMetricValue(key, value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && Number.isNaN(value))
  ) {
    return '—';
  }
  if (
    key === 'total_invested' ||
    key === 'current_holding' ||
    key === 'total_return' ||
    key === 'amount' ||
    key === 'signed_amount' ||
    key === 'nav'
  ) {
    return formatInr(value);
  }
  if (key === 'xirr') {
    return formatPct(value);
  }
  if (key === 'units') {
    return formatUnits(value);
  }
  if (key === 'transaction_date') {
    return formatDate(value);
  }
  return String(value);
}

function SummaryRow({label, value, valueColor, colors, isLast}) {
  return (
    <View
      style={[
        styles.summaryRow,
        {borderBottomColor: colors.border},
        isLast && styles.summaryRowLast,
      ]}>
      <Text style={[styles.summaryLabel, {color: colors.textSecondary}]}>{label}</Text>
      <Text style={[styles.summaryValue, {color: valueColor ?? colors.textPrimary}]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function MetricMini({label, value, colors}) {
  return (
    <View style={[styles.metricMini, {backgroundColor: colors.inputBg}]}>
      <Text style={[styles.metricMiniLabel, {color: colors.textSecondary}]}>{label}</Text>
      <Text style={[styles.metricMiniVal, {color: colors.textPrimary}]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function TransactionTableBlock({title, summary, transactions, colors, nestedSurface}) {
  const summaryRow = [
    {label: 'Invested', value: formatInr(summary?.total_invested)},
    {label: 'Current Value', value: formatInr(summary?.current_holding)},
    {label: 'Returns', value: formatInr(summary?.total_return)},
    {label: 'XIRR', value: formatPct(summary?.xirr)},
  ];

  return (
    <View style={[styles.sectionCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
      <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>{title}</Text>
      <Text style={[styles.sectionSub, {color: colors.textSecondary}]}>
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </Text>
      <View style={styles.metricGrid}>
        {summaryRow.map(row => (
          <MetricMini key={row.label} label={row.label} value={row.value} colors={colors} />
        ))}
      </View>
      <View style={styles.txList}>
        {transactions.map((tx, index) => (
          <View
            key={String(tx?.order_no ?? tx?.order_db_id ?? index)}
            style={[styles.txCard, {borderColor: colors.border, backgroundColor: nestedSurface}]}>
            {TX_COLUMNS.map(col => (
              <View key={col.key} style={styles.txFieldRow}>
                <Text style={[styles.txFieldLbl, {color: colors.textSecondary}]}>{col.label}</Text>
                <Text style={[styles.txFieldVal, {color: colors.textPrimary}]} numberOfLines={3}>
                  {renderMetricValue(col.key, tx?.[col.key])}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function LumpMetricCell({label, value, colors}) {
  return (
    <View style={styles.lumpCell}>
      <Text style={[styles.lumpFieldLabel, {color: colors.textSecondary}]}>{label}</Text>
      <Text style={[styles.lumpFieldValue, {color: colors.textPrimary}]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function LumpsumBlock({summary, transactions, schemeName, colors, nestedSurface, statusPillBg, primaryColor}) {
  const metricCards = [
    {label: 'Invested', value: formatInr(summary?.total_invested)},
    {label: 'Current Value', value: formatInr(summary?.current_holding)},
    {label: 'Returns', value: formatInr(summary?.total_return)},
    {label: 'XIRR', value: formatPct(summary?.xirr)},
  ];

  return (
    <View style={[styles.sectionCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
      <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>Lumpsum Transactions</Text>
      <Text style={[styles.sectionSub, {color: colors.textSecondary}]}>
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </Text>
      <View style={styles.metricGrid}>
        {metricCards.map(row => (
          <MetricMini key={row.label} label={row.label} value={row.value} colors={colors} />
        ))}
      </View>
      <View style={styles.txList}>
        {transactions.map((tx, index) => (
          <View
            key={String(tx?.order_no ?? tx?.order_db_id ?? index)}
            style={[styles.lumpCard, {borderColor: colors.border, backgroundColor: nestedSurface}]}>
            <View style={styles.lumpTop}>
              <View style={styles.lumpTitleCol}>
                <Text style={[styles.lumpScheme, {color: colors.textPrimary}]} numberOfLines={2}>
                  {tx?.scheme_name || schemeName || '—'}
                </Text>
                <Text style={[styles.lumpFolio, {color: colors.textSecondary}]}>
                  Folio No. {tx?.folio_no ?? '—'}
                </Text>
              </View>
              <View style={[styles.statusPill, {backgroundColor: statusPillBg}]}>
                <Text style={[styles.statusPillTxt, {color: primaryColor}]}>{tx?.status || 'Completed'}</Text>
              </View>
            </View>
            <View style={styles.lumpGrid}>
              <View style={[styles.lumpRow, styles.lumpRowFirst]}>
                <LumpMetricCell label="Date" value={formatDate(tx?.transaction_date)} colors={colors} />
                <LumpMetricCell label="Amount" value={formatInr(tx?.amount)} colors={colors} />
              </View>
              <View style={styles.lumpRow}>
                <LumpMetricCell label="Units" value={formatUnits(tx?.units)} colors={colors} />
                <LumpMetricCell label="NAV" value={formatInr(tx?.nav)} colors={colors} />
              </View>
              <View style={styles.lumpRowFull}>
                <LumpMetricCell label="Order No." value={tx?.order_no != null ? String(tx.order_no) : '—'} colors={colors} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FolioDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const folio = route.params?.folio;

  const nestedSurface = isDark ? '#2A2A2A' : '#F3F4F6';
  const statusPillBg = isDark ? 'rgba(30, 129, 242, 0.22)' : 'rgba(30, 129, 242, 0.1)';
  const accentBgs = useMemo(() => headlineAccentBackgrounds(isDark), [isDark]);
  const heroTagBg = isDark ? 'rgba(30, 129, 242, 0.14)' : 'rgba(30, 129, 242, 0.08)';

  const transactionSections = useMemo(() => {
    if (!folio) {
      return [];
    }
    return [
      {
        key: 'sip',
        title: 'SIP Transactions',
        type: 'table',
        summary: folio.sip,
        transactions: folio.sip?.transactions || [],
      },
      {
        key: 'xsip',
        title: 'XSIP Transactions',
        type: 'table',
        summary: folio.xsip,
        transactions: folio.xsip?.transactions || [],
      },
      {
        key: 'lumpsum',
        title: 'Lumpsum Transactions',
        type: 'cards',
        summary: folio.lumpsum,
        transactions: folio.lumpsum?.transactions || [],
      },
    ].filter(s => s.transactions.length > 0);
  }, [folio]);

  const activeModes = useMemo(() => {
    if (!folio) {
      return '';
    }
    return ['sip', 'xsip', 'lumpsum']
      .filter(mode => (folio[mode]?.transactions || []).length > 0)
      .map(m => m.toUpperCase())
      .join(', ');
  }, [folio]);

  const headlineStats = useMemo(() => {
    if (!folio) {
      return [];
    }
    const totalReturnValue = Number(folio.total_return || 0);
    const totalReturnPercentage = Number(folio.total_return_per || 0);
    const gainC = colors.success;
    const lossC = colors.danger;
    const returnTone = totalReturnValue > 0 ? gainC : totalReturnValue < 0 ? lossC : colors.textPrimary;
    const returnPercentTone =
      totalReturnPercentage > 0 ? gainC : totalReturnPercentage < 0 ? lossC : colors.textPrimary;

    const retDisplay =
      folio.total_return === null || folio.total_return === undefined
        ? '—'
        : `${totalReturnValue >= 0 ? '+' : '-'}${formatInr(Math.abs(totalReturnValue))}`;

    return [
      {label: 'Invested Value', value: formatInr(folio.amount), tone: colors.textPrimary, bg: colors.inputBg},
      {label: 'Current Value', value: formatInr(folio.current_holding), tone: colors.textPrimary, bg: colors.inputBg},
      {
        label: 'Total Returns',
        value: retDisplay,
        tone: returnTone,
        bg: totalReturnValue >= 0 ? accentBgs.gain : accentBgs.loss,
      },
      {
        label: 'Return %',
        value: formatPct(folio.total_return_per),
        tone: returnPercentTone,
        bg: totalReturnPercentage >= 0 ? accentBgs.posPct : accentBgs.negPct,
      },
    ];
  }, [folio, colors.textPrimary, colors.success, colors.danger, colors.inputBg, accentBgs]);

  const folioDetails = useMemo(() => {
    if (!folio) {
      return [];
    }
    return [
      {label: 'Folio No.', value: folio.folio_no ?? '—'},
      {label: 'Units', value: formatUnits(folio.units)},
      {label: 'XIRR', value: formatPct(folio.xirr)},
      {label: 'Current NAV', value: formatInr(folio.current_nav)},
      {label: 'Scheme Code', value: folio.scheme_code ?? '—'},
      {label: 'ISIN', value: folio.isin ?? '—'},
    ];
  }, [folio]);

  if (!folio) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
        <View style={[styles.headerRow, {borderBottomColor: colors.border}]}>
          <AppBackButton onPress={() => navigation.goBack()} forHeader />
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>Folio</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyBox}>
          <Text style={[Textstyles.medium, {color: colors.textSecondary}]}>Folio details not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const schemeTitle = folio.scheme_name ?? folio.base_scheme_name ?? 'Folio';

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <View style={[styles.headerRow, {borderBottomColor: colors.border}]}>
        <AppBackButton onPress={() => navigation.goBack()} forHeader />
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]} numberOfLines={1}>
          {schemeTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {backgroundColor: colors.background}]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.heroCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={[styles.heroKicker, {color: colors.textSecondary}]}>FOLIO SUMMARY</Text>
          <Text style={[styles.heroName, {color: colors.textPrimary}]}>{schemeTitle}</Text>
          <View style={styles.heroTagRow}>
            <View style={[styles.heroTag, {backgroundColor: heroTagBg, borderColor: colors.primary}]}>
              <Text style={[styles.heroTagTxt, {color: colors.primary}]} numberOfLines={2}>
                {folio.amc_name || 'Portfolio'}
              </Text>
            </View>
            {activeModes ? (
              <View style={[styles.heroTag, {backgroundColor: heroTagBg, borderColor: colors.primary}]}>
                <Text style={[styles.heroTagTxt, {color: colors.primary}]} numberOfLines={2}>
                  {activeModes}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.headlineGrid}>
            {headlineStats.map(item => (
              <View
                key={item.label}
                style={[
                  styles.headlineCell,
                  {backgroundColor: item.bg},
                ]}>
                <Text style={[styles.headlineLbl, {color: colors.textSecondary}]}>{item.label}</Text>
                <Text style={[styles.headlineVal, {color: item.tone}]} numberOfLines={3}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.detailsCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <Text style={[styles.detailsTitle, {color: colors.textPrimary}]}>Folio Details</Text>
          {folioDetails.map((row, idx) => (
            <SummaryRow
              key={row.label}
              label={row.label}
              value={row.value}
              colors={colors}
              isLast={idx === folioDetails.length - 1}
            />
          ))}
        </View>

        {transactionSections.map(section =>
          section.type === 'table' ? (
            <TransactionTableBlock
              key={section.key}
              title={section.title}
              summary={section.summary}
              transactions={section.transactions}
              colors={colors}
              nestedSurface={nestedSurface}
            />
          ) : (
            <LumpsumBlock
              key={section.key}
              summary={section.summary}
              transactions={section.transactions}
              schemeName={schemeTitle}
              colors={colors}
              nestedSurface={nestedSurface}
              statusPillBg={statusPillBg}
              primaryColor={colors.primary}
            />
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {...Textstyles.heading, flex: 1, fontSize: 17, textAlign: 'center', paddingHorizontal: 4},
  headerSpacer: {width: 44},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, flexGrow: 1},
  emptyBox: {padding: 24, alignItems: 'center'},
  heroCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  heroKicker: {...Textstyles.medium, fontSize: 10, letterSpacing: 1.2, marginBottom: 6},
  heroName: {...Textstyles.heading, fontSize: 18, lineHeight: 24},
  heroTagRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10},
  heroTag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    maxWidth: '100%',
  },
  heroTagTxt: {...Textstyles.medium, fontSize: 11, fontWeight: '600'},
  headlineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    justifyContent: 'space-between',
    rowGap: 10,
  },
  headlineCell: {width: '48%', borderRadius: 12, padding: 12},
  headlineLbl: {...Textstyles.medium, fontSize: 11},
  headlineVal: {...Textstyles.heading, fontSize: 15, marginTop: 4},
  detailsCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    marginBottom: 12,
  },
  detailsTitle: {...Textstyles.heading, fontSize: 15, marginBottom: 8},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryRowLast: {borderBottomWidth: 0},
  summaryLabel: {...Textstyles.normal, fontSize: 14, flexShrink: 0, maxWidth: '42%', paddingRight: 8},
  summaryValue: {
    ...Textstyles.medium,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  sectionCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {...Textstyles.heading, fontSize: 16},
  sectionSub: {...Textstyles.normal, fontSize: 13, marginTop: 4},
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    justifyContent: 'space-between',
    rowGap: 10,
  },
  metricMini: {width: '48%', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10},
  metricMiniLabel: {fontSize: 11},
  metricMiniVal: {...Textstyles.medium, fontSize: 13, fontWeight: '600', marginTop: 4},
  txList: {marginTop: 14, gap: 10},
  txCard: {borderRadius: 12, borderWidth: 1, padding: 12},
  txFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  txFieldLbl: {fontSize: 12, flexShrink: 0, width: '38%', paddingRight: 8},
  txFieldVal: {
    ...Textstyles.medium,
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
    minWidth: 0,
  },
  lumpCard: {borderRadius: 12, borderWidth: 1, padding: 14},
  lumpTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10},
  lumpTitleCol: {flex: 1, minWidth: 0},
  lumpScheme: {...Textstyles.medium, fontSize: 14, fontWeight: '600'},
  lumpFolio: {fontSize: 13, marginTop: 4},
  statusPill: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5},
  statusPillTxt: {...Textstyles.medium, fontSize: 11, fontWeight: '600'},
  lumpGrid: {marginTop: 10},
  lumpRow: {flexDirection: 'row', alignItems: 'stretch', gap: 12, marginTop: 12},
  lumpRowFirst: {marginTop: 0},
  lumpRowFull: {marginTop: 12, width: '100%'},
  lumpCell: {flex: 1, minWidth: 0},
  lumpFieldLabel: {...Textstyles.medium, fontSize: 11, fontWeight: '500', marginBottom: 4},
  lumpFieldValue: {...Textstyles.medium, fontSize: 13, fontWeight: '600', lineHeight: 18},
});
