import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { ChannelsPage, channelCard } from './pages/ChannelsPage';
import { DraftsPage, draftCard } from './pages/DraftsPage';
import { CalendarPage, renderMonthGrid, renderWeekGrid, renderDayView, renderAgendaView } from './pages/CalendarPage';
import { AnalyticsPage, renderBarChart, renderHeatmap } from './pages/AnalyticsPage';
import { TemplatesPage, templateCard } from './pages/TemplatesPage';
import { initialEditorState, PostEditorPage, type EditorState } from './pages/PostEditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './utils/api';
import { insertAtCursor, wrapSelection } from './utils/formatting';
import { qs } from './utils/dom';
import type { Channel, Draft, InlineButtonRows, PostPayload, RepeatMode, Template } from './types/post';

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
  const list = qs('#channels-list');
  let allChannels: Channel[] = [];

  try {
    allChannels = await api.getChannels();
    renderChannelList(allChannels, list);
  } catch (error) {
    console.warn(error);
    list.innerHTML = '<p class="muted">Channels could not be loaded right now.</p>';
    return;
  }

  const searchInput = qs<HTMLInputElement>('#channel-search');
  const refreshBtn = document.getElementById('refresh-channels-btn');
  const discoverInput = qs<HTMLInputElement>('#discover-input');
  const discoverBtn = document.getElementById('discover-btn');
  const discoverStatus = document.getElementById('discover-status');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = query
      ? allChannels.filter(c => c.name.toLowerCase().includes(query) || (c.username ?? '').toLowerCase().includes(query))
      : allChannels;
    renderChannelList(filtered, list);
    bindChannelActions(list, allChannels);
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.textContent = 'Refreshing...';
      try {
        await api.refreshChannels();
        void render('channels');
      } catch (error) {
        console.warn(error);
        refreshBtn.textContent = 'Refresh';
      }
    });
  }

  if (discoverBtn && discoverInput) {
    discoverBtn.addEventListener('click', async () => {
      const identifier = discoverInput.value.trim();
      if (!identifier) return;

      discoverBtn.textContent = 'Looking up...';
      if (discoverStatus) discoverStatus.textContent = '';

      try {
        const channel = await api.discoverChannel(identifier);
        if (discoverStatus) {
          discoverStatus.style.color = '#10b981';
          discoverStatus.textContent = `Added "${channel.name}" successfully.`;
        }
        discoverInput.value = '';
        void render('channels');
      } catch (error) {
        if (discoverStatus) {
          discoverStatus.style.color = '#f87171';
          discoverStatus.textContent = error instanceof Error ? error.message : 'Channel not found.';
        }
        discoverBtn.textContent = 'Add';
      }
    });
  }

  bindChannelActions(list, allChannels);
}

function renderChannelList(channels: Channel[], container: Element): void {
  container.innerHTML = channels.map(channelCard).join('') || '<p class="muted">No channels connected. Add one below.</p>';
}

function bindChannelActions(container: Element, allChannels: Channel[]): void {
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

    card.querySelector('[data-favorite-draft]')?.addEventListener('click', async () => {
      const draft = allDrafts.find((d) => d.id === draftId);
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
  body.textContent = template.text;
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

// ─── Editor Binding (All Existing Code) ────────────────────────────────────────

function bindEditor(): void {
  const titleInput = qs<HTMLInputElement>('#post-title');
  const channelSelect = qs<HTMLSelectElement>('#channel-id');
  const textarea = qs<HTMLTextAreaElement>('#post-text');

  textarea.value = state.editor.text;

  titleInput.addEventListener('input', () => {
    state.editor.title = titleInput.value;
    refreshPreview();
  });
  channelSelect.addEventListener('change', () => (state.editor.channelId = channelSelect.value));
  textarea.addEventListener('input', () => {
    state.editor.text = textarea.value;
    refreshPreview();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.format;
      state.editor.text = applyFormat(action, textarea);
      refreshPreview();
    });
  });

  bindButtonBuilder();
  void hydrateEditorChannels(channelSelect);

  const previewRoot = document.querySelector('#preview-root');
  if (previewRoot) bindSpoilers(previewRoot);

  qs<HTMLButtonElement>('#save-draft').addEventListener('click', async () => {
    syncEditorFields(titleInput, channelSelect, textarea);
    try {
      await api.saveDraft(createPayload('draft'));
      alert('Draft saved.');
    } catch (error) {
      console.warn(error);
      alert('Draft could not be saved right now.');
    }
  });

  qs<HTMLButtonElement>('#publish-now').addEventListener('click', async () => {
    syncEditorFields(titleInput, channelSelect, textarea);
    try {
      await api.publishPost(createPayload('posted'));
      alert('Published to Telegram.');
    } catch (error) {
      console.warn(error);
      alert('Post could not be published right now.');
    }
  });

  bindScheduleSheet(titleInput, channelSelect, textarea);
}

async function hydrateEditorChannels(channelSelect: HTMLSelectElement): Promise<void> {
  try {
    if (state.editor.channels.length === 0) {
      state.editor.channels = await api.getChannels();
    }

    state.editor.channelId = state.editor.channelId || state.editor.channels[0]?.id || '';
    channelSelect.disabled = false;
    channelSelect.innerHTML = [
      '<option value="">Choose a channel</option>',
      ...state.editor.channels.map(
        (channel) => `<option value="${channel.id}" ${channel.id === state.editor.channelId ? 'selected' : ''}>${channel.name}</option>`
      )
    ].join('');
    channelSelect.value = state.editor.channelId;
  } catch (error) {
    console.warn(error);
    channelSelect.disabled = true;
    channelSelect.innerHTML = '<option value="">Channels unavailable</option>';
  }
}

function syncEditorFields(titleInput: HTMLInputElement, channelSelect: HTMLSelectElement, textarea: HTMLTextAreaElement): void {
  state.editor.title = titleInput.value;
  state.editor.channelId = channelSelect.value;
  state.editor.text = textarea.value;
}

function createPayload(status: PostPayload['status']): PostPayload {
  const now = new Date().toISOString();
  return {
    title: state.editor.title.trim() || 'Untitled Announcement',
    channelId: state.editor.channelId,
    text: state.editor.text,
    parseMode: 'HTML',
    buttons: state.editor.buttons,
    status,
    createdAt: now,
    updatedAt: now
  };
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

function bindButtonBuilder(): void {
  qs<HTMLButtonElement>('#add-button-row').addEventListener('click', () => {
    state.editor.buttons.push([{ text: '', url: '' }]);
    void render('editor');
  });

  document.querySelectorAll<HTMLInputElement>('[data-button-field]').forEach((input) => {
    input.addEventListener('input', () => updateButtonFromInput(input));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-add-button]').forEach((button) => {
    button.addEventListener('click', () => {
      const rowIndex = Number(button.dataset.addButton);
      state.editor.buttons[rowIndex].push({ text: '', url: '' });
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

function updateButtonFromInput(input: HTMLInputElement): void {
  const parent = input.closest<HTMLElement>('.builder-button');
  if (!parent) return;

  const [rowIndex, buttonIndex] = getButtonPosition(parent);
  const field = input.dataset.buttonField as 'text' | 'url';
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

function bindScheduleSheet(titleInput: HTMLInputElement, channelSelect: HTMLSelectElement, textarea: HTMLTextAreaElement): void {
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

  import('./components/PostPreview').then(({ PostPreview }) => {
    root.innerHTML = PostPreview(state.editor.text, state.editor.buttons, state.editor.title);
    bindSpoilers(root);
  });
}

function bindSpoilers(container: Element): void {
  container.querySelectorAll<HTMLElement>('tg-spoiler').forEach((spoiler) => {
    spoiler.addEventListener('click', () => spoiler.classList.toggle('revealed'));
  });
}
