import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import WebView from 'react-native-webview';
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

function NativeNavLineChart({values, lineColor, width}) {
  const pad = 10;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = CHART_H - pad * 2;

  const n = values.length;
  if (n < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const xStep = innerW / (n - 1);

  const points = values.map((v, i) => {
    const pct = (v - min) / span;
    return {
      x: pad + i * xStep,
      y: pad + (1 - pct) * innerH,
    };
  });

  const THICKNESS = 2;

  return (
    <View style={styles.nativeLineRoot}>
      {points.slice(0, -1).map((p1, i) => {
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!Number.isFinite(len) || len <= 0.1) return null;

        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        return (
          <View
            key={`seg-${i}`}
            style={[
              styles.nativeLineSegment,
              {
                left: midX - len / 2,
                top: midY - THICKNESS / 2,
                width: len,
                height: THICKNESS,
                backgroundColor: lineColor,
                transform: [{rotateZ: `${angleDeg}deg`}],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.nativeLineDot,
          {
            left: points[points.length - 1].x - 3,
            top: points[points.length - 1].y - 3,
            backgroundColor: lineColor,
          },
        ]}
      />
    </View>
  );
}

function buildApexLineChartHTML({labels, series, lineColor}) {
  const labelsJson = JSON.stringify(labels);
  const seriesJson = JSON.stringify(series);

  // Uses the same approach as Meon-CRM (ApexCharts in WebView + HTML string)
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      #line-chart { width: 100%; height: ${CHART_H}px; }
    </style>
  </head>
  <body>
    <div id="line-chart"></div>
    <script>
      (function () {
        var options = {
          chart: { type: 'line', height: ${CHART_H}, toolbar: { show: false }, zoom: { enabled: false } },
          series: ${seriesJson},
          colors: ['${lineColor}'],
          stroke: { curve: 'smooth', width: 2 },
          dataLabels: { enabled: false },
          fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.0, stops: [0, 90, 100] }
          },
          grid: { borderColor: '#F3F4F6' },
          xaxis: { categories: ${labelsJson}, labels: { show: false } },
          yaxis: { labels: { show: false } },
          legend: { show: false },
          tooltip: { enabled: true }
        };
        var chart = new ApexCharts(document.querySelector("#line-chart"), options);
        chart.render();
      })();
    </script>
  </body>
</html>
`;
}

export default function NavLineChart({graphData = [], graphLoading, timeFrame, onTimeFrameChange}) {
  const range = timeFrame || '1M';

  const toMs = d => {
    const raw = d?.date || d?.nav_date || d?.timestamp;
    if (typeof raw === 'number') {
      return raw < 1e12 ? raw * 1000 : raw;
    }
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  };

  const filteredData = useMemo(() => {
    const days = RANGE_MAP[range] || 30;
    if (!graphData?.length) {
      return [];
    }
    return graphData.slice(-days);
  }, [graphData, range]);

  // Plot strictly oldest -> latest so trend direction matches web.
  const chartData = useMemo(() => {
    if (!filteredData.length) return [];
    return [...filteredData]
      .map(d => ({...d, __ms: toMs(d)}))
      .filter(d => Number.isFinite(d.__ms))
      .sort((a, b) => a.__ms - b.__ms);
  }, [filteredData]);

  const {absoluteReturn, percentReturn, isGain} = useMemo(() => {
    const fd = chartData;
    if (fd.length < 2) {
      return {absoluteReturn: 0, percentReturn: 0, isGain: true};
    }
    const oldest = Number(fd[0].nav_value);
    const latest = Number(fd[fd.length - 1].nav_value);
    const abs = latest - oldest;
    const pct = oldest ? (abs / oldest) * 100 : 0;
    return {
      absoluteReturn: abs,
      percentReturn: pct,
      isGain: abs >= 0,
    };
  }, [chartData]);

  const chartWidth = Math.min(Dimensions.get('window').width - 32, 400);
  const lineColor = isGain ? '#16a34a' : '#dc2626';

  const {values, chartKey} = useMemo(() => {
    if (!chartData.length) {
      return {values: [0], chartKey: 'empty'};
    }
    const vals = chartData.map(d => Number(d.nav_value) || 0);
    const first = chartData[0]?.nav_value;
    const last = chartData[chartData.length - 1]?.nav_value;
    return {
      values: vals,
      chartKey: `${range}-${filteredData.length}-${first}-${last}`,
    };
  }, [chartData, filteredData.length, range]);

  const showChart = chartData.length >= 2;

  const [webviewReady, setWebviewReady] = useState(false);
  const [webviewError, setWebviewError] = useState(null);

  const apex = useMemo(() => {
    if (!chartData.length) {
      return {labels: [], series: []};
    }
    const labels = chartData.map(d => {
      const ms = d.__ms;
      if (!Number.isFinite(ms)) return '';
      const dt = new Date(ms);
      return dt.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'});
    });
    const data = chartData.map(d => Number(d.nav_value) || 0);
    return {labels, series: [{name: 'NAV', data}]};
  }, [chartData]);

  const chartHtml = useMemo(() => {
    if (!showChart) return '';
    return buildApexLineChartHTML({labels: apex.labels, series: apex.series, lineColor});
  }, [apex.labels, apex.series, lineColor, showChart]);

  useEffect(() => {
    setWebviewReady(false);
    setWebviewError(null);
  }, [chartHtml]);

  return (
    <View style={styles.wrap}>
      <View style={styles.returnRow}>
        <Text style={[Textstyles.medium, styles.abs, isGain ? styles.green : styles.red]}>
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
          <View style={styles.chartStack}>
            {/* Native fallback (so UI never goes blank) */}
            <NativeNavLineChart key={`native-${chartKey}`} values={values} lineColor={lineColor} width={chartWidth} />

            {!webviewError ? (
              <WebView
                key={`apex-${chartKey}`}
                style={styles.webviewOverlay}
                originWhitelist={['*']}
                source={{html: chartHtml}}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                onLoad={() => setWebviewReady(true)}
                onError={e => {
                  const msg = e?.nativeEvent?.description || e?.nativeEvent?.message || 'WebView error';
                  setWebviewError(msg);
                }}
                onHttpError={e => {
                  const msg = e?.nativeEvent?.description || e?.nativeEvent?.message || 'WebView http error';
                  setWebviewError(msg);
                }}
              />
            ) : null}

            {/* While WebView is loading, keep native visible */}
            {!webviewReady && !webviewError ? <View style={styles.webviewLoadingDim} pointerEvents="none" /> : null}
          </View>
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
  chartStack: {
    width: '100%',
    height: CHART_H,
    position: 'relative',
  },
  webviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  webviewLoadingDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  nativeLineRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  nativeLineSegment: {
    position: 'absolute',
  },
  nativeLineDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
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