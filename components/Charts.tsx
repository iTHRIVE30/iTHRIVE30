import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';
const PIE_COLORS = [
  '#D4AF37', '#8a7433', '#E8C968', '#B98F2E', '#5C4D24',
  '#F0D385', '#A67C00', '#C9A227', '#736024', '#D9B64E',
  '#836619', '#E0BD5E', '#6B5518',
];

export type ChartPoint = { label: string; value: number };
export type PieSlice = { label: string; value: number; color?: string };

// ---------- Bar ----------

export function BarChart({
  data,
  maxValue,
  valueSuffix = '',
  height = 140,
}: {
  data: ChartPoint[];
  maxValue?: number;
  valueSuffix?: string;
  height?: number;
}) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={[styles.row, { minHeight: height + 40 }]}>
      {data.map((point, i) => {
        const barHeight = max > 0 ? Math.max(2, (point.value / max) * height) : 2;
        return (
          <View key={i} style={styles.barColumn}>
            <Text style={styles.valueLabel}>{point.value > 0 ? `${Math.round(point.value * 10) / 10}${valueSuffix}` : ''}</Text>
            <View style={[styles.track, { height }]}>
              <View style={[styles.bar, { height: barHeight }]} />
            </View>
            <Text style={styles.xLabel} numberOfLines={1}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Line ----------

export function LineChart({
  data,
  maxValue,
  height = 140,
}: {
  data: ChartPoint[];
  maxValue?: number;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <View style={{ height: height + 30 }} />;
  }

  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - (max > 0 ? Math.min(1, d.value / max) * height : 0),
  }));

  return (
    <View>
      <View style={{ height, width: '100%' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 &&
          points.slice(0, -1).map((p, i) => {
            const next = points[i + 1];
            const dx = next.x - p.x;
            const dy = next.y - p.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const midX = (p.x + next.x) / 2;
            const midY = (p.y + next.y) / 2;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: midX - length / 2,
                  top: midY - 1,
                  width: length,
                  height: 2,
                  backgroundColor: GOLD,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}
        {width > 0 &&
          points.map((p, i) => (
            <View
              key={`dot-${i}`}
              style={{
                position: 'absolute',
                left: p.x - 4,
                top: p.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: GOLD,
                borderWidth: 2,
                borderColor: BLACK,
              }}
            />
          ))}
      </View>
      <View style={styles.row}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.xLabel,
              { flex: 1, textAlign: i === 0 ? 'left' : i === data.length - 1 ? 'right' : 'center' },
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------- Pie ----------

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function PieChart({ data, size = 170 }: { data: PieSlice[]; size?: number }) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((sum, d) => sum + d.value, 0);

  if (total <= 0) {
    return <Text style={styles.emptyPieText}>Not enough data yet.</Text>;
  }

  const r = size / 2;
  // Start angle is derived from the slices before this one rather than accumulated into a
  // mutable variable - reassigning a captured local during render is impure (React Compiler
  // flags it). The slice count is tiny, so the repeated sum costs nothing.
  const slices = filtered.map((d, i) => {
    const precedingValue = filtered.slice(0, i).reduce((sum, x) => sum + x.value, 0);
    const startAngle = (precedingValue / total) * 360;
    const endAngle = startAngle + (d.value / total) * 360;
    return {
      ...d,
      path: describeArc(r, r, r, startAngle, endAngle),
      color: d.color || PIE_COLORS[i % PIE_COLORS.length],
      percent: Math.round((d.value / total) * 100),
    };
  });

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Svg width={size} height={size}>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} />
          ))}
        </Svg>
      </View>
      <View>
        {slices.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
            <Text style={styles.legendPercent}>{s.percent}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 2 },
  valueLabel: { color: '#8a7433', fontSize: 9, marginBottom: 2, fontWeight: '700' },
  track: { width: '100%', maxWidth: 22, backgroundColor: '#1c1c1c', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { backgroundColor: GOLD, borderRadius: 6, width: '100%' },
  xLabel: { color: '#777', fontSize: 9, marginTop: 6 },
  emptyPieText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: '#ccc', fontSize: 12, flex: 1 },
  legendPercent: { color: '#8a7433', fontSize: 12, fontWeight: '700' },
});
