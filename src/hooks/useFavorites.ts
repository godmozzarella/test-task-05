import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'favorite-match-ids';

// Избранные матчи (по id). Сохраняются между запусками приложения.
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const currentFavorites = useRef<string[]>([]);
  const writes = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const ids: unknown = stored ? JSON.parse(stored) : [];
        if (!cancelled && Array.isArray(ids)) {
          const restored = ids.filter((id): id is string => typeof id === 'string');
          currentFavorites.current = restored;
          setFavorites(restored);
        }
      } catch {
        // Если хранилище недоступно, избранное остаётся в памяти.
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggle = (id: string) => {
    if (!ready) return;
    const current = currentFavorites.current;
    const next = current.includes(id)
      ? current.filter((favoriteId) => favoriteId !== id)
      : [...current, id];
    currentFavorites.current = next;
    setFavorites(next);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)))
      .catch(() => {});
  };

  return { favorites, ready, isFavorite, toggle };
}
