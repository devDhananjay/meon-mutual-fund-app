import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import AppBackButton from '../../components/AppBackButton';
import AppModal from '../../components/AppModal';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {radius} from '../../theme/radius';
import {useAppTheme} from '../../theme/useAppTheme';
import {selectCanPostToBse} from '../../store/slices/authSlice';
import {extractOrderAuthUrl, processOrderPayment, getPaymentProcessErrorMessage} from '../../services/ordersService';
import {appAlert} from '../../utils/appAlert';

const ALL_FOLIOS_VALUE = 'all';
const EMPTY_FOLIO_VALUE = '__empty_folio__';
const TX_TABS = [
  {label: 'One-time', value: 'one_time'},
  {label: 'SIP', value: 'sip'},
];

function maskBankAccount(user) {
  const bank = String(user?.bank_name || user?.bank || '').trim();
  const acc = String(user?.account_number || user?.bank_account_no || user?.bank_account_number || '').replace(/\s/g, '');
  if (!acc && !bank) {
    return 'Linked bank account';
  }
  const last4 = acc.length >= 4 ? acc.slice(-4) : acc;
  const masked = last4 ? `*****${last4}` : '*****';
  return bank ? `${bank} ${masked}` : masked;
}

function paymentModeLabel(mode, user) {
  if (mode === 'UPI') {
    return maskBankAccount(user);
  }
  if (mode === 'NODAL') {
    return 'Nodal payment option';
  }
  return 'Select your preferred payment option';
}

function SipPendingPaymentModal({
  visible,
  transaction,
  user,
  colors,
  isDark,
  canPostToBse,
  paying,
  onClose,
  onConfirmPay,
}) {
  const [step, setStep] = useState('summary');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('UPI');
  const [upiVpa, setUpiVpa] = useState('');

  useEffect(() => {
    if (!visible) {
      setStep('summary');
      setSelectedPaymentMode('UPI');
      setUpiVpa('');
    }
  }, [visible]);

  const amountLabel = formatInr(transaction?.amount);
  const submitDisabled = paying || !canPostToBse;
  const upiSub = maskBankAccount(user);

  const isValidUpi = value => /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$/.test(String(value || '').trim());

  const validateAndPay = async () => {
    if (!canPostToBse || paying) {
      return;
    }
    if (!selectedPaymentMode) {
      setStep('method');
      return;
    }
    if (selectedPaymentMode === 'UPI' && !isValidUpi(upiVpa)) {
      appAlert('UPI', 'Please enter a valid UPI VPA (example: name@bank).');
      setStep('method');
      return;
    }
    await onConfirmPay({
      transaction,
      mode: selectedPaymentMode,
      vpaId: selectedPaymentMode === 'UPI' ? String(upiVpa || '').trim() : '',
      neftReference: '',
    });
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title=""
      isBottomSheet={false}
      maxHeight={'88%'}>
      <View style={styles.payModalInner}>
        {step === 'method' ? (
          <>
            <View style={styles.payMethodHeader}>
              <TouchableOpacity style={styles.payModalBackRow} onPress={() => setStep('summary')} activeOpacity={0.85}>
                <Image source={Icons.BackIcon} style={[styles.payModalBackIcon, {tintColor: colors.textPrimary}]} resizeMode="contain" />
                <Text style={[styles.payModalBackTxt, {color: colors.textPrimary}]}>Back to Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.payModalClose, {backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6', alignSelf: 'center', marginBottom: 0}]} onPress={onClose} hitSlop={8}>
                <Text style={[styles.payModalCloseTxt, {color: colors.textPrimary}]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.payMethodsWrap, {borderColor: colors.border}]}>
              <View
                style={[
                  styles.payModeBlock,
                  selectedPaymentMode === 'UPI' && {backgroundColor: isDark ? 'rgba(30,129,242,0.12)' : '#F0F7FF'},
                ]}>
                <TouchableOpacity
                  style={styles.payModeRowInner}
                  onPress={() => setSelectedPaymentMode('UPI')}
                  activeOpacity={0.85}>
                  <View style={styles.choosePayIconWrap}>
                    <View style={[styles.choosePayTri, {backgroundColor: '#F97316', transform: [{rotate: '-20deg'}]}]} />
                    <View style={[styles.choosePayTri, styles.choosePayTriFront, {backgroundColor: '#22C55E'}]} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={[styles.payModeMain, {color: colors.textPrimary}]}>Send Payment Link via UPI</Text>
                    <Text style={[styles.payModeSub, {color: colors.textSecondary}]}>{upiSub}</Text>
                  </View>
                </TouchableOpacity>
                {selectedPaymentMode === 'UPI' ? (
                  <TextInput
                    style={[
                      styles.upiIdInput,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={upiVpa}
                    onChangeText={setUpiVpa}
                    placeholder="Enter Your UPI ID"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.payModeBlock,
                  styles.payModeRowInner,
                  selectedPaymentMode === 'NODAL' && {backgroundColor: isDark ? colors.inputBg : '#F3F4F6'},
                ]}
                onPress={() => setSelectedPaymentMode('NODAL')}
                activeOpacity={0.85}>
                <View style={[styles.nodalIconWrap, {borderColor: '#22C55E'}]}>
                  <Text style={styles.nodalIconTxt}>🏦</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={[styles.payModeMain, {color: colors.textPrimary}]}>Nodal payment option</Text>
                  <Text style={[styles.payModeSub, {color: colors.textSecondary}]}>
                    Pay securely via linked bank account
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.payContinueCta, submitDisabled && styles.txPayNowBtnDisabled]}
              onPress={() => {
                if (!selectedPaymentMode) {
                  appAlert('Payment', 'Please choose a payment method.');
                  return;
                }
                if (selectedPaymentMode === 'UPI' && !isValidUpi(upiVpa)) {
                  appAlert('UPI', 'Please enter a valid UPI VPA (example: name@bank).');
                  return;
                }
                setStep('summary');
              }}
              disabled={submitDisabled}
              activeOpacity={0.9}>
              <Text style={styles.payNowCtaTxt}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.payModalClose, {backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6'}]} onPress={onClose} hitSlop={8}>
              <Text style={[styles.payModalCloseTxt, {color: colors.textPrimary}]}>✕</Text>
            </TouchableOpacity>
            <View style={styles.payTypeTabs}>
              <View style={styles.payTypeTab}>
                <Text style={[styles.payTypeTabTxt, {color: colors.textSecondary}]}>One-time</Text>
              </View>
              <View style={[styles.payTypeTab, styles.payTypeTabOn]}>
                <Text style={[styles.payTypeTabTxt, styles.payTypeTabTxtOn, {color: colors.primary}]}>SIP</Text>
              </View>
            </View>

            <View style={[styles.payAmountBox, {borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : '#FFFFFF'}]}>
              <Text style={[styles.payAmountTxt, {color: colors.textPrimary}]}>{amountLabel}</Text>
            </View>

            <TouchableOpacity
              style={[styles.choosePayRow, {backgroundColor: isDark ? colors.inputBg : '#F3F4F6'}]}
              onPress={() => setStep('method')}
              activeOpacity={0.85}>
              <View style={styles.choosePayIconWrap}>
                <View style={[styles.choosePayTri, {backgroundColor: '#F97316', transform: [{rotate: '-20deg'}]}]} />
                <View style={[styles.choosePayTri, styles.choosePayTriFront, {backgroundColor: '#22C55E'}]} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[styles.choosePayTitle, {color: colors.textPrimary}]}>Choose Payment Method</Text>
                <Text style={[styles.choosePaySub, {color: colors.textSecondary}]} numberOfLines={1}>
                  {paymentModeLabel(selectedPaymentMode, user)}
                </Text>
              </View>
              <Image source={Icons.GoIcon} style={[styles.payModeChev, {tintColor: colors.textSecondary}]} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payNowCta, submitDisabled && styles.txPayNowBtnDisabled]}
              onPress={validateAndPay}
              disabled={submitDisabled}
              activeOpacity={0.9}>
              {paying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payNowCtaTxt}>Pay Now</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </AppModal>
  );
}

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
  {key: 'order_no', label: 'Order No.'},
  {key: 'status', label: 'Status'},
  {key: 'transaction_date', label: 'Date'},
  {key: 'amount', label: 'Amount'},
  {key: 'units', label: 'Unit'},
  {key: 'nav', label: 'NAV'},
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
  return d
    .toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'})
    .replace(/\//g, '-');
}

function toFiniteNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getTransactionFolioValue(transaction) {
  const folioNo = String(transaction?.folio_no || '').trim();
  return folioNo || EMPTY_FOLIO_VALUE;
}

function getTransactionFolioLabel(value) {
  return value === EMPTY_FOLIO_VALUE ? 'No Folio' : value;
}

function getUniqueFolioOptions(transactions = []) {
  const options = new Map();
  transactions.forEach(transaction => {
    const value = getTransactionFolioValue(transaction);
    options.set(value, getTransactionFolioLabel(value));
  });
  return Array.from(options, ([value, label]) => ({value, label}));
}

function combineSummaries(summaries = []) {
  const validSummaries = summaries.filter(Boolean);
  if (!validSummaries.length) {
    return {total_invested: 0, current_holding: 0, total_return: 0, xirr: 0};
  }
  return {
    total_invested: validSummaries.reduce((total, summary) => total + toFiniteNumber(summary?.total_invested), 0),
    current_holding: validSummaries.reduce((total, summary) => total + toFiniteNumber(summary?.current_holding), 0),
    total_return: validSummaries.reduce((total, summary) => total + toFiniteNumber(summary?.total_return), 0),
    xirr: validSummaries.find(summary => toFiniteNumber(summary?.xirr) !== 0)?.xirr ?? 0,
  };
}

function buildSummaryFromTransactions(transactions = [], currentNav = 0, fallbackXirr = 0) {
  const includedTransactions = transactions.filter(transaction => transaction?.include_in_calculation !== false);
  const totalInvested = includedTransactions.reduce(
    (total, transaction) => total + toFiniteNumber(transaction?.amount),
    0,
  );
  const totalUnits = includedTransactions.reduce(
    (total, transaction) => total + toFiniteNumber(transaction?.units),
    0,
  );
  const navValue = toFiniteNumber(currentNav);
  const currentHolding = navValue ? totalUnits * navValue : 0;
  return {
    total_invested: totalInvested,
    current_holding: currentHolding,
    total_return: currentHolding - totalInvested,
    xirr: fallbackXirr,
  };
}

function normalizeStatusText(status) {
  return String(status || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function getTransactionOrderId(transaction = {}) {
  return (
    transaction?.bse_order_id ||
    transaction?.order_id ||
    transaction?.order_no ||
    transaction?.xsip_reg_id ||
    transaction?.sip_order_id ||
    transaction?.order_db_id ||
    ''
  );
}

function isPendingSipPaymentTransaction(transaction) {
  const status = normalizeStatusText(transaction?.status);
  const isPendingPaymentStatus = status === 'PENDING TRANSACTION' || status === 'PENDING';
  return isPendingPaymentStatus && !!getTransactionOrderId(transaction);
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

function TransactionDetailsSection({
  activeType,
  onTypeChange,
  folioOptions,
  selectedFolio,
  onFolioChange,
  summary,
  transactions,
  colors,
  isDark,
  nestedSurface,
  canPostToBse,
  onPayNow,
  payingOrderId,
}) {
  const [folioPickerOpen, setFolioPickerOpen] = useState(false);
  const selectedFolioLabel =
    selectedFolio === ALL_FOLIOS_VALUE
      ? 'All Folios'
      : folioOptions.find(option => option.value === selectedFolio)?.label || 'All Folios';

  const summaryItems = [
    {label: 'Invested Value', value: formatInr(summary?.total_invested)},
    {label: 'Current Value', value: formatInr(summary?.current_holding)},
    {label: 'Returns', value: formatInr(summary?.total_return)},
    {label: 'XIRR', value: formatPct(summary?.xirr)},
  ];

  return (
    <View>
      <Text style={[styles.sectionTitle, {color: colors.textPrimary, marginBottom: 10}]}>
        Transaction Details
      </Text>
      <View style={[styles.sectionCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
        <View style={[styles.txTabsTrack, {backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5'}]}>
          {TX_TABS.map(tab => {
            const on = activeType === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[
                  styles.txTab,
                  on && {backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: {width: 0, height: 1}},
                ]}
                onPress={() => onTypeChange(tab.value)}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.txTabTxt,
                    {color: on ? colors.primary : colors.textPrimary},
                    on && styles.txTabTxtOn,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.folioSelect,
            {borderColor: colors.border, backgroundColor: isDark ? colors.inputBg : '#FAFAFA'},
          ]}
          onPress={() => setFolioPickerOpen(true)}
          activeOpacity={0.85}>
          <Text style={[styles.folioSelectTxt, {color: colors.textPrimary}]} numberOfLines={1}>
            {selectedFolioLabel}
          </Text>
          <Image source={Icons.DropDown} style={[styles.folioSelectCaret, {tintColor: colors.textSecondary}]} resizeMode="contain" />
        </TouchableOpacity>

        <View style={styles.txList}>
          {transactions.length > 0 ? (
            transactions.map((tx, index) => {
              const showPayNow = activeType === 'sip' && isPendingSipPaymentTransaction(tx);
              const orderId = String(getTransactionOrderId(tx) || index);
              const paying = String(payingOrderId) === orderId;
              return (
                <View
                  key={String(tx?.order_no ?? tx?.order_db_id ?? index)}
                  style={[styles.txCard, {borderColor: colors.border, backgroundColor: nestedSurface}]}>
                  <Text style={[styles.txSerial, {color: colors.textSecondary}]}>S.No. {index + 1}</Text>
                  {TX_COLUMNS.map(col => (
                    <View key={col.key} style={styles.txFieldRow}>
                      <Text style={[styles.txFieldLbl, {color: colors.textSecondary}]}>{col.label}</Text>
                      <Text style={[styles.txFieldVal, {color: colors.textPrimary}]} numberOfLines={3}>
                        {col.key === 'status'
                          ? normalizeStatusText(tx?.[col.key]) || '—'
                          : renderMetricValue(col.key, tx?.[col.key])}
                      </Text>
                    </View>
                  ))}
                  {showPayNow ? (
                    <TouchableOpacity
                      style={[styles.txPayNowBtn, (!canPostToBse || paying) && styles.txPayNowBtnDisabled]}
                      onPress={() => onPayNow(tx)}
                      disabled={!canPostToBse || paying}
                      activeOpacity={0.9}>
                      {paying ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.txPayNowTxt}>Pay Now</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={styles.txEmpty}>
              <Text style={[styles.txEmptyTxt, {color: colors.textSecondary}]}>
                No transactions found for selected filters.
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.txSummaryBox,
            {backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8', borderColor: colors.border},
          ]}>
          {summaryItems.map(item => (
            <View key={item.label} style={styles.txSummaryCell}>
              <Text style={[styles.txSummaryLbl, {color: colors.textSecondary}]}>{item.label}</Text>
              <Text style={[styles.txSummaryVal, {color: colors.textPrimary}]} numberOfLines={2}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <AppModal
        visible={folioPickerOpen}
        onClose={() => setFolioPickerOpen(false)}
        title="Select folio"
        isBottomSheet
        maxHeight={'70%'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {[{value: ALL_FOLIOS_VALUE, label: 'All Folios'}, ...folioOptions].map(option => {
            const selected = option.value === selectedFolio;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.folioOptionRow,
                  {borderBottomColor: colors.border},
                  selected && {backgroundColor: isDark ? 'rgba(30,129,242,0.12)' : '#F1F8FF'},
                ]}
                onPress={() => {
                  onFolioChange(option.value);
                  setFolioPickerOpen(false);
                }}
                activeOpacity={0.85}>
                <Text style={[styles.folioOptionTxt, {color: colors.textPrimary}, selected && {color: colors.primary}]}>
                  {option.label}
                </Text>
                {selected ? <Text style={[styles.folioOptionCheck, {color: colors.primary}]}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </AppModal>
    </View>
  );
}

export default function FolioDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const folio = route.params?.folio;
  const canPostToBse = useSelector(selectCanPostToBse);
  const user = useSelector(s => s.auth.user);

  const nestedSurface = isDark ? '#2A2A2A' : '#F3F4F6';
  const accentBgs = useMemo(() => headlineAccentBackgrounds(isDark), [isDark]);
  const heroTagBg = isDark ? 'rgba(30, 129, 242, 0.14)' : 'rgba(30, 129, 242, 0.08)';

  const oneTimeTransactions = folio?.lumpsum?.transactions || [];
  const sipTransactions = [...(folio?.sip?.transactions || []), ...(folio?.xsip?.transactions || [])];
  const selectedFolioIdentity = folio?.id || folio?.scheme_code || '';

  const [activeTransactionType, setActiveTransactionType] = useState(
    oneTimeTransactions.length > 0 ? 'one_time' : 'sip',
  );
  const [selectedTransactionFolio, setSelectedTransactionFolio] = useState(ALL_FOLIOS_VALUE);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [paymentTransaction, setPaymentTransaction] = useState(null);

  useEffect(() => {
    if (!selectedFolioIdentity) {
      return;
    }
    setActiveTransactionType(oneTimeTransactions.length > 0 ? 'one_time' : 'sip');
    setSelectedTransactionFolio(ALL_FOLIOS_VALUE);
  }, [oneTimeTransactions.length, selectedFolioIdentity, sipTransactions.length]);

  const allTransactionRows = activeTransactionType === 'one_time' ? oneTimeTransactions : sipTransactions;
  const folioOptions = useMemo(() => getUniqueFolioOptions(allTransactionRows), [allTransactionRows]);
  const resolvedTransactionFolio = folioOptions.some(option => option.value === selectedTransactionFolio)
    ? selectedTransactionFolio
    : ALL_FOLIOS_VALUE;
  const visibleTransactions =
    resolvedTransactionFolio === ALL_FOLIOS_VALUE
      ? allTransactionRows
      : allTransactionRows.filter(
          transaction => getTransactionFolioValue(transaction) === resolvedTransactionFolio,
        );
  const activeTransactionSummary =
    activeTransactionType === 'one_time' ? folio?.lumpsum : combineSummaries([folio?.sip, folio?.xsip]);
  const visibleTransactionSummary =
    resolvedTransactionFolio === ALL_FOLIOS_VALUE
      ? activeTransactionSummary
      : buildSummaryFromTransactions(visibleTransactions, folio?.current_nav, activeTransactionSummary?.xirr);
  const hasTransactions = oneTimeTransactions.length > 0 || sipTransactions.length > 0;

  const onTypeChange = useCallback(type => {
    setActiveTransactionType(type);
    setSelectedTransactionFolio(ALL_FOLIOS_VALUE);
  }, []);

  const onPayNow = useCallback(
    transaction => {
      if (!canPostToBse) {
        return;
      }
      const orderNumber = getTransactionOrderId(transaction);
      const totalAmount = Number(String(transaction?.amount ?? '').replace(/,/g, '')) || 0;
      const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
      if (!orderNumber || !clientCode || !totalAmount) {
        appAlert('Pay Now', 'Required payment fields missing for this order.');
        return;
      }
      setPaymentTransaction(transaction);
    },
    [canPostToBse, user],
  );

  const closePaymentModal = useCallback(() => {
    if (payingOrderId) {
      return;
    }
    setPaymentTransaction(null);
  }, [payingOrderId]);

  const onConfirmPay = useCallback(
    async ({transaction, mode, vpaId, neftReference}) => {
      if (!canPostToBse) {
        return;
      }
      const orderNumber = getTransactionOrderId(transaction);
      const totalAmount = Number(String(transaction?.amount ?? '').replace(/,/g, '')) || 0;
      const clientCode = user?.client_code ?? user?.ucc_code ?? user?.ucc;
      if (!orderNumber || !clientCode || !totalAmount || !mode) {
        appAlert('Pay Now', 'Required payment fields missing for this order.');
        return;
      }
      try {
        setPayingOrderId(String(orderNumber));
        const res = await processOrderPayment({
          clientCode,
          modeOfPayment: mode,
          orderNumber,
          totalAmount,
          vpaId: vpaId || '',
          neftReference: neftReference || '',
        });
        const paymentError = getPaymentProcessErrorMessage(res);
        if (paymentError) {
          setPaymentTransaction(null);
          setTimeout(() => {
            appAlert('Payment', paymentError);
          }, 350);
          return;
        }
        const url = extractOrderAuthUrl(res?.data);
        if (url) {
          setPaymentTransaction(null);
          navigation.navigate('MandateAuthWebview', {uri: url, title: 'Complete payment'});
        } else {
          const fallback = getPaymentProcessErrorMessage(res) || 'Payment URL not found for this order.';
          setPaymentTransaction(null);
          setTimeout(() => {
            appAlert('Payment', fallback);
          }, 350);
        }
      } catch (e) {
        appAlert('Pay Now', String(e?.message || 'Could not start payment.'));
      } finally {
        setPayingOrderId(null);
      }
    },
    [canPostToBse, navigation, user],
  );

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

        {hasTransactions ? (
          <TransactionDetailsSection
            activeType={activeTransactionType}
            onTypeChange={onTypeChange}
            folioOptions={folioOptions}
            selectedFolio={resolvedTransactionFolio}
            onFolioChange={setSelectedTransactionFolio}
            summary={visibleTransactionSummary}
            transactions={visibleTransactions}
            colors={colors}
            isDark={isDark}
            nestedSurface={nestedSurface}
            canPostToBse={canPostToBse}
            onPayNow={onPayNow}
            payingOrderId={payingOrderId}
          />
        ) : null}
      </ScrollView>
      <SipPendingPaymentModal
        visible={!!paymentTransaction}
        transaction={paymentTransaction}
        user={user}
        colors={colors}
        isDark={isDark}
        canPostToBse={canPostToBse}
        paying={!!payingOrderId}
        onClose={closePaymentModal}
        onConfirmPay={onConfirmPay}
      />
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
  txTabsTrack: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    marginBottom: 12,
  },
  txTab: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTabTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '600'},
  txTabTxtOn: {fontWeight: '700'},
  folioSelect: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  folioSelectTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '600', flex: 1},
  folioSelectCaret: {width: 16, height: 16},
  folioOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  folioOptionTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '500'},
  folioOptionCheck: {fontSize: 16, fontWeight: '700'},
  txList: {marginTop: 14, gap: 10},
  txCard: {borderRadius: 12, borderWidth: 1, padding: 12},
  txSerial: {...Textstyles.medium, fontSize: 11, marginBottom: 4},
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
  txPayNowBtn: {
    marginTop: 10,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  txPayNowBtnDisabled: {opacity: 0.45},
  txPayNowTxt: {...Textstyles.medium, color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
  txEmpty: {paddingVertical: 24, alignItems: 'center'},
  txEmptyTxt: {fontSize: 13, textAlign: 'center'},
  txSummaryBox: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  txSummaryCell: {width: '50%', paddingRight: 8},
  txSummaryLbl: {fontSize: 12},
  txSummaryVal: {...Textstyles.heading, fontSize: 15, marginTop: 4, fontWeight: '700'},
  payModalInner: {paddingTop: 4, paddingBottom: 8},
  payMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  payModalClose: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  payModalCloseTxt: {fontSize: 16, fontWeight: '600'},
  payModalBackRow: {flexDirection: 'row', alignItems: 'center', flex: 1, marginBottom: 0},
  payModalBackIcon: {width: 16, height: 16, marginRight: 6},
  payModalBackTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '600'},
  payTypeTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  payTypeTab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
  },
  payTypeTabOn: {
    borderBottomWidth: 2,
    borderBottomColor: '#1E81F2',
  },
  payTypeTabTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '600'},
  payTypeTabTxtOn: {fontWeight: '700'},
  payAmountBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  payAmountTxt: {...Textstyles.medium, fontSize: 18, fontWeight: '600'},
  choosePayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 18,
  },
  choosePayIconWrap: {width: 36, height: 28, justifyContent: 'center'},
  choosePayTri: {width: 16, height: 16, borderRadius: 3, position: 'absolute', left: 0},
  choosePayTriFront: {left: 10, top: 6},
  choosePayTitle: {...Textstyles.medium, fontSize: 15, fontWeight: '700'},
  choosePaySub: {fontSize: 12, marginTop: 2},
  payModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  },
  payMethodsWrap: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  payModeBlock: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  payModeRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upiIdInput: {
    marginTop: 10,
    marginLeft: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  payModeRowOn: {backgroundColor: '#F3F4F6'},
  payModeMain: {...Textstyles.medium, fontSize: 15, fontWeight: '700', marginBottom: 2},
  payModeSub: {fontSize: 13},
  payModeChev: {width: 12, height: 12, marginLeft: 8},
  nodalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodalIconTxt: {fontSize: 16},
  payContinueCta: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  payNowCta: {
    backgroundColor: '#1E81F2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  payNowCtaTxt: {...Textstyles.medium, fontSize: 16, color: '#FFFFFF', fontWeight: '600'},
});
