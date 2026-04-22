import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {radius} from '../../../theme/radius';
import AppModal from '../../../components/AppModal';
import Textstyles from '../../../utils/text';
import Icons from '../../../utils/icons';
import {useAppTheme} from '../../../theme/useAppTheme';

function Chip({label, selected, onPress}) {
  const {colors, isDark} = useAppTheme();
  const styles = getStyles(colors, isDark);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipTxt, selected && styles.chipTxtSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function FilterBar({
  count,
  sortLabel,
  selectedSortKey,
  onPressSort,
  categoryOptions,
  selectedCategory,
  onSelectCategory,
  riskOptions,
  selectedRisk,
  onSelectRisk,
  containerStyle,
}) {
  const {colors, isDark} = useAppTheme();
  const styles = getStyles(colors, isDark);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);
  const [draftRisk, setDraftRisk] = useState(selectedRisk);

  const returnOptions = useMemo(
    () => [
      {key: 'none', label: 'Default'},
      {key: '1y', label: '1Y Returns'},
      {key: '3y', label: '3Y Returns'},
      {key: '5y', label: '5Y Returns'},
      {key: '7y', label: '7Y Returns'},
    ],
    [],
  );

  const getOptionLabel = (value, options) => {
    if (!value) {
      return 'All';
    }
    return options?.find(o => o.value === value)?.label ?? 'All';
  };

  const onOpenFilterSheet = () => {
    setDraftCategory(selectedCategory);
    setDraftRisk(selectedRisk);
    setFilterSheetOpen(true);
  };

  const clearDraftFilters = () => {
    setDraftCategory('');
    setDraftRisk('');
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.headerRow}>
        <Text style={styles.countTxt}>{count == null ? '…' : `${count} Funds`}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortValueBtn}
            activeOpacity={0.9}
            onPress={() => setReturnsOpen(true)}>
            <Text style={styles.sortValueTxt} numberOfLines={1}>
              {sortLabel}
            </Text>
            <Image source={Icons.DropDown} style={styles.sortChevron} resizeMode="contain" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterPillBtn} activeOpacity={0.85} onPress={onOpenFilterSheet}>
            <Text style={styles.filterPillTxt} numberOfLines={1}>
              {`Filter: ${getOptionLabel(selectedCategory, categoryOptions)}, ${getOptionLabel(selectedRisk, riskOptions)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.filterMetaTxt} numberOfLines={1}>
        {`Category: ${getOptionLabel(selectedCategory, categoryOptions)}  •  Risk: ${getOptionLabel(selectedRisk, riskOptions)}`}
      </Text>

      <AppModal
        visible={returnsOpen}
        onClose={() => setReturnsOpen(false)}
        title="Returns"
        isBottomSheet
        maxHeight={'60%'}>
        {returnOptions.map(opt => {
          const active = opt.key === selectedSortKey;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.modalRow, active && styles.modalRowActive]}
              onPress={() => {
                onPressSort?.(opt.key);
                setReturnsOpen(false);
              }}
              activeOpacity={0.9}>
              <Text style={[styles.modalRowTxt, active && styles.modalRowTxtActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </AppModal>

      <AppModal
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filter"
        isBottomSheet
        showActions
        onCancel={() => setFilterSheetOpen(false)}
        onApply={() => {
          onSelectCategory?.(draftCategory);
          onSelectRisk?.(draftRisk);
          setFilterSheetOpen(false);
        }}>
        <View style={styles.filterSheetHead}>
          <View />
          <TouchableOpacity
            onPress={() => {
              clearDraftFilters();
            }}
            hitSlop={8}>
            <Text style={styles.clearTxt}>Clear Filter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sheetSectionLabel}>Category</Text>
        <View style={styles.chipWrap}>
          {categoryOptions.map(opt => (
            <Chip
              key={opt.value ?? opt.label}
              label={opt.label}
              selected={draftCategory === opt.value}
              onPress={() => setDraftCategory(opt.value)}
            />
          ))}
        </View>

        <Text style={styles.sheetSectionLabel}>Risk</Text>
        <View style={styles.chipWrap}>
          {riskOptions.map(opt => (
            <Chip
              key={opt.value ?? opt.label}
              label={opt.label}
              selected={draftRisk === opt.value}
              onPress={() => setDraftRisk(opt.value)}
            />
          ))}
        </View>
      </AppModal>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  headerActions: {flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end'},
  countTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: colors.textPrimary},
  sortValueBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    maxWidth: 116,
  },
  sortValueTxt: {...Textstyles.medium, fontSize: 12, fontWeight: '500', color: colors.textPrimary, flexShrink: 1},
  sortChevron: {width: 12, height: 12, tintColor: colors.textSecondary, marginLeft: 6},
  filterPillBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginLeft: 8,
    maxWidth: 144,
  },
  filterPillTxt: {...Textstyles.normal, fontSize: 12, color: colors.textPrimary},
  filterMetaTxt: {...Textstyles.normal, fontSize: 12, color: colors.textSecondary, marginTop: 10},

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {borderColor: colors.primary, backgroundColor: isDark ? '#1B2A3D' : '#EAF2FF'},
  chipTxt: {...Textstyles.medium, fontSize: 12, color: colors.textPrimary, fontWeight: '500'},
  chipTxtSelected: {color: colors.primary},

  modalRow: {paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10},
  modalRowActive: {backgroundColor: isDark ? '#1B2A3D' : '#EAF2FF'},
  modalRowTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: colors.textPrimary},
  modalRowTxtActive: {color: colors.primary},
  filterSheetHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  clearTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: colors.primary},
  sheetSectionLabel: {...Textstyles.medium, fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginTop: 12},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
});

