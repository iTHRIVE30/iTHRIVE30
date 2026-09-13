import { View, Text, StyleSheet } from 'react-native';

import { useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';

export default function TeamsScreen() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Teams — coming soon</Text>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground, alignItems: 'center', justifyContent: 'center' },
    text: { color: t.primary, fontSize: 18, fontWeight: '600' },
  });
