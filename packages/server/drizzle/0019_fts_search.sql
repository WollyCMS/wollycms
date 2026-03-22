-- Full-text search index for pages (SQLite FTS5)
-- D1 supports FTS5 virtual tables
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  page_id UNINDEXED,
  title,
  slug,
  body,
  meta_description,
  tokenize='porter unicode61'
);
