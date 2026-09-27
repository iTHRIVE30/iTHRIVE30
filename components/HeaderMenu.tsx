import { useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTheme();
  const styles = useThemedStyles(createStyles);

  // The Growth Tree used to have a row here; it now lives in the Challenges tab.
  const openMenu = () => setOpen(true);

  const go = (path: string) => {
    setOpen(false);
    router.push(path as any);
  };

  return (
    <>
      <Pressable onPress={openMenu} hitSlop={12} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="menu" size={26} color={t.primary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Pressable style={styles.item} onPress={() => go('/archive')}>
              <Ionicons name="folder-outline" size={18} color={t.primary} />
              <Text style={styles.itemText}>Archive</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/account')}>
              <Ionicons name="compass-outline" size={18} color={t.primary} />
              <Text style={styles.itemText}>My Journey</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/teams')}>
              <Ionicons name="people-outline" size={18} color={t.primary} />
              <Text style={styles.itemText}>Teams</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/montage')}>
              <Ionicons name="images-outline" size={18} color={t.primary} />
              <Text style={styles.itemText}>Transformation</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/settings')}>
              <Ionicons name="settings-outline" size={18} color={t.primary} />
              <Text style={styles.itemText}>Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: t.backdrop },
    dropdown: {
      position: 'absolute',
      top: 90,
      right: 16,
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingVertical: 6,
      minWidth: 210,
    },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
    itemText: { color: t.inkSoft, fontSize: 15 },
    divider: { height: 1, backgroundColor: t.border, marginHorizontal: 8 },
  });
