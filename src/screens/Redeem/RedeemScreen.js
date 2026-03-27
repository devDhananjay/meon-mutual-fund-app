import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {buildRedeemPlacePayload, createSingleOrder, extractOrderId} from '../../services/ordersService';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import AppColors from '../../theme/colors';
import {radius} from '../../theme/radius';

const BANNER_BG = '#DCFCE7';
const BANNER_FG = '#166534';
const CTA_GREEN = AppColors.primary;
const CHIP_BLUE = Colors.themeBlue;

const QUICK_AMOUNTS = [500, 1000, 2000];

function formatUnits(u) {
  if (u == null || !Number.isFinite(Number(u))) {
    return '0';
  }
  const n = Number(u);
  const s = n.toFixed(6).replace(/\.?0+$/, '');
  return s || '0';
}

export default function RedeemScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const schemeCode = route.params?.schemeCode ?? route.params?.scheme_code;
  const schemeName = route.params?.schemeName ?? route.params?.scheme_name ?? 'Fund';
  const folioNumber = route.params?.folioNumber ?? '';
  const availableUnits = Number(route.params?.availableUnits ?? 0) || 0;
  const maxAmount = Number(route.params?.maxAmount ?? route.params?.currentValue ?? 0) || 0;

  const [mode, setMode] = useState('amount');
  const [amountText, setAmountText] = useState('');
  const [unitsText, setUnitsText] = useState('');
  const [redeemAll, setRedeemAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = useMemo(() => {
    const n = Number(String(amountText).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [amountText]);

  const parsedUnits = useMemo(() => {
    const n = Number(String(unitsText).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [unitsText]);

  const redeemByAmount = mode === 'amount';

  const onProceed = useCallback(async () => {
    if (!schemeCode) {
      Alert.alert('Redeem', 'Missing scheme. Go back and try again.');
      return;
    }

    if (redeemByAmount) {
      if (parsedAmount <= 0) {
        Alert.alert('Redeem', 'Enter a valid amount.');
        return;
      }
      if (maxAmount > 0 && parsedAmount > maxAmount + 0.01) {
        Alert.alert('Redeem', `Amount cannot exceed ₹${maxAmount.toFixed(2)}.`);
        return;
      }
    } else if (!redeemAll) {
      if (parsedUnits <= 0) {
        Alert.alert('Redeem', 'Enter a valid quantity.');
        return;
      }
      if (availableUnits > 0 && parsedUnits > availableUnits + 1e-8) {
        Alert.alert('Redeem', `Units cannot exceed ${formatUnits(availableUnits)}.`);
        return;
      }
    }

    const allRedeem = !redeemByAmount && redeemAll;

    const payload = buildRedeemPlacePayload({
      schemeCode,
      folioNumber,
      redeemByAmount,
      amount: redeemByAmount ? parsedAmount : 0,
      units: redeemByAmount ? 0 : redeemAll ? availableUnits : parsedUnits,
      allRedeem,
    });

    try {
      setSubmitting(true);
      const res = await createSingleOrder(payload);
      if (!res?.success) {
        const msg = res?.message ?? res?.error ?? 'Could not place redemption.';
        Alert.alert('Redeem', String(msg));
        return;
      }
      const orderId = extractOrderId(res?.data);
      Alert.alert(
        'Redemption submitted',
        orderId ? `Reference: ${orderId}\nTrack status in My Orders.` : 'Check My Orders for status.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (e) {
      Alert.alert('Redeem', String(e?.message ?? 'Request failed'));
    } finally {
      setSubmitting(false);
    }
  }, [
    schemeCode,
    folioNumber,
    redeemByAmount,
    parsedAmount,
    parsedUnits,
    maxAmount,
    availableUnits,
    redeemAll,
    navigation,
  ]);

  const setQuick = useCallback(v => {
    setAmountText(String(v));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={[Textstyles.heading, styles.toolbarTitle]} numberOfLines={1}>
          Redeem
        </Text>
        <View style={styles.toolbarRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[Textstyles.medium, styles.fundTitle]} numberOfLines={3}>
          {schemeName}
        </Text>
        <View style={styles.divider} />

        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Redeem available</Text>
          <Text style={styles.bannerValue}>{formatUnits(availableUnits)} units</Text>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segBtn, redeemByAmount && styles.segBtnOn]}
            onPress={() => {
              setMode('amount');
              setRedeemAll(false);
            }}
            activeOpacity={0.85}>
            <Text style={[styles.segTxt, redeemByAmount && styles.segTxtOn]}>Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, !redeemByAmount && styles.segBtnOn]}
            onPress={() => {
              setMode('quantity');
            }}
            activeOpacity={0.85}>
            <Text style={[styles.segTxt, !redeemByAmount && styles.segTxtOn]}>Quantity</Text>
          </TouchableOpacity>
        </View>

        {redeemByAmount ? (
          <>
            <View style={styles.inputWrap}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Amount"
                placeholderTextColor={Colors.GREY}
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={setAmountText}
              />
            </View>
            <View style={styles.chips}>
              {QUICK_AMOUNTS.map(amt => (
                <TouchableOpacity key={amt} style={styles.chip} onPress={() => setQuick(amt)} activeOpacity={0.85}>
                  <Text style={styles.chipTxt}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputWrap}>
              <Text style={styles.unitsLabel}>Units</Text>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Enter Quantity"
                placeholderTextColor={Colors.GREY}
                keyboardType="decimal-pad"
                editable={!redeemAll}
                value={unitsText}
                onChangeText={setUnitsText}
              />
            </View>
            <View style={styles.redeemAllRow}>
              <Switch
                value={redeemAll}
                onValueChange={v => {
                  setRedeemAll(v);
                  if (v) {
                    setUnitsText(formatUnits(availableUnits));
                  }
                }}
                trackColor={{false: '#D1D5DB', true: '#86EFAC'}}
                thumbColor={redeemAll ? '#fff' : '#f4f3f4'}
              />
              <Text style={styles.redeemAllTxt}>Redeem All</Text>
            </View>
          </>
        )}

        <Text style={styles.hint}>
          SWP (systematic withdrawal) is not available in the app yet — use the website for SWP setup.
        </Text>

        <TouchableOpacity
          style={[styles.cta, submitting && styles.ctaDisabled]}
          onPress={onProceed}
          disabled={submitting}
          activeOpacity={0.9}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaTxt}>Proceed to Redeem</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.offWhite},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backBtn: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center'},
  backTxt: {fontSize: 28, color: Colors.TEXT_PRIMARY, fontWeight: '300'},
  toolbarTitle: {flex: 1, fontSize: 17, textAlign: 'center'},
  toolbarRight: {width: 44},
  scroll: {padding: 16, paddingBottom: 40},
  fundTitle: {fontSize: 17, color: Colors.TEXT_PRIMARY, lineHeight: 22},
  divider: {height: 1, backgroundColor: Colors.BORDER_GREY, marginVertical: 14},
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BANNER_BG,
    borderRadius: radius.input,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  bannerLabel: {fontSize: 15, fontWeight: '600', color: BANNER_FG},
  bannerValue: {fontSize: 15, fontWeight: '600', color: BANNER_FG},
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.input,
    padding: 4,
    marginBottom: 16,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segBtnOn: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    // elevation: 2,
  },
  segTxt: {fontSize: 15, color: Colors.GREY, fontWeight: '600'},
  segTxtOn: {color: CHIP_BLUE},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    minHeight: 52,
  },
  rupee: {fontSize: 17, color: Colors.TEXT_PRIMARY, marginRight: 6},
  unitsLabel: {fontSize: 15, color: Colors.TEXT_PRIMARY, marginRight: 8, minWidth: 44},
  input: {flex: 1, fontSize: 16, color: Colors.TEXT_PRIMARY, paddingVertical: 10},
  inputFlex: {flex: 1},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20},
  chip: {
    borderWidth: 1,
    borderColor: CHIP_BLUE,
    borderRadius: radius.input,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipTxt: {color: CHIP_BLUE, fontWeight: '600', fontSize: 14},
  redeemAllRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16},
  redeemAllTxt: {fontSize: 15, color: Colors.TEXT_PRIMARY, fontWeight: '500'},
  hint: {fontSize: 12, color: Colors.GREY, marginBottom: 20, lineHeight: 18},
  cta: {
    backgroundColor: CTA_GREEN,
    borderRadius: radius.buttonLarge,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {opacity: 0.7},
  ctaTxt: {color: Colors.white, fontSize: 17, fontWeight: '700'},
});
