import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FavoriteButton } from '../components/FavoriteButton';
import { ThemeIcon } from '../components/ThemeIcon';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { MATCHES_URL } from '../config';
import { useFavorites } from '../hooks/useFavorites';
import { filterMatches, type MatchFilter } from '../utils/filterMatches';

type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: { name: string };
  away: { name: string };
  score: { home: number; away: number } | null;
};

const filters: { key: MatchFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'scheduled', label: 'Предстоящие' },
  { key: 'finished', label: 'Завершённые' },
];

const lightColors = {
  background: '#ffffff',
  surface: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  filter: '#f3f4f6',
  active: '#111827',
  activeText: '#ffffff',
  errorBackground: '#fee2e2',
  errorText: '#111827',
};

const darkColors: typeof lightColors = {
  background: '#111827',
  surface: '#1f2937',
  text: '#f9fafb',
  muted: '#9ca3af',
  border: '#374151',
  filter: '#374151',
  active: '#f9fafb',
  activeText: '#111827',
  errorBackground: '#7f1d1d',
  errorText: '#fee2e2',
};

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

function MatchCard({ match, favorite, favoritesReady, onToggleFavorite, colors }: {
  match: Match;
  favorite: boolean;
  favoritesReady: boolean;
  onToggleFavorite: () => void;
  colors: typeof lightColors;
}) {
  const score = match.score == null ? '—' : `${match.score.home}:${match.score.away}`;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.date, { color: colors.muted }]}>{matchDate(match.startsAt)}</Text>
        <Text style={[styles.status, { color: colors.text }]}>{matchStatus(match)}</Text>
        {favoritesReady && <FavoriteButton active={favorite} onPress={onToggleFavorite} />}
      </View>
      <View style={styles.teams}>
        <Text style={[styles.team, { color: colors.text }]}>{match.home.name}</Text>
        <Text style={[styles.score, { color: colors.text }]}>{score}</Text>
        <Text style={[styles.team, styles.away, { color: colors.text }]}>{match.away.name}</Text>
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

export function MatchesScreen({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const colors = dark ? darkColors : lightColors;
  const { favorites, ready: favoritesReady, isFavorite, toggle } = useFavorites();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [query, setQuery] = useState('');
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

  const visibleMatches = filterMatches(matches ?? [], filter, query);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Матчи тура</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          onPress={onToggleTheme}
          style={[styles.themeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <ThemeIcon dark={dark} color={colors.text} />
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Поиск по названию клуба"
        placeholder="Поиск клуба"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        style={[styles.search, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
      />
      <View style={styles.filters}>
        {filters.map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === key }}
            onPress={() => setFilter(key)}
            style={[styles.filter, { backgroundColor: filter === key ? colors.active : colors.filter }]}
          >
            <Text style={[styles.filterText, { color: filter === key ? colors.activeText : colors.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        {updatedAt && <UpdatedAgo since={updatedAt} dark={dark} />}
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void loadMatches()}
          style={styles.refresh}
        >
          <Text style={[styles.refreshText, { color: colors.text }]}>{loading ? 'Обновление…' : 'Обновить'}</Text>
        </Pressable>
      </View>
      {error && (
        <View style={[styles.message, { backgroundColor: colors.errorBackground }]}>
          <Text style={{ color: colors.errorText }}>Не удалось загрузить матчи. Проверьте соединение.</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadMatches()}>
            <Text style={[styles.retry, { color: colors.errorText }]}>Повторить</Text>
          </Pressable>
        </View>
      )}
      {loading && matches === null ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.text} accessibilityLabel="Загрузка матчей" />
      ) : !error || matches !== null ? (
        <FlatList
          data={visibleMatches}
          extraData={favorites}
          keyExtractor={(match) => match.id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              favorite={isFavorite(item.id)}
              favoritesReady={favoritesReady}
              onToggleFavorite={() => toggle(item.id)}
              colors={colors}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>
              {matches?.length === 0
                ? 'Матчей пока нет'
                : query.trim() ? 'Совпадений не найдено' : 'В этой категории матчей нет'}
            </Text>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  themeButton: { width: 40, height: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  search: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filter: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8 },
  filterText: { fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 12 },
  refresh: { paddingVertical: 8, paddingHorizontal: 10 },
  refreshText: { fontWeight: '600' },
  message: { gap: 8, padding: 12, marginBottom: 12, borderRadius: 8 },
  retry: { fontWeight: '600' },
  loader: { flex: 1 },
  list: { flexGrow: 1, paddingBottom: 24 },
  empty: { marginTop: 48, textAlign: 'center' },
  card: { padding: 16, marginBottom: 10, borderWidth: 1, borderRadius: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  date: { fontSize: 13 },
  status: { fontSize: 13, textAlign: 'right' },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  team: { flex: 1, fontSize: 15, fontWeight: '600' },
  away: { textAlign: 'right' },
  score: { fontSize: 18, fontWeight: '700' },
});
