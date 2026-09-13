import { useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const GOLD = '#D4AF37';

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const go = (path: string) => {
    setOpen(false);
    router.push(path as any);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={12} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="menu" size={26} color={GOLD} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Pressable style={styles.item} onPress={() => go('/archive')}>
              <Ionicons name="folder-outline" size={18} color={GOLD} />
              <Text style={styles.itemText}>Archive</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/account')}>
              <Ionicons name="compass-outline" size={18} color={GOLD} />
              <Text style={styles.itemText}>My Journey</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/teams')}>
              <Ionicons name="people-outline" size={18} color={GOLD} />
              <Text style={styles.itemText}>Teams</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={() => go('/settings')}>
              <Ionicons name="settings-outline" size={18} color={GOLD} />
              <Text style={styles.itemText}>Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dropdown: {
    position: 'absolute',
    top: 90,
    right: 16,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    paddingVertical: 6,
    minWidth: 210,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  itemText: { color: '#eee', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#262626', marginHorizontal: 8 },
});
