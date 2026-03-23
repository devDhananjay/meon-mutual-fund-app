import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal} from 'react-native';

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
  indexOnly,
  onToggleIndexOnly,
  flexiCap,
  onToggleFlexiCap,
  sectorOptions,
  selectedSector,
  onSelectSector,
}) {
  const [returnsOpen, setReturnsOpen] = useState(false);

  const returnOptions = useMemo(
    () => [
      {key: '1y', label: '1Y Returns'},
      {key: '3y', label: '3Y Returns'},
      {key: '5y', label: '5Y Returns'},
    ],
    [],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.rowTop}>
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.85}
          onPress={() => setReturnsOpen(true)}>
          <Text style={styles.sortBtnTxt}>Sort by</Text>
          <Text style={styles.sortChevron}>⌄</Text>
        </TouchableOpacity>

        <Chip label="Index only" selected={indexOnly} onPress={onToggleIndexOnly} />
        <Chip label="Flexi Cap" selected={flexiCap} onPress={onToggleFlexiCap} />
      </View>

      <View style={styles.rowTabs}>
        <Text style={styles.tabsLabel}>Sector</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {sectorOptions.map(opt => (
            <Chip
              key={opt}
              label={opt}
              selected={selectedSector === opt}
              onPress={() => onSelectSector(opt)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.rowBottom}>
        <Text style={styles.countTxt}>{count} Funds</Text>
        <TouchableOpacity
          style={styles.sortValueBtn}
          activeOpacity={0.85}
          onPress={() => setReturnsOpen(true)}>
          <Text style={styles.sortValueTxt}>{sortLabel}</Text>
          <View style={styles.dottedUnderline} />
        </TouchableOpacity>
      </View>

      <Modal visible={returnsOpen} transparent animationType="fade" onRequestClose={() => setReturnsOpen(false)}>
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
  rowTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  sortBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2, paddingVertical: 4},
  sortBtnTxt: {fontSize: 13, fontWeight: '800', color: '#111827'},
  sortChevron: {fontSize: 12, color: '#6B7280', marginTop: 2},

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EBECED',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: PRIMARY_GREEN,
    backgroundColor: '#E6FFF6',
  },
  chipTxt: {fontSize: 12, color: '#374151', fontWeight: '700'},
  chipTxtSelected: {color: PRIMARY_GREEN},

  rowTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  tabsLabel: {fontSize: 13, fontWeight: '800', color: '#6B7280'},
  tabsScroll: {flex: 1},

  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  countTxt: {fontSize: 14, fontWeight: '700', color: '#111827'},
  sortValueBtn: {alignItems: 'flex-end'},
  sortValueTxt: {fontSize: 13, fontWeight: '900', color: '#111827', marginBottom: 6},
  dottedUnderline: {
    width: 64,
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
    borderStyle: 'dotted',
  },

  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  modalDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECED',
  },
  modalTitle: {fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10},
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalRowActive: {backgroundColor: '#E6FFF6'},
  modalRowTxt: {fontSize: 14, fontWeight: '700', color: '#111827'},
  modalRowTxtActive: {color: PRIMARY_GREEN},
});

