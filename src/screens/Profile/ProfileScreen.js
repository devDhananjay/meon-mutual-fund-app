import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  navigationRef,
  navigateToMyOrders,
  navigateToWatchlist,
  navigateToMandate,
} from '../../navigation/navigationRef';
import {logout} from '../../store/slices/authSlice';
import {setThemeMode} from '../../store/slices/themeSlice';
import {clearAuthStorage} from '../../services/authStorage';
import {STORAGE_KEYS} from '../../constants/storageKeys';
import {appAlert} from '../../utils/appAlert';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import Icons from '../../utils/icons';

function getThemePalette(isDark) {
  if (isDark) {
    return {
      pageBg: '#0F1116',
      cardBg: '#171A21',
      cardBorder: '#1F2937',
      iconBg: '#262B35',
      iconTint: '#E5E7EB',
      textPrimary: '#F3F4F6',
      textSecondary: '#9CA3AF',
      textMuted: '#6B7280',
      rowBorder: '#334155',
      chevron: '#94A3B8',
      toggleBg: '#0F172A',
      toggleActiveBg: '#2563EB',
      toggleInactiveText: '#94A3B8',
      white: '#FFFFFF',
      verifyBadgeBg: '#14532D',
      verifyBadgeText: '#86EFAC',
      verifyPendingBg: '#422006',
      verifyPendingText: '#FDBA74',
      themeIconTint: '#94A3B8',
    };
  }
  return {
    pageBg: '#F3F4F6',
    cardBg: '#FFFFFF',
    cardBorder: '#E5E7EB',
    iconBg: '#F3F4F6',
    iconTint: '#2B2F38',
    textPrimary: Colors.TEXT_PRIMARY,
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    rowBorder: '#E5E7EB',
    chevron: '#9CA3AF',
    toggleBg: '#F1F5F9',
    toggleActiveBg: '#2563EB',
    toggleInactiveText: '#6B7280',
    white: '#FFFFFF',
    verifyBadgeBg: '#DCFCE7',
    verifyBadgeText: '#166534',
    verifyPendingBg: '#FFFBEB',
    verifyPendingText: '#B45309',
    themeIconTint: '#64748B',
  };
}
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
  const fullName = (user?.full_name || '').trim();
  if (fullName) {
    return fullName;
  }
  const firstName = (user?.first_name || '').trim();
  if (firstName) {
    return firstName;
  }
  if (user?.name) {
    return user.name;
  }
  return 'Member';
}

function getProfileSubLine(user) {
  const email = (user?.email || '').trim();
  if (email) {
    return email;
  }
  const mobile = (user?.mobile || user?.phone || '').trim();
  if (mobile) {
    return `+91 ${mobile}`;
  }
  const code = (user?.client_code || user?.clientCode || '').trim();
  if (code) {
    return `Client Code: ${code}`;
  }
  return 'Mutual Fund Investor';
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

function isVerifiedUser(user) {
  const v =
    user?.is_verified ??
    user?.is_profile_verified ??
    user?.kyc_verified ??
    user?.profile_verified;
  return v !== false;
}

function SectionCard({title, children, styles}) {
  return (
    <View style={styles.sectionCard}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function ProfileRow({icon, emoji, label, onPress, isLast, destructive, tintColor, styles}) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.65}>
      <View style={styles.rowIconWrap}>
        {icon ? (
          <Image source={icon} tintColor={tintColor || styles.rowIconTint.color} style={styles.rowIconImg} resizeMode="contain" />
        ) : (
          <Text style={styles.rowEmoji}>{emoji}</Text>
        )}
      </View>
      <Text style={[Textstyles.medium, styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <Image source={Icons.GoIcon} style={styles.chevron} resizeMode="contain" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const themeMode = useSelector(s => s.theme.mode);
  const [signingOut, setSigningOut] = useState(false);
  const isDark = themeMode === 'dark';
  const palette = useMemo(() => getThemePalette(isDark), [isDark]);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const initials = useMemo(() => getInitials(user), [user]);
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const profileSubLine = useMemo(() => getProfileSubLine(user), [user]);
  const memberLine = useMemo(() => getMemberSinceLine(user), [user]);
  const verifyLine = useMemo(() => verificationLine(user), [user]);
  const verified = useMemo(() => isVerifiedUser(user), [user]);

  const onOrders = useCallback(() => {
    navigateToMyOrders(navigation);
  }, [navigation]);

  const onWatchlist = useCallback(() => {
    navigateToWatchlist(navigation);
  }, [navigation]);

  const onForgotPassword = useCallback(() => {
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const onProfileSettings = useCallback(() => {
    navigation.navigate('ProfileSettings');
  }, [navigation]);

  const onThemeChange = useCallback(
    async mode => {
      dispatch(setThemeMode(mode));
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
      } catch {
        /* ignore */
      }
    },
    [dispatch],
  );

  const onMandate = useCallback(() => {
    navigateToMandate(navigation);
  }, [navigation]);

  const onSupportArticle = useCallback(
    id => {
      navigation.navigate('SupportArticle', {id});
    },
    [navigation],
  );

  const onPrivacyPolicy = useCallback(() => {
    navigation.navigate('PrivacyPolicy');
  }, [navigation]);

  const onDeleteAccount = useCallback(() => {
    navigation.navigate('DeleteAccount');
  }, [navigation]);

  const onLogout = useCallback(async () => {
    appAlert('Logout', 'Are you sure you want to log out?', [
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
          <View style={styles.profileGlowOne} />
          <View style={styles.profileGlowTwo} />
          <View style={styles.profileAccentBar} />
          <View style={styles.profileHeaderInner}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={[styles.avatarTxt, Textstyles.medium]}>{initials}</Text>
              </View>
              <View style={styles.profileTextCol}>
                <Text style={[Textstyles.heading, styles.displayName]} numberOfLines={2}>
                  {displayName}
                </Text>
                <Text style={styles.profileSubLine} numberOfLines={1}>
                  {profileSubLine}
                </Text>
                <View style={styles.profileMetaRow}>
                  <View
                    style={[
                      styles.verifyPill,
                      verified ? styles.verifyPillOk : styles.verifyPillPending,
                    ]}>
                    <Text style={[styles.verifyPillGlyph, verified ? styles.verifyPillGlyphOk : styles.verifyPillGlyphWarn]}>
                      {verified ? '✓' : '!'}
                    </Text>
                    <Text style={[styles.verifyPillText, verified ? styles.verifyPillTextOk : styles.verifyPillTextPending]} numberOfLines={1}>
                      {verified ? 'Verified' : verifyLine}
                    </Text>
                  </View>
                  <View style={styles.memberPill}>
                    <Text style={styles.memberPillText}>{memberLine}</Text>
                  </View>
                </View>
                <Text style={styles.profileHint}>Manage your investments and account settings</Text>
              </View>
              <TouchableOpacity
                style={styles.profileSettingsBtn}
                onPress={onProfileSettings}
                activeOpacity={0.85}
                hitSlop={8}>
                {/* <Text style={styles.profileSettingsIcon}>⚙</Text> */}
                <Image source={Icons.SettingsMinimalistic} style={styles.profileSettingsIconImg} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <SectionCard title="Accounts" styles={styles}>
          <ProfileRow icon={Icons.MyOrdersIcon} label="My Orders" onPress={onOrders} styles={styles} />
          <ProfileRow icon={Icons.MandateIcon} label="Mandate" onPress={onMandate} styles={styles} />
          <ProfileRow
            icon={Icons.BookmarkFilled}
            label="My Watchlist"
            onPress={onWatchlist}
            styles={styles}
          />
          <View style={styles.themeRow}>
            <View style={styles.themeIconBox}>
              <Text style={styles.themeEmoji}>🎨</Text>
            </View>
            <View style={styles.themeMeta}>
              <Text style={[Textstyles.medium, styles.themeTitle]}>App theme</Text>
              <Text style={styles.themeHelp}>Light / dark</Text>
            </View>
            <View style={styles.themeSwitchWrap}>
              <TouchableOpacity
                style={[styles.themeOption, themeMode === 'light' && styles.themeOptionActive]}
                onPress={() => onThemeChange('light')}
                activeOpacity={0.85}>
                <Text style={[styles.themeIcon, themeMode === 'light' && styles.themeIconActive]}>☀</Text>
                <Text style={[styles.themeLabel, themeMode === 'light' && styles.themeLabelActive]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionActive]}
                onPress={() => onThemeChange('dark')}
                activeOpacity={0.85}>
                <Text style={[styles.themeIcon, themeMode === 'dark' && styles.themeIconActive]}>🌙</Text>
                <Text style={[styles.themeLabel, themeMode === 'dark' && styles.themeLabelActive]}>Dark</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ProfileRow
            icon={Icons.ChangePasswordIcon}
            label="Change Password"
            onPress={onForgotPassword}
            styles={styles}
          />
          <ProfileRow
            icon={Icons.deleteIcon}
            label="Delete account"
            onPress={onDeleteAccount}
            destructive
            isLast
            tintColor={'#DC2626'}
            styles={styles}
          />
        </SectionCard>

        <SectionCard title="Support & Legal" styles={styles}>
          <ProfileRow icon={Icons.FaqIcon} label={"FAQ's"} onPress={() => onSupportArticle('faq')} styles={styles} />
          <ProfileRow
            icon={Icons.HelpSupportIcon}
            label="Help & Support"
            onPress={() => onSupportArticle('help')}
            styles={styles}
          />
          <ProfileRow icon={Icons.PrivacyPolicyIcon} label="Privacy Policy" onPress={onPrivacyPolicy} styles={styles} />
          <ProfileRow
            icon={Icons.TermsAndConditionsIcon}
            label="Terms and Conditions"
            onPress={() => onSupportArticle('terms')}
            isLast
            styles={styles}
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

const createStyles = palette =>
  StyleSheet.create({
  safe: {flex: 1, backgroundColor: palette.pageBg},
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
    backgroundColor: palette.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    // elevation: 2,
  },
  profileGlowOne: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -28,
    top: -30,
    backgroundColor: palette.toggleActiveBg,
    opacity: 0.08,
  },
  profileGlowTwo: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    left: -16,
    bottom: -22,
    backgroundColor: palette.toggleActiveBg,
    opacity: 0.05,
  },
  profileAccentBar: {
    height: 4,
    backgroundColor: Colors.themeBlue,
    opacity: 0.6,
  },
  profileHeaderInner: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
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
    borderWidth: 2,
    borderColor: palette.cardBg,
  },
  avatarTxt: {fontSize: 22, fontWeight: '600', color: palette.white},
  profileTextCol: {flex: 1, minWidth: 0},
  displayName: {
    fontSize: 19,
    color: palette.textPrimary,
    marginBottom: 2,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  profileSubLine: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  profileMetaRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8},
  memberPill: {
    backgroundColor: palette.iconBg,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rowBorder,
  },
  memberPillText: {fontSize: 11, color: palette.textSecondary, fontWeight: '600'},
  profileHint: {fontSize: 12, color: palette.textMuted, marginTop: 8},
  profileSettingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: palette.rowBorder,
    backgroundColor: palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  profileSettingsIcon: {fontSize: 16, color: palette.themeIconTint},
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    marginBottom: 2,
  },
  verifyPillOk: {
    backgroundColor: palette.verifyBadgeBg,
  },
  verifyPillPending: {
    backgroundColor: palette.verifyPendingBg,
  },
  verifyPillGlyph: {fontSize: 12, fontWeight: '700'},
  verifyPillGlyphOk: {color: palette.verifyBadgeText},
  verifyPillGlyphWarn: {color: palette.verifyPendingText},
  verifyPillText: {fontSize: 12, fontWeight: '600'},
  verifyPillTextOk: {color: palette.verifyBadgeText},
  verifyPillTextPending: {color: palette.verifyPendingText},
  sectionCard: {
    backgroundColor: palette.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.cardBorder,
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
    color: palette.textSecondary,
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
  rowBorder: {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.rowBorder},
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowEmoji: {fontSize: 20},
  rowIconTint: {color: palette.iconTint},
  rowIconImg: {width: 20, height: 20},
  rowLabel: {flex: 1, fontSize: 16, color: palette.textPrimary, fontWeight: '500'},
  rowLabelDestructive: {color: '#DC2626'},
  chevron: {width: 14, height: 14, tintColor: palette.chevron},
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.rowBorder,
  },
  themeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeEmoji: {fontSize: 20},
  themeMeta: {flex: 1, minWidth: 0},
  themeTitle: {fontSize: 16, color: palette.textPrimary, fontWeight: '600'},
  themeHelp: {fontSize: 12, color: palette.textMuted, marginTop: 2},
  themeSwitchWrap: {
    flexDirection: 'row',
    backgroundColor: palette.toggleBg,
    borderRadius: 12,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rowBorder,
  },
  themeOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionActive: {
    backgroundColor: palette.cardBg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    // elevation: 2,
  },
  themeIcon: {
    fontSize: 12,
    marginBottom: 1,
    color: palette.toggleInactiveText,
    fontWeight: '600',
  },
  themeIconActive: {
    color: palette.textPrimary,
  },
  themeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: palette.toggleInactiveText,
    letterSpacing: 0.2,
  },
  themeLabelActive: {
    color: palette.textPrimary,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingVertical: 16,
  },
  logoutIconImg: {width: 20, height: 20, marginRight: 8},
  logoutText: {fontSize: 16, fontWeight: '500', color: '#EF4444'},
  profileSettingsIconImg: {width: 20, height: 20, tintColor: palette.iconTint},
});
