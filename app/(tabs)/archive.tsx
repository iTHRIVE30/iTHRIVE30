import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { getSortedCategories, getItemsForCategory, ArchiveItem } from '../../lib/archiveStore';
import { markScreenVisited } from '../../lib/rewardEvents';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';
const GRID_GAP = 10;
const GRID_COLUMNS = 3;

export default function ArchiveScreen() {
  const categories = getSortedCategories();
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
                        <Ionicons name="document-text-outline" size={20} color={GOLD} />
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
                      <Ionicons name="hourglass-outline" size={20} color="#777" />
                    ) : (
                      <Ionicons name={item.isImage ? 'expand-outline' : 'download-outline'} size={20} color="#777" />
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
                  <Ionicons name="share-outline" size={16} color={BLACK} />
                  <Text style={styles.previewButtonText}>
                    {openingId === preview.id ? 'Opening…' : 'Save / Share'}
                  </Text>
                </Pressable>
              </View>
              <Pressable style={styles.previewClose} onPress={() => setPreview(null)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#fff" />
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLACK },
  title: { color: GOLD, fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 24 },
  categoryBlock: { marginBottom: 26 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  categoryTitle: { color: GOLD, fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryCount: { color: '#666', fontSize: 12, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridImage: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#161616' },

  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 12, borderWidth: 1, borderColor: '#262626', padding: 14, marginBottom: 10, gap: 12 },
  itemIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1f1a08', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemThumb: { width: '100%', height: '100%' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { color: '#eee', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  fileTypeBadge: { backgroundColor: '#1f1a08', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  fileTypeBadgeText: { color: '#8a7433', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  itemDescription: { color: '#888', fontSize: 12, marginTop: 3, lineHeight: 16 },
  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', marginBottom: 10 },

  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '92%', height: '76%' },
  previewBar: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewTitle: { color: '#eee', fontSize: 14, fontWeight: '600', flex: 1 },
  previewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  previewButtonText: { color: BLACK, fontSize: 13, fontWeight: '700' },
  previewClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
