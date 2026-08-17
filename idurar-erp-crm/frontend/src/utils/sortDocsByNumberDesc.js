function parseDocNumber(doc) {
  const raw = String(doc?.number ?? '').trim();
  const m = raw.match(/^([0-9]+)(.*)$/);
  if (!m) {
    return { num: 0, suffix: raw.toLowerCase() };
  }
  return {
    num: parseInt(m[1], 10) || 0,
    suffix: (m[2] || '').toLowerCase(),
  };
}

/** 由大到小：SML-12346, SML-12346R1, 12345, 12344 */
export function sortDocsByNumberDesc(docs = []) {
  return [...docs].sort((a, b) => {
    const pa = parseDocNumber(a);
    const pb = parseDocNumber(b);
    if (pb.num !== pa.num) return pb.num - pa.num;
    if (pa.suffix !== pb.suffix) return pa.suffix.localeCompare(pb.suffix);
    const prefA = String(a?.numberPrefix || '');
    const prefB = String(b?.numberPrefix || '');
    return prefA.localeCompare(prefB);
  });
}
