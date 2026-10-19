export type MatchFilter = 'all' | 'scheduled' | 'finished';

type SearchableMatch = {
  status: string;
  home: { name: string };
  away: { name: string };
};

export function filterMatches<T extends SearchableMatch>(
  matches: readonly T[],
  filter: MatchFilter,
  query: string,
): T[] {
  const search = query.trim().toLowerCase();
  return matches.filter((match) =>
    (filter === 'all' || match.status === filter) &&
    (match.home.name.toLowerCase().includes(search) || match.away.name.toLowerCase().includes(search)),
  );
}
