import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function renderMonthGrid(year: number, month: number): string {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const headers = DAY_NAMES.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const cells: string[] = [];

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push('<div class="cal-day empty"></div>');
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const todayClass = d === todayDate ? ' today' : '';
    cells.push(`
      <div class="cal-day${todayClass}" data-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        <div class="cal-events" data-events-date="${dateStr}"></div>
      </div>
    `);
  }

  // Pad remaining cells to fill last row
  const totalUsed = firstDay + daysInMonth;
  const remainder = totalUsed % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push('<div class="cal-day empty"></div>');
    }
  }

  return `${headers}${cells.join('')}`;
}

export function CalendarPage(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return `
    ${Header('Calendar', 'View and manage your scheduled content.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="filter-tabs">
          <button class="filter-tab active" data-calendar-view="month">Month</button>
          <button class="filter-tab" data-calendar-view="week">Week</button>
          <button class="filter-tab" data-calendar-view="day">Day</button>
          <button class="filter-tab" data-calendar-view="agenda">Agenda</button>
        </div>
      `)}
      ${GlassCard(`
        <div class="cal-nav">
          <button class="cal-nav-btn" id="cal-prev">‹</button>
          <strong class="cal-nav-label" id="cal-month-label">${monthNames[month]} ${year}</strong>
          <button class="cal-nav-btn" id="cal-next">›</button>
        </div>
        <div id="calendar-grid" class="cal-grid">
          ${renderMonthGrid(year, month)}
        </div>
      `)}
      ${GlassCard(`
        <div class="cal-legend">
          <span><span class="cal-dot" style="background:rgba(247,237,255,0.32)"></span> Draft</span>
          <span><span class="cal-dot" style="background:#00dbff"></span> Scheduled</span>
          <span><span class="cal-dot" style="background:#10b981"></span> Posted</span>
        </div>
      `)}
    </main>
  `;
}
