import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function renderBarChart(data: Array<{ label: string; value: number }>, containerId: string): string {
  if (!data.length) return '<p class="muted">No data available.</p>';
  const max = Math.max(...data.map(d => d.value), 1);
  const bars = data
    .map(d => {
      const pct = Math.round((d.value / max) * 100);
      return `
        <div class="bar-col">
          <div class="bar" data-value="${d.value}" style="height:${pct}%"></div>
          <span class="bar-label">${d.label}</span>
        </div>
      `;
    })
    .join('');
  return `<div class="bar-chart" id="${containerId}">${bars}</div>`;
}

export function renderHeatmap(data: Array<{ day: number; hour: number; count: number }>): string {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const grid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
  for (const d of data) {
    if (d.hour >= 0 && d.hour < 24 && d.day >= 0 && d.day < 7) {
      grid[d.hour][d.day] = d.count;
    }
  }

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const headerRow = `<div class="heatmap-row header"><div class="heatmap-label"></div>${dayLabels.map(l => `<div class="heatmap-header">${l}</div>`).join('')}</div>`;

  const rows = grid
    .map((row, hour) => {
      const cells = row
        .map(count => {
          const opacity = count > 0 ? Math.max(0.15, count / maxCount) : 0;
          return `<div class="heatmap-cell" data-count="${count}" style="opacity:${opacity}"></div>`;
        })
        .join('');
      const label = `${String(hour).padStart(2, '0')}:00`;
      return `<div class="heatmap-row"><div class="heatmap-label">${label}</div>${cells}</div>`;
    })
    .join('');

  return `<div class="heatmap-grid">${headerRow}${rows}</div>`;
}

export function AnalyticsPage(): string {
  return `
    ${Header('Analytics', 'Track your publishing performance and engagement.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="metric-grid">
          <div><span>Total Posts</span><strong id="total-posts">—</strong></div>
          <div><span>Drafts</span><strong id="analytics-drafts">—</strong></div>
          <div><span>Scheduled</span><strong id="analytics-scheduled">—</strong></div>
          <div><span>Published</span><strong id="analytics-published">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <div class="metric-grid">
          <div><span>Total Views</span><strong id="total-views">—</strong></div>
          <div><span>Avg Views</span><strong id="avg-views">—</strong></div>
          <div><span>Button Clicks</span><strong id="button-clicks">—</strong></div>
          <div><span>Engagement</span><strong id="engagement">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <div class="metric-grid metric-grid-wide">
          <div><span>Publishing Streak</span><strong id="pub-streak">—</strong></div>
          <div><span>Best Day</span><strong id="best-day">—</strong></div>
          <div><span>Best Hour</span><strong id="best-hour">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <h2>Weekly Activity</h2>
        <div id="weekly-chart" class="chart-container"></div>
      `)}
      ${GlassCard(`
        <h2>Monthly Overview</h2>
        <div id="monthly-chart" class="chart-container"></div>
      `)}
      ${GlassCard(`
        <h2>Posting Heatmap</h2>
        <div id="heatmap-chart" class="chart-container"></div>
      `)}
    </main>
  `;
}
