import { View, Text, StyleSheet } from 'react-native';

export default function AccountScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.body}>Sign in to sync your watchlists, layouts, and alerts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f17', padding: 24 },
  title: { color: '#e6ebf2', fontSize: 24, fontWeight: '600' },
  body:  { color: '#9aa4b2', marginTop: 12 },
});
