import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {WebView} from 'react-native-webview';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const THEME_BLUE = '#1890FF';

export default function MandateAuthWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errBox}>
          <Text style={[Textstyles.medium, styles.errTxt]}>No authentication link available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {loading ? (
        <View style={styles.loadingWrap} pointerEvents="none">
          <ActivityIndicator size="large" color={THEME_BLUE} />
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
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8},
  backChevron: {fontSize: 28, color: THEME_BLUE, marginRight: 2, marginTop: -2, fontWeight: '400'},
  backLabel: {fontSize: 16, color: THEME_BLUE, fontWeight: '600'},
  title: {flex: 1, fontSize: 16, fontWeight: '700', color: Colors.TEXT_PRIMARY, marginRight: 8},
  webview: {flex: 1, backgroundColor: Colors.white},
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 1,
  },
  errBox: {flex: 1, justifyContent: 'center', padding: 24},
  errTxt: {textAlign: 'center', color: Colors.GREY},
});
