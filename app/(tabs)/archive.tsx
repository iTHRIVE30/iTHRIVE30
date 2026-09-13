import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { getSortedCategories, getItemsForCategory, ArchiveItem } from '../../lib/archiveStore';
import { markScreenVisited } from '../../lib/rewardEvents';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import { DarkTheme, type Theme } from '../../constants/theme';

const GRID_GAP = 10;
const GRID_COLUMNS = 3;

export default function ArchiveScreen() {
  const categories = getSortedCategories();
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ArchiveItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('archive');
    }, [])
  );

  // 20px screen padding either side, plus the gaps between columns.
  const tileSize = Math.floor((width - 40 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  const handleShare = async (item: ArchiveItem) => {
    setOpeningId(item.id);
    try {
      const asset = Asset.fromModule(item.file);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Not available', "This device can't open the share sheet.");
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.log('Archive open error:', err);
      Alert.alert('Could not open file', 'Something went wrong opening this file. Try again in a moment.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={styles.title}>Archive</Text>
        <Text style={styles.subtitle}>Guides, worksheets, and resources to support your journey.</Text>

        {categories.length === 0 && <Text style={styles.emptyText}>Nothing here yet.</Text>}

        {categories.map((category) => {
          const items = getItemsForCategory(category.id);
          // Grid layout only makes sense if the category is actually pictures.
          const asGrid = category.layout === 'grid' && items.every((i) => i.isImage);

          return (
            <View key={category.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                {items.length > 0 && <Text style={styles.categoryCount}>{items.length}</Text>}
              </View>

              {items.length === 0 && <Text style={styles.emptyText}>No resources in this category yet.</Text>}

              {asGrid ? (
                <View style={styles.grid}>
                  {items.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setPreview(item)}
                      style={{ width: tileSize, height: tileSize }}
                    >
                      <Image source={item.file} style={styles.gridImage} resizeMode="cover" />
                    </Pressable>
                  ))}
                </View>
              ) : (
                items.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => (item.isImage ? setPreview(item) : handleShare(item))}
                    disabled={openingId === item.id}
                  >
                    <View style={styles.itemIconWrap}>
                      {item.isImage ? (
                        <Image source={item.file} style={styles.itemThumb} resizeMode="cover" />
                      ) : (
                        <Ionicons name="document-text-outline" size={20} color={t.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.itemTitleRow}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <View style={styles.fileTypeBadge}>
                          <Text style={styles.fileTypeBadgeText}>{item.fileType}</Text>
                        </View>
                      </View>
                      {!!item.description && (
                        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
                      )}
                    </View>
                    {openingId === item.id ? (
                      <Ionicons name="hourglass-outline" size={20} color={t.muted} />
                    ) : (
                      <Ionicons name={item.isImage ? 'expand-outline' : 'download-outline'} size={20} color={t.muted} />
                    )}
                  </Pressable>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Full-screen viewer for pictures - tap a tile to read it, then save/share from here. */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreview(null)} />
          {!!preview && (
            <>
              <Image source={preview.file} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.previewBar}>
                <Text style={styles.previewTitle} numberOfLines={1}>{preview.title}</Text>
                <Pressable
                  style={styles.previewButton}
                  onPress={() => handleShare(preview)}
                  disabled={openingId === preview.id}
                >
                  <Ionicons name="share-outline" size={16} color={t.onPrimary} />
                  <Text style={styles.previewButtonText}>
                    {openingId === preview.id ? 'Opening…' : 'Save / Share'}
                  </Text>
                </Pressable>
              </View>
              <Pressable style={styles.previewClose} onPress={() => setPreview(null)} hitSlop={10}>
                <Ionicons name="close" size={26} color={DarkTheme.ink} />
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 24 },
    categoryBlock: { marginBottom: 26 },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    categoryTitle: { color: t.primary, fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    categoryCount: { color: t.muted, fontSize: 12, fontWeight: '700' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
    gridImage: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: t.surface },

    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 10, gap: 12 },
    itemIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: t.primaryTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    itemThumb: { width: '100%', height: '100%' },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemTitle: { color: t.inkSoft, fontSize: 14, fontWeight: '600', flexShrink: 1 },
    fileTypeBadge: { backgroundColor: t.primaryTint, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    fileTypeBadgeText: { color: t.primaryDim, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    itemDescription: { color: t.secondaryDim, fontSize: 12, marginTop: 3, lineHeight: 16 },
    emptyText: { color: t.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 10 },

    // The full-screen picture viewer stays dark in BOTH themes. A lightbox exists to get
    // everything but the image out of the way, and an ivory one fights the picture.
    previewBackdrop: { flex: 1, backgroundColor: DarkTheme.scrimStrong, alignItems: 'center', justifyContent: 'center' },
    previewImage: { width: '92%', height: '76%' },
    previewBar: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
    previewTitle: { color: DarkTheme.inkSoft, fontSize: 14, fontWeight: '600', flex: 1 },
    previewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    previewButtonText: { color: t.onPrimary, fontSize: 13, fontWeight: '700' },
    previewClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  });
