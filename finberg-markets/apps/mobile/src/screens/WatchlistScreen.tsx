import { FlatList, View, Text, StyleSheet } from 'react-native';

const ITEMS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin',  price: 67432.10, change:  1.23 },
  { symbol: 'ETHUSDT', name: 'Ethereum', price:  3502.55, change: -0.42 },
  { symbol: 'SOLUSDT', name: 'Solana',   price:   142.10, change:  2.18 },
  { symbol: 'AAPL',    name: 'Apple',    price:   228.40, change: -0.31 },
  { symbol: 'NVDA',    name: 'Nvidia',   price:   136.80, change:  3.95 },
];

export default function WatchlistScreen(): JSX.Element {
  return (
    <FlatList
      style={styles.list}
      data={ITEMS}
      keyExtractor={(i) => i.symbol}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View>
            <Text style={styles.sym}>{item.symbol}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.price}>{item.price.toFixed(2)}</Text>
            <Text style={[styles.change, { color: item.change >= 0 ? '#26a69a' : '#ef5350' }]}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list:   { backgroundColor: '#0b0f17' },
  row:    { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sep:    { height: 1, backgroundColor: '#1a2332' },
  sym:    { color: '#e6ebf2', fontSize: 16, fontWeight: '600' },
  name:   { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  price:  { color: '#e6ebf2', fontFamily: 'Menlo', fontSize: 16 },
  change: { fontFamily: 'Menlo', fontSize: 12, marginTop: 2 },
});
