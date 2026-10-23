/** Turns free text into a safe ILIKE "contains" pattern (escapes % _ and \). */
function likePattern(text) {
  return `%${String(text).trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

module.exports = { likePattern };
