import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import {useSelector} from 'react-redux';
import {selectCanPostToBse} from '../../store/slices/authSlice';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';
import {postMandateRegister} from '../../services/mandateService';
import AppModal from '../../components/AppModal';
import {useAppTheme} from '../../theme/useAppTheme';
import {appAlert} from '../../utils/appAlert';

const MANDATE_TYPES = ['eNACH', 'NACH', 'UPI Autopay'];
const MIN_PICK_DATE = new Date(2000, 0, 1);
const MAX_PICK_DATE = new Date(2100, 11, 31);

function formatDDMMYYYY(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '—';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** API expects DD/MM/YYYY strings (same as web curl). */
function formatDateForApi(d) {
  return formatDDMMYYYY(d);
}

function mapMandateTypeForApi(display) {
  if (display === 'UPI Autopay') {
    return 'UPI_AUTOPAY';
  }
  return display;
}

function extractRegisterUrl(resData) {
  if (resData == null) {
    return null;
  }
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  if (typeof inner === 'string' && /^https?:\/\//i.test(inner.trim())) {
    return inner.trim();
  }
  if (inner && typeof inner === 'object') {
    const u =
      inner.url ??
      inner.redirect_url ??
      inner.web_url ??
      inner.payment_url ??
      inner.authentication_url;
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) {
      return u.trim();
    }
  }
  return null;
}

function extractMessage(resData) {
  const root = resData?.data ?? resData;
  const inner = root?.data ?? root;
  if (inner && typeof inner === 'object' && inner.message) {
    return String(inner.message);
  }
  if (root?.message) {
    return String(root.message);
  }
  return null;
}

function Row({label, value, styles}) {
  return (
    <View style={styles.invRow}>
      <Text style={styles.invLabel}>{label}</Text>
      <Text style={[Textstyles.medium, styles.invVal]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function AddMandateModal({visible, onClose, onSuccess, onOpenWeb}) {
  const user = useSelector(s => s.auth.user);
  const canPostToBse = useSelector(selectCanPostToBse);
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => getAddMandateModalStyles(colors, isDark), [colors, isDark]);
  const [mandateType, setMandateType] = useState('eNACH');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [submitting, setSubmitting] = useState(false);
  /** Which date is being edited — nested Modal + RN Modal breaks iOS; use one inline (iOS) / dialog (Android) picker. */
  const [datePickerFor, setDatePickerFor] = useState(null);

  useEffect(() => {
    setEndDate(prev => (prev < startDate ? new Date(startDate) : prev));
  }, [startDate]);

  useEffect(() => {
    if (!visible) {
      setDatePickerFor(null);
    }
  }, [visible]);

  const investorName = useMemo(() => {
    const fn = (user?.full_name || '').trim();
    const ln = (user?.last_name || '').trim();
    if (fn && ln) {
      return `${fn} ${ln}`;
    }
    return user?.name || user?.full_name || '—';
  }, [user]);

  const ucc = user?.ucc_code ?? user?.client_code ?? user?.ucc ?? '—';
  const pan = user?.pan ?? user?.pan_number ?? '—';
  const tax = user?.tax_status ?? user?.investor_type ?? 'Individual';

  const reset = useCallback(() => {
    setMandateType('eNACH');
    setAmount('');
    setStartDate(new Date());
    const e = new Date();
    e.setDate(e.getDate() + 7);
    setEndDate(e);
    setTypePickerOpen(false);
    setDatePickerFor(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSubmit = useCallback(async () => {
    if (!canPostToBse) {
      return;
    }
    const amt = amount.trim();
    if (!amt || Number(amt) <= 0) {
      appAlert('Add mandate', 'Please enter a valid amount.');
      return;
    }
    if (endDate < startDate) {
      appAlert('Add mandate', 'End date must be on or after start date.');
      return;
    }

    const body = {
      mandateType: mapMandateTypeForApi(mandateType),
      mandate_amount: String(amt),
      start_date: formatDateForApi(startDate),
      end_date: formatDateForApi(endDate),
    };

    setSubmitting(true);
    try {
      const res = await postMandateRegister(body);
      if (res?.success) {
        const url = extractRegisterUrl(res.data);
        reset();
        onClose();
        if (url && onOpenWeb) {
          onOpenWeb(url);
        } else {
          const msg =
            extractMessage(res.data) ?? 'Mandate registration submitted successfully.';
          appAlert('Add mandate', msg);
        }
        onSuccess?.();
      } else {
        appAlert('Add mandate', 'Request could not be completed.');
      }
    } catch (e) {
      const msg = e?.message || e?.data?.message || 'Could not register mandate.';
      appAlert('Add mandate', String(msg));
    } finally {
      setSubmitting(false);
    }
  }, [amount, canPostToBse, endDate, mandateType, onClose, onOpenWeb, onSuccess, reset, startDate]);

  const onConfirmDatePicker = useCallback(
    date => {
      if (datePickerFor === 'start') {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setDatePickerFor(null);
    },
    [datePickerFor],
  );

  const onCancelDatePicker = useCallback(() => {
    setDatePickerFor(null);
  }, []);

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title="Add New Mandate"
      isBottomSheet
      maxHeight={'92%'}>
      <ScrollView
        style={styles.sheetScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Investor details</Text>
        <View style={styles.invCard}>
          <Row label="Investor name" value={investorName} styles={styles} />
          <Row label="UCC" value={ucc} styles={styles} />
          <Row label="PAN" value={pan} styles={styles} />
          <Row label="Tax status" value={tax} styles={styles} />
        </View>

        <Text style={styles.sectionTitle}>Mandate details</Text>
        <View style={styles.invCard}>
          <Text style={styles.fieldLabel}>Mandate type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setTypePickerOpen(o => !o)}
            activeOpacity={0.85}>
            <Text style={[Textstyles.medium, styles.dropdownTxt]}>{mandateType}</Text>
            <Image source={Icons.DropDown} style={styles.chev} resizeMode="contain" />
          </TouchableOpacity>
          {typePickerOpen ? (
            <View style={styles.typeList}>
              {MANDATE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={styles.typeOpt}
                  onPress={() => {
                    setMandateType(t);
                    setTypePickerOpen(false);
                  }}>
                  <Text style={styles.typeOptTxt}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <View style={styles.dateRow}>
            <View style={styles.dateFieldHalf}>
              <Text style={styles.fieldLabel}>Start date</Text>
              <TouchableOpacity
                style={styles.dateTouch}
                onPress={() => {
                  setDatePickerFor(p => {
                    if (p === 'start') {
                      return null;
                    }
                    return 'start';
                  });
                }}
                activeOpacity={0.85}>
                <Text style={[Textstyles.medium, styles.dateTouchTxt]}>{formatDDMMYYYY(startDate)}</Text>
                <Image
                  source={require('../../assets/Icons/calendarOthers.png')}
                  style={styles.calIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.dateFieldHalf}>
              <Text style={styles.fieldLabel}>End date</Text>
              <TouchableOpacity
                style={styles.dateTouch}
                onPress={() => {
                  setDatePickerFor(p => {
                    if (p === 'end') {
                      return null;
                    }
                    return 'end';
                  });
                }}
                activeOpacity={0.85}>
                <Text style={[Textstyles.medium, styles.dateTouchTxt]}>{formatDDMMYYYY(endDate)}</Text>
                <Image
                  source={require('../../assets/Icons/calendarOthers.png')}
                  style={styles.calIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {datePickerFor !== null ? (
            <DatePicker
              modal
              open={true}
              date={datePickerFor === 'start' ? startDate : endDate}
              mode="date"
              minimumDate={datePickerFor === 'start' ? MIN_PICK_DATE : startDate}
              maximumDate={datePickerFor === 'start' ? endDate : MAX_PICK_DATE}
              onConfirm={onConfirmDatePicker}
              onCancel={onCancelDatePicker}
              title={null}
            />
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnCancel}
          onPress={handleClose}
          activeOpacity={0.85}
          disabled={submitting}>
          <Text style={styles.btnCancelTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnSubmit, (submitting || !canPostToBse) && styles.btnSubmitDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={submitting || !canPostToBse}>
          {submitting ? <ActivityIndicator color={colors.card} /> : <Text style={styles.btnSubmitTxt}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

function getAddMandateModalStyles(colors, isDark) {
  const c = colors;
  return StyleSheet.create({
    sheetScroll: {maxHeight: 520},
    sectionTitle: {
      fontSize: 13,
      ...Textstyles.medium,
      color: c.textSecondary,
      marginBottom: 8,
      marginTop: 4,
    },
    invCard: {
      backgroundColor: isDark ? '#252525' : '#F3F4F6',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    invRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    invLabel: {fontSize: 14, color: c.textSecondary, flex: 1, marginRight: 8},
    invVal: {fontSize: 14, color: c.textPrimary, flex: 1, textAlign: 'right'},
    fieldLabel: {...Textstyles.medium, fontSize: 12, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 10},
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: c.inputBg,
    },
    dropdownTxt: {fontSize: 15, color: c.textPrimary},
    chev: {width: 12, height: 12, tintColor: c.textSecondary},
    typeList: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.card,
    },
    typeOpt: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? c.border : '#F3F4F6',
    },
    typeOptTxt: {fontSize: 15, color: c.textPrimary},
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: c.textPrimary,
      backgroundColor: c.inputBg,
    },
    dateRow: {flexDirection: 'row', marginHorizontal: -6, marginTop: 4},
    dateFieldHalf: {flex: 1, minWidth: 0, paddingHorizontal: 6},
    dateTouch: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: c.inputBg,
    },
    dateTouchTxt: {fontSize: 15, color: c.textPrimary, flex: 1},
    calIcon: {width: 16, height: 16, marginLeft: 4},
    inlineIosPicker: {
      marginTop: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    inlineIosBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? '#252525' : '#F9FAFB',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    inlineIosTitle: {...Textstyles.heading, fontSize: 14, fontWeight: '700', color: c.textPrimary},
    inlineIosDone: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: c.primary},
    iosSpinnerInline: {alignSelf: 'center', height: 216, width: '100%'},
    actions: {
      flexDirection: 'row',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    btnCancel: {
      flex: 1,
      marginRight: 6,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBg,
    },
    btnCancelTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '500', color: c.textSecondary},
    btnSubmit: {
      flex: 1,
      marginLeft: 6,
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSubmitDisabled: {opacity: 0.45},
    btnSubmitTxt: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: '#FFFFFF'},
  });
}
