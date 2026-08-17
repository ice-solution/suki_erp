function pickFollowUpById(docOrBody, fallbackAdminId) {
  const raw = docOrBody?.followUpBy;
  if (raw && typeof raw === 'object') {
    return raw._id || raw.id || fallbackAdminId;
  }
  if (raw) return raw;
  return fallbackAdminId;
}

module.exports = { pickFollowUpById };
