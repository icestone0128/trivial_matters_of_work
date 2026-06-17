const API_URL = 'https://script.google.com/macros/s/AKfycbxPLdplooUmy6Z_bAAZkVDk02E50JBkt21qHWKDfsYrPV51bTxN7cBqrcP824TiPBrV/exec';

const SORT_DEFINITIONS = [
  { key: 'ME Single', label: 'ME Single', field: 'meSingle' },
  { key: 'Packing Single', label: 'Packing Single', field: 'packingSingle' },
  { key: 'Assy', label: 'Assembly', field: 'assembly' },
  { key: 'Total', label: 'Total', field: 'total' }
];
const SORTS = SORT_DEFINITIONS.map(sort => sort.key);
const COUNT_FIELD_MAP = [
  ['Part Quantity', 'partQuantity'],
  ['FMD Applying', 'fmdApplying'],
  ['FMD Released', 'fmdReleased'],
  ['Approved', 'approved']
];
const STATUS_FIELD_MAP = [
  ['FMD Applying', 'fmdApplying'],
  ['FMD Released', 'fmdReleased'],
  ['Approved', 'approved']
];
const SHEET_TABS = [
  { key: 'ME Single', label: 'ME Single' },
  { key: 'Packing Single', label: 'Packing Single' },
  { key: 'Assy', label: 'Assembly' },
  { key: 'Total', label: 'Total' }
];

let projects = [];
let currentProject = null;
let activeRecordSort = 'ME Single';

const form = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const summaryInput = document.getElementById('summary-input');
const previewBtn = document.getElementById('preview-btn');
const exportBtn = document.getElementById('export-btn');
const exportPngBtn = document.getElementById('export-png-btn');
const formMessage = document.getElementById('form-message');
const currentProjectLabel = document.getElementById('current-project-label');
const singleSummary = document.getElementById('single-summary');
const aggregatePies = document.getElementById('aggregate-pies');
const aggregateSummary = document.getElementById('aggregate-summary');
const aggregateCharts = document.getElementById('aggregate-charts');
const recordList = document.getElementById('record-list');
const recordCount = document.getElementById('record-count');

init();

function init() {
  exportBtn.textContent = 'Export XLSX';

  previewBtn.addEventListener('click', () => {
    try {
      currentProject = readFormProject();
      renderCurrentProject();
      setMessage('已產生預覽，確認後可提交。');
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const project = readFormProject();
      currentProject = project;
      renderCurrentProject();
      setMessage('正在提交...');
      await postAction({ action: 'upsert', project });
      await loadProjects();
      setMessage('已提交；同名 Project Name 會以最新資料覆蓋。');
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  exportBtn.addEventListener('click', exportProjectsToExcel);
  exportPngBtn.addEventListener('click', exportAggregateToPng);

  loadProjects();
}

async function loadProjects() {
  if (!isApiReady()) {
    projects = [];
    renderAll();
    setMessage('尚未設定 Apps Script Web App URL。');
    return;
  }

  const response = await jsonp(API_URL, { action: 'list' });
  if (!response.ok) throw new Error(response.error || '讀取資料失敗。');
  projects = Array.isArray(response.projects) ? response.projects.map(normalizeProjectShape) : [];
  if (!currentProject && projects.length) currentProject = projects[0];
  renderAll();
}

function readFormProject() {
  const projectName = projectNameInput.value.trim();
  if (!projectName) throw new Error('請輸入 Project Name。');
  const rows = parseSummary(summaryInput.value);
  return {
    projectName,
    entryDate: systemDate(),
    metrics: buildMetrics(rows),
    rows,
    sourceRange: 'Summary!B2:F6'
  };
}

function parseSummary(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 5) {
    throw new Error('請貼上 Summary!B2:F6 的 5 列資料，包含標題列。');
  }

  const splitRows = lines.map(line => line.split(/\t|,/).map(cell => cell.trim()));
  const header = splitRows[0].map(cell => cell.toLowerCase());
  const required = ['sort', 'part quantity', 'fmd applying', 'fmd released', 'approved'];
  const headerLooksRight = required.every((name, index) => header[index] === name);
  const dataRows = headerLooksRight ? splitRows.slice(1) : splitRows.slice(0, 4);

  const parsed = dataRows.map(cells => ({
    sort: cells[0],
    partQuantity: toNumber(cells[1]),
    fmdApplying: toNumber(cells[2]),
    fmdReleased: toNumber(cells[3]),
    approved: toNumber(cells[4])
  }));

  const bySort = Object.fromEntries(parsed.map(row => [row.sort, row]));
  const missing = SORTS.filter(sort => !bySort[sort]);
  if (missing.length) {
    throw new Error(`貼上資料缺少列：${missing.join(', ')}。`);
  }

  return SORTS.map(sort => bySort[sort]);
}

function toNumber(value) {
  const numeric = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeProjectShape(project) {
  const rows = Array.isArray(project.rows) && project.rows.length
    ? SORTS.map(sort => getRow(project.rows, sort))
    : rowsFromMetrics(project.metrics || {});
  return {
    ...project,
    rows,
    metrics: buildMetrics(rows)
  };
}

function buildMetrics(rows) {
  return Object.fromEntries(SORT_DEFINITIONS.map(def => {
    const row = getRow(rows, def.key);
    return [def.field, {
      partQuantity: toNumber(row.partQuantity),
      fmdApplying: toNumber(row.fmdApplying),
      fmdReleased: toNumber(row.fmdReleased),
      approved: toNumber(row.approved)
    }];
  }));
}

function rowsFromMetrics(metrics) {
  return SORT_DEFINITIONS.map(def => {
    const values = metrics[def.field] || {};
    return {
      sort: def.key,
      partQuantity: toNumber(values.partQuantity),
      fmdApplying: toNumber(values.fmdApplying),
      fmdReleased: toNumber(values.fmdReleased),
      approved: toNumber(values.approved)
    };
  });
}

function sortField(sort) {
  return (SORT_DEFINITIONS.find(def => def.key === sort) || {}).field || sort;
}

async function postAction(payload) {
  if (!isApiReady()) throw new Error('尚未設定 Apps Script Web App URL。');

  const response = await jsonp(API_URL, {
    action: payload.action,
    payload: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(response.error || '寫入資料失敗。');
  return response;
}

function jsonp(url, params) {
  const callbackName = `bosCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const query = new URLSearchParams({ ...params, callback: callbackName });

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}${query.toString()}`;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('讀取 Apps Script 逾時。'));
    }, 12000);

    window[callbackName] = data => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('無法連線 Apps Script。'));
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    document.body.appendChild(script);
  });
}

function renderAll() {
  renderRecords();
  renderCurrentProject();
  renderAggregate();
  renderPieCanvases();
}

function renderCurrentProject() {
  if (!currentProject) {
    currentProjectLabel.textContent = '尚未選取專案';
    singleSummary.innerHTML = '<div class="empty">貼上 Summary!B2:F6，即可產生單筆資訊。</div>';
    return;
  }

  currentProjectLabel.textContent = `${formatDate(currentProject.entryDate)} · ${currentProject.projectName}`;
  singleSummary.innerHTML = renderCountTable(currentProject.rows);
}

function renderRecords() {
  recordCount.textContent = `${projects.length} 筆`;
  if (!projects.length) {
    recordList.innerHTML = '<div class="empty">目前沒有資料庫紀錄。</div>';
    return;
  }

  recordList.innerHTML = `
    <div class="sheet-layout">
      <div class="sheet-tabs" role="tablist" aria-label="總表 sheet">
        ${SHEET_TABS.map(tab => `
          <button
            class="sheet-tab${tab.key === activeRecordSort ? ' active' : ''}"
            type="button"
            role="tab"
            aria-selected="${tab.key === activeRecordSort}"
            data-sheet="${escapeAttr(tab.key)}"
          >${escapeHtml(tab.label)}</button>
        `).join('')}
      </div>
      <table class="record-table">
        <thead>
          <tr>
            <th>填寫資料的日期</th>
            <th>專案名稱</th>
            <th>FMD Applying</th>
            <th>FMD Released</th>
            <th>Approved</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${projects.map(project => {
            const row = getRow(project.rows, activeRecordSort);
            return `
              <tr>
                <td>${escapeHtml(formatDate(project.entryDate))}</td>
                <td>
                  <button class="record-link" type="button" data-select="${escapeAttr(project.projectName)}">
                    ${escapeHtml(project.projectName)}
                  </button>
                </td>
                ${STATUS_FIELD_MAP.map(([, key]) => `<td>${formatFraction(row[key], row.partQuantity)}</td>`).join('')}
                <td><button class="delete-btn" type="button" data-delete="${escapeAttr(project.projectName)}">Delete</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  recordList.querySelectorAll('[data-sheet]').forEach(button => {
    button.addEventListener('click', () => {
      activeRecordSort = button.dataset.sheet;
      renderRecords();
    });
  });

  recordList.querySelectorAll('[data-select]').forEach(button => {
    button.addEventListener('click', () => {
      const selected = projects.find(project => project.projectName === button.dataset.select);
      if (!selected) return;
      currentProject = selected;
      projectNameInput.value = selected.projectName;
      summaryInput.value = toPasteText(selected.rows);
      renderCurrentProject();
    });
  });

  recordList.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const name = button.dataset.delete;
      if (!window.confirm(`確定刪除「${name}」？`)) return;
      setMessage('正在刪除...');
      await postAction({ action: 'delete', projectName: name });
      if (currentProject && currentProject.projectName === name) currentProject = null;
      await loadProjects();
      setMessage('已刪除單筆資料。');
    });
  });
}

function renderAggregate() {
  const rows = aggregateRows(projects);
  aggregatePies.innerHTML = renderCompletionPies(projects);
  aggregateSummary.innerHTML = renderTransposedFractionTable(rows);
  aggregateCharts.innerHTML = renderCharts(rows);
}

function aggregateRows(records) {
  return SORTS.map(sort => {
    const seed = { sort, partQuantity: 0, fmdApplying: 0, fmdReleased: 0, approved: 0 };
    records.forEach(project => {
      const row = getRow(project.rows, sort);
      seed.partQuantity += toNumber(row.partQuantity);
      seed.fmdApplying += toNumber(row.fmdApplying);
      seed.fmdReleased += toNumber(row.fmdReleased);
      seed.approved += toNumber(row.approved);
    });
    return seed;
  });
}

function getRow(rows, sort) {
  return (rows || []).find(row => row.sort === sort) || { sort, partQuantity: 0, fmdApplying: 0, fmdReleased: 0, approved: 0 };
}

function renderCountTable(rows) {
  return `
    <table>
      <thead>
        <tr>
          <th>Sort</th>
          ${COUNT_FIELD_MAP.map(([label]) => `<th>${label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${SORTS.map(sort => {
          const row = getRow(rows, sort);
          return `
            <tr>
              <td>${escapeHtml(displaySort(sort))}</td>
              ${COUNT_FIELD_MAP.map(([, key]) => `<td>${formatNumber(row[key])}</td>`).join('')}
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderFractionTable(rows) {
  return `
    <table>
      <thead>
        <tr>
          <th>Sort</th>
          ${STATUS_FIELD_MAP.map(([label]) => `<th>${label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${SORTS.map(sort => {
          const row = getRow(rows, sort);
          return `
            <tr>
              <td>${escapeHtml(displaySort(sort))}</td>
              ${STATUS_FIELD_MAP.map(([, key]) => `<td>${formatFraction(row[key], row.partQuantity)}</td>`).join('')}
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderTransposedFractionTable(rows) {
  return `
    <table>
      <thead>
        <tr>
          <th>Sort</th>
          ${SORTS.map(sort => `<th>${escapeHtml(displaySort(sort))}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${STATUS_FIELD_MAP.map(([label, key]) => `
          <tr>
            <td>${escapeHtml(label)}</td>
            ${SORTS.map(sort => {
              const row = getRow(rows, sort);
              return `<td>${formatFraction(row[key], row.partQuantity)}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderCompletionPies(records) {
  const totals = records.map(project => ({
    projectName: project.projectName,
    total: getRow(project.rows, 'Total')
  })).filter(item => item.total.partQuantity > 0);

  if (!totals.length) {
    return '<div class="empty">目前沒有可產生圓餅圖的 Total 資料。</div>';
  }

  return `
    ${renderPiePanel('FMD Released Status by Projects', 'fmdReleased', 'released', totals)}
    ${renderPiePanel('Approved Status by Projects', 'approved', 'approved', totals)}
  `;
}

function renderPiePanel(label, key, className, totals) {
  const totalPartQuantity = totals.reduce((sum, item) => sum + toNumber(item.total.partQuantity), 0);
  const segments = buildPieSegments(totals, key);
  return `
    <article class="pie-panel">
      <h3>${escapeHtml(label)}</h3>
      <div class="pie-summary">
        <div
          class="pie-bubble ${className}"
          title="${escapeAttr(`Total Part Quality: ${formatNumber(totalPartQuantity)}`)}"
        >
          <canvas class="pie-canvas" width="216" height="216" data-pie="${escapeAttr(JSON.stringify(segments.canvasSegments))}"></canvas>
          <span class="pie-center"><small>Total</small><strong>${formatNumber(totalPartQuantity)}</strong></span>
        </div>
        <div class="pie-legend">
          ${segments.legendItems.map(item => `
            <div class="legend-row">
              <span class="legend-swatch" style="background: ${item.color};"></span>
              <strong>${escapeHtml(item.projectName)} ${item.completedSharePercent.toFixed(1)}%</strong>
              <span class="legend-separator">|</span>
              <span>${formatNumber(item.completedValue)}/${formatNumber(item.partQuantity)} (${item.completionPercent.toFixed(1)}%)</span>
            </div>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

function buildPieSegments(totals, key) {
  const colors = ['#0072ce', '#27a278', '#f4a340', '#7b61ff', '#c94b4b', '#17a2b8', '#8a6f3d', '#5a7d9a'];
  const totalPartQuantity = totals.reduce((sum, item) => sum + toNumber(item.total.partQuantity), 0);
  let cursor = 0;
  
  const canvasSegments = [];
  const legendItems = [];
  
  totals.forEach((item, index) => {
    const partQuantity = toNumber(item.total.partQuantity);
    const completedValue = toNumber(item.total[key]);
    
    const darkColor = colors[index % colors.length];
    
    const completedSharePercent = totalPartQuantity > 0 ? (completedValue / totalPartQuantity) * 100 : 0;
    const completionPercent = partQuantity > 0 ? (completedValue / partQuantity) * 100 : 0;
    
    const start = cursor;
    cursor += completedSharePercent;
    const end = cursor;
    
    if (completedSharePercent > 0) {
      canvasSegments.push({
        percent: completedSharePercent,
        color: darkColor,
        start,
        end
      });
    }
    
    legendItems.push({
      projectName: item.projectName,
      completedValue,
      partQuantity,
      completedSharePercent,
      completionPercent,
      color: darkColor
    });
  });
  
  return { canvasSegments, legendItems };
}

function renderPieCanvases() {
  document.querySelectorAll('.pie-canvas').forEach(canvas => {
    const items = JSON.parse(canvas.dataset.pie || '[]');
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 1;
    let start = -Math.PI / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e6eef5';
    ctx.fill();

    items.forEach(item => {
      const angle = (item.percent / 100) * Math.PI * 2;
      if (angle <= 0) return;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      start += angle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = '#fbfdff';
    ctx.fill();
  });
}

function renderCharts(rows) {
  return SORTS.map(sort => {
    const row = getRow(rows, sort);
    return `
      <article class="status-card">
        <h3>${escapeHtml(displaySort(sort))} Parts Status</h3>
        ${renderBar('FMD Applying', row.fmdApplying, row.partQuantity, 'applying')}
        ${renderBar('FMD Released', row.fmdReleased, row.partQuantity, 'released')}
        ${renderBar('Approved', row.approved, row.partQuantity, 'approved')}
      </article>
    `;
  }).join('');
}

function renderBar(label, value, total, className) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return `
    <div class="bar-row">
      <span>${label}</span>
      <div class="bar-track" title="${formatNumber(value)} / ${formatNumber(total)}">
        <div class="bar-fill ${className}" style="width: ${pct.toFixed(2)}%"></div>
      </div>
      <span class="bar-value">${formatNumber(value)}/${formatNumber(total)}</span>
    </div>
  `;
}

function toPasteText(rows) {
  const header = 'Sort\tPart Quantity\tFMD Applying\tFMD Released\tApproved';
  const body = SORTS.map(sort => {
    const row = getRow(rows, sort);
    return [row.sort, row.partQuantity, row.fmdApplying, row.fmdReleased, row.approved].join('\t');
  });
  return [header, ...body].join('\n');
}

function exportProjectsToExcel() {
  if (!projects.length) {
    setMessage('目前沒有可匯出的後端資料。', true);
    return;
  }

  if (typeof XLSX === 'undefined') {
    setMessage('Excel 匯出工具尚未載入，請稍後再試。', true);
    return;
  }

  const groupHeader = ['填寫資料的日期', '專案名稱'];
  SORTS.forEach(sort => {
    groupHeader.push(displaySort(sort), '', '', '');
  });

  const fieldHeader = ['', ''];
  SORTS.forEach(() => {
    fieldHeader.push('Part Quality', 'FMD Applying', 'FMD Released', 'Approved');
  });

  const rows = projects.map(project => {
    const row = [project.entryDate || '', project.projectName || ''];
    SORTS.forEach(sort => {
      const values = getRow(project.rows, sort);
      row.push(values.partQuantity, values.fmdApplying, values.fmdReleased, values.approved);
    });
    return row;
  });

  const worksheet = XLSX.utils.aoa_to_sheet([groupHeader, fieldHeader, ...rows]);
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    ...SORTS.map((sort, index) => {
      const col = 2 + index * 4;
      return { s: { r: 0, c: col }, e: { r: 0, c: col + 3 } };
    })
  ];
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    ...SORTS.flatMap(() => [{ wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 10 }])
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BOS Data');
  XLSX.writeFile(workbook, `BOS Report Summary-${systemDate()}.xlsx`);
  setMessage('已匯出目前後端資料。');
}

async function exportAggregateToPng() {
  const previousDisplay = exportPngBtn.style.display;
  try {
    if (typeof html2canvas !== 'function') {
      throw new Error('截圖工具尚未載入，請稍後再試。');
    }

    const target = document.querySelector('.aggregate-panel');
    if (!target) throw new Error('找不到所有機種累計區塊。');

    exportPngBtn.style.display = 'none';
    await nextFrame();
    const canvas = await html2canvas(target, {
      backgroundColor: '#f4f9fd',
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true
    });

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `BOS Report Analysis-${systemDate()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage('已匯出所有機種累計 PNG。');
  } catch (error) {
    setMessage(`PNG 匯出失敗：${error.message || error}`, true);
  } finally {
    exportPngBtn.style.display = previousDisplay;
  }
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatFraction(value, total) {
  return `${formatNumber(value)}/${formatNumber(total)}`;
}

function displaySort(sort) {
  return sort === 'Assy' ? 'Assembly' : sort;
}

function formatDate(value) {
  return value || '-';
}

function systemDate() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? '#b94d45' : '#647067';
}

function isApiReady() {
  return API_URL && !API_URL.includes('PASTE_APPS_SCRIPT');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
