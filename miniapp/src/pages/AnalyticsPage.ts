import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function renderBarChart(data: Array<{ label: string; value: number }>, containerId: string): string {
  if (!data.length) return '<p class="muted">No data available.</p>';
  const max = Math.max(...data.map(d => d.value), 1);
  const bars = data
    .map(d => {
      const pct = Math.max(4, Math.round((d.value / max) * 100));
      return `
        <div class="bar-chart-col">
          <span class="bar-chart-value">${d.value}</span>
          <div class="bar-chart-bar" style="height:${pct}%"></div>
          <span class="bar-chart-label">${d.label}</span>
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

  // Only render every 3 hours to keep it compact
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  const headerCells = dayLabels.map(l => `<div class="hm-header">${l}</div>`).join('');

  const rows = hours
    .map(hour => {
      const cells = grid[hour]
        .map(count => {
          const opacity = count > 0 ? Math.max(0.15, count / maxCount) : 0.04;
          return `<div class="hm-cell" style="background:rgba(0,219,255,${opacity})" title="${count} posts"></div>`;
        })
        .join('');
      return `<div class="hm-label">${String(hour).padStart(2, '0')}:00</div>${cells}`;
    })
    .join('');

  return `
    <div class="hm-grid">
      <div class="hm-label"></div>${headerCells}
      ${rows}
    </div>
  `;
}

export function AnalyticsPage(): string {
  return `
    ${Header('Analytics', 'Track your publishing performance and engagement.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="analytics-metrics">
          <div class="a-metric"><span>Total Posts</span><strong id="total-posts">—</strong></div>
          <div class="a-metric"><span>Drafts</span><strong id="analytics-drafts">—</strong></div>
          <div class="a-metric"><span>Scheduled</span><strong id="analytics-scheduled">—</strong></div>
          <div class="a-metric"><span>Published</span><strong id="analytics-published">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <div class="analytics-metrics">
          <div class="a-metric"><span>Total Views</span><strong id="total-views">—</strong></div>
          <div class="a-metric"><span>Avg Views</span><strong id="avg-views">—</strong></div>
          <div class="a-metric"><span>Clicks</span><strong id="button-clicks">—</strong></div>
          <div class="a-metric"><span>Engagement</span><strong id="engagement">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <div class="analytics-metrics trio">
          <div class="a-metric"><span>Streak</span><strong id="pub-streak">—</strong></div>
          <div class="a-metric"><span>Best Day</span><strong id="best-day">—</strong></div>
          <div class="a-metric"><span>Best Hour</span><strong id="best-hour">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <h3>Weekly Activity</h3>
        <div id="weekly-chart" class="chart-wrap"></div>
      `)}
      ${GlassCard(`
        <h3>Monthly Overview</h3>
        <div id="monthly-chart" class="chart-wrap"></div>
      `)}
      ${GlassCard(`
        <h3>Posting Heatmap</h3>
        <div id="heatmap-chart" class="chart-wrap"></div>
      `)}
    </main>
  `;
}
