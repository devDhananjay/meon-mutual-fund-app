import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import AppColors from '../../../theme/colors';
import {radius} from '../../../theme/radius';
import AppModal from '../../../components/AppModal';
import Textstyles from '../../../utils/text';

const PRIMARY_BLUE = AppColors.primary;

function Chip({label, selected, onPress}) {
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
  onPressSort,
  categoryOptions,
  selectedCategory,
  onSelectCategory,
  riskOptions,
  selectedRisk,
  onSelectRisk,
  containerStyle,
}) {
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);
  const [draftRisk, setDraftRisk] = useState(selectedRisk);

  const returnOptions = useMemo(
    () => [
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
        <Text style={styles.countTxt}>{count} Funds</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortValueBtn}
            activeOpacity={0.9}
            onPress={() => setReturnsOpen(true)}>
            <Text style={styles.sortValueTxt} numberOfLines={1}>
              {sortLabel}
            </Text>
            <Text style={styles.sortChevron}>⌄</Text>
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
          const active = opt.label === sortLabel;
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

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AppColors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  headerActions: {flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end'},
  countTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: AppColors.textPrimary},
  sortValueBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    maxWidth: 116,
  },
  sortValueTxt: {...Textstyles.medium, fontSize: 12, fontWeight: '500', color: AppColors.textPrimary, flexShrink: 1},
  sortChevron: {fontSize: 11, color: AppColors.textSecondary, marginLeft: 6},
  filterPillBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginLeft: 8,
    maxWidth: 144,
  },
  filterPillTxt: {...Textstyles.normal, fontSize: 12, color: AppColors.textPrimary},
  filterMetaTxt: {...Textstyles.normal, fontSize: 12, color: AppColors.textSecondary, marginTop: 10},

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EBECED',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {borderColor: PRIMARY_BLUE, backgroundColor: '#EAF2FF'},
  chipTxt: {...Textstyles.medium, fontSize: 12, color: '#374151', fontWeight: '500'},
  chipTxtSelected: {color: PRIMARY_BLUE},

  modalRow: {paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10},
  modalRowActive: {backgroundColor: '#EAF2FF'},
  modalRowTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: AppColors.textPrimary},
  modalRowTxtActive: {color: PRIMARY_BLUE},
  filterSheetHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  clearTxt: {...Textstyles.medium, fontSize: 14, fontWeight: '500', color: PRIMARY_BLUE},
  sheetSectionLabel: {...Textstyles.medium, fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 12},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
});

