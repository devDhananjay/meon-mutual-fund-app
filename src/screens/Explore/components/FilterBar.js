import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal} from 'react-native';

const PRIMARY_GREEN = '#00B386';

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
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.countTxt}>{count} Funds</Text>
        <TouchableOpacity
          style={styles.sortValueBtn}
          activeOpacity={0.9}
          onPress={() => setReturnsOpen(true)}>
          <Text style={styles.sortValueTxt}>{sortLabel}</Text>
          <Text style={styles.sortChevron}>⌄</Text>
          <View style={styles.dottedUnderline} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.filterRow}
        activeOpacity={0.85}
        onPress={onOpenFilterSheet}>
        <View style={styles.filterRowLeft}>
          <Text style={styles.filterRowTitle}>Filter</Text>
          <Text style={styles.filterRowSub} numberOfLines={1}>
            {`Category: ${getOptionLabel(selectedCategory, categoryOptions)}  •  Risk: ${getOptionLabel(selectedRisk, riskOptions)}`}
          </Text>
        </View>
        <Text style={styles.filterRowChevron}>›</Text>
      </TouchableOpacity>
      <View style={styles.filterDottedUnderline} />

      <Modal
        visible={returnsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReturnsOpen(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalDim} activeOpacity={1} onPress={() => setReturnsOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Returns</Text>
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
          </View>
        </View>
      </Modal>

      <Modal visible={filterSheetOpen} transparent animationType="slide" onRequestClose={() => setFilterSheetOpen(false)}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.modalDim} activeOpacity={1} onPress={() => setFilterSheetOpen(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.filterGrabber} />
            <View style={styles.filterSheetHead}>
              <Text style={styles.filterSheetTitle}>Filter</Text>
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

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.sheetBtnCancel}
                activeOpacity={0.85}
                onPress={() => setFilterSheetOpen(false)}>
                <Text style={styles.sheetBtnCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetBtnApply}
                activeOpacity={0.9}
                onPress={() => {
                  onSelectCategory?.(draftCategory);
                  onSelectRisk?.(draftRisk);
                  setFilterSheetOpen(false);
                }}>
                <Text style={styles.sheetBtnApplyTxt}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBECED',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'},
  countTxt: {fontSize: 14, fontWeight: '500', color: '#111827'},
  sortValueBtn: {alignItems: 'flex-end'},
  sortValueTxt: {fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 6},
  sortChevron: {fontSize: 12, color: '#6B7280', marginTop: -2, marginBottom: 6},
  dottedUnderline: {width: 64, borderBottomWidth: 2, borderBottomColor: '#D1D5DB', borderStyle: 'dotted', marginTop: 2},
  filterDottedUnderline: {alignSelf: 'stretch', borderBottomWidth: 2, borderBottomColor: '#D1D5DB', borderStyle: 'dotted', marginTop: 8},

  filterRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRowLeft: {flex: 1, minWidth: 0},
  filterRowTitle: {fontSize: 14, fontWeight: '500', color: '#111827'},
  filterRowSub: {fontSize: 12, color: '#6B7280', marginTop: 4},
  filterRowChevron: {fontSize: 22, color: '#9CA3AF', fontWeight: '300'},

  chipScroll: {maxHeight: 40, marginTop: 6},

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
  chipSelected: {borderColor: PRIMARY_GREEN, backgroundColor: '#E6FFF6'},
  chipTxt: {fontSize: 12, color: '#374151', fontWeight: '500'},
  chipTxtSelected: {color: PRIMARY_GREEN},

  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalDim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)'},
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECED',
  },
  modalTitle: {fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10},
  modalRow: {paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10},
  modalRowActive: {backgroundColor: '#E6FFF6'},
  modalRowTxt: {fontSize: 14, fontWeight: '500', color: '#111827'},
  modalRowTxtActive: {color: PRIMARY_GREEN},

  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECED',
    maxHeight: '85%',
  },
  filterGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 2,
    marginBottom: 12,
  },
  filterSheetHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  filterSheetTitle: {fontSize: 18, fontWeight: '700', color: '#111827'},
  clearTxt: {fontSize: 14, fontWeight: '500', color: PRIMARY_GREEN},
  sheetSectionLabel: {fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 12},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8},
  sheetActions: {flexDirection: 'row', marginTop: 16, gap: 10},
  sheetBtnCancel: {flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY_GREEN, paddingVertical: 14, alignItems: 'center'},
  sheetBtnCancelTxt: {fontSize: 15, fontWeight: '500', color: PRIMARY_GREEN},
  sheetBtnApply: {flex: 1, borderRadius: 10, backgroundColor: PRIMARY_GREEN, paddingVertical: 14, alignItems: 'center'},
  sheetBtnApplyTxt: {fontSize: 15, fontWeight: '500', color: '#FFFFFF'},
});

