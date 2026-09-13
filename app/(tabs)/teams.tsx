import { View, Text, StyleSheet } from 'react-native';

export default function TeamsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Teams — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#D4AF37', fontSize: 18, fontWeight: '600' },
});