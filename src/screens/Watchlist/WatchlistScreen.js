import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {removeFromWishlist} from '../../services/wishlistService';
import {useWishlistData} from '../../hooks/useWishlistData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const PAGE_BG = '#F0F2F5';
const CARD_BORDER = '#E8E8E8';
const THEME_BLUE = '#1890FF';
const EMPTY_ITEMS = [];

function pickTitle(item) {
  return (
    item.scheme_name ??
    item.base_scheme_name ??
    item.scheme?.scheme_name ??
    item.fund_name ??
    'Fund'
  );
}

function FundLogo({name, uri}) {
  if (uri) {
    return <Image source={{uri}} style={styles.fundLogo} resizeMode="contain" />;
  }
  const letter = (name || '?')[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.fundLogo, styles.fundLogoPh]}>
      <Text style={styles.fundLogoLetter}>{letter}</Text>
    </View>
  );
}

function WatchlistRow({item, index, onOpenFund, onRemove}) {
  const title = pickTitle(item).toUpperCase();
  const code = pickSchemeCode(item);
  const logo = item.logo_url ?? item.logo ?? item.scheme?.logo_url;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.rowTop} onPress={() => onOpenFund(item)} activeOpacity={0.75}>
        <Text style={styles.serial}>{String(index + 1).padStart(2, '0')}</Text>
        <FundLogo name={title} uri={logo} />
        <View style={styles.nameCol}>
          <Text style={styles.fundNameCaps} numberOfLines={3}>
            {title}
          </Text>
          {code ? <Text style={styles.codeLine}>{code}</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={styles.rowActions}>
        <TouchableOpacity onPress={() => onOpenFund(item)} hitSlop={8} activeOpacity={0.75}>
          <Text style={styles.linkTxt}>View fund</Text>
        </TouchableOpacity>
        {code ? (
          <TouchableOpacity onPress={() => onRemove(item)} hitSlop={8} activeOpacity={0.75}>
            <Text style={styles.removeTxt}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function WatchlistScreen() {
  const navigation = useNavigation();
  const showBack = navigation.canGoBack();
  const {data, isPending, error, refreshing, refetch} = useWishlistData();
  const items = data?.results ?? EMPTY_ITEMS;
  const totalCount = data?.count ?? items.length;

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(it => pickTitle(it).toLowerCase().includes(q));
  }, [items, search]);

  const goExplore = useCallback(() => {
    navigation.navigate('MainTabs', {screen: 'Explore'});
  }, [navigation]);

  const onOpenFund = useCallback(
    raw => {
      const code = pickSchemeCode(raw);
      if (!code) {
        return;
      }
      navigateToFundDetail(navigation, {
        schemeCode: code,
        schemeName: pickTitle(raw),
      });
    },
    [navigation],
  );

  const onRemove = useCallback(
    item => {
      const code = pickSchemeCode(item);
      if (!code) {
        return;
      }
      Alert.alert('Remove from watchlist', `Remove ${pickTitle(item)}?`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await removeFromWishlist(code);
              if (res?.success) {
                await refetch();
              } else {
                Alert.alert('Error', 'Could not remove');
              }
            } catch {
              Alert.alert('Error', 'Could not remove');
            }
          },
        },
      ]);
    },
    [refetch],
  );

  const renderItem = useCallback(
    ({item, index}) => (
      <WatchlistRow
        item={item}
        index={index}
        onOpenFund={onOpenFund}
        onRemove={onRemove}
      />
    ),
    [onOpenFund, onRemove],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <Text style={styles.pageTitle}>My Watchlist</Text>
        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search watchlist..."
            placeholderTextColor={Colors.GREY}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Text style={styles.countLine}>
          {filtered.length === 0
            ? '0 funds'
            : `Showing ${filtered.length}${totalCount > filtered.length ? ` of ${totalCount}` : ''}`}
        </Text>
      </View>
    ),
    [search, filtered.length, totalCount],
  );

  const backBar = showBack ? (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
        <Text style={styles.backChevron}>‹</Text>
        <Text style={[Textstyles.medium, styles.backLabel]}>Back</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {backBar}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={THEME_BLUE} />
          <Text style={[Textstyles.normal, styles.loadingTxt]}>Loading watchlist…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {backBar}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(pickSchemeCode(item) ?? item.id ?? index)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={THEME_BLUE} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={[Textstyles.medium, styles.emptyTitle]}>No funds in watchlist</Text>
            <Text style={[Textstyles.normal, styles.emptySub]}>
              {search.trim() ? 'Try a different search.' : 'Explore funds and tap the bookmark to save them here.'}
            </Text>
            <TouchableOpacity style={styles.cta} onPress={goExplore} activeOpacity={0.85}>
              <Text style={[Textstyles.medium, styles.ctaTxt]}>Explore funds</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: PAGE_BG},
  topBar: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  backBtn: {flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8},
  backChevron: {fontSize: 28, color: THEME_BLUE, marginRight: 2, marginTop: -2, fontWeight: '400'},
  backLabel: {fontSize: 16, color: THEME_BLUE, fontWeight: '600'},
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  pageHead: {paddingHorizontal: 16, paddingTop: 8},
  pageTitle: {fontSize: 24, fontWeight: '700', color: Colors.TEXT_PRIMARY, marginBottom: 12},
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, marginRight: 8},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 4},
  countLine: {fontSize: 12, color: '#6B7280', marginBottom: 8, paddingHorizontal: 4},
  listContent: {paddingBottom: 32, paddingHorizontal: 16},
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: {flexDirection: 'row', alignItems: 'flex-start'},
  serial: {fontSize: 13, color: '#9CA3AF', width: 28, fontWeight: '600', marginTop: 4},
  fundLogo: {width: 36, height: 36, borderRadius: 6, marginRight: 10},
  fundLogoPh: {
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  fundLogoLetter: {fontSize: 14, fontWeight: '800', color: THEME_BLUE},
  nameCol: {flex: 1},
  fundNameCaps: {fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 17},
  codeLine: {fontSize: 11, color: '#6B7280', marginTop: 4},
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  linkTxt: {fontSize: 14, color: THEME_BLUE, fontWeight: '600'},
  removeTxt: {fontSize: 14, color: Colors.themeRed, fontWeight: '600'},
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {flex: 1, color: '#B91C1C', fontSize: 14},
  retry: {color: THEME_BLUE, fontWeight: '600'},
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginTop: 8,
  },
  emptyTitle: {fontSize: 16, color: Colors.TEXT_PRIMARY, marginBottom: 8},
  emptySub: {fontSize: 14, color: Colors.GREY, textAlign: 'center', marginBottom: 16},
  cta: {
    backgroundColor: THEME_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  ctaTxt: {color: Colors.white, fontSize: 15},
});
