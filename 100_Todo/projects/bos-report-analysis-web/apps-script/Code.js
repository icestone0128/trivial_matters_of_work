const STORE_KEY = 'bos_report_projects_v1';
const SORT_DEFINITIONS = [
  { key: 'ME Single', label: 'ME Single', field: 'meSingle' },
  { key: 'Packing Single', label: 'Packing Single', field: 'packingSingle' },
  { key: 'Assy', label: 'Assembly', field: 'assembly' },
  { key: 'Total', label: 'Total', field: 'total' }
];
const STATUS_DEFINITIONS = [
  { label: 'Part Quality', key: 'partQuantity' },
  { label: 'FMD Applying', key: 'fmdApplying' },
  { label: 'FMD Released', key: 'fmdReleased' },
  { label: 'Approved', key: 'approved' }
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || 'list';
  const callback = params.callback || '';

  let result;
  try {
    if (action === 'health') {
      result = { ok: true, updatedAt: new Date().toISOString() };
    } else if (action === 'upsert') {
      const payload = parseGetPayload_(params);
      result = upsertProject_(payload.project);
    } else if (action === 'delete') {
      const payload = parseGetPayload_(params);
      result = deleteProject_(payload.projectName);
    } else {
      result = { ok: true, projects: listProjects_(), updatedAt: new Date().toISOString() };
    }
  } catch (err) {
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  }

  return jsonResponse_(result, callback);
}

function parseGetPayload_(params) {
  if (!params.payload) throw new Error('Missing payload.');
  return JSON.parse(params.payload);
}

function doPost(e) {
  let result;
  try {
    const payload = parsePayload_(e);
    if (payload.action === 'upsert') {
      result = upsertProject_(payload.project);
    } else if (payload.action === 'delete') {
      result = deleteProject_(payload.projectName);
    } else {
      throw new Error('Unknown action.');
    }
  } catch (err) {
    result = { ok: false, error: String(err && err.message ? err.message : err) };
  }

  return jsonResponse_(result, '');
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body.');
  }

  const contentType = String(e.postData.type || '');
  if (contentType.indexOf('application/json') >= 0) {
    return JSON.parse(e.postData.contents);
  }

  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  return JSON.parse(e.postData.contents);
}

function listProjects_() {
  const raw = PropertiesService.getScriptProperties().getProperty(STORE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(project => normalizeStoredProject_(project));
}

function saveProjects_(projects) {
  PropertiesService.getScriptProperties().setProperty(STORE_KEY, JSON.stringify(projects));
}

function upsertProject_(project) {
  const normalized = normalizeProject_(project);
  const projects = listProjects_();
  const key = normalized.projectName.toLowerCase();
  const index = projects.findIndex(item => String(item.projectName || '').toLowerCase() === key);

  if (index >= 0) {
    normalized.createdAt = projects[index].createdAt || normalized.createdAt;
    projects[index] = normalized;
  } else {
    projects.push(normalized);
  }

  projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  saveProjects_(projects);
  return { ok: true, project: normalized, projects: projects };
}

function deleteProject_(projectName) {
  const name = String(projectName || '').trim();
  if (!name) throw new Error('Project name is required.');

  const key = name.toLowerCase();
  const projects = listProjects_().filter(item => String(item.projectName || '').toLowerCase() !== key);
  saveProjects_(projects);
  return { ok: true, deletedProjectName: name, projects: projects };
}

function normalizeProject_(project) {
  if (!project || typeof project !== 'object') throw new Error('Project payload is required.');

  const projectName = String(project.projectName || '').trim();
  if (!projectName) throw new Error('Project Name is required.');
  const now = new Date();
  const nowIso = now.toISOString();
  const entryDate = normalizeDate_(project.entryDate || project.date || now);

  const rows = Array.isArray(project.rows) ? project.rows : rowsFromMetrics_(project.metrics || {});
  const normalizedRows = normalizeRows_(rows);
  const metrics = buildMetrics_(normalizedRows);

  return {
    projectName: projectName,
    entryDate: entryDate,
    metrics: metrics,
    rows: normalizedRows,
    databaseHeaders: databaseHeaders_(),
    databaseRow: databaseRow_(entryDate, projectName, metrics),
    columns: STATUS_DEFINITIONS.map(item => item.label),
    sourceRange: 'Summary!B2:F6',
    createdAt: project.createdAt || nowIso,
    updatedAt: nowIso
  };
}

function normalizeStoredProject_(project) {
  const rows = Array.isArray(project.rows) && project.rows.length
    ? normalizeRows_(project.rows)
    : rowsFromMetrics_(project.metrics || {});
  const metrics = buildMetrics_(rows);
  const entryDate = project.entryDate ? project.entryDate : normalizeDate_(project.createdAt || project.updatedAt || new Date());

  return {
    projectName: String(project.projectName || '').trim(),
    entryDate: entryDate,
    metrics: metrics,
    rows: rows,
    databaseHeaders: databaseHeaders_(),
    databaseRow: databaseRow_(entryDate, String(project.projectName || '').trim(), metrics),
    columns: STATUS_DEFINITIONS.map(item => item.label),
    sourceRange: project.sourceRange || 'Summary!B2:F6',
    createdAt: project.createdAt || project.updatedAt || new Date().toISOString(),
    updatedAt: project.updatedAt || project.createdAt || new Date().toISOString()
  };
}

function normalizeRows_(rows) {
  const rowMap = {};

  rows.forEach(row => {
    const sort = String(row.sort || '').trim();
    if (!sort) return;
    rowMap[sort] = {
      sort: sort,
      partQuantity: toNumber_(row.partQuantity),
      fmdApplying: toNumber_(row.fmdApplying),
      fmdReleased: toNumber_(row.fmdReleased),
      approved: toNumber_(row.approved)
    };
  });

  return SORT_DEFINITIONS.map(def => {
    const sort = def.key;
    const existing = rowMap[sort] || {};
    return {
      sort: sort,
      partQuantity: toNumber_(existing.partQuantity),
      fmdApplying: toNumber_(existing.fmdApplying),
      fmdReleased: toNumber_(existing.fmdReleased),
      approved: toNumber_(existing.approved)
    };
  });
}

function buildMetrics_(rows) {
  return SORT_DEFINITIONS.reduce((metrics, def) => {
    const row = rows.find(item => item.sort === def.key) || {};
    metrics[def.field] = {
      partQuantity: toNumber_(row.partQuantity),
      fmdApplying: toNumber_(row.fmdApplying),
      fmdReleased: toNumber_(row.fmdReleased),
      approved: toNumber_(row.approved)
    };
    return metrics;
  }, {});
}

function rowsFromMetrics_(metrics) {
  return SORT_DEFINITIONS.map(def => {
    const values = metrics[def.field] || {};
    return {
      sort: def.key,
      partQuantity: toNumber_(values.partQuantity),
      fmdApplying: toNumber_(values.fmdApplying),
      fmdReleased: toNumber_(values.fmdReleased),
      approved: toNumber_(values.approved)
    };
  });
}

function databaseHeaders_() {
  return {
    groups: SORT_DEFINITIONS.map(def => def.label),
    fields: STATUS_DEFINITIONS.map(def => def.label)
  };
}

function databaseRow_(entryDate, projectName, metrics) {
  const row = {
    entryDate: entryDate,
    projectName: projectName
  };

  SORT_DEFINITIONS.forEach(def => {
    const values = metrics[def.field] || {};
    STATUS_DEFINITIONS.forEach(status => {
      row[def.field + '_' + status.key] = toNumber_(values[status.key]);
    });
  });

  return row;
}

function toNumber_(value) {
  const n = Number(String(value == null ? '' : value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate_(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (!isNaN(date.getTime())) return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function jsonResponse_(result, callback) {
  const body = callback ? callback + '(' + JSON.stringify(result) + ');' : JSON.stringify(result);
  const output = ContentService.createTextOutput(body);
  output.setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  return output;
}
