import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import {useSelector} from 'react-redux';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {postMandateRegister} from '../../services/mandateService';
import AppModal from '../../components/AppModal';

const PRIMARY = '#1A73E8';
const CARD_BORDER = '#E8E8E8';

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

function Row({label, value}) {
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
    const amt = amount.trim();
    if (!amt || Number(amt) <= 0) {
      Alert.alert('Add mandate', 'Please enter a valid amount.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Add mandate', 'End date must be on or after start date.');
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
          Alert.alert('Add mandate', msg);
        }
        onSuccess?.();
      } else {
        Alert.alert('Add mandate', 'Request could not be completed.');
      }
    } catch (e) {
      const msg = e?.message || e?.data?.message || 'Could not register mandate.';
      Alert.alert('Add mandate', String(msg));
    } finally {
      setSubmitting(false);
    }
  }, [amount, endDate, mandateType, onClose, onOpenWeb, onSuccess, reset, startDate]);

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
          <Row label="Investor name" value={investorName} />
          <Row label="UCC" value={ucc} />
          <Row label="PAN" value={pan} />
          <Row label="Tax status" value={tax} />
        </View>

        <Text style={styles.sectionTitle}>Mandate details</Text>
        <View style={styles.invCard}>
          <Text style={styles.fieldLabel}>Mandate type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setTypePickerOpen(o => !o)}
            activeOpacity={0.85}>
            <Text style={[Textstyles.medium, styles.dropdownTxt]}>{mandateType}</Text>
            <Text style={styles.chev}>▼</Text>
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
            placeholderTextColor={Colors.GREY}
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
          style={[styles.btnSubmit, submitting && styles.btnSubmitDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={submitting}>
          {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnSubmitTxt}>Submit</Text>}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheetScroll: {maxHeight: 520},
  sectionTitle: {
    fontSize: 13,
    ...Textstyles.medium,
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 4,
  },
  invCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  invRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  invLabel: {fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8},
  invVal: {fontSize: 14, color: Colors.TEXT_PRIMARY, flex: 1, textAlign: 'right'},
  fieldLabel: {...Textstyles.medium, fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 10},
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  dropdownTxt: {fontSize: 15, color: Colors.TEXT_PRIMARY},
  chev: {fontSize: 10, color: '#9CA3AF'},
  typeList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  typeOpt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  typeOptTxt: {fontSize: 15, color: Colors.TEXT_PRIMARY},
  input: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.TEXT_PRIMARY,
    backgroundColor: Colors.white,
  },
  dateRow: {flexDirection: 'row', marginHorizontal: -6, marginTop: 4},
  dateFieldHalf: {flex: 1, minWidth: 0, paddingHorizontal: 6},
  dateTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  dateTouchTxt: {fontSize: 15, color: Colors.TEXT_PRIMARY, flex: 1},
  calIcon: {width: 16, height: 16, marginLeft: 4},
  inlineIosPicker: {
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  inlineIosBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  inlineIosTitle: {...Textstyles.heading, fontSize: 14, fontWeight: '700', color: Colors.TEXT_PRIMARY},
  inlineIosDone: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: PRIMARY},
  iosSpinnerInline: {alignSelf: 'center', height: 216, width: '100%'},
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  btnCancel: {
    flex: 1,
    marginRight: 6,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelTxt: {...Textstyles.medium, fontSize: 15, fontWeight: '500', color: '#6B7280'},
  btnSubmit: {
    flex: 1,
    marginLeft: 6,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2F80ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitDisabled: {opacity: 0.7},
  btnSubmitTxt: {...Textstyles.medium, fontSize: 16, fontWeight: '500', color: Colors.white},
});
