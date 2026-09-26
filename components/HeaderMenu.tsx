import { useState } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';
import { isGrowthTreeUnlocked } from '../lib/growthTree';

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [treeUnlocked, setTreeUnlocked] = useState(false);
  const router = useRouter();
  const t = useTheme();
  const styles = useThemedStyles(createStyles);

  // Read on open rather than on mount: the menu lives in the tab header for the whole
  // session, so a value read once would still say "locked" after the level that opens it.
  // Defaults to locked, so a failed read shows the lock rather than the tree.
  const openMenu = () => {
    setOpen(true);
    isGrowthTreeUnlocked().then(setTreeUnlocked).catch(() => setTreeUnlocked(false));
  };

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
            {/*
              The Growth Tree stays shut until Level 3 (see REVEAL_AT_LEVEL in
              lib/growthTree.ts). The row still shows, dimmed and with a lock, rather than
              disappearing: a row that appears from nowhere weeks later reads as a bug,
              and one quiet line is not the overstimulation the wait is there to prevent.
              Tapping it explains when it opens.
            */}
            <Pressable style={styles.item} onPress={() => go('/growth-tree')}>
              <Ionicons
                name={treeUnlocked ? 'git-branch-outline' : 'lock-closed-outline'}
                size={18}
                color={treeUnlocked ? t.primary : t.muted}
              />
              <Text style={[styles.itemText, !treeUnlocked && styles.itemTextLocked]}>
                Growth Tree
              </Text>
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
    itemTextLocked: { color: t.muted },
    divider: { height: 1, backgroundColor: t.border, marginHorizontal: 8 },
  });
