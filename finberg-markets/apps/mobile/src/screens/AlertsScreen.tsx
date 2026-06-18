import { View, Text, StyleSheet } from 'react-native';

export default function AlertsScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.body}>No alerts yet. Create one from the chart screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f17', padding: 24 },
  title: { color: '#e6ebf2', fontSize: 24, fontWeight: '600' },
  body:  { color: '#9aa4b2', marginTop: 12 },
});
