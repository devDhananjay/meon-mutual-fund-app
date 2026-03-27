import React, {useEffect, useRef} from 'react';
import {View, StatusBar, StyleSheet, Animated} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {AuthColors} from '../../constants/authTheme';
import AuthBrand from '../../components/auth/AuthBrand';
import {restoreSession} from '../../store/slices/authSlice';
import {loadStoredSession} from '../../services/authStorage';

export default function Splash() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
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
        dispatch(
          restoreSession({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: session.user,
          }),
        );
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View style={[styles.logoWrap, {opacity: fade}]}>
        <AuthBrand />
      </Animated.View>
      <View style={styles.bottomLine} />
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
  bottomLine: {
    position: 'absolute',
    bottom: 20,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: AuthColors.border,
  },
});
