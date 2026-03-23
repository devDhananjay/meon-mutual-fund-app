import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../../utils/AppConstant';
import Textstyles from '../../utils/text';

const RANGE_KEYS = ['1M', '2M', '3M', '6M', '1Y'];

const RANGE_MAP = {
  '1M': 30,
  '2M': 60,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

const CHART_H = 220;

/**
 * Pure RN — no WebView (RNCWebViewModule) and no react-native-svg.
 * Bar sparkline matches NAV trend without native chart deps.
 */
function NativeNavSparkline({values, lineColor, width}) {
  const pad = 10;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = CHART_H - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return (
    <View style={[styles.nativeChart, {width, height: CHART_H, paddingHorizontal: pad, paddingTop: pad}]}>
      <View style={[styles.barRow, {width: innerW, height: innerH}]}>
        {values.map((v, i) => {
          const pct = (v - min) / span;
          const barH = Math.max(3, pct * innerH);
          return (
            <View key={i} style={styles.barCell}>
              <View style={[styles.bar, {height: barH, backgroundColor: lineColor}]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function NavLineChart({graphData = [], graphLoading, timeFrame, onTimeFrameChange}) {
  const range = timeFrame || '1M';

  const filteredData = useMemo(() => {
    const days = RANGE_MAP[range] || 30;
    if (!graphData?.length) {
      return [];
    }
    return graphData.slice(-days);
  }, [graphData, range]);

  const {absoluteReturn, percentReturn, isGain} = useMemo(() => {
    const fd = filteredData;
    if (fd.length < 2) {
      return {absoluteReturn: 0, percentReturn: 0, isGain: true};
    }
    const last = Number(fd[fd.length - 1].nav_value);
    const first = Number(fd[0].nav_value);
    const abs = first - last;
    const pct = last ? (abs / last) * 100 : 0;
    return {
      absoluteReturn: abs,
      percentReturn: pct,
      isGain: abs >= 0,
    };
  }, [filteredData]);

  const chartWidth = Math.min(Dimensions.get('window').width - 32, 400);
  const lineColor = isGain ? '#16a34a' : '#dc2626';

  const {values, chartKey} = useMemo(() => {
    if (!filteredData.length) {
      return {values: [0], chartKey: 'empty'};
    }
    const vals = filteredData.map(d => Number(d.nav_value) || 0);
    const first = filteredData[0]?.nav_value;
    const last = filteredData[filteredData.length - 1]?.nav_value;
    return {
      values: vals,
      chartKey: `${range}-${filteredData.length}-${first}-${last}`,
    };
  }, [filteredData, range]);

  const showChart = filteredData.length >= 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.returnRow}>
        <Text style={[Textstyles.bold, styles.abs, isGain ? styles.green : styles.red]}>
          {absoluteReturn >= 0 ? '+' : '-'}₹{Math.abs(absoluteReturn).toFixed(2)}
        </Text>
        <Text style={[Textstyles.normal, styles.rangeLabel]}>{range} return</Text>
      </View>
      <Text style={[Textstyles.medium, isGain ? styles.green : styles.red]}>
        {absoluteReturn >= 0 ? '+' : ''}
        {percentReturn.toFixed(2)}%
      </Text>

      <View style={[styles.chartBox, {width: chartWidth}]}>
        {graphLoading && filteredData.length === 0 ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="large" color={Colors.themeBlue} />
            <Text style={styles.loadingTxt}>Loading chart…</Text>
          </View>
        ) : !showChart ? (
          <View style={styles.chartLoading}>
            <Text style={styles.loadingTxt}>Not enough NAV data</Text>
          </View>
        ) : (
          <NativeNavSparkline key={chartKey} values={values} lineColor={lineColor} width={chartWidth} />
        )}
        {graphLoading && filteredData.length > 0 ? (
          <View style={styles.chartOverlay}>
            <ActivityIndicator color={Colors.themeBlue} />
          </View>
        ) : null}
      </View>

      <View style={styles.chips}>
        {RANGE_KEYS.map(key => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, range === key && styles.chipOn]}
            onPress={() => onTimeFrameChange?.(key)}
            activeOpacity={0.85}>
            <Text style={[Textstyles.medium, styles.chipTxt, range === key && styles.chipTxtOn]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  abs: {
    fontSize: 22,
    marginRight: 8,
  },
  rangeLabel: {
    fontSize: 14,
    color: Colors.GREY,
  },
  green: {color: '#16a34a'},
  red: {color: '#dc2626'},
  chartBox: {
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 8,
  },
  nativeChart: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    justifyContent: 'flex-end',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCell: {
    flex: 1,
    marginHorizontal: 0.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 3,
    borderRadius: 2,
    opacity: 0.88,
  },
  chartLoading: {
    height: CHART_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTxt: {
    marginTop: 8,
    color: Colors.GREY,
    fontSize: 14,
  },
  chartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER_GREY,
    backgroundColor: Colors.white,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  chipOn: {
    borderColor: Colors.themeBlue,
    backgroundColor: '#E0F2FE',
  },
  chipTxt: {
    fontSize: 13,
    color: Colors.TEXT_PRIMARY,
  },
  chipTxtOn: {
    color: Colors.themeBlue,
    fontWeight: '600',
  },
});
