import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function renderMonthGrid(year: number, month: number): string {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr =
    today.getFullYear() === year && today.getMonth() === month
      ? String(today.getDate())
      : '';

  const headers = DAY_NAMES.map(d => `<div class="calendar-header-cell">${d}</div>`).join('');

  const cells: string[] = [];
  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(`<div class="calendar-day empty"></div>`);
    } else {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const todayClass = String(dayNum) === todayStr ? ' today' : '';
      cells.push(`
        <div class="calendar-day${todayClass}" data-date="${dateStr}">
          <span class="day-number">${dayNum}</span>
          <div class="calendar-events"></div>
        </div>
      `);
    }
  }

  return `
    <div class="calendar-grid-header">${headers}</div>
    <div class="calendar-grid">${cells.join('')}</div>
  `;
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
        <div class="month-nav">
          <button class="small-action" id="cal-prev">&lt;</button>
          <strong id="cal-month-label">${monthNames[month]} ${year}</strong>
          <button class="small-action" id="cal-next">&gt;</button>
        </div>
        <div id="calendar-grid" class="calendar-grid">
          ${renderMonthGrid(year, month)}
        </div>
      `)}
      ${GlassCard(`
        <div class="event-legend">
          <span class="legend-dot draft-dot"></span> Draft
          <span class="legend-dot scheduled-dot"></span> Scheduled
          <span class="legend-dot posted-dot"></span> Posted
        </div>
      `)}
    </main>
  `;
}
