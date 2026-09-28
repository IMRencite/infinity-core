export const READER_FAVORITE_SCORE = "ReaderFavoriteScore" as const;

export type EditorialEngagement = {
  path: string;
  qualified_views: number;
  engaged_sessions: number;
  completion_proxy: number;
  repeat_readers: number;
};

export function scoreReaderFavorite(row: EditorialEngagement): number {
  return row.qualified_views * 1 + row.engaged_sessions * 2 + row.completion_proxy * 3 + row.repeat_readers * 4;
}

export function selectReaderFavorites(input: {
  rows: EditorialEngagement[];
  minimum_qualified_views: number;
}): { label: "Reader Favorites" | "Featured Reads"; paths: string[]; evidence: "SUFFICIENT" | "INSUFFICIENT" } {
  const eligible = input.rows.filter((row) => row.qualified_views >= input.minimum_qualified_views);
  if (eligible.length < 2) {
    return { label: "Featured Reads", paths: input.rows.slice(0, 3).map((row) => row.path), evidence: "INSUFFICIENT" };
  }
  return {
    label: "Reader Favorites",
    paths: [...eligible].sort((left, right) => scoreReaderFavorite(right) - scoreReaderFavorite(left)).slice(0, 3).map((row) => row.path),
    evidence: "SUFFICIENT",
  };
}
