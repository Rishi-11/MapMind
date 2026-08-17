import React, { useEffect, useRef } from 'react';
import rough from 'roughjs';
import { NodeShape } from '@/types/graph';

interface RoughNodeRendererProps {
  width: number;
  height: number;
  colorTheme?: string;
  selected?: boolean;
  shape?: NodeShape;
  isRoot?: boolean;
}

const THEME_FILLS: Record<string, { stroke: string; fill: string; bg: string }> = {
  slate: { stroke: '#475569', fill: 'rgba(226, 232, 240, 0.4)', bg: '#f8fafc' },
  blue: { stroke: '#2563eb', fill: 'rgba(219, 234, 254, 0.5)', bg: '#eff6ff' },
  emerald: { stroke: '#059669', fill: 'rgba(209, 250, 229, 0.5)', bg: '#ecfdf5' },
  amber: { stroke: '#d97706', fill: 'rgba(254, 243, 199, 0.5)', bg: '#fffbeb' },
  rose: { stroke: '#e11d48', fill: 'rgba(255, 228, 230, 0.5)', bg: '#fff1f2' },
  purple: { stroke: '#7c3aed', fill: 'rgba(243, 232, 255, 0.5)', bg: '#faf5ff' },
  cyan: { stroke: '#0891b2', fill: 'rgba(207, 250, 254, 0.5)', bg: '#ecfeff' },
};

function getRoughCloudPath(w: number, h: number): string {
  const pad = 6;
  const width = Math.max(w - pad * 2, 80);
  const height = Math.max(h - pad * 2, 50);
  const x = pad;
  const y = pad;

  const x0 = x;
  const x1 = x + width * 0.25;
  const x2 = x + width * 0.5;
  const x3 = x + width * 0.75;
  const x4 = x + width;

  const y0 = y;
  const y1 = y + height * 0.5;
  const y2 = y + height;

  return `
    M ${x1},${y0 + 2}
    C ${x1 - 15},${y0 - 12} ${x0 + 10},${y0 - 8} ${x0 + 12},${y0 + 14}
    C ${x0 - 14},${y0 + 16} ${x0 - 14},${y1 + 4} ${x0 + 10},${y1 + 10}
    C ${x0 - 12},${y1 + 16} ${x0 - 6},${y2 + 8} ${x1 - 6},${y2 - 2}
    C ${x1},${y2 + 14} ${x2 - 10},${y2 + 14} ${x2},${y2 - 2}
    C ${x2 + 10},${y2 + 14} ${x3},${y2 + 14} ${x3 + 6},${y2 - 2}
    C ${x4 - 4},${y2 + 10} ${x4 + 14},${y2 + 2} ${x4 - 6},${y1 + 12}
    C ${x4 + 14},${y1 + 4} ${x4 + 14},${y0 + 16} ${x4 - 10},${y0 + 12}
    C ${x4 - 8},${y0 - 10} ${x3 + 12},${y0 - 12} ${x3},${y0 + 2}
    C ${x3 - 10},${y0 - 14} ${x2 + 10},${y0 - 14} ${x2},${y0 + 2}
    C ${x2 - 10},${y0 - 14} ${x1 + 10},${y0 - 14} ${x1},${y0 + 2}
    Z
  `.replace(/\s+/g, ' ').trim();
}

export const RoughNodeRenderer: React.FC<RoughNodeRendererProps> = ({
  width,
  height,
  colorTheme = 'slate',
  selected = false,
  shape = 'card',
  isRoot = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const theme = THEME_FILLS[colorTheme] || THEME_FILLS.slate;

    const strokeColor = selected ? '#2563eb' : theme.stroke;
    const strokeWidth = selected ? 2.5 : isRoot ? 2.2 : 1.5;
    const roughness = selected ? 1.8 : 1.4;

    const options = {
      stroke: strokeColor,
      strokeWidth,
      roughness,
      bowing: 1.2,
      fill: theme.fill,
      fillStyle: 'cross-hatch' as const,
      hachureAngle: 60,
      hachureGap: 8,
    };

    const padding = 4;
    const w = Math.max(width - padding * 2, 20);
    const h = Math.max(height - padding * 2, 20);

    let shapeNode: SVGGElement;

    if (shape === 'pill' || isRoot) {
      shapeNode = rc.rectangle(padding, padding, w, h, options);
    } else if (shape === 'diamond') {
      const points: [number, number][] = [
        [w / 2 + padding, padding],
        [w + padding, h / 2 + padding],
        [w / 2 + padding, h + padding],
        [padding, h / 2 + padding],
      ];
      shapeNode = rc.polygon(points, options);
    } else if (shape === 'cloud') {
      const cloudD = getRoughCloudPath(width, height);
      shapeNode = rc.path(cloudD, options);
    } else {
      shapeNode = rc.rectangle(padding, padding, w, h, options);
    }

    svg.appendChild(shapeNode);
  }, [width, height, colorTheme, selected, shape, isRoot]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
      style={{ zIndex: 0 }}
      width={width}
      height={height}
    />
  );
};
