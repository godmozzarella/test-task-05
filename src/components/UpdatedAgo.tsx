import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  // Момент последней успешной загрузки данных.
  since: Date;
  dark: boolean;
};

// Подпись «Обновлено N сек назад».
export function UpdatedAgo({ since, dark }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [since]);

  const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));
  return <Text style={[styles.text, dark && styles.darkText]}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
  darkText: { color: '#9ca3af' },
});
