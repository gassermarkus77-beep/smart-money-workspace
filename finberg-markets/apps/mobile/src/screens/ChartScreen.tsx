import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

// Minimal Skia line chart — full candle engine ships in v1.0.
export default function ChartScreen(): JSX.Element {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    let x = 0, y = 200;
    p.moveTo(x, y);
    for (let i = 1; i < 80; i++) {
      x += 4;
      y += (Math.random() - 0.5) * 30;
      p.lineTo(x, y);
    }
    return p;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>BTCUSDT · 1h</Text>
      <Text style={styles.price}>$67,432.10  <Text style={styles.change}>+1.23%</Text></Text>
      <Canvas style={styles.canvas}>
        <Path path={path} color="#26a69a" style="stroke" strokeWidth={2} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f17', padding: 16 },
  symbol:    { color: '#9aa4b2', fontSize: 12, fontFamily: 'Menlo' },
  price:     { color: '#e6ebf2', fontSize: 28, fontWeight: '600', marginTop: 4 },
  change:    { color: '#26a69a', fontSize: 16 },
  canvas:    { flex: 1, marginTop: 24 },
});
