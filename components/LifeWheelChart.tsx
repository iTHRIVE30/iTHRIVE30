import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../hooks/useTheme';
import { LIFE_AREAS, ZONES, type WheelScores } from '../lib/lifeWheel';

/**
 * The life wheel: eight spokes, one per area, with the three zones as rings - comfort at
 * the centre, thrive at the rim. Each series is one wheel (Day 1, Day 29...). A dashed
 * series reads as "where you were", a solid one as "where you are".
 *
 * Only ever this person's own wheels. No averages, no other Thrivers (growth record rules).
 */
export type WheelSeries = { scores: WheelScores; dashed?: boolean };

export default function LifeWheelChart({ series, size = 280 }: { series: WheelSeries[]; size?: number }) {
  const t = useTheme();
  const pad = 46; // room for the area names round the rim
  const c = size / 2;
  const r = c - pad;
  const n = LIFE_AREAS.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, score: number) => {
    const rr = (Math.max(0, Math.min(10, score)) / 10) * r;
    return [c + rr * Math.cos(angle(i)), c + rr * Math.sin(angle(i))];
  };

  // Outer edge of each zone, drawn largest first so the smaller ones sit on top.
  const zoneFill: Record<string, string> = { thrive: t.primaryTint, growth: t.primaryTintAlt, comfort: t.surfaceAlt };
  const rings = [...ZONES].sort((a, b) => b.max - a.max);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {rings.map((z) => (
          <Circle key={z.id} cx={c} cy={c} r={(z.max / 10) * r} fill={zoneFill[z.id]} stroke={t.border} strokeWidth={1} />
        ))}
        {LIFE_AREAS.map((a, i) => {
          const [x, y] = point(i, 10);
          const [lx, ly] = point(i, 12.4);
          return [
            <Line key={`s${a.id}`} x1={c} y1={c} x2={x} y2={y} stroke={t.border} strokeWidth={1} />,
            <SvgText
              key={`l${a.id}`}
              x={lx}
              y={ly + 3}
              fontSize={10}
              fill={t.secondary}
              textAnchor={Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'}
            >
              {a.name}
            </SvgText>,
          ];
        })}
        {series.map((s, si) => {
          const pts = LIFE_AREAS.map((_, i) => point(i, s.scores[i] ?? 0).join(',')).join(' ');
          return (
            <Polygon
              key={si}
              points={pts}
              fill={s.dashed ? 'none' : t.primary}
              fillOpacity={s.dashed ? 0 : 0.22}
              stroke={s.dashed ? t.secondary : t.primary}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5,4' : undefined}
            />
          );
        })}
      </Svg>
    </View>
  );
}
