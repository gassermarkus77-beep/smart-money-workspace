'use client';

// ============================================================================
// Left-edge drawing toolbar — TradingView-style.
// Icons are wired to the activeTool state; actual canvas interaction for each
// tool ships later. For now selecting a tool just shows the highlighted state.
// ============================================================================

import {
  MousePointer2, TrendingUp, Spline, GitBranch, Slash,
  Type as TypeIcon, Smile, Ruler, ZoomIn, Magnet, Lock,
  Eye, Link2, Trash2, Square,
} from 'lucide-react';

export type DrawingTool =
  | 'cursor' | 'trendline' | 'fib' | 'channel' | 'horizontal'
  | 'rect' | 'text' | 'emoji' | 'ruler' | 'zoom'
  | 'magnet' | 'lock' | 'hide' | 'sync' | 'clear';

const TOOLS: Array<{ key: DrawingTool; icon: React.ReactNode; label: string; group?: number }> = [
  { key: 'cursor',     icon: <MousePointer2 size={16} />, label: 'Cursor',         group: 1 },
  { key: 'trendline',  icon: <TrendingUp    size={16} />, label: 'Trend line',     group: 2 },
  { key: 'channel',    icon: <Spline        size={16} />, label: 'Channel',        group: 2 },
  { key: 'fib',        icon: <GitBranch     size={16} />, label: 'Fibonacci',      group: 2 },
  { key: 'horizontal', icon: <Slash         size={16} />, label: 'Horizontal line', group: 2 },
  { key: 'rect',       icon: <Square        size={16} />, label: 'Rectangle',      group: 3 },
  { key: 'text',       icon: <TypeIcon      size={16} />, label: 'Text',           group: 3 },
  { key: 'emoji',      icon: <Smile         size={16} />, label: 'Sticker',        group: 3 },
  { key: 'ruler',      icon: <Ruler         size={16} />, label: 'Measure',        group: 4 },
  { key: 'zoom',       icon: <ZoomIn        size={16} />, label: 'Zoom',           group: 4 },
  { key: 'magnet',     icon: <Magnet        size={16} />, label: 'Magnet',         group: 5 },
  { key: 'lock',       icon: <Lock          size={16} />, label: 'Lock drawings',  group: 5 },
  { key: 'hide',       icon: <Eye           size={16} />, label: 'Hide drawings',  group: 5 },
  { key: 'sync',       icon: <Link2         size={16} />, label: 'Sync drawings',  group: 5 },
  { key: 'clear',      icon: <Trash2        size={16} />, label: 'Remove all',     group: 6 },
];

export interface DrawingToolbarProps {
  active: DrawingTool;
  onSelect: (tool: DrawingTool) => void;
}

export function DrawingToolbar({ active, onSelect }: DrawingToolbarProps): JSX.Element {
  let prevGroup = 0;
  return (
    <div className="w-10 border-r border-bg-elevated bg-bg flex flex-col items-center py-2 gap-0.5">
      {TOOLS.map(t => {
        const showSep = t.group !== prevGroup && prevGroup !== 0;
        prevGroup = t.group ?? 0;
        return (
          <div key={t.key} className="flex flex-col items-center w-full">
            {showSep && <div className="w-5 h-px bg-bg-elevated my-1" />}
            <button
              title={t.label}
              onClick={() => onSelect(t.key)}
              className={`w-8 h-8 inline-flex items-center justify-center rounded transition-colors ${
                active === t.key
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text'
              }`}
            >
              {t.icon}
            </button>
          </div>
        );
      })}
    </div>
  );
}
