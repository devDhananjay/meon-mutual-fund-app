import React, {useCallback, useMemo, useRef, useState} from 'react';
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
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {navigateToFundDetail} from '../../navigation/navigationRef';
import {pickSchemeCode} from '../../utils/schemeCode';
import {removeFromWishlist} from '../../services/wishlistService';
import {useWishlistData} from '../../hooks/useWishlistData';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const PAGE_BG = '#F5F5F5';
const CARD_BORDER = '#E8E8E8';
const THEME_BLUE = '#1890FF';
const STAR_GOLD = '#F59E0B';
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

/** Wishlist API returns `one_day_change_percent` for 1D return. */
function pickOneDayReturnPercent(item) {
  const n = x => {
    const v = Number(x);
    return Number.isFinite(v) ? v : null;
  };
  return (
    n(item.one_day_change_percent) ??
    n(item.one_day_return_per) ??
    n(item?.returns?.['1d']) ??
    n(item?.returns?.['1D']) ??
    n(item.return_1d)
  );
}

function pickSubtitle(item) {
  const raw = [
    item.amc_name,
    item.fund_category,
    item.scheme_category,
    item.category,
    item.sub_category,
    item.scheme_type,
    item?.scheme?.category,
  ]
    .filter(v => v != null && String(v).trim() !== '')
    .map(v => String(v).trim());
  const uniq = [...new Set(raw)];
  return uniq.slice(0, 3).join(' • ') || '';
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
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

function WatchlistRow({
  item,
  index,
  total,
  onOpenFund,
  onRemoveStar,
  returnVal,
  removingCode,
}) {
  const title = pickTitle(item);
  const subtitle = pickSubtitle(item);
  const logo = item.logo_url ?? item.logo ?? item.scheme?.logo_url;
  const pct = formatPct(returnVal);
  const n = returnVal != null ? Number(returnVal) : null;
  const isNeg = n != null && n < 0;
  const hasNum = n != null && !Number.isNaN(n);
  const code = pickSchemeCode(item);
  const busy = code != null && removingCode === code;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <View
      style={[
        styles.rowInCard,
        isFirst && styles.rowInCardFirst,
        isLast && styles.rowInCardLast,
        !isLast && styles.rowInCardDivider,
      ]}>
      <TouchableOpacity
        style={styles.rowMainTap}
        onPress={() => onOpenFund(item)}
        activeOpacity={0.75}
        disabled={busy}>
        <FundLogo name={title} uri={logo} />
        <View style={styles.nameCol}>
          <Text style={[Textstyles.heading, styles.fundName]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[Textstyles.medium, styles.subLine]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.returnCol}>
          <Text
            style={[
              styles.returnPct,
              !hasNum ? styles.returnNeutral : isNeg ? styles.returnNeg : styles.returnPos,
            ]}>
            {pct}
          </Text>
          <Text style={[Textstyles.medium, styles.periodLabel]}>1D</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.starBtn}
        onPress={() => onRemoveStar(item)}
        hitSlop={{top: 12, bottom: 12, left: 8, right: 12}}
        disabled={busy}
        accessibilityLabel="Remove from watchlist"
        accessibilityRole="button">
        {busy ? (
          <ActivityIndicator size="small" color={STAR_GOLD} />
        ) : (
          <Text style={styles.starFilled}>★</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function WatchlistScreen() {
  const navigation = useNavigation();
  const showBack = navigation.canGoBack();
  const {data, isPending, error, refreshing, refetch} = useWishlistData();
  const items = data?.results ?? EMPTY_ITEMS;

  const [search, setSearch] = useState('');
  const [removingCode, setRemovingCode] = useState(null);
  const removeInFlightRef = useRef(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter(it => pickTitle(it).toLowerCase().includes(q));
    }
    const withRet = list.map(it => ({
      item: it,
      ret: pickOneDayReturnPercent(it),
    }));
    withRet.sort((a, b) => {
      const ar = a.ret;
      const br = b.ret;
      if (ar == null && br == null) {
        return 0;
      }
      if (ar == null) {
        return 1;
      }
      if (br == null) {
        return -1;
      }
      return br - ar;
    });
    return withRet.map(x => x.item);
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

  const onRemoveStar = useCallback(
    async item => {
      const code = pickSchemeCode(item);
      if (!code || removeInFlightRef.current) {
        return;
      }
      removeInFlightRef.current = true;
      setRemovingCode(code);
      try {
        const res = await removeFromWishlist(code);
        if (res?.success) {
          await refetch();
        }
      } finally {
        removeInFlightRef.current = false;
        setRemovingCode(null);
      }
    },
    [refetch],
  );

  const renderItem = useCallback(
    ({item, index}) => (
      <WatchlistRow
        item={item}
        index={index}
        total={filtered.length}
        onOpenFund={onOpenFund}
        onRemoveStar={onRemoveStar}
        returnVal={pickOneDayReturnPercent(item)}
        removingCode={removingCode}
      />
    ),
    [filtered.length, onOpenFund, onRemoveStar, removingCode],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.pageHead}>
        <View style={styles.searchCard}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={[Textstyles.medium, styles.searchInput]}
            placeholder="Search orders..."
            placeholderTextColor={Colors.GREY}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
    ),
    [search],
  );

  const headerBar = (
    <View style={styles.headerRow}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={12} accessibilityRole="button">
          <Text style={styles.headerChevron}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBackPlaceholder} />
      )}
      <Text style={[Textstyles.heading, styles.headerTitle]} numberOfLines={1}>
        My Watchlist
      </Text>
      <View style={styles.sortWrap}>
        <View style={styles.sortInner}>
          <Text style={[Textstyles.medium, styles.sortLabel]} numberOfLines={1}>
            1D Returns
          </Text>
          <Text style={styles.sortChevron}>▼</Text>
        </View>
        <View style={styles.sortDottedLine} />
      </View>
    </View>
  );

  if (isPending && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {headerBar}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={THEME_BLUE} />
          <Text style={[Textstyles.normal, styles.loadingTxt]}>Loading watchlist…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {headerBar}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  headerBack: {width: 40, justifyContent: 'center'},
  headerBackPlaceholder: {width: 40},
  headerChevron: {fontSize: 32, color: Colors.TEXT_PRIMARY, fontWeight: '300', marginTop: -2},
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  sortWrap: {minWidth: 96, maxWidth: 120, alignItems: 'flex-end'},
  sortInner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'},
  sortLabel: {fontSize: 14, color: Colors.TEXT_PRIMARY},
  sortChevron: {fontSize: 9, color: Colors.TEXT_PRIMARY, marginLeft: 4, marginTop: 1},
  sortDottedLine: {
    marginTop: 2,
    alignSelf: 'stretch',
    borderBottomWidth: Platform.OS === 'ios' ? 1 : StyleSheet.hairlineWidth,
    borderBottomColor: '#9CA3AF',
    borderStyle: 'dotted',
    minWidth: 72,
  },
  loadingBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  loadingTxt: {marginTop: 12, color: Colors.GREY},
  pageHead: {paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10},
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
    // elevation: 2,
  },
  searchIcon: {fontSize: 16, color: Colors.GREY, marginRight: 8},
  searchInput: {flex: 1, fontSize: 15, color: Colors.TEXT_PRIMARY, paddingVertical: 4},
  listContent: {paddingBottom: 32, paddingHorizontal: 16},
  rowInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
  },
  rowMainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  rowInCardFirst: {
    marginTop: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    // elevation: 2,
  },
  rowInCardLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  rowInCardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  fundLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  fundLogoPh: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fundLogoLetter: {fontSize: 15, fontWeight: '500', color: THEME_BLUE},
  nameCol: {flex: 1, minWidth: 0, paddingRight: 8},
  fundName: {fontSize: 15, color: Colors.TEXT_PRIMARY, lineHeight: 20},
  subLine: {fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 16},
  returnCol: {alignItems: 'flex-end', minWidth: 64, marginRight: 4},
  returnPct: {fontSize: 15, fontWeight: '500'},
  returnPos: {color: '#16A34A'},
  returnNeg: {color: '#DC2626'},
  returnNeutral: {color: '#6B7280'},
  periodLabel: {fontSize: 11, color: '#9CA3AF', marginTop: 4},
  starBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  starFilled: {
    fontSize: 22,
    color: STAR_GOLD,
    lineHeight: 26,
  },
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
