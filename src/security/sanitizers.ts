export function stripWeirdChars(input: string): string {
  // remove BOM, zero-width, control except \n\r\t
  return input
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function redactByPath(obj: any, paths: string[], placeholder = "***REDACTED***"): any {
  if (!obj || !paths?.length) return obj;
  let clone: any;
  try { clone = JSON.parse(JSON.stringify(obj)); } catch { return obj; }

  const apply = (node: any, tokens: string[], idx: number) => {
    if (node == null) return;
    if (idx === tokens.length) return; // safety
    const t = tokens[idx];
    const last = idx === tokens.length - 1;
    if (t === '*') {
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          if (last) node[i] = placeholder; else apply(node[i], tokens, idx + 1);
        }
      } else if (typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (last) node[k] = placeholder; else apply(node[k], tokens, idx + 1);
        }
      }
    } else {
      if (Array.isArray(node)) {
        const i = t === '*' ? -1 : Number(t);
        if (!Number.isNaN(i) && node[i] !== undefined) {
          if (last) node[i] = placeholder; else apply(node[i], tokens, idx + 1);
        }
      } else if (typeof node === 'object' && t in node) {
        if (last) node[t] = placeholder; else apply(node[t], tokens, idx + 1);
      }
    }
  };

  for (const path of paths) {
    if (!path || typeof path !== 'string') continue;
    const tokens = path.split('.').filter(Boolean);
    if (!tokens.length) continue;
    apply(clone, tokens, 0);
  }
  return clone;
}

// Backwards compatibility existing name
export function redact(obj: any, paths: string[]): any {
  return redactByPath(obj, paths);
}
