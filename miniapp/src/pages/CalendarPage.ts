import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function renderMonthGrid(year: number, month: number): string {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  const headers = DAY_NAMES.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const cells: string[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push('<div class="cal-day empty"></div>');
  }

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

  const totalUsed = firstDay + daysInMonth;
  const remainder = totalUsed % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push('<div class="cal-day empty"></div>');
    }
  }

  return `${headers}${cells.join('')}`;
}

export function renderWeekGrid(date: Date): string {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Find the Sunday of the week containing `date`
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);

  const headers = DAY_NAMES.map((name, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr ? ' today' : '';
    return `
      <div class="week-col${isToday}">
        <div class="week-col-header">
          <span class="week-day-name">${name}</span>
          <span class="week-day-num">${d.getDate()}</span>
        </div>
        <div class="week-col-body" data-events-date="${dateStr}"></div>
      </div>
    `;
  }).join('');

  return `<div class="week-grid">${headers}</div>`;
}

export function renderDayView(date: Date): string {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dayName = DAY_NAMES_FULL[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];

  const hours: string[] = [];
  for (let h = 0; h < 24; h++) {
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    hours.push(`
      <div class="day-hour-row">
        <span class="day-hour-label">${label}</span>
        <div class="day-hour-slot" data-events-date="${dateStr}" data-hour="${h}"></div>
      </div>
    `);
  }

  return `
    <div class="day-view-header">
      <div class="day-date-badge">
        <span>${dayName.slice(0, 3)}</span>
        <strong>${date.getDate()}</strong>
      </div>
      <div>
        <span class="day-view-kicker">Day Calendar</span>
        <strong>${dayName}, ${monthName} ${date.getDate()}</strong>
      </div>
    </div>
    <div class="day-view-body">${hours.join('')}</div>
  `;
}

export function renderAgendaView(): string {
  return `<div id="agenda-list" class="agenda-list"><p class="muted">Loading events...</p></div>`;
}

export function CalendarPage(date: Date = new Date(), view: string = 'month'): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  let gridContent: string;
  switch (view) {
    case 'week': gridContent = renderWeekGrid(date); break;
    case 'day': gridContent = renderDayView(date); break;
    case 'agenda': gridContent = renderAgendaView(); break;
    default: gridContent = `<div class="cal-grid">${renderMonthGrid(year, month)}</div>`; break;
  }

  return `
    ${Header('Calendar', 'View and manage your scheduled content.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="filter-tabs">
          <button class="filter-tab${view === 'month' ? ' active' : ''}" data-calendar-view="month">Month</button>
          <button class="filter-tab${view === 'week' ? ' active' : ''}" data-calendar-view="week">Week</button>
          <button class="filter-tab${view === 'day' ? ' active' : ''}" data-calendar-view="day">Day</button>
          <button class="filter-tab${view === 'agenda' ? ' active' : ''}" data-calendar-view="agenda">Agenda</button>
        </div>
      `)}
      ${GlassCard(`
        <div class="cal-nav">
          <button class="cal-nav-btn" id="cal-prev">‹</button>
          <strong class="cal-nav-label" id="cal-month-label">${MONTH_NAMES[month]} ${year}</strong>
          <button class="cal-nav-btn" id="cal-next">›</button>
        </div>
        <div id="calendar-content">
          ${gridContent}
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
