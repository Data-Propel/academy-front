import { useMemo } from 'react';

interface GradualBlurProps {
  position?: 'top' | 'bottom' | 'left' | 'right';
  strength?: number;
  height?: string;
  divCount?: number;
  exponential?: boolean;
  curve?: 'linear' | 'bezier' | 'ease-in';
  opacity?: number;
  zIndex?: number;
}

type CurveFunction = (p: number) => number;

const CURVE_FUNCTIONS: Record<string, CurveFunction> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
};

const getDirection = (pos: string): string =>
  ({ top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' } as Record<string, string>)[pos] ?? 'to bottom';

const GradualBlur = ({
  position = 'bottom',
  strength = 2,
  height = '6rem',
  divCount = 5,
  exponential = false,
  curve = 'linear',
  opacity = 1,
  zIndex = 10,
}: GradualBlurProps) => {
  const blurDivs = useMemo(() => {
    const increment = 100 / divCount;
    const curveFunc = CURVE_FUNCTIONS[curve] ?? CURVE_FUNCTIONS.linear;
    const direction = getDirection(position);

    return Array.from({ length: divCount }, (_, idx) => {
      const i = idx + 1;
      const progress = curveFunc(i / divCount);
      const blurValue = exponential
        ? Math.pow(2, progress * 4) * 0.0625 * strength
        : 0.0625 * (progress * divCount + 1) * strength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            maskImage: `linear-gradient(${direction}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
            backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
            opacity,
          }}
        />
      );
    });
  }, [position, strength, divCount, exponential, curve, opacity]);

  const isVertical = position === 'top' || position === 'bottom';

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex,
    [position]: 0,
    ...(isVertical
      ? { left: 0, right: 0, height, width: '100%' }
      : { top: 0, bottom: 0, width: height, height: '100%' }),
  };

  return <div style={containerStyle}>{blurDivs}</div>;
};

export default GradualBlur;
