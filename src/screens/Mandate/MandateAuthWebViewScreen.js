import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {WebView} from 'react-native-webview';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';
import {useAppTheme} from '../../theme/useAppTheme';
import AppBackButton from '../../components/AppBackButton';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
export default function MandateAuthWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {colors, isDark} = useAppTheme();
  const uri = route.params?.uri;
  const title = route.params?.title ?? 'Authenticate';

  const [loading, setLoading] = useState(true);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const onLoadStart = useCallback(() => {
    setLoading(true);
  }, []);

  if (!uri || typeof uri !== 'string') {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
        <View style={[styles.topBar, {borderBottomColor: colors.border, backgroundColor: colors.background}]}>
          <View style={styles.topBarSide}>
            <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
          </View>
          <View style={styles.topBarFill} />
          <View style={styles.topBarSide} />
        </View>
        <View style={styles.errBox}>
          <Text style={[Textstyles.medium, styles.errTxt, {color: colors.textSecondary}]}>No authentication link available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.background}]} edges={['top', 'left', 'right']}>
      <View style={[styles.topBar, {borderBottomColor: colors.border, backgroundColor: colors.background}]}>
        <View style={styles.topBarSide}>
          <AppBackButton onPress={() => navigation.goBack()} hitSlop={10} />
        </View>
        <Text style={[styles.title, {color: colors.textPrimary}]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.topBarSide} />
      </View>
      {loading ? (
        <View
          style={[
            styles.loadingWrap,
            {backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)'},
          ]}
          pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
      <WebView
        source={{uri}}
        onLoadEnd={onLoadEnd}
        onLoadStart={onLoadStart}
        startInLoadingState
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        style={[styles.webview, {backgroundColor: colors.card}]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  topBarSide: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  topBarFill: {flex: 1},
  title: {flex: 1, ...Textstyles.heading, fontSize: 16, color: Colors.TEXT_PRIMARY, textAlign: 'center'},
  webview: {flex: 1, backgroundColor: Colors.white},
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errBox: {flex: 1, justifyContent: 'center', padding: 24},
  errTxt: {textAlign: 'center', color: Colors.GREY},
});
