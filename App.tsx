import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { MatchesScreen } from './src/screens/MatchesScreen';

export default function App() {
  const [dark, setDark] = useState(false);
  return (
    <View style={[styles.root, dark && styles.darkRoot]}>
      <MatchesScreen dark={dark} onToggleTheme={() => setDark((value) => !value)} />
      <StatusBar style={dark ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 48,
    backgroundColor: '#fff',
  },
  darkRoot: { backgroundColor: '#111827' },
});
