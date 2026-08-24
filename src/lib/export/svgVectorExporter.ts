import { MapMindNode, MapMindEdge, CanvasSettings } from '@/types/graph';

export interface DiagramBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  exportWidth: number;
  exportHeight: number;
  transform: string;
  visibleCount: number;
}

const THEME_PALETTES: Record<
  string,
  {
    fillLight: string;
    strokeLight: string;
    fillDark: string;
    strokeDark: string;
    accent: string;
    textLight: string;
    textDark: string;
    tagBgLight: string;
    tagBgDark: string;
    tagTextLight: string;
    tagTextDark: string;
  }
> = {
  slate: {
    fillLight: '#f8fafc',
    strokeLight: '#cbd5e1',
    fillDark: '#1e293b',
    strokeDark: '#475569',
    accent: '#475569',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#e2e8f0',
    tagBgDark: '#334155',
    tagTextLight: '#334155',
    tagTextDark: '#e2e8f0',
  },
  blue: {
    fillLight: '#eff6ff',
    strokeLight: '#93c5fd',
    fillDark: '#0f172a',
    strokeDark: '#1e40af',
    accent: '#2563eb',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#dbeafe',
    tagBgDark: '#1e3a8a',
    tagTextLight: '#1e40af',
    tagTextDark: '#bfdbfe',
  },
  emerald: {
    fillLight: '#ecfdf5',
    strokeLight: '#6ee7b7',
    fillDark: '#022c22',
    strokeDark: '#065f46',
    accent: '#059669',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#d1fae5',
    tagBgDark: '#064e3b',
    tagTextLight: '#065f46',
    tagTextDark: '#a7f3d0',
  },
  amber: {
    fillLight: '#fffbeb',
    strokeLight: '#fde68a',
    fillDark: '#291002',
    strokeDark: '#78350f',
    accent: '#d97706',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#fef3c7',
    tagBgDark: '#451a03',
    tagTextLight: '#92400e',
    tagTextDark: '#fde68a',
  },
  rose: {
    fillLight: '#fff1f2',
    strokeLight: '#fecdd3',
    fillDark: '#350414',
    strokeDark: '#881337',
    accent: '#e11d48',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#ffe4e6',
    tagBgDark: '#4c0519',
    tagTextLight: '#9f1239',
    tagTextDark: '#fecdd3',
  },
  purple: {
    fillLight: '#faf5ff',
    strokeLight: '#e9d5ff',
    fillDark: '#1e0a38',
    strokeDark: '#581c87',
    accent: '#9333ea',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#f3e8ff',
    tagBgDark: '#3b0764',
    tagTextLight: '#6b21a8',
    tagTextDark: '#e9d5ff',
  },
  cyan: {
    fillLight: '#ecfeff',
    strokeLight: '#a5f3fc',
    fillDark: '#042f2e',
    strokeDark: '#155e75',
    accent: '#0891b2',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    tagBgLight: '#cffafe',
    tagBgDark: '#083344',
    tagTextLight: '#155e75',
    tagTextDark: '#a5f3fc',
  },
};

function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates clean, infinite-resolution standalone vector SVG for any size MapMind diagram.
 * Completely immune to viewport virtualization or html-to-image clipping limits.
 */
export function generatePureVectorSvgString(
  nodes: MapMindNode[],
  edges: MapMindEdge[],
  settings: CanvasSettings | undefined,
  bounds: DiagramBounds,
  bgColor: string,
  padding: number = 80
): string {
  const isDark = settings?.theme === 'dark';
  const width = bounds.exportWidth;
  const height = bounds.exportHeight;
  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  const visibleNodes = nodes.filter((n) => !n.data?.hidden);
  const nodeMap = new Map<string, { node: MapMindNode; x: number; y: number; w: number; h: number }>();

  visibleNodes.forEach((node) => {
    const w = node.measured?.width || (node.width as number) || 200;
    const h = node.measured?.height || (node.height as number) || 80;
    const x = node.position.x + offsetX;
    const y = node.position.y + offsetY;
    nodeMap.set(node.id, { node, x, y, w, h });
  });

  // 1. Build Edges (Bezier curves with crisp vector paths)
  let edgesSvg = '';
  edges.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return;

    // Calculate source and target anchors
    const isSourceLeft = target.x < source.x;
    const isTargetLeft = source.x < target.x;

    const startX = isSourceLeft ? source.x : source.x + source.w;
    const startY = source.y + source.h / 2;
    const endX = isTargetLeft ? target.x : target.x + target.w;
    const endY = target.y + target.h / 2;

    const dx = Math.abs(endX - startX) * 0.55;
    const cp1x = isSourceLeft ? startX - dx : startX + dx;
    const cp1y = startY;
    const cp2x = isTargetLeft ? endX - dx : endX + dx;
    const cp2y = endY;

    const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    const strokeColor = isDark ? '#475569' : '#94a3b8';

    edgesSvg += `
      <g class="mapmind-edge" id="${escapeXml(edge.id)}">
        <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
        ${
          edge.data?.label
            ? `
          <g transform="translate(${(startX + endX) / 2}, ${(startY + endY) / 2})">
            <rect x="-40" y="-12" width="80" height="24" rx="6" fill="${isDark ? '#1e293b' : '#ffffff'}" stroke="${strokeColor}" stroke-width="1" />
            <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="${isDark ? '#cbd5e1' : '#475569'}" text-anchor="middle">
              ${escapeXml(edge.data.label)}
            </text>
          </g>
        `
            : ''
        }
      </g>
    `;
  });

  // 2. Build Nodes (Cards, Pills, Diamonds, Clouds with typography and tags)
  let nodesSvg = '';
  visibleNodes.forEach((node) => {
    const item = nodeMap.get(node.id);
    if (!item) return;

    const { x, y, w, h } = item;
    const colorKey = node.data?.colorTheme || 'blue';
    const palette = THEME_PALETTES[colorKey] || THEME_PALETTES.blue;
    const fill = isDark ? palette.fillDark : palette.fillLight;
    const stroke = isDark ? palette.strokeDark : palette.strokeLight;
    const textColor = isDark ? palette.textDark : palette.textLight;
    const shape = node.data?.shape || 'card';
    const isRoot = Boolean(node.data?.isRoot);

    const titleText = escapeXml(node.data?.label || node.data?.title || 'Untitled Node');
    const sublabelText = escapeXml(node.data?.sublabel || '');
    const tags = node.data?.tags || [];

    let shapeElement = '';
    if (shape === 'pill' || isRoot) {
      shapeElement = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#drop-shadow)" />`;
    } else if (shape === 'sharp') {
      shapeElement = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#drop-shadow)" />`;
    } else if (shape === 'diamond') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const points = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
      shapeElement = `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#drop-shadow)" />`;
    } else {
      shapeElement = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2" filter="url(#drop-shadow)" />`;
    }

    // Tags rendering
    let tagsSvg = '';
    if (tags.length > 0) {
      let tagX = x + 14;
      const tagY = y + h - 16;
      tags.slice(0, 3).forEach((tag) => {
        const tagLabel = escapeXml(tag);
        const tagWidth = Math.min(80, tagLabel.length * 7 + 14);
        tagsSvg += `
          <g transform="translate(${tagX}, ${tagY})">
            <rect x="0" y="-8" width="${tagWidth}" height="16" rx="4" fill="${isDark ? palette.tagBgDark : palette.tagBgLight}" />
            <text x="${tagWidth / 2}" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="600" fill="${isDark ? palette.tagTextDark : palette.tagTextLight}" text-anchor="middle">
              ${tagLabel}
            </text>
          </g>
        `;
        tagX += tagWidth + 5;
      });
    }

    nodesSvg += `
      <g class="mapmind-node" id="${escapeXml(node.id)}">
        ${shapeElement}
        
        <!-- Header / Root badge -->
        ${
          isRoot
            ? `<circle cx="${x + 18}" cy="${y + 22}" r="5" fill="${palette.accent}" />`
            : `<circle cx="${x + 18}" cy="${y + 22}" r="3.5" fill="${palette.accent}" opacity="0.8" />`
        }

        <!-- Title -->
        <text
          x="${x + 28}"
          y="${y + (sublabelText ? 24 : tags.length > 0 ? 26 : h / 2 + 5)}"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          font-size="13"
          font-weight="700"
          fill="${textColor}"
        >
          ${titleText}
        </text>

        <!-- Sublabel / Note -->
        ${
          sublabelText
            ? `
          <text
            x="${x + 28}"
            y="${y + 40}"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            font-size="10"
            font-weight="500"
            fill="${isDark ? '#94a3b8' : '#64748b'}"
          >
            ${sublabelText}
          </text>
        `
            : ''
        }

        <!-- Tags -->
        ${tagsSvg}
      </g>
    `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  style="background-color: ${bgColor};"
>
  <defs>
    <filter id="drop-shadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Canvas Background -->
  <rect width="${width}" height="${height}" fill="${bgColor}" />

  <!-- Graph Connections Layer -->
  <g id="mapmind-edges-layer">
    ${edgesSvg}
  </g>

  <!-- Graph Nodes Layer -->
  <g id="mapmind-nodes-layer">
    ${nodesSvg}
  </g>
</svg>`;
}
