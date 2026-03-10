export function extractErrorMessage(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed.detail || fallback;
  } catch {
    return raw || fallback;
  }
}

export function decodeTokenPayload(token) {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded))

    return {
      ...decoded,
      tenant_id: decoded.tid || decoded.tenant_id,
      user_id: decoded.sub,
    };
  } catch {
    return null;
  }
}

export function normalizeText(value = '') {
  return String(value).toLowerCase().trim();
}

export function connectorMatchesFilters(connector, query, typeFilter) {
  const normalizedQuery = normalizeText(query);
  const normalizedTypeFilter = normalizeText(typeFilter);
  const byType =
    normalizedTypeFilter === 'all' || normalizeText(connector.type || '') === normalizedTypeFilter;
  if (!byType) return false;
  if (!normalizedQuery) return true;

  return (
    normalizeText(connector.name || '').includes(normalizedQuery) ||
    normalizeText(connector.type || '').includes(normalizedQuery) ||
    normalizeText(connector.id || '').includes(normalizedQuery)
  );
}

export function sortConnectorsByName(items, sortOrder) {
  const direction = sortOrder === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const aName = String(a.name || '');
    const bName = String(b.name || '');
    return aName.localeCompare(bName) * direction;
  });
}

export function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

export function csvEscape(value) {
  const safe = String(value ?? '');
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function downloadCsv(filename, headers, rows) {
  const csvLines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
