import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { MATCHES_URL } from '../config';

type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: { name: string };
  away: { name: string };
  score: { home: number; away: number } | null;
};

type Filter = 'all' | 'scheduled' | 'finished';
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'scheduled', label: 'Предстоящие' },
  { key: 'finished', label: 'Завершённые' },
];

function matchStatus(match: Match): string {
  switch (match.status) {
    case 'scheduled': return 'Предстоящий';
    case 'finished': return 'Завершён';
    case 'live': return match.minute == null ? 'Идёт матч' : `Идёт матч · ${match.minute}′`;
    case 'postponed': return 'Перенесён';
    default: return 'Статус неизвестен';
  }
}

function matchDate(startsAt: string | null): string {
  if (!startsAt) return 'Дата уточняется';
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'Дата уточняется';
  // Без timeZone: Intl использует часовой пояс устройства.
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function MatchCard({ match }: { match: Match }) {
  const score = match.score == null ? '—' : `${match.score.home}:${match.score.away}`;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.date}>{matchDate(match.startsAt)}</Text>
        <Text style={styles.status}>{matchStatus(match)}</Text>
      </View>
      <View style={styles.teams}>
        <Text style={styles.team}>{match.home.name}</Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={[styles.team, styles.away]}>{match.away.name}</Text>
      </View>
    </View>
  );
}

async function fetchMatches(signal: AbortSignal): Promise<Match[]> {
  const response = await fetch(MATCHES_URL, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('matches' in data) || !Array.isArray(data.matches)) {
    throw new Error('Неверный формат ответа');
  }
  return data.matches as Match[];
}

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const request = useRef<AbortController | null>(null);

  const loadMatches = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setError(true);
      setLoading(false);
    }, 10000);
    try {
      const result = await fetchMatches(controller.signal);
      if (controller.signal.aborted) return;
      setMatches(result);
      setUpdatedAt(new Date());
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
    return () => request.current?.abort();
  }, [loadMatches]);

  const visibleMatches = matches?.filter((match) => filter === 'all' || match.status === filter) ?? [];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Матчи тура</Text>
      <View style={styles.filters}>
        {filters.map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === key }}
            onPress={() => setFilter(key)}
            style={[styles.filter, filter === key && styles.activeFilter]}
          >
            <Text style={[styles.filterText, filter === key && styles.activeFilterText]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        {updatedAt && <UpdatedAgo since={updatedAt} />}
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void loadMatches()}
          style={styles.refresh}
        >
          <Text style={styles.refreshText}>{loading ? 'Обновление…' : 'Обновить'}</Text>
        </Pressable>
      </View>
      {error && (
        <View style={styles.message}>
          <Text>Не удалось загрузить матчи. Проверьте соединение.</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadMatches()}>
            <Text style={styles.retry}>Повторить</Text>
          </Pressable>
        </View>
      )}
      {loading && matches === null ? (
        <ActivityIndicator style={styles.loader} size="large" accessibilityLabel="Загрузка матчей" />
      ) : !error || matches !== null ? (
        <FlatList
          data={visibleMatches}
          keyExtractor={(match) => match.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {matches?.length === 0 ? 'Матчей пока нет' : 'В этой категории матчей нет'}
            </Text>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filter: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f3f4f6' },
  activeFilter: { backgroundColor: '#111827' },
  filterText: { fontSize: 13, color: '#374151' },
  activeFilterText: { color: '#fff' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 12 },
  refresh: { paddingVertical: 8, paddingHorizontal: 10 },
  refreshText: { color: '#111827', fontWeight: '600' },
  message: { gap: 8, padding: 12, marginBottom: 12, borderRadius: 8, backgroundColor: '#fee2e2' },
  retry: { color: '#111827', fontWeight: '600' },
  loader: { flex: 1 },
  list: { flexGrow: 1, paddingBottom: 24 },
  empty: { marginTop: 48, textAlign: 'center', color: '#6b7280' },
  card: { padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  date: { color: '#6b7280', fontSize: 13 },
  status: { color: '#374151', fontSize: 13, textAlign: 'right' },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  team: { flex: 1, fontSize: 15, fontWeight: '600' },
  away: { textAlign: 'right' },
  score: { fontSize: 18, fontWeight: '700' },
});
