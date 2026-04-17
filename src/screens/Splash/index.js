import React, {useEffect, useRef, useState} from 'react';
import {View, StatusBar, StyleSheet, Animated, Image, TouchableOpacity, Linking, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {AuthColors} from '../../constants/authTheme';
import AuthBrand from '../../components/auth/AuthBrand';
import {restoreSession} from '../../store/slices/authSlice';
import {loadStoredSession} from '../../services/authStorage';
import {fetchAuthProfile} from '../../services/authService';
import {persistAuth} from '../../services/authStorage';
import {useAppTheme} from '../../theme/useAppTheme';
import {baseUrl, Colors} from '../../utils/AppConstant';
import { Textstyles } from '../../utils';

const API_ORIGIN = 'https://mutualfunds.meon.co.in';

function toAbsoluteLogoUrl(rawLogo) {
  if (!rawLogo) {
    return null;
  }
  const value = String(rawLogo).trim();
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  // API returns relative logo paths like `/v1/media/...`.
  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`;
  }
  return `${baseUrl.replace(/\/$/, '')}/${value}`;
}

export default function Splash() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {colors, isDark} = useAppTheme();
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const done = useRef(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (done.current) {
      return;
    }
    let cancelled = false;

    const run = async () => {
      await new Promise(r => setTimeout(r, 1200));
      if (cancelled) {
        return;
      }
      const session = await loadStoredSession();
      done.current = true;
      if (session) {
        const storedLogoUrl = toAbsoluteLogoUrl(session.user?.company_logo);
        if (!cancelled && storedLogoUrl) {
          setCompanyLogoUrl(storedLogoUrl);
        }
        // Restore token to Redux first so apiClient sends Authorization on profile fetch.
        dispatch(
          restoreSession({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: session.user,
          }),
        );

        let mergedUser = session.user;
        try {
          const profileRes = await fetchAuthProfile();
          const profile = profileRes?.data?.data;
          if (profile && typeof profile === 'object') {
            mergedUser = {...session.user, ...profile};
            await persistAuth({
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              user: mergedUser,
            });
          }
        } catch {
          // If profile fetch fails, continue with stored user.
        }
        const logoUrl = toAbsoluteLogoUrl(mergedUser?.company_logo);
        if (!cancelled) {
          setCompanyLogoUrl(logoUrl);
        }
        if (mergedUser !== session.user) {
          dispatch(
            restoreSession({
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              user: mergedUser,
            }),
          );
        }
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Login');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [dispatch, navigation]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 450, //450
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <Animated.View style={[styles.logoWrap, {opacity: fade}]}>
        {companyLogoUrl ? (
          <Image source={{uri: companyLogoUrl}} style={styles.companyLogo} resizeMode="contain" />
        ) : (
          <AuthBrand />
        )}
      </Animated.View>
      <View style={styles.footerWrap}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://meon.co.in')
              .catch(err => console.error('Failed to open URL:', err))}
            style={styles.footerLinkRow}>
            <Text style={[
              Textstyles.normal,
              {color: isDark ? Colors.white : colors.textPrimary, fontSize: 13},
            ]}>© Meon MF By</Text>

            <Text style={[
              Textstyles.normal,
              {color: colors.primary, fontSize: 13},
            ]}> Meon Technologies Pvt. Ltd</Text>
          </TouchableOpacity>
        </View>
      <View style={[styles.bottomLine, {backgroundColor: colors.border}]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {marginBottom: 10},
  footerWrap: {bottom: 0, left: 0, right: 0, position: 'absolute'},
  footerLinkRow: {flexDirection: 'row', top: -20, alignSelf: 'center', alignItems: 'center'},
  companyLogo: {
    width: 200,
    height: 100,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 10,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: AuthColors.border,
  },
});
