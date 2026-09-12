(function () {
  'use strict';

  const schedule = window.JAKK_SCHEDULE;
  const MODES = ['arrival', 'departure'];
  const EDGE_CONTEXT_ROWS = 10;
  const modeConfig = {
    arrival: {
      items: schedule?.arrivals,
      listId: 'arrival-list',
      tabId: 'tab-arrival',
      slideId: 'slide-arrival',
      formId: 'arrival-search-form',
      inputId: 'arrival-search',
      refreshId: 'arrival-refresh',
      suggestionsId: 'arrival-suggestions',
      feedbackId: 'arrival-search-feedback',
      label: 'datang',
    },
    departure: {
      items: schedule?.departures,
      listId: 'departure-list',
      tabId: 'tab-departure',
      slideId: 'slide-departure',
      formId: 'departure-search-form',
      inputId: 'departure-search',
      refreshId: 'departure-refresh',
      suggestionsId: 'departure-suggestions',
      feedbackId: 'departure-search-feedback',
      label: 'berangkat',
    },
  };

  const state = {
    activeMode: location.hash === '#berangkat' ? 'departure' : 'arrival',
    lastRenderKey: '',
    lastAnnouncementKey: '',
    swipeStartX: null,
    views: {
      arrival: { manuallyBrowsed: false, selectedIndex: null },
      departure: { manuallyBrowsed: false, selectedIndex: null },
    },
  };

  const $ = id => document.getElementById(id);
  const pad = value => String(value).padStart(2, '0');
  const timeToMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const normalizeTrain = value => String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

  function validateSchedule() {
    if (!schedule || !Array.isArray(schedule.arrivals) || !Array.isArray(schedule.departures)) {
      throw new Error('Data jadwal tidak dapat dimuat.');
    }

    for (const mode of MODES) {
      let previous = -1;
      for (const row of modeConfig[mode].items) {
        if (!Array.isArray(row) || row.length !== 2 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row[0]) || !row[1]) {
          throw new Error(`Data ${modeConfig[mode].label} tidak valid.`);
        }
        const minutes = timeToMinutes(row[0]);
        if (minutes < previous) throw new Error(`Urutan jadwal ${modeConfig[mode].label} tidak valid.`);
        previous = minutes;
      }
    }
  }

  function startOfLocalDay(date, dayOffset) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset).getTime();
  }

  function getScrollableItems(items, now) {
    const previousStart = Math.max(0, items.length - EDGE_CONTEXT_ROWS);
    const sections = [
      { rows: items.slice(previousStart), dayOffset: -1, scheduleStart: previousStart },
      { rows: items, dayOffset: 0, scheduleStart: 0 },
      { rows: items.slice(0, EDGE_CONTEXT_ROWS), dayOffset: 1, scheduleStart: 0 },
    ];
    const occurrences = [];

    for (const section of sections) {
      const dayStart = startOfLocalDay(now, section.dayOffset);
      section.rows.forEach(([time, train], sectionIndex) => {
        occurrences.push({
          displayIndex: occurrences.length,
          scheduleIndex: section.scheduleStart + sectionIndex,
          dayOffset: section.dayOffset,
          time,
          train,
          timestamp: dayStart + timeToMinutes(time) * 60_000,
        });
      });
    }
    return occurrences;
  }

  function getCurrentDisplayItem(items, now) {
    const occurrences = getScrollableItems(items, now);
    return occurrences.find(item => item.timestamp + 60_000 > now.getTime()) || occurrences.at(-1);
  }

  function makeScheduleRow(item, now, isFirstUpcoming, selectedIndex) {
    const row = document.createElement('li');
    const train = document.createElement('span');
    const time = document.createElement('time');
    const nowTime = now.getTime();
    const due = nowTime >= item.timestamp && nowTime < item.timestamp + 60_000;
    const past = item.timestamp + 60_000 <= nowTime;

    row.className = 'schedule-row';
    row.dataset.displayIndex = String(item.displayIndex);
    row.dataset.train = normalizeTrain(item.train);
    row.dataset.time = item.time;
    row.dataset.dayOffset = String(item.dayOffset);

    if (due) row.classList.add('is-due');
    else if (past) row.classList.add('is-past');
    else if (isFirstUpcoming) row.classList.add('is-next');

    if (item.displayIndex === selectedIndex) row.classList.add('is-search-result');
    if (due) row.setAttribute('aria-current', 'time');
    const dayDescription = item.dayOffset < 0 ? ', kemarin' : item.dayOffset > 0 ? ', besok' : '';
    row.setAttribute('aria-label', `KA ${item.train}, pukul ${item.time}${dayDescription}${due ? ', waktunya sekarang' : ''}`);

    train.className = 'train-number';
    train.textContent = item.train;
    time.dateTime = item.time;
    time.textContent = item.time;
    row.append(train, time);
    return { row, due };
  }

  function renderMode(mode, now) {
    const config = modeConfig[mode];
    const list = $(config.listId);
    const previousScrollTop = list.scrollTop;
    const hadRows = list.childElementCount > 0;
    const items = getScrollableItems(config.items, now);
    const fragment = document.createDocumentFragment();
    let foundUpcoming = false;
    const dueTrains = [];

    for (const item of items) {
      const isUpcoming = item.timestamp > now.getTime();
      const built = makeScheduleRow(item, now, isUpcoming && !foundUpcoming, state.views[mode].selectedIndex);
      if (isUpcoming && !foundUpcoming) foundUpcoming = true;
      if (built.due) dueTrains.push(item.train);
      fragment.append(built.row);
    }

    list.replaceChildren(fragment);
    if (hadRows) list.scrollTop = previousScrollTop;
    return dueTrains;
  }

  function getRowGap(list) {
    const styles = getComputedStyle(list);
    return Number.parseFloat(styles.rowGap || styles.gap) || 0;
  }

  function scrollToIndex(mode, index, behavior, alignment) {
    const list = $(modeConfig[mode].listId);
    const row = list.querySelector(`[data-display-index="${index}"]`);
    if (!row) return;

    const gap = getRowGap(list);
    const rowStep = row.offsetHeight + gap;
    const preferredTop = alignment === 'center'
      ? row.offsetTop - rowStep * 4
      : row.offsetTop - rowStep * 2;
    const maximumTop = Math.max(0, list.scrollHeight - list.clientHeight);
    const targetTop = Math.max(0, Math.min(preferredTop, maximumTop));

    list.scrollTo({ top: targetTop, behavior });
  }

  function scrollToCurrent(mode, now, behavior) {
    const item = getCurrentDisplayItem(modeConfig[mode].items, now);
    scrollToIndex(mode, item.displayIndex, behavior, 'current');
    return item;
  }

  function announceDue(now, dueByMode) {
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    const messages = [];
    if (dueByMode.arrival.length) messages.push(`Saatnya KA ${dueByMode.arrival.join(', ')} datang.`);
    if (dueByMode.departure.length) messages.push(`Saatnya KA ${dueByMode.departure.join(', ')} berangkat.`);

    if (messages.length && state.lastAnnouncementKey !== key) {
      $('status-announcement').textContent = messages.join(' ');
      state.lastAnnouncementKey = key;
    }
  }

  function updateClock(now) {
    $('live-clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    $('live-clock').dateTime = now.toISOString();
    $('live-date').textContent = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);
  }

  function render(force, followBehaviors = {}) {
    const now = new Date();
    updateClock(now);
    const renderKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (!force && state.lastRenderKey === renderKey) return;

    const modesToFollow = MODES.filter(mode => {
      const view = state.views[mode];
      return !view.manuallyBrowsed && view.selectedIndex === null;
    });
    const dueByMode = {
      arrival: renderMode('arrival', now),
      departure: renderMode('departure', now),
    };

    announceDue(now, dueByMode);
    state.lastRenderKey = renderKey;
    window.requestAnimationFrame(() => {
      for (const mode of modesToFollow) {
        scrollToCurrent(mode, now, followBehaviors[mode] || 'auto');
      }
    });
  }

  function setMode(mode, updateHash) {
    if (!MODES.includes(mode)) return;
    state.activeMode = mode;
    document.body.dataset.mode = mode;

    MODES.forEach((item, index) => {
      const active = item === mode;
      const tab = $(modeConfig[item].tabId);
      const slide = $(modeConfig[item].slideId);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      slide.setAttribute('aria-hidden', String(!active));
      document.querySelectorAll('.slide-dots span')[index].classList.toggle('active', active);
    });

    if (updateHash) {
      history.replaceState(null, '', mode === 'departure' ? '#berangkat' : '#datang');
    }
  }

  function moveSlide(direction) {
    const currentIndex = MODES.indexOf(state.activeMode);
    const nextIndex = (currentIndex + direction + MODES.length) % MODES.length;
    setMode(MODES[nextIndex], true);
    $(modeConfig[MODES[nextIndex]].tabId).focus({ preventScroll: true });
  }

  function setSearchFeedback(mode, message, type) {
    const feedback = $(modeConfig[mode].feedbackId);
    feedback.className = 'search-feedback';
    if (type) feedback.classList.add(`is-${type}`);
    feedback.textContent = message;
  }

  function clearSelectedRow(mode) {
    state.views[mode].selectedIndex = null;
    $(modeConfig[mode].listId).querySelector('.is-search-result')?.classList.remove('is-search-result');
  }

  function searchTrain(mode) {
    const config = modeConfig[mode];
    const input = $(config.inputId);
    const query = input.value.trim();
    const normalizedQuery = normalizeTrain(query);

    if (!normalizedQuery) {
      input.setAttribute('aria-invalid', 'true');
      setSearchFeedback(mode, 'Masukkan nomor KA yang ingin dicari.', 'error');
      input.focus();
      return;
    }

    const normalizedItems = config.items.map(([, train], index) => ({ index, normalized: normalizeTrain(train) }));
    let matches = normalizedItems.filter(item => item.normalized === normalizedQuery);
    if (!matches.length) matches = normalizedItems.filter(item => item.normalized.includes(normalizedQuery));

    if (matches.length > 1) {
      const examples = matches.slice(0, 4).map(item => config.items[item.index][1]).join(', ');
      input.removeAttribute('aria-invalid');
      clearSelectedRow(mode);
      setSearchFeedback(mode, `Ada ${matches.length} hasil yang cocok (${examples}${matches.length > 4 ? ', …' : ''}). Ketik nomor KA lengkap.`, '');
      return;
    }

    if (!matches.length) {
      input.setAttribute('aria-invalid', 'true');
      clearSelectedRow(mode);
      setSearchFeedback(mode, `KA “${query}” tidak ditemukan pada jadwal ${config.label}.`, 'error');
      return;
    }

    const matchIndex = matches[0].index;
    const displayIndex = Math.min(EDGE_CONTEXT_ROWS, config.items.length) + matchIndex;
    const [time, train] = config.items[matchIndex];
    input.value = train;
    input.removeAttribute('aria-invalid');
    state.views[mode].selectedIndex = displayIndex;
    state.views[mode].manuallyBrowsed = true;
    setSearchFeedback(mode, `KA ${train} • ${config.label} pukul ${time}.`, 'success');
    render(true);
    window.requestAnimationFrame(() => scrollToIndex(mode, displayIndex, 'smooth', 'center'));
  }

  function refreshMode(mode) {
    const config = modeConfig[mode];
    const input = $(config.inputId);
    const now = new Date();
    const currentItem = getCurrentDisplayItem(config.items, now);
    const dayLabel = currentItem.dayOffset > 0 ? ' (besok)' : currentItem.dayOffset < 0 ? ' (kemarin)' : '';

    input.value = '';
    input.removeAttribute('aria-invalid');
    state.views[mode].selectedIndex = null;
    state.views[mode].manuallyBrowsed = false;
    setSearchFeedback(mode, `Kembali ke waktu sekarang • KA ${currentItem.train} pukul ${currentItem.time}${dayLabel}.`, 'reset');
    render(true, { [mode]: 'smooth' });
  }

  function populateSuggestions(mode) {
    const config = modeConfig[mode];
    const suggestions = $(config.suggestionsId);
    const fragment = document.createDocumentFragment();

    for (const [time, train] of config.items) {
      const option = document.createElement('option');
      option.value = train;
      option.label = `${time} • ${config.label}`;
      fragment.append(option);
    }
    suggestions.replaceChildren(fragment);
  }

  function markAsManuallyBrowsed(mode) {
    state.views[mode].manuallyBrowsed = true;
  }

  function setUpScheduleControls(mode) {
    const config = modeConfig[mode];
    const input = $(config.inputId);
    const list = $(config.listId);

    populateSuggestions(mode);
    $(config.formId).addEventListener('submit', event => {
      event.preventDefault();
      searchTrain(mode);
    });
    $(config.refreshId).addEventListener('click', () => refreshMode(mode));

    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      if (state.views[mode].selectedIndex !== null) clearSelectedRow(mode);
      setSearchFeedback(mode, '', '');
    });

    input.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      input.value = '';
      input.removeAttribute('aria-invalid');
      clearSelectedRow(mode);
      setSearchFeedback(mode, '', '');
    });

    list.addEventListener('wheel', () => markAsManuallyBrowsed(mode), { passive: true });
    list.addEventListener('pointerdown', () => markAsManuallyBrowsed(mode));
    list.addEventListener('touchstart', () => markAsManuallyBrowsed(mode), { passive: true });
    list.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
        markAsManuallyBrowsed(mode);
      }
    });
  }

  function showFatalError(message) {
    const lists = [$('arrival-list'), $('departure-list')];
    for (const list of lists) {
      const row = document.createElement('li');
      row.className = 'schedule-row';
      row.textContent = message;
      list.replaceChildren(row);
    }
  }

  try {
    validateSchedule();
    MODES.forEach(setUpScheduleControls);

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => setMode(tab.dataset.target, true));
      tab.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveSlide(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveSlide(1); }
      });
    });

    $('previous-slide').addEventListener('click', () => moveSlide(-1));
    $('next-slide').addEventListener('click', () => moveSlide(1));

    $('slides').addEventListener('pointerdown', event => { state.swipeStartX = event.clientX; });
    $('slides').addEventListener('pointercancel', () => { state.swipeStartX = null; });
    $('slides').addEventListener('pointerup', event => {
      if (state.swipeStartX === null) return;
      const delta = event.clientX - state.swipeStartX;
      state.swipeStartX = null;
      if (Math.abs(delta) >= 48) moveSlide(delta < 0 ? 1 : -1);
    });

    window.addEventListener('hashchange', () => setMode(location.hash === '#berangkat' ? 'departure' : 'arrival', false));
    window.addEventListener('resize', () => render(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(true); });

    setMode(state.activeMode, false);
    render(true);
    window.setInterval(() => render(false), 1_000);
  } catch (error) {
    showFatalError(error instanceof Error ? error.message : 'Jadwal tidak dapat dimuat.');
  }
}());
