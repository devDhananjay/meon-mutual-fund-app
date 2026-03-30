import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
  navigationRef,
  navigateToMyOrders,
  navigateToWatchlist,
  navigateToMandate,
} from '../../navigation/navigationRef';
import {logout} from '../../store/slices/authSlice';
import {clearAuthStorage} from '../../services/authStorage';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';

const PAGE_BG = '#F8FAFC';
const CARD_BORDER = '#E5E7EB';
const ICON_BG = '#EEF5FF';
function getInitials(user) {
  const fn = (user?.full_name || user?.first_name || '').trim();
  const ln = (user?.full_name || user?.last_name || '').trim();
  if (fn && ln) {
    return `${fn[0]}${ln[0]}`.toUpperCase();
  }
  if (fn.length >= 2) {
    return fn.slice(0, 2).toUpperCase();
  }
  const name = (user?.name || user?.email || '?').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function getDisplayName(user) {
  const fn = (user?.full_name || user?.first_name || '').trim();
  const ln = (user?.last_name || '').trim();
  if (fn && ln) {
    return `${fn} ${ln}`;
  }
  if (user?.name) {
    return user.name;
  }
  return user?.full_name || 'Member';
}

function getMemberSinceLine(user) {
  const raw = user?.created_at || user?.date_joined || user?.member_since;
  if (raw) {
    try {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return `Member since ${d.getFullYear()}`;
      }
    } catch {
      /* ignore */
    }
  }
  return 'Member since 2023';
}

function verificationLine(user) {
  const v =
    user?.is_verified ??
    user?.is_profile_verified ??
    user?.kyc_verified ??
    user?.profile_verified;
  if (v === false) {
    return 'Verification pending';
  }
  return 'Profile Verified';
}

function SectionCard({title, children}) {
  return (
    <View style={styles.sectionCard}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function ProfileRow({icon, emoji, label, onPress, isLast, destructive}) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.65}>
      <View style={styles.rowIconWrap}>
        {icon ? (
          <Image source={icon} style={styles.rowIconImg} resizeMode="contain" />
        ) : (
          <Text style={styles.rowEmoji}>{emoji}</Text>
        )}
      </View>
      <Text style={[Textstyles.medium, styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const [signingOut, setSigningOut] = useState(false);

  const initials = useMemo(() => getInitials(user), [user]);
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const memberLine = useMemo(() => getMemberSinceLine(user), [user]);
  const verifyLine = useMemo(() => verificationLine(user), [user]);

  const onOrders = useCallback(() => {
    navigateToMyOrders(navigation);
  }, [navigation]);

  const onWatchlist = useCallback(() => {
    navigateToWatchlist(navigation);
  }, [navigation]);

  const onForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPassword');
  }, [navigation]);

  const onLanguage = useCallback(() => {
    Alert.alert('Choose language', 'Language selection will be available in a future update.', [
      {text: 'OK'},
    ]);
  }, []);

  const onMandate = useCallback(() => {
    navigateToMandate(navigation);
  }, [navigation]);

  const onSupportArticle = useCallback(
    id => {
      navigation.navigate('SupportArticle', {id});
    },
    [navigation],
  );

  const onDeleteAccount = useCallback(() => {
    navigation.navigate('DeleteAccount');
  }, [navigation]);

  const onLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await clearAuthStorage();
            dispatch(logout());
            if (navigationRef.isReady()) {
              navigationRef.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{name: 'Login'}],
                }),
              );
            }
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.profileHeaderCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarTxt, Textstyles.medium]}>{initials}</Text>
            </View>
            <View style={styles.profileTextCol}>
              <Text style={[Textstyles.heading, styles.displayName]} numberOfLines={2}>
                {displayName}
              </Text>
              <Text style={styles.verifyLine}>{verifyLine}</Text>
              <Text style={styles.memberLine}>{memberLine}</Text>
            </View>
          </View>
        </View>

        <SectionCard title="Accounts">
          <ProfileRow icon={Icons.MyOrdersIcon} label="My Orders" onPress={onOrders} />
          <ProfileRow icon={Icons.MandateIcon} label="Mandate" onPress={onMandate} />
          <ProfileRow icon={Icons.MyWatchlistIcon} label="My Watchlist" onPress={onWatchlist} />
          {/* <ProfileRow emoji="🌐" label="Choose Language" onPress={onLanguage} /> */}
          <ProfileRow icon={Icons.ChangePasswordIcon} label="Change Password" onPress={onForgotPassword} isLast />
        </SectionCard>

        <SectionCard title="Support & Legal">
          <ProfileRow icon={Icons.FaqIcon} label={"FAQ's"} onPress={() => onSupportArticle('faq')} />
          <ProfileRow icon={Icons.HelpSupportIcon} label="Help & Support" onPress={() => onSupportArticle('help')} />
          <ProfileRow icon={Icons.PrivacyPolicyIcon} label="Privacy Policy" onPress={() => onSupportArticle('privacy')} />
          <ProfileRow icon={Icons.TermsAndConditionsIcon} label="Terms and Conditions" onPress={() => onSupportArticle('terms')} />
          <ProfileRow
            icon={Icons.deleteIcon}
            label="Delete account"
            onPress={onDeleteAccount}
            destructive
            isLast
          />
        </SectionCard>

        <TouchableOpacity
          style={styles.logoutCard}
          onPress={onLogout}
          disabled={signingOut}
          activeOpacity={0.75}>
          {signingOut ? (
            <ActivityIndicator color={Colors.themeRed} />
          ) : (
            <>
              <Image source={Icons.LogoutIcon} style={styles.logoutIconImg} resizeMode="contain" />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 32, paddingHorizontal: 16},
  pageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 12,
  },
  profileHeaderCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    // elevation: 3,
  },
  profileRow: {flexDirection: 'row', alignItems: 'center'},
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.themeBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarTxt: {fontSize: 22, fontWeight: '500', color: Colors.white},
  profileTextCol: {flex: 1},
  displayName: {fontSize: 20, color: Colors.TEXT_PRIMARY, marginBottom: 4, fontWeight: '600'},
  verifyLine: {fontSize: 13, color: '#6B7280', marginBottom: 2},
  memberLine: {fontSize: 12, color: '#9CA3AF'},
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB'},
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowEmoji: {fontSize: 20},
  rowIconImg: {width: 20, height: 20},
  rowLabel: {flex: 1, fontSize: 16, color: Colors.TEXT_PRIMARY, fontWeight: '500'},
  rowLabelDestructive: {color: '#DC2626'},
  chevron: {fontSize: 18, color: '#9CA3AF', fontWeight: '300'},
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 16,
  },
  logoutIconImg: {width: 20, height: 20, marginRight: 8},
  logoutText: {fontSize: 16, fontWeight: '500', color: '#EF4444'},
});
