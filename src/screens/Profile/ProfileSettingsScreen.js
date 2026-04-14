import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import {fetchAuthProfile} from '../../services/authService';
import {appAlert} from '../../utils/appAlert';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';

function valueOrDash(v) {
  return v == null || String(v).trim() === '' ? '—' : String(v);
}

function formatDob(v) {
  const raw = valueOrDash(v);
  if (raw === '—') {
    return raw;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw;
  }
  return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
}

function Item({label, value, styles, isLast = false}) {
  return (
    <View style={[styles.itemRow, !isLast && styles.itemRowBorder]}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={[styles.itemValue, Textstyles.medium]}>{valueOrDash(value)}</Text>
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const {colors, isDark} = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchAuthProfile();
        const data = res?.data?.data ?? res?.data ?? {};
        if (mounted) {
          setProfile(data);
        }
      } catch (e) {
        if (mounted) {
          appAlert('Profile settings', String(e?.message || 'Could not load account details.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const personalRows = [
    {label: 'Name (as per PAN)', value: profile?.full_name},
    {label: 'Mobile', value: profile?.mobile_number},
    {label: 'Email', value: profile?.email},
    {label: 'Date of Birth', value: formatDob(profile?.date_of_birth)},
    {label: "Father's name", value: profile?.father_name},
  ];

  const bankRows = [
    {label: 'Bank', value: profile?.bank_name},
    {label: 'Account number', value: profile?.account_number},
    {label: 'IFSC Code', value: profile?.ifsc_code},
    {label: 'Client Code', value: profile?.ucc_code},
    {label: 'KYC', value: profile?.kyc_status === 'Y' ? 'Verified' : 'Pending'},
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader
        title="Account Details"
        onBack={() => navigation.goBack()}
        // right={
        //   <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')} hitSlop={8}>
        //     <Text style={styles.changePwdLink}>Change</Text>
        //   </TouchableOpacity>
        // }
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.tabWrap}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'personal' && styles.tabBtnActive]}
              onPress={() => setActiveTab('personal')}
              activeOpacity={0.85}>
              <Text style={[styles.tabTxt, activeTab === 'personal' && styles.tabTxtActive]}>Personal Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'bank' && styles.tabBtnActive]}
              onPress={() => setActiveTab('bank')}
              activeOpacity={0.85}>
              <Text style={[styles.tabTxt, activeTab === 'bank' && styles.tabTxtActive]}>Bank Details</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHead}>
            {activeTab === 'personal' ? 'PERSONAL DETAILS' : 'BANK ACCOUNT DETAILS'}
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            (activeTab === 'personal' ? personalRows : bankRows).map((row, idx, arr) => (
              <Item
                key={`${activeTab}-${row.label}`}
                label={row.label}
                value={row.value}
                styles={styles}
                isLast={idx === arr.length - 1}
              />
            ))
          )}

          <View style={styles.helpBox}>
            <Text style={styles.helpTxt}>
              If you need to update any of your {activeTab === 'personal' ? 'personal details' : 'bank details'},
              you can contact our support team.
            </Text>
            <View style={styles.helpActions}>
              {/* <Text style={styles.helpAction}>📞 +91 9990 767 766</Text> */}
              <Text style={styles.helpAction}> support@meon.co.in</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c, isDark) {
  return StyleSheet.create({
    safe: {flex: 1, backgroundColor: c.background},
    scrollContent: {paddingHorizontal: 16, paddingBottom: 16},
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      padding: 14,
    },
    changePwdLink: {color: c.primary, fontSize: 13, ...Textstyles.medium},
    tabWrap: {
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      borderRadius: 13,
      padding: 4,
      flexDirection: 'row',
      marginBottom: 14,
    },
    tabBtn: {flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
    tabBtnActive: {backgroundColor: c.card},
    tabTxt: {fontSize: 14, color: c.textSecondary},
    tabTxtActive: {fontSize: 14, color: c.primary, ...Textstyles.medium},
    sectionHead: {fontSize: 24, letterSpacing: 1.2, color: c.textSecondary, marginVertical: 8},
    loader: {marginVertical: 22},
    itemRow: {paddingVertical: 14},
    itemRowBorder: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border},
    itemLabel: {fontSize: 14, color: c.textSecondary, marginBottom: 4},
    itemValue: {fontSize: 16, color: c.textPrimary},
    helpBox: {
      marginTop: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(30,64,175,0.2)' : '#EFF6FF',
    },
    helpTxt: {
      textAlign: 'center',
      color: c.primary,
      fontSize: 13,
      lineHeight: 18,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    helpActions: {
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1D4ED8' : '#BFDBFE',
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 8,
    },
    helpAction: {fontSize: 13, color: c.primary},
  });
}
