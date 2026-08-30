import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { ChannelsPage, channelCard } from './pages/ChannelsPage';
import { DraftsPage, draftCard } from './pages/DraftsPage';
import { CalendarPage, renderMonthGrid, renderWeekGrid, renderDayView, renderAgendaView } from './pages/CalendarPage';
import { AnalyticsPage, renderBarChart, renderHeatmap } from './pages/AnalyticsPage';
import { TemplatesPage, templateCard } from './pages/TemplatesPage';
import { buildRichMessage, createPayload as buildPayload, initialEditorState, PostEditorPage, type EditorState } from './pages/PostEditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { PostPreview } from './components/PostPreview';
import { INLINE_BUTTON_PAYLOAD_FIELDS } from './components/ButtonBuilder';
import { RICH_BUTTON_PAYLOAD_FIELDS } from './components/RichButtonBuilder';
import { emptyCell, makeBlock, walkPath } from './components/RichBlockBuilder';
import { api } from './utils/api';
import { insertAtCursor, wrapSelection } from './utils/formatting';
import { qs } from './utils/dom';
import type {
  Channel,
  Draft,
  InlineButton,
  InlineButtonKind,
  InlineButtonRows,
  InputMedia,
  PostMode,
  PostPayload,
  RepeatMode,
  RichBlock,
  RichBlockCaption,
  RichBlockTableCell,
  RichButtonStyle,
  RichFlavor,
  RichListItem,
  RichMediaRef,
  RichMessageButton,
  Template
} from './types/post';

// ─── Types and State ───────────────────────────────────────────────────────────

export type PageName = 'dashboard' | 'editor' | 'channels' | 'drafts' | 'settings' | 'calendar' | 'analytics' | 'templates' | 'more';

interface AppState {
  page: PageName;
  editor: EditorState;
  calendarDate: Date;
  calendarView: string;
  draftFilter: string;
  draftSort: string;
  templateCategory: string;
}

const state: AppState = {
  page: 'dashboard',
  editor: { ...initialEditorState },
  calendarDate: new Date(),
  calendarView: 'month',
  draftFilter: 'all',
  draftSort: 'newest',
  templateCategory: 'all'
};

// ─── Render, PageHtml, Navigation, MoreMenu ────────────────────────────────────

export async function render(page: PageName = state.page): Promise<void> {
  if (page === 'more') {
    const moreMenu = document.getElementById('more-menu');
    if (moreMenu) moreMenu.classList.toggle('open');
    return;
  }

  state.page = page;

  const root = qs<HTMLDivElement>('#app');
  const pageHtml = getPageHtml(page);
  const bottomNavHtml = page === 'editor' ? '' : BottomNav(page);
  root.innerHTML = `<div class="app-shell">${pageHtml}${bottomNavHtml}</div>`;

  await hydratePage(page);
  bindNavigation();
  bindMoreMenu();
}

function getPageHtml(page: PageName): string {
  const pages: Record<PageName, string> = {
    dashboard: DashboardPage(),
    editor: PostEditorPage(state.editor) + ScheduleSheet(),
    channels: ChannelsPage(),
    drafts: DraftsPage(),
    settings: SettingsPage(),
    calendar: CalendarPage(state.calendarDate, state.calendarView),
    analytics: AnalyticsPage(),
    templates: TemplatesPage(),
    more: ''
  };

  return pages[page];
}

function bindNavigation(): void {
  document.querySelectorAll<HTMLElement>('[data-page]').forEach((element) => {
    element.addEventListener('click', () => {
      const page = element.dataset.page as PageName;
      void render(page);
    });
  });
}

function bindMoreMenu(): void {
  const toggleBtn = document.querySelector('[data-toggle-more]');
  const moreMenu = document.getElementById('more-menu');
  const backdrop = document.querySelector('[data-close-more]');

  if (toggleBtn && moreMenu) {
    toggleBtn.addEventListener('click', () => moreMenu.classList.toggle('open'));
  }
  if (backdrop && moreMenu) {
    backdrop.addEventListener('click', () => moreMenu.classList.remove('open'));
  }
}

// ─── hydratePage Dispatcher ────────────────────────────────────────────────────

async function hydratePage(page: PageName): Promise<void> {
  if (page === 'dashboard') await hydrateDashboard();
  if (page === 'channels') await hydrateChannels();
  if (page === 'drafts') await hydrateDrafts();
  if (page === 'calendar') await hydrateCalendar();
  if (page === 'analytics') await hydrateAnalytics();
  if (page === 'templates') await hydrateTemplates();
  if (page === 'editor') bindEditor();
}

// ─── Dashboard Hydration ───────────────────────────────────────────────────────

async function hydrateDashboard(): Promise<void> {
  try {
    const [drafts, channels, posts, scheduled] = await Promise.all([
      api.getDrafts(),
      api.getChannels(),
      api.getPosts(),
      api.getScheduled()
    ]);
    qs('#draft-count').textContent = String(drafts.length);
    qs('#channel-count').textContent = String(channels.length);
    qs('#posted-count').textContent = String(posts.length);
    qs('#scheduled-count').textContent = String(scheduled.length);
  } catch (error) {
    console.warn(error);
    qs('#draft-count').textContent = '!';
    qs('#channel-count').textContent = '!';
    qs('#posted-count').textContent = '!';
    qs('#scheduled-count').textContent = '!';
  }
}

// ─── Channels Hydration ────────────────────────────────────────────────────────

async function hydrateChannels(): Promise<void> {
  const picker = qs<HTMLSelectElement>('#channel-picker');
  const detail = qs('#selected-channel-detail');
  const list = qs('#channels-list');
  const status = document.getElementById('channel-picker-status');
  const refreshBtn = document.getElementById('refresh-channels-btn');
  const discoverInput = qs<HTMLInputElement>('#discover-input');
  const discoverBtn = document.getElementById('discover-btn');
  const discoverStatus = document.getElementById('discover-status');
  let allChannels: Channel[] = [];

  try {
    allChannels = await api.refreshChannels();
  } catch (error) {
    console.warn(error);
    try {
      allChannels = await api.getChannels();
      if (status) {
        status.textContent = 'Using saved channels. Sync could not reach Telegram right now.';
      }
    } catch {
      picker.innerHTML = '<option>No channels available</option>';
      picker.disabled = true;
      detail.innerHTML = '<p class="muted">Channels could not be loaded right now.</p>';
      list.innerHTML = '<p class="muted">Channels could not be loaded right now.</p>';
      if (status) status.textContent = 'Bot channels unavailable.';
      return;
    }
  }

  renderChannelPicker(allChannels, picker, detail, status);
  renderChannelList(allChannels, list);
  bindChannelActions(detail);
  bindChannelActions(list);

  picker.addEventListener('change', () => {
    renderSelectedChannel(allChannels, picker.value, detail);
    bindChannelActions(detail);
  });

  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.textContent = 'Syncing...';
    try {
      allChannels = await api.refreshChannels();
      renderChannelPicker(allChannels, picker, detail, status);
      renderChannelList(allChannels, list);
      bindChannelActions(detail);
      bindChannelActions(list);
    } catch (error) {
      console.warn(error);
      if (status) status.textContent = 'Could not sync Telegram access right now.';
    } finally {
      refreshBtn.textContent = 'Sync';
    }
  });

  discoverBtn?.addEventListener('click', async () => {
    const identifier = discoverInput.value.trim();
    if (!identifier) return;

    discoverBtn.textContent = 'Verifying...';
    if (discoverStatus) {
      discoverStatus.className = 'channel-picker-status';
      discoverStatus.textContent = '';
    }

    try {
      const channel = await api.discoverChannel(identifier);
      discoverInput.value = '';
      allChannels = await api.getChannels({ refresh: 'true' });
      renderChannelPicker(allChannels, picker, detail, status);
      picker.value = channel.id;
      renderSelectedChannel(allChannels, channel.id, detail);
      renderChannelList(allChannels, list);
      bindChannelActions(detail);
      bindChannelActions(list);

      if (discoverStatus) {
        discoverStatus.classList.add('ok');
        discoverStatus.textContent = `Added ${channel.username ? `@${channel.username}` : channel.name}.`;
      }
    } catch (error) {
      if (discoverStatus) {
        discoverStatus.classList.add('warn');
        discoverStatus.textContent = error instanceof Error ? error.message : 'Could not add channel.';
      }
    } finally {
      discoverBtn.textContent = 'Verify & Add';
    }
  });
}

function renderChannelPicker(channels: Channel[], picker: HTMLSelectElement, detail: Element, status: Element | null): void {
  const sorted = sortChannelsForPicker(channels);

  if (sorted.length === 0) {
    picker.innerHTML = '<option>No channels available</option>';
    picker.disabled = true;
    detail.innerHTML = `
      <div class="channel-detail-empty">
        <p class="muted">No channels are connected yet. Add the bot as an admin to a Telegram channel, then sync again.</p>
      </div>
    `;
    if (status) status.textContent = 'No bot-accessible channels found.';
    return;
  }

  picker.disabled = false;
  picker.innerHTML = sorted
    .map((channel) => `<option value="${channel.id}">${channel.name}${channel.username ? ` · @${channel.username}` : ''}</option>`)
    .join('');

  const selected = sorted.find((channel) => channel.isDefault) ?? sorted[0];
  picker.value = selected.id;
  renderSelectedChannel(sorted, selected.id, detail);
  if (status) status.textContent = `${sorted.length} channel${sorted.length === 1 ? '' : 's'} available to the bot.`;
}

function sortChannelsForPicker(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function renderChannelList(channels: Channel[], container: Element): void {
  const sorted = sortChannelsForPicker(channels);
  container.innerHTML = sorted.map(channelCard).join('') || '<p class="muted">No channels connected.</p>';
}

function renderSelectedChannel(channels: Channel[], channelId: string, detail: Element): void {
  const selected = channels.find((channel) => channel.id === channelId);

  if (!selected) {
    detail.innerHTML = '<p class="muted">Select a channel to view connection details.</p>';
    return;
  }

  detail.innerHTML = `
    ${channelCard(selected)}
  `;
}

function bindChannelActions(container: Element): void {
  container.querySelectorAll<HTMLElement>('.ch-card').forEach((card) => {
    const channelId = card.dataset.channelId!;

    card.querySelector('[data-favorite-channel]')?.addEventListener('click', async () => {
      try {
        await api.toggleChannelFavorite(channelId);
        void render('channels');
      } catch (error) {
        console.warn(error);
      }
    });

    card.querySelector('[data-channel-action="remove"]')?.addEventListener('click', async () => {
      if (!confirm('Remove this channel?')) return;
      try {
        await api.deleteChannel(channelId);
        void render('channels');
      } catch (error) {
        console.warn(error);
      }
    });

    card.querySelector('[data-channel-action="set-default"]')?.addEventListener('click', async () => {
      try {
        await api.setDefaultChannel(channelId);
        void render('channels');
      } catch (error) {
        console.warn(error);
      }
    });
  });
}

// ─── Drafts Hydration ──────────────────────────────────────────────────────────

async function hydrateDrafts(): Promise<void> {
  const list = qs('#drafts-list');
  let allDrafts: Draft[] = [];
  let allChannels: Channel[] = [];

  try {
    [allDrafts, allChannels] = await Promise.all([api.getDrafts(), api.getChannels()]);
    renderDraftList(allDrafts, allChannels, list);
  } catch (error) {
    console.warn(error);
    list.innerHTML = '<p class="muted">Drafts could not be loaded right now.</p>';
    return;
  }

  const searchInput = qs<HTMLInputElement>('#draft-search');
  const bulkBar = document.getElementById('bulk-bar');

  const refilter = () => {
    const filtered = filterDrafts(allDrafts, searchInput.value, state.draftSort, state.draftFilter);
    renderDraftList(filtered, allChannels, list);
    bindDraftActions(list, allDrafts, allChannels, bulkBar);
  };

  searchInput.addEventListener('input', refilter);

  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.draftFilter = tab.dataset.filter!;
      refilter();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-sort]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.draftSort = tab.dataset.sort!;
      refilter();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-bulk]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.bulk as 'archive' | 'favorite' | 'delete';
      const ids = getCheckedDraftIds();
      if (ids.length === 0) return;
      try {
        await api.bulkDrafts({ ids, action });
        void render('drafts');
      } catch (error) {
        console.warn(error);
        alert('Bulk action failed.');
      }
    });
  });

  bindDraftActions(list, allDrafts, allChannels, bulkBar);
}

function filterDrafts(drafts: Draft[], search: string, sort: string, filter: string): Draft[] {
  let filtered = drafts;

  if (filter === 'favorites') filtered = filtered.filter((d) => d.isFavorite);
  else if (filter === 'archived') filtered = filtered.filter((d) => d.isArchived);
  else if (filter === 'trashed') filtered = filtered.filter((d) => d.isTrashed);

  const query = search.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter((d) => d.title.toLowerCase().includes(query));
  }

  const sorted = [...filtered];
  switch (sort) {
    case 'newest': sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); break;
    case 'oldest': sorted.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)); break;
    case 'title-az': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'title-za': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
  }
  return sorted;
}

function renderDraftList(drafts: Draft[], channels: Channel[], container: Element): void {
  container.innerHTML = drafts.map((d) => draftCard(d, channels)).join('') || '<p class="muted">No saved drafts yet.</p>';
}

function bindDraftActions(container: Element, allDrafts: Draft[], allChannels: Channel[], bulkBar: HTMLElement | null): void {
  container.querySelectorAll<HTMLElement>('.draft-card').forEach((card) => {
    const draftId = card.dataset.draftId!;
    const draft = allDrafts.find((d) => d.id === draftId);

    card.addEventListener('click', (event) => {
      if (!draft || isDraftControl(event.target)) {
        return;
      }

      loadDraftIntoEditor(draft, allChannels);
    });
    card.addEventListener('keydown', (event) => {
      if (!draft || isDraftControl(event.target) || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
      }

      event.preventDefault();
      loadDraftIntoEditor(draft, allChannels);
    });

    card.querySelector('[data-favorite-draft]')?.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!draft) return;
      try {
        await api.updateDraft(draftId, { isFavorite: !draft.isFavorite });
        void render('drafts');
      } catch (error) {
        console.warn(error);
      }
    });

    const checkbox = card.querySelector<HTMLInputElement>('.draft-checkbox');
    if (checkbox && bulkBar) {
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener('change', () => {
        const checked = getCheckedDraftIds();
        if (checked.length > 0) {
          bulkBar.classList.remove('hidden');
        } else {
          bulkBar.classList.add('hidden');
        }
      });
    }
  });
}

function loadDraftIntoEditor(draft: Draft, channels: Channel[]): void {
  const rich = draft.rich;
  state.editor = {
    draftId: draft.id,
    title: draft.title,
    channelId: draft.channelId,
    text: draft.text,
    buttons: draft.buttons.length > 0
      ? draft.buttons.map((row) => row.map((button) => ({ kind: 'url' as InlineButtonKind, ...button })))
      : [[newInlineButton()]],
    channels,
    mode: draft.mode ?? 'regular',
    richFlavor: rich?.flavor ?? 'html',
    richHtml: rich?.html ?? '',
    richMarkdown: rich?.markdown ?? '',
    richBlocks: rich?.blocks ? JSON.parse(JSON.stringify(rich.blocks)) as RichBlock[] : [],
    richMedia: rich?.media ? JSON.parse(JSON.stringify(rich.media)) as RichMediaRef[] : [],
    richIsRtl: Boolean(rich?.isRtl),
    richSkipEntityDetection: Boolean(rich?.skipEntityDetection)
  };

  void render('editor');
}

function isDraftControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, input, label, a'));
}

function getCheckedDraftIds(): string[] {
  const ids: string[] = [];
  document.querySelectorAll<HTMLElement>('.draft-card').forEach((card) => {
    const checkbox = card.querySelector<HTMLInputElement>('.draft-checkbox');
    if (checkbox?.checked) {
      ids.push(card.dataset.draftId!);
    }
  });
  return ids;
}

// ─── Calendar Hydration ────────────────────────────────────────────────────────

interface CalEvent {
  date: string;
  title: string;
  status: 'draft' | 'scheduled' | 'posted';
}

async function hydrateCalendar(): Promise<void> {
  let allEvents: CalEvent[] = [];

  try {
    const [drafts, scheduled, posts] = await Promise.all([
      api.getDrafts(),
      api.getScheduled(),
      api.getPosts()
    ]);

    allEvents = [
      ...drafts.map((d) => ({ date: d.updatedAt, title: d.title, status: 'draft' as const })),
      ...scheduled.map((s) => ({ date: s.schedule?.publishAt ?? s.createdAt, title: s.title, status: 'scheduled' as const })),
      ...posts.map((p) => ({ date: p.createdAt, title: p.title, status: 'posted' as const }))
    ];

    placeCalendarEvents(allEvents);

    // For agenda view, populate the list
    if (state.calendarView === 'agenda') {
      populateAgenda(allEvents);
    }
  } catch (error) {
    console.warn(error);
  }

  // Prev/next navigation
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.calendarView === 'month') {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
      } else if (state.calendarView === 'week') {
        state.calendarDate = new Date(state.calendarDate.getTime() - 7 * 86400000);
      } else {
        state.calendarDate = new Date(state.calendarDate.getTime() - 86400000);
      }
      void render('calendar');
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.calendarView === 'month') {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
      } else if (state.calendarView === 'week') {
        state.calendarDate = new Date(state.calendarDate.getTime() + 7 * 86400000);
      } else {
        state.calendarDate = new Date(state.calendarDate.getTime() + 86400000);
      }
      void render('calendar');
    });
  }

  // View tabs
  document.querySelectorAll<HTMLButtonElement>('[data-calendar-view]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.calendarView!;
      state.calendarView = view;
      void render('calendar');
    });
  });
}

function placeCalendarEvents(events: CalEvent[]): void {
  const colors: Record<string, string> = {
    draft: 'rgba(247,237,255,0.32)',
    scheduled: '#00dbff',
    posted: '#10b981'
  };
  for (const event of events) {
    const dateStr = event.date.slice(0, 10);
    // Month/week views: place dots
    document.querySelectorAll<HTMLElement>(`[data-events-date="${dateStr}"]`).forEach(cell => {
      if (cell.dataset.hour != null) return; // skip day-view hour slots
      const dot = document.createElement('span');
      dot.className = 'cal-event-dot';
      dot.style.background = colors[event.status] || '#fff';
      dot.title = event.title;
      cell.appendChild(dot);
    });

    // Day view: place event cards in hour slots
    const eventDate = new Date(event.date);
    const hour = eventDate.getHours();
    const hourSlot = document.querySelector<HTMLElement>(`[data-events-date="${dateStr}"][data-hour="${hour}"]`);
    if (hourSlot) {
      const card = document.createElement('div');
      card.className = `day-event event-${event.status}`;
      card.textContent = event.title;
      hourSlot.appendChild(card);
    }
  }
}

function populateAgenda(events: CalEvent[]): void {
  const container = document.getElementById('agenda-list');
  if (!container) return;

  // Sort by date ascending, filter to today and future
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter(e => e.date.slice(0, 10) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) {
    container.innerHTML = '<p class="muted">No upcoming events.</p>';
    return;
  }

  const colors: Record<string, string> = {
    draft: 'rgba(247,237,255,0.32)',
    scheduled: '#00dbff',
    posted: '#10b981'
  };

  // Group by date
  const grouped = new Map<string, CalEvent[]>();
  for (const e of upcoming) {
    const key = e.date.slice(0, 10);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  let html = '';
  for (const [dateKey, items] of grouped) {
    const d = new Date(dateKey + 'T12:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    html += `<div class="agenda-date-header">${label}</div>`;
    for (const item of items) {
      const time = new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      html += `
        <div class="agenda-item">
          <span class="cal-dot" style="background:${colors[item.status]}"></span>
          <div class="agenda-item-body">
            <strong>${item.title}</strong>
            <span class="muted">${time} · ${item.status}</span>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

// ─── Analytics Hydration ───────────────────────────────────────────────────────

async function hydrateAnalytics(): Promise<void> {
  try {
    const data = await api.getAnalytics();

    qs('#total-posts').textContent = String(data.totalPosts);
    qs('#analytics-drafts').textContent = String(data.totalDrafts);
    qs('#analytics-scheduled').textContent = String(data.totalScheduled);
    qs('#analytics-published').textContent = String(data.totalPublished);
    qs('#total-views').textContent = data.totalViews.toLocaleString();
    qs('#avg-views').textContent = data.averageViews.toLocaleString();
    qs('#button-clicks').textContent = data.buttonClicks.toLocaleString();
    qs('#engagement').textContent = `${data.engagement}%`;
    qs('#pub-streak').textContent = `${data.publishingStreak} days`;
    qs('#best-day').textContent = data.bestDay;
    qs('#best-hour').textContent = `${String(data.bestHour).padStart(2, '0')}:00`;

    const weeklyContainer = document.getElementById('weekly-chart');
    if (weeklyContainer) {
      const weeklyData = data.weeklyChart.map((d) => ({ label: d.day, value: d.count }));
      weeklyContainer.innerHTML = renderBarChart(weeklyData, 'weekly-bars');
    }

    const monthlyContainer = document.getElementById('monthly-chart');
    if (monthlyContainer) {
      const monthlyData = data.monthlyChart.map((d) => ({ label: d.month, value: d.count }));
      monthlyContainer.innerHTML = renderBarChart(monthlyData, 'monthly-bars');
    }

    const heatmapContainer = document.getElementById('heatmap-chart');
    if (heatmapContainer) {
      heatmapContainer.innerHTML = renderHeatmap(data.heatmap);
    }
  } catch (error) {
    console.warn(error);
    qs('#total-posts').textContent = '!';
    qs('#analytics-drafts').textContent = '!';
    qs('#analytics-scheduled').textContent = '!';
    qs('#analytics-published').textContent = '!';
    qs('#total-views').textContent = '!';
    qs('#avg-views').textContent = '!';
    qs('#button-clicks').textContent = '!';
    qs('#engagement').textContent = '!';
    qs('#pub-streak').textContent = '!';
    qs('#best-day').textContent = '!';
    qs('#best-hour').textContent = '!';
  }
}

// ─── Templates Hydration ───────────────────────────────────────────────────────

async function hydrateTemplates(): Promise<void> {
  const list = qs('#templates-list');
  let allTemplates: Template[] = [];

  try {
    allTemplates = await api.getTemplates();
    renderTemplateList(allTemplates, list);
  } catch (error) {
    console.warn(error);
    list.innerHTML = '<p class="muted">Templates could not be loaded right now.</p>';
    return;
  }

  const searchInput = qs<HTMLInputElement>('#template-search');

  searchInput.addEventListener('input', () => {
    const filtered = filterTemplates(allTemplates, searchInput.value, state.templateCategory);
    renderTemplateList(filtered, list);
    bindTemplateActions(list, allTemplates);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-category]').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.templateCategory = pill.dataset.category!;
      const filtered = filterTemplates(allTemplates, searchInput.value, state.templateCategory);
      renderTemplateList(filtered, list);
      bindTemplateActions(list, allTemplates);
    });
  });

  bindTemplateActions(list, allTemplates);

  // Modal close handlers
  const modal = document.getElementById('template-preview-modal');
  const modalCloseBackdrop = document.getElementById('tpl-modal-close');
  const modalCloseBtn = document.getElementById('tpl-modal-close-btn');
  const modalUseBtn = document.getElementById('tpl-modal-use');

  const closeModal = () => { if (modal) modal.style.display = 'none'; };

  modalCloseBackdrop?.addEventListener('click', closeModal);
  modalCloseBtn?.addEventListener('click', closeModal);

  if (modalUseBtn) {
    modalUseBtn.addEventListener('click', () => {
      const templateId = modalUseBtn.dataset.templateId;
      if (!templateId) return;
      const template = allTemplates.find(t => t.id === templateId);
      if (!template) return;
      closeModal();
      state.editor.draftId = undefined;
      state.editor.title = template.name;
      state.editor.text = template.text;
      state.editor.buttons = template.buttons.length > 0
        ? template.buttons.map((row) => row.map((b) => ({ ...b })))
        : [[{ text: '', url: '' }]];
      void render('editor');
    });
  }
}

function openTemplatePreview(template: Template): void {
  const modal = document.getElementById('template-preview-modal');
  const title = document.getElementById('tpl-modal-title');
  const body = document.getElementById('tpl-modal-body');
  const useBtn = document.getElementById('tpl-modal-use');

  if (!modal || !title || !body) return;

  title.textContent = template.name;
  body.innerHTML = PostPreview(template.text, template.buttons);
  bindSpoilers(body);
  if (useBtn) useBtn.dataset.templateId = template.id;

  modal.style.display = 'flex';
}

function filterTemplates(templates: Template[], search: string, category: string): Template[] {
  let filtered = templates;
  if (category && category !== 'all') {
    filtered = filtered.filter((t) => t.category === category);
  }
  const query = search.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter((t) => t.name.toLowerCase().includes(query));
  }
  return filtered;
}

function renderTemplateList(templates: Template[], container: Element): void {
  container.innerHTML = templates.map(templateCard).join('') || '<p class="muted">No templates found.</p>';
}

function bindTemplateActions(container: Element, allTemplates: Template[]): void {
  container.querySelectorAll<HTMLElement>('.tpl-card').forEach((card) => {
    const templateId = card.dataset.templateId!;
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;

    card.querySelector('[data-template-action="preview"]')?.addEventListener('click', () => {
      openTemplatePreview(template);
    });

    card.querySelector('[data-template-action="use"]')?.addEventListener('click', () => {
      state.editor.draftId = undefined;
      state.editor.title = template.name;
      state.editor.text = template.text;
      state.editor.buttons = template.buttons.length > 0 ? template.buttons.map((row) => row.map((b) => ({ ...b }))) : [[{ text: '', url: '' }]];
      void render('editor');
    });

    card.querySelector('[data-template-action="duplicate"]')?.addEventListener('click', async () => {
      try {
        await api.saveTemplate({
          name: `${template.name} (Copy)`,
          category: template.category,
          text: template.text,
          buttons: template.buttons
        });
        void render('templates');
      } catch (error) {
        console.warn(error);
        alert('Could not duplicate template.');
      }
    });

    card.querySelector('[data-template-action="delete"]')?.addEventListener('click', async () => {
      if (!confirm('Delete this template?')) return;
      try {
        await api.deleteTemplate(templateId);
        void render('templates');
      } catch (error) {
        console.warn(error);
        alert('Could not delete template.');
      }
    });

    card.querySelector('[data-favorite-template]')?.addEventListener('click', async () => {
      try {
        await api.updateTemplate(templateId, { isFavorite: !template.isFavorite });
        void render('templates');
      } catch (error) {
        console.warn(error);
      }
    });
  });
}

// ─── Wire up the editor (Regular + Rich Message) ─────────────────────────────

function bindEditor(): void {
  const titleInput = qs<HTMLInputElement>('#post-title');
  const channelSelect = qs<HTMLSelectElement>('#channel-id');
  // Only present when we're in Regular mode.
  const textarea = document.getElementById('post-text') as HTMLTextAreaElement | null;

  if (textarea) textarea.value = state.editor.text;

  titleInput.addEventListener('input', () => {
    state.editor.title = titleInput.value;
    refreshPreview();
  });
  channelSelect.addEventListener('change', () => {
    state.editor.channelId = channelSelect.value;
    renderEditorChannelPreview();
    refreshPreview();
  });

  if (textarea) {
    textarea.addEventListener('input', () => {
      state.editor.text = textarea.value;
      refreshPreview();
    });
    document.querySelectorAll<HTMLButtonElement>('.editor-textarea + * [data-format], [data-format]').forEach((button) => {
      // Regular-mode toolbar buttons apply HTML wraps to #post-text.
      if (button.closest('.rich-flavor-body')) return;
      button.addEventListener('click', () => {
        const action = button.dataset.format;
        state.editor.text = applyFormat(action, textarea);
        refreshPreview();
      });
    });
  }

  bindModeAndFlavor();
  bindRichHtmlPane();
  bindRichMarkdownPane();
  bindRichMediaList();
  bindRichBlockBuilder();
  bindRichBlocksToolbar();
  bindRichMessageOptions();
  bindButtonBuilder();
  void hydrateEditorChannels(channelSelect);

  const previewRoot = document.querySelector('#preview-root');
  if (previewRoot) bindSpoilers(previewRoot);

  qs<HTMLButtonElement>('#save-draft').addEventListener('click', async () => {
    syncEditorFields(titleInput, channelSelect, textarea);
    const selectedChannel = getSelectedEditorChannel();
    if (!selectedChannel || !canPublishToChannel(selectedChannel)) {
      alert('Choose a channel the bot can access before saving this draft.');
      return;
    }

    try {
      const payload = createPayload('draft');
      const savedDraft = state.editor.draftId
        ? await api.updateDraft(state.editor.draftId, payload)
        : await api.saveDraft(payload);
      state.editor.draftId = savedDraft.id;
      resetEditorState();
      void render('dashboard');
    } catch (error) {
      console.warn(error);
      alert('Draft could not be saved right now.');
    }
  });

  qs<HTMLButtonElement>('#publish-now').addEventListener('click', async () => {
    syncEditorFields(titleInput, channelSelect, textarea);
    const selectedChannel = getSelectedEditorChannel();
    if (!selectedChannel || !canPublishToChannel(selectedChannel)) {
      alert('Choose a channel the bot can access before publishing.');
      return;
    }

    try {
      await api.publishPost(createPayload('posted'));
      resetEditorState();
      void render('dashboard');
    } catch (error) {
      console.warn(error);
      alert('Post could not be published right now.');
    }
  });

  bindScheduleSheet(titleInput, channelSelect, textarea);
}

// ─── Regular ↔ Rich tabs, and the HTML/Markdown/Blocks sub-tabs ──────────────

function bindModeAndFlavor(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-post-mode]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.postMode as PostMode | undefined;
      if (!nextMode || nextMode === state.editor.mode) return;
      state.editor.mode = nextMode;
      void render('editor');
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rich-flavor]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const flavor = tab.dataset.richFlavor as RichFlavor | undefined;
      if (!flavor || flavor === state.editor.richFlavor) return;
      state.editor.richFlavor = flavor;
      void render('editor');
    });
  });
}

// ─── HTML and Markdown editing panes ─────────────────────────────────────────

function bindRichHtmlPane(): void {
  const ta = document.getElementById('rich-html') as HTMLTextAreaElement | null;
  if (!ta) return;
  ta.value = state.editor.richHtml;
  ta.addEventListener('input', () => {
    state.editor.richHtml = ta.value;
    refreshPreview();
  });
  document.querySelectorAll<HTMLButtonElement>('.rich-flavor-body [data-format]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.format;
      state.editor.richHtml = applyFormat(action, ta);
      refreshPreview();
    });
  });
}

function bindRichMarkdownPane(): void {
  const ta = document.getElementById('rich-markdown') as HTMLTextAreaElement | null;
  if (!ta) return;
  ta.value = state.editor.richMarkdown;
  ta.addEventListener('input', () => {
    state.editor.richMarkdown = ta.value;
    refreshPreview();
  });
  // Wire the toolbar buttons that live above the markdown textarea to
  // markdown-flavoured wraps (**bold**, *italic*, ~strike~, `code`, etc.).
  document.querySelectorAll<HTMLButtonElement>('.rich-flavor-body [data-format]').forEach((button) => {
    // Skip anything already wired by the HTML pane; both panes share the
    // same query but only one exists at a time (the flavor tab that's open).
    if (!document.getElementById('rich-markdown')) return;
    button.addEventListener('click', () => {
      state.editor.richMarkdown = applyMarkdownFormat(button.dataset.format, ta);
      refreshPreview();
    });
  });
}

function applyMarkdownFormat(action: string | undefined, textarea: HTMLTextAreaElement): string {
  switch (action) {
    case 'bold': return wrapSelection(textarea, '**', '**');
    case 'italic': return wrapSelection(textarea, '*', '*');
    // Markdown has no underline — Telegram accepts inline HTML so use <u>.
    case 'underline': return wrapSelection(textarea, '<u>', '</u>');
    case 'strike': return wrapSelection(textarea, '~', '~');
    case 'code': return wrapSelection(textarea, '`', '`');
    case 'quote': return insertAtCursor(textarea, '\n> Quote text\n');
    case 'spoiler': return wrapSelection(textarea, '||', '||');
    case 'divider': return insertAtCursor(textarea, '\n---\n');
    default: return textarea.value;
  }
}

function bindRichMessageOptions(): void {
  const rtl = document.getElementById('rich-is-rtl') as HTMLInputElement | null;
  const skip = document.getElementById('rich-skip-entity-detection') as HTMLInputElement | null;
  if (rtl) rtl.addEventListener('change', () => { state.editor.richIsRtl = rtl.checked; refreshPreview(); });
  if (skip) skip.addEventListener('change', () => { state.editor.richSkipEntityDetection = skip.checked; refreshPreview(); });
}

// Toolbar for the Blocks pane. Bold/italic/etc. buttons apply markdown-style
// wraps (**bold**, *italic*, ~strike~, `code`, ||spoiler||) to whichever
// block textarea the user last had focused. That way one toolbar covers
// every block that takes text without cluttering each block header.
function bindRichBlocksToolbar(): void {
  const toolbar = document.getElementById('rich-blocks-toolbar');
  if (!toolbar) return;

  let lastFocused: HTMLTextAreaElement | null = null;
  document.querySelectorAll<HTMLTextAreaElement>('.rich-block textarea').forEach((ta) => {
    ta.addEventListener('focus', () => { lastFocused = ta; });
  });

  toolbar.querySelectorAll<HTMLButtonElement>('[data-blocks-format]').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus on the textarea
    btn.addEventListener('click', () => {
      const ta = lastFocused ?? document.querySelector<HTMLTextAreaElement>('.rich-block textarea');
      if (!ta) return;
      const action = btn.dataset.blocksFormat;
      const nextValue = applyBlocksFormat(action, ta);
      ta.value = nextValue;
      // Mirror the change into state at the right path.
      const path = ta.getAttribute('data-rich-block-path') || '';
      const field = ta.getAttribute('data-rich-block-field') as string | null;
      if (path && field) {
        const block = getBlockAtPath(path);
        if (block) {
          (block as unknown as Record<string, unknown>)[field] = nextValue;
        }
      }
      refreshPreview();
    });
  });
}

function applyBlocksFormat(action: string | undefined, textarea: HTMLTextAreaElement): string {
  switch (action) {
    case 'bold': return wrapSelection(textarea, '**', '**');
    case 'italic': return wrapSelection(textarea, '*', '*');
    case 'underline': return wrapSelection(textarea, '<u>', '</u>');
    case 'strike': return wrapSelection(textarea, '~', '~');
    case 'code': return wrapSelection(textarea, '`', '`');
    case 'spoiler': return wrapSelection(textarea, '||', '||');
    default: return textarea.value;
  }
}

// ─── Media library (used by the HTML and Markdown flavors) ──────────────────

function bindRichMediaList(): void {
  const addBtn = document.querySelector<HTMLButtonElement>('[data-rich-media-add]');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      state.editor.richMedia.push({
        id: `m${state.editor.richMedia.length + 1}`,
        media: { type: 'photo', media: '' }
      });
      void render('editor');
    });
  }

  document.querySelectorAll<HTMLElement>('.rich-media-item').forEach((item) => {
    const index = Number(item.dataset.richMediaIndex);
    const ref = state.editor.richMedia[index];
    if (!ref) return;

    item.querySelector<HTMLButtonElement>('[data-rich-media-remove]')?.addEventListener('click', () => {
      state.editor.richMedia.splice(index, 1);
      void render('editor');
    });

    item.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-rich-media-field]').forEach((input) => {
      const field = input.dataset.richMediaField as 'id' | 'media' | 'caption';
      input.addEventListener('input', () => {
        if (field === 'id') ref.id = input.value;
        else if (field === 'media') ref.media.media = input.value;
        else if (field === 'caption') ref.media.caption = input.value;
        refreshPreview();
      });
    });

    const typeSelect = item.querySelector<HTMLSelectElement>('[data-rich-media-type]');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        const type = typeSelect.value as InputMedia['type'];
        const previous = ref.media;
        ref.media = { type, media: previous.media, caption: previous.caption } as InputMedia;
        void render('editor');
      });
    }

    item.querySelectorAll<HTMLInputElement>('[data-rich-media-flag]').forEach((flag) => {
      const key = flag.dataset.richMediaFlag as 'hasSpoiler' | 'showCaptionAboveMedia';
      flag.addEventListener('change', () => {
        (ref.media as unknown as Record<string, unknown>)[key] = flag.checked;
        refreshPreview();
      });
    });
  });
}

// ─── Blocks editor (the visual builder for the Blocks flavor) ───────────────

function bindRichBlockBuilder(): void {
  // Add-block buttons (present in root + every nested scope).
  document.querySelectorAll<HTMLButtonElement>('[data-rich-block-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scope = btn.dataset.richBlockAdd || 'root';
      const typeSelect = document.querySelector<HTMLSelectElement>(`[data-rich-block-add-type="${scope}"]`);
      const type = (typeSelect?.value as RichBlock['type']) || 'paragraph';
      appendBlockAtScope(scope, makeBlock(type));
      void render('editor');
    });
  });

  // Move / remove buttons on each block item.
  document.querySelectorAll<HTMLButtonElement>('[data-rich-block-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.richBlockPath || '';
      const direction = Number(btn.dataset.richBlockMove);
      moveBlockAtPath(path, direction);
      void render('editor');
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rich-block-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeBlockAtPath(btn.dataset.richBlockPath || '');
      void render('editor');
    });
  });

  // Simple scalar fields on each block.
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-rich-block-field]').forEach((input) => {
    const path = input.getAttribute('data-rich-block-path') || '';
    const field = input.dataset.richBlockField as string;
    const evt = input instanceof HTMLSelectElement || (input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'number' ? 'change' : 'input';
    input.addEventListener(evt, () => {
      const block = getBlockAtPath(path);
      if (!block) return;
      applyScalarField(block, field, input);
      refreshPreview();
    });
  });

  // Block captions (photo/video/animation/audio/document/voice_note/collage/slideshow/map).
  document.querySelectorAll<HTMLInputElement>('[data-rich-block-caption-field]').forEach((input) => {
    const path = input.getAttribute('data-rich-block-path') || '';
    const field = input.dataset.richBlockCaptionField as 'text' | 'credit';
    input.addEventListener('input', () => {
      const block = getBlockAtPath(path) as unknown as { caption?: RichBlockCaption };
      if (!block) return;
      const caption: RichBlockCaption = block.caption ?? { text: '' };
      caption[field] = input.value;
      block.caption = caption;
      refreshPreview();
    });
  });

  // Inline media fields on media blocks (photo/video/etc).
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-rich-media-inline-field]').forEach((input) => {
    const path = input.getAttribute('data-rich-block-path') || '';
    const field = input.dataset.richMediaInlineField as string;
    const evt = (input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'number' ? 'change' : 'input';
    input.addEventListener(evt, () => {
      const block = getBlockAtPath(path);
      if (!block) return;
      const media = mediaOnBlock(block);
      if (!media) return;
      applyInputMediaField(media, field, input);
      refreshPreview();
    });
  });

  // List item handlers.
  document.querySelectorAll<HTMLButtonElement>('[data-rich-list-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.richListAdd || '';
      const block = getBlockAtPath(path);
      if (!block || block.type !== 'list') return;
      block.items.push({ blocks: [{ type: 'paragraph', text: '' }] });
      void render('editor');
    });
  });
  document.querySelectorAll<HTMLElement>('[data-rich-list-item]').forEach((item) => {
    const path = item.dataset.richBlockPath || '';
    const listItem = getListItemAtPath(path);
    if (!listItem) return;

    item.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-rich-list-item-field]').forEach((input) => {
      const field = input.dataset.richListItemField as 'hasCheckbox' | 'isChecked' | 'value' | 'labelType';
      const evt = (input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'number' || input instanceof HTMLSelectElement ? 'change' : 'input';
      input.addEventListener(evt, () => applyListItemField(listItem, field, input));
    });

    item.querySelector<HTMLButtonElement>('[data-rich-list-remove]')?.addEventListener('click', () => {
      removeListItemAtPath(path);
      void render('editor');
    });
    item.querySelectorAll<HTMLButtonElement>('[data-rich-list-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        moveListItemAtPath(path, Number(btn.dataset.richListMove));
        void render('editor');
      });
    });
  });

  // Table cell handlers.
  document.querySelectorAll<HTMLElement>('[data-rich-table-cell]').forEach((cellEl) => {
    const path = cellEl.dataset.richBlockPath || '';
    const row = Number(cellEl.dataset.richTableRow);
    const col = Number(cellEl.dataset.richTableCol);
    const block = getBlockAtPath(path);
    if (!block || block.type !== 'table') return;
    const cell = block.cells[row]?.[col];
    if (!cell) return;
    cellEl.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-rich-cell-field]').forEach((input) => {
      const field = input.dataset.richCellField as keyof RichBlockTableCell;
      const evt = (input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'number' || input instanceof HTMLSelectElement ? 'change' : 'input';
      input.addEventListener(evt, () => applyCellField(cell, field, input));
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rich-table-row-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const block = getBlockAtPath(btn.dataset.richBlockPath || '');
      if (!block || block.type !== 'table') return;
      const cols = Math.max(1, ...block.cells.map((r) => r.length));
      block.cells.push(Array.from({ length: cols }, () => emptyCell()));
      void render('editor');
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rich-table-col-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const block = getBlockAtPath(btn.dataset.richBlockPath || '');
      if (!block || block.type !== 'table') return;
      block.cells.forEach((r) => r.push(emptyCell()));
      void render('editor');
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rich-table-col-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const block = getBlockAtPath(btn.dataset.richBlockPath || '');
      if (!block || block.type !== 'table') return;
      block.cells.forEach((r) => { if (r.length > 1) r.pop(); });
      void render('editor');
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-rich-table-row-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.richBlockPath || '';
      const block = getBlockAtPath(path);
      if (!block || block.type !== 'table') return;
      const row = Number(btn.dataset.richTableRowRemove);
      if (block.cells.length > 1) block.cells.splice(row, 1);
      void render('editor');
    });
  });

  // Rich buttons (inside InputRichBlockButtons blocks).
  document.querySelectorAll<HTMLElement>('[data-rich-buttons-scope]').forEach((scope) => {
    const path = scope.dataset.richButtonsScope || '';
    const block = getBlockAtPath(path);
    if (!block || block.type !== 'buttons') return;

    scope.querySelector<HTMLButtonElement>('[data-rich-buttons-add]')?.addEventListener('click', () => {
      block.buttons.push({ text: '', kind: 'url', url: '' });
      void render('editor');
    });
    const alignSel = scope.querySelector<HTMLSelectElement>('[data-rich-buttons-align]');
    if (alignSel) alignSel.addEventListener('change', () => { block.align = alignSel.value as 'left' | 'center' | 'right'; refreshPreview(); });

    scope.querySelectorAll<HTMLElement>('[data-rich-button-index]').forEach((row) => {
      const index = Number(row.dataset.richButtonIndex);
      const button = block.buttons[index];
      if (!button) return;

      row.querySelector<HTMLInputElement>('[data-rich-button-field="text"]')?.addEventListener('input', (e) => {
        button.text = (e.target as HTMLInputElement).value;
        refreshPreview();
      });
      const kindSel = row.querySelector<HTMLSelectElement>('[data-rich-button-kind]');
      if (kindSel) kindSel.addEventListener('change', () => {
        button.kind = kindSel.value as RichMessageButton['kind'];
        clearRichButtonPayloads(button);
        void render('editor');
      });
      const styleSel = row.querySelector<HTMLSelectElement>('[data-rich-button-style]');
      if (styleSel) styleSel.addEventListener('change', () => {
        button.style = styleSel.value ? (styleSel.value as RichButtonStyle) : undefined;
        refreshPreview();
      });
      row.querySelector<HTMLInputElement>('[data-rich-button-payload]')?.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        const spec = RICH_BUTTON_PAYLOAD_FIELDS[button.kind];
        if (spec) (button as unknown as Record<string, unknown>)[spec.field] = value;
        refreshPreview();
      });
      row.querySelector<HTMLButtonElement>('[data-rich-button-remove]')?.addEventListener('click', () => {
        block.buttons.splice(index, 1);
        void render('editor');
      });
      row.querySelectorAll<HTMLButtonElement>('[data-rich-button-move]').forEach((mv) => {
        mv.addEventListener('click', () => {
          const dir = Number(mv.dataset.richButtonMove);
          const next = index + dir;
          if (next < 0 || next >= block.buttons.length) return;
          const [b] = block.buttons.splice(index, 1);
          block.buttons.splice(next, 0, b);
          void render('editor');
        });
      });
    });
  });
}

// ─── Helpers for navigating the tree of nested blocks ───────────────────────

function getBlockAtPath(path: string): RichBlock | null {
  const loc = walkPath(state.editor.richBlocks, path);
  if (!loc) return null;
  return (loc.parent[loc.index] as RichBlock) ?? null;
}

function getListItemAtPath(path: string): RichListItem | null {
  const loc = walkPath(state.editor.richBlocks, path);
  if (!loc) return null;
  return (loc.parent[loc.index] as RichListItem) ?? null;
}

function appendBlockAtScope(scope: string, block: RichBlock): void {
  if (scope === 'root') {
    state.editor.richBlocks.push(block);
    return;
  }
  const segments = scope.split('/').filter(Boolean);
  // Scope always ends with a container key ('blocks' or 'items' — but items appends via a different route).
  let arr: unknown[] = state.editor.richBlocks;
  for (let i = 0; i < segments.length - 1; i += 2) {
    const idx = Number(segments[i]);
    const key = segments[i + 1];
    const node = arr[idx] as Record<string, unknown>;
    arr = node[key] as unknown[];
  }
  // The scope from RichBlockBuilder ends in "…/blocks" (from renderBlockBuilder(pathPrefix + '/blocks'))
  // — so the final segment is 'blocks' and arr is now the blocks array.
  const tail = segments[segments.length - 1];
  if (tail === 'blocks' || tail === 'items') {
    (arr as RichBlock[]).push(block);
  } else {
    // Fallback (shouldn't happen): scope pointed at an item — append to its blocks.
    const parent = arr[Number(tail)] as { blocks?: RichBlock[] };
    if (parent && Array.isArray(parent.blocks)) parent.blocks.push(block);
  }
}

function moveBlockAtPath(path: string, direction: number): void {
  const loc = walkPath(state.editor.richBlocks, path);
  if (!loc) return;
  const next = loc.index + direction;
  if (next < 0 || next >= loc.parent.length) return;
  const [item] = loc.parent.splice(loc.index, 1);
  loc.parent.splice(next, 0, item);
}

function removeBlockAtPath(path: string): void {
  const loc = walkPath(state.editor.richBlocks, path);
  if (!loc) return;
  loc.parent.splice(loc.index, 1);
}

function moveListItemAtPath(path: string, direction: number): void {
  moveBlockAtPath(path, direction);
}

function removeListItemAtPath(path: string): void {
  removeBlockAtPath(path);
}

function mediaOnBlock(block: RichBlock): InputMedia | null {
  switch (block.type) {
    case 'photo': return block.photo;
    case 'video': return block.video;
    case 'animation': return block.animation;
    case 'audio': return block.audio;
    case 'document': return block.document;
    case 'voice_note': return block.voiceNote;
    default: return null;
  }
}

function applyScalarField(block: RichBlock, field: string, input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  const val = (input as HTMLInputElement).type === 'checkbox' ? (input as HTMLInputElement).checked
    : (input as HTMLInputElement).type === 'number' ? Number((input as HTMLInputElement).value)
    : (input as HTMLInputElement).value;
  (block as unknown as Record<string, unknown>)[field] = field === 'size' ? Number(val) as 1 | 2 | 3 | 4 | 5 | 6 : val;
}

function applyInputMediaField(media: InputMedia, field: string, input: HTMLInputElement | HTMLTextAreaElement): void {
  const el = input as HTMLInputElement;
  if (el.type === 'checkbox') (media as unknown as Record<string, unknown>)[field] = el.checked;
  else if (el.type === 'number') (media as unknown as Record<string, unknown>)[field] = el.value === '' ? undefined : Number(el.value);
  else (media as unknown as Record<string, unknown>)[field] = el.value;
}

function applyListItemField(item: RichListItem, field: 'hasCheckbox' | 'isChecked' | 'value' | 'labelType', input: HTMLInputElement | HTMLSelectElement): void {
  if (field === 'hasCheckbox' || field === 'isChecked') item[field] = (input as HTMLInputElement).checked;
  else if (field === 'value') item.value = (input as HTMLInputElement).value === '' ? undefined : Number((input as HTMLInputElement).value);
  else if (field === 'labelType') {
    const v = (input as HTMLSelectElement).value;
    item.labelType = v ? (v as RichListItem['labelType']) : undefined;
  }
  refreshPreview();
}

function applyCellField(cell: RichBlockTableCell, field: keyof RichBlockTableCell, input: HTMLInputElement | HTMLSelectElement): void {
  const el = input as HTMLInputElement;
  if (field === 'isHeader') cell.isHeader = el.checked;
  else if (field === 'colspan' || field === 'rowspan') {
    const n = Number(el.value);
    cell[field] = Number.isFinite(n) && n > 1 ? n : undefined;
  } else if (field === 'align' || field === 'valign') {
    cell[field] = (input as HTMLSelectElement).value as RichBlockTableCell['align'] & RichBlockTableCell['valign'];
  } else {
    cell.text = el.value;
  }
  refreshPreview();
}

function clearRichButtonPayloads(button: RichMessageButton): void {
  button.url = undefined;
  button.callbackData = undefined;
  button.webAppUrl = undefined;
  button.loginUrl = undefined;
  button.switchInlineQuery = undefined;
  button.switchInlineQueryCurrentChat = undefined;
  button.copyText = undefined;
}

function resetEditorState(): void {
  // Deep clone so the shared initialEditorState arrays (buttons, richBlocks…)
  // aren't mutated by the next session.
  state.editor = JSON.parse(JSON.stringify(initialEditorState)) as EditorState;
}

async function hydrateEditorChannels(channelSelect: HTMLSelectElement): Promise<void> {
  const status = document.getElementById('editor-channel-status');

  try {
    try {
      state.editor.channels = sortChannelsForPicker(await api.refreshChannels());
      if (status) status.textContent = `${state.editor.channels.length} bot-accessible channel${state.editor.channels.length === 1 ? '' : 's'} loaded.`;
    } catch (error) {
      console.warn(error);
      state.editor.channels = sortChannelsForPicker(await api.getChannels());
      if (status) status.textContent = 'Using saved channels. Sync could not reach Telegram right now.';
    }

    if (state.editor.channels.length === 0) {
      state.editor.channelId = '';
      channelSelect.disabled = true;
      channelSelect.innerHTML = '<option value="">No bot channels available</option>';
      if (status) status.textContent = 'No channels available. Add the bot as an admin to a channel, then sync Channels.';
      return;
    }

    // Dropdown shows names; the value we track is the Telegram chat id.
    if (!state.editor.channels.some((channel) => channel.telegramChatId === state.editor.channelId)) {
      state.editor.channelId = state.editor.channels.find((channel) => channel.isDefault)?.telegramChatId || state.editor.channels[0]?.telegramChatId || '';
    }

    channelSelect.disabled = false;
    channelSelect.innerHTML = [
      '<option value="">Choose a bot channel</option>',
      ...state.editor.channels.map(
        (channel) => `<option value="${channel.telegramChatId}" ${channel.telegramChatId === state.editor.channelId ? 'selected' : ''}>${channel.name}${canPublishToChannel(channel) ? '' : ' · needs access'}</option>`
      )
    ].join('');
    channelSelect.value = state.editor.channelId;
    renderEditorChannelPreview();
    refreshPreview();
  } catch (error) {
    console.warn(error);
    channelSelect.disabled = true;
    channelSelect.innerHTML = '<option value="">Channels unavailable</option>';
    if (status) status.textContent = 'Channels unavailable. The bot cannot load publish destinations right now.';
    renderEditorChannelPreview();
  }
}

function getSelectedEditorChannel(): Channel | undefined {
  return state.editor.channels.find((channel) => channel.telegramChatId === state.editor.channelId);
}

function canPublishToChannel(channel: Channel): boolean {
  return Boolean(channel.telegramChatId && channel.botCanAccess);
}

function renderEditorChannelPreview(): void {
  const preview = document.getElementById('editor-channel-preview');
  if (!preview) return;

  const channel = getSelectedEditorChannel();
  if (!channel) {
    preview.innerHTML = '<p class="muted">Select a channel to preview the publish destination.</p>';
    return;
  }

  const initial = (channel.name || channel.username || '?').charAt(0).toUpperCase();
  const avatar = channel.photoUrl
    ? `<img class="editor-channel-photo" src="${channel.photoUrl}" alt="" />`
    : `<div class="editor-channel-avatar" style="background:${channel.avatarColor || '#8000fe'}">${initial}</div>`;

  preview.innerHTML = `
    ${avatar}
    <div class="editor-channel-preview-copy">
      <strong>${channel.name}</strong>
      ${channel.username ? `<span>@${channel.username}</span>` : ''}
      ${channel.description ? `<p>${channel.description}</p>` : ''}
      ${canPublishToChannel(channel) ? '' : '<em>Bot access is not ready for publishing.</em>'}
    </div>
  `;
}

function syncEditorFields(titleInput: HTMLInputElement, channelSelect: HTMLSelectElement, textarea: HTMLTextAreaElement | null): void {
  state.editor.title = titleInput.value;
  state.editor.channelId = channelSelect.value;
  if (textarea) state.editor.text = textarea.value;
  const richHtml = document.getElementById('rich-html') as HTMLTextAreaElement | null;
  if (richHtml) state.editor.richHtml = richHtml.value;
  const richMarkdown = document.getElementById('rich-markdown') as HTMLTextAreaElement | null;
  if (richMarkdown) state.editor.richMarkdown = richMarkdown.value;
}

function createPayload(status: PostPayload['status']): PostPayload {
  return buildPayload(state.editor, status);
}

function applyFormat(action: string | undefined, textarea: HTMLTextAreaElement): string {
  switch (action) {
    case 'bold': return wrapSelection(textarea, '<b>', '</b>');
    case 'italic': return wrapSelection(textarea, '<i>', '</i>');
    case 'underline': return wrapSelection(textarea, '<u>', '</u>');
    case 'strike': return wrapSelection(textarea, '<s>', '</s>');
    case 'code': return wrapSelection(textarea, '<code>', '</code>');
    case 'quote': return insertAtCursor(textarea, '\n<blockquote>Quote text</blockquote>\n');
    case 'spoiler': return wrapSelection(textarea, '<tg-spoiler>', '</tg-spoiler>');
    case 'divider': return insertAtCursor(textarea, '\n━━━━━━━━━━━━\n');
    default: return textarea.value;
  }
}

function newInlineButton(): InlineButton {
  return { text: '', url: '', kind: 'url' };
}

function clearInlineButtonPayload(button: InlineButton): void {
  button.url = '';
  button.callbackData = undefined;
  button.webAppUrl = undefined;
  button.loginUrl = undefined;
  button.switchInlineQuery = undefined;
  button.switchInlineQueryCurrentChat = undefined;
  button.copyText = undefined;
}

function bindButtonBuilder(): void {
  qs<HTMLButtonElement>('#add-button-row').addEventListener('click', () => {
    state.editor.buttons.push([newInlineButton()]);
    void render('editor');
  });

  document.querySelectorAll<HTMLInputElement>('[data-button-field]').forEach((input) => {
    input.addEventListener('input', () => updateButtonTextFromInput(input));
  });

  // Kind picker on each inline button.
  document.querySelectorAll<HTMLSelectElement>('[data-button-kind]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const parent = sel.closest<HTMLElement>('.builder-button');
      if (!parent) return;
      const [rowIndex, buttonIndex] = getButtonPosition(parent);
      const button = state.editor.buttons[rowIndex][buttonIndex];
      button.kind = sel.value as InlineButtonKind;
      clearInlineButtonPayload(button);
      void render('editor');
    });
  });

  // Kind-specific payload input.
  document.querySelectorAll<HTMLInputElement>('[data-button-payload]').forEach((input) => {
    input.addEventListener('input', () => {
      const parent = input.closest<HTMLElement>('.builder-button');
      if (!parent) return;
      const [rowIndex, buttonIndex] = getButtonPosition(parent);
      const button = state.editor.buttons[rowIndex][buttonIndex];
      const spec = INLINE_BUTTON_PAYLOAD_FIELDS[button.kind ?? 'url'];
      if (!spec) return;
      (button as unknown as Record<string, unknown>)[spec.field] = input.value;
      // Mirror to legacy `url` field when kind === 'url' so old consumers keep working.
      if ((button.kind ?? 'url') === 'url') button.url = input.value;
      refreshPreview();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-add-button]').forEach((button) => {
    button.addEventListener('click', () => {
      const rowIndex = Number(button.dataset.addButton);
      state.editor.buttons[rowIndex].push(newInlineButton());
      void render('editor');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-remove-row]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editor.buttons.splice(Number(button.dataset.removeRow), 1);
      if (state.editor.buttons.length === 0) state.editor.buttons.push([]);
      void render('editor');
    });
  });

  document.querySelectorAll<HTMLElement>('.builder-button').forEach((item) => {
    item.querySelector('[data-remove-button]')?.addEventListener('click', () => {
      const [rowIndex, buttonIndex] = getButtonPosition(item);
      state.editor.buttons[rowIndex].splice(buttonIndex, 1);
      void render('editor');
    });

    item.querySelector('[data-move-left]')?.addEventListener('click', () => moveButton(item, -1));
    item.querySelector('[data-move-right]')?.addEventListener('click', () => moveButton(item, 1));
  });
}

function updateButtonTextFromInput(input: HTMLInputElement): void {
  const parent = input.closest<HTMLElement>('.builder-button');
  if (!parent) return;

  const [rowIndex, buttonIndex] = getButtonPosition(parent);
  const field = input.dataset.buttonField as 'text';
  state.editor.buttons[rowIndex][buttonIndex][field] = input.value;
  refreshPreview();
}

function getButtonPosition(element: HTMLElement): [number, number] {
  return [Number(element.dataset.rowIndex), Number(element.dataset.buttonIndex)];
}

function moveButton(element: HTMLElement, direction: number): void {
  const [rowIndex, buttonIndex] = getButtonPosition(element);
  const row = state.editor.buttons[rowIndex];
  const nextIndex = buttonIndex + direction;
  if (nextIndex < 0 || nextIndex >= row.length) return;

  const [button] = row.splice(buttonIndex, 1);
  row.splice(nextIndex, 0, button);
  void render('editor');
}

// ─── Schedule Sheet ────────────────────────────────────────────────────────────

function ScheduleSheet(): string {
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

  const repeatOptions: RepeatMode[] = ['never', 'daily', 'weekly', 'monthly', 'yearly', 'custom'];
  const repeatButtons = repeatOptions
    .map((mode) => {
      const active = mode === 'never' ? ' active' : '';
      const label = mode.charAt(0).toUpperCase() + mode.slice(1);
      return `<button class="filter-pill${active}" data-repeat="${mode}">${label}</button>`;
    })
    .join('');

  return `
    <div class="schedule-overlay" id="schedule-sheet" style="display:none;">
      <div class="schedule-backdrop" id="schedule-backdrop"></div>
      <div class="schedule-panel glass-card">
        <h2>Schedule Post</h2>

        <label class="field-label">Date
          <input type="date" id="schedule-date" class="input" value="${today}" />
        </label>

        <label class="field-label">Time
          <input type="time" id="schedule-time" class="input" value="${nowTime}" />
        </label>

        <div class="field-label">Timezone
          <span class="code-pill">${detectedTz}</span>
        </div>

        <div class="field-label">Repeat</div>
        <div class="pill-scroll" id="repeat-options">${repeatButtons}</div>

        <div id="custom-repeat" class="hidden" style="margin-top:0.5rem;">
          <label class="field-label">Every
            <div class="toolbar-row">
              <input type="number" id="custom-interval" class="input" value="1" min="1" style="width:5rem;" />
              <select id="custom-unit" class="input">
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </label>
        </div>

        <div class="editor-actions" style="margin-top:1rem;">
          <button class="secondary-action" id="schedule-cancel">Cancel</button>
          <button class="primary-action" id="schedule-confirm">Schedule</button>
        </div>
      </div>
    </div>
  `;
}

function bindScheduleSheet(titleInput: HTMLInputElement, channelSelect: HTMLSelectElement, textarea: HTMLTextAreaElement | null): void {
  const scheduleBtn = document.getElementById('schedule-btn');
  const sheet = document.getElementById('schedule-sheet');
  const backdrop = document.getElementById('schedule-backdrop');
  const cancelBtn = document.getElementById('schedule-cancel');
  const confirmBtn = document.getElementById('schedule-confirm');
  const customRepeatDiv = document.getElementById('custom-repeat');

  let selectedRepeat: RepeatMode = 'never';

  if (!scheduleBtn || !sheet) return;

  const openSheet = () => { sheet.style.display = 'flex'; };
  const closeSheet = () => { sheet.style.display = 'none'; };

  scheduleBtn.addEventListener('click', openSheet);
  if (backdrop) backdrop.addEventListener('click', closeSheet);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSheet);

  document.querySelectorAll<HTMLButtonElement>('#repeat-options [data-repeat]').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#repeat-options [data-repeat]').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      selectedRepeat = pill.dataset.repeat as RepeatMode;
      if (customRepeatDiv) {
        if (selectedRepeat === 'custom') {
          customRepeatDiv.classList.remove('hidden');
        } else {
          customRepeatDiv.classList.add('hidden');
        }
      }
    });
  });

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      syncEditorFields(titleInput, channelSelect, textarea);

      const dateVal = qs<HTMLInputElement>('#schedule-date').value;
      const timeVal = qs<HTMLInputElement>('#schedule-time').value;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (!dateVal || !timeVal) {
        alert('Please select a date and time.');
        return;
      }

      const publishAt = new Date(`${dateVal}T${timeVal}`).toISOString();

      const payload = createPayload('scheduled');
      payload.schedule = {
        publishAt,
        timezone,
        repeat: selectedRepeat
      };

      if (selectedRepeat === 'custom') {
        const interval = Number(qs<HTMLInputElement>('#custom-interval').value) || 1;
        const unit = qs<HTMLSelectElement>('#custom-unit').value as 'hours' | 'days' | 'weeks' | 'months';
        payload.schedule.customInterval = interval;
        payload.schedule.customUnit = unit;
      }

      try {
        await api.schedulePost(payload);
        alert('Post scheduled.');
        closeSheet();
      } catch (error) {
        console.warn(error);
        alert('Could not schedule post.');
      }
    });
  }
}

// ─── Shared Utilities ──────────────────────────────────────────────────────────

function refreshPreview(): void {
  const root = document.querySelector('#preview-root');
  if (!root) return;

  const selectedChannel = getSelectedEditorChannel();
  root.innerHTML = PostPreview(state.editor.text, state.editor.buttons, {
    channelName: selectedChannel?.name,
    mode: state.editor.mode,
    rich: state.editor.mode === 'rich' ? buildRichMessage(state.editor) : undefined
  });
  bindSpoilers(root);
}

function bindSpoilers(container: Element): void {
  container.querySelectorAll<HTMLElement>('tg-spoiler').forEach((spoiler) => {
    spoiler.addEventListener('click', () => spoiler.classList.toggle('revealed'));
  });
}
