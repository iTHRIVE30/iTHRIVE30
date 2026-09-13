// Categories for the Archive / Digital Library.
//
// IMPORTANT: each `id` here MUST exactly match a folder name under assets/archive/.
// The generator keys every file by its folder name, and archiveStore joins the two on
// that id - so a category whose id doesn't match a real folder shows up empty, and a
// folder with no matching category here is invisible in the app. `npm run sync-archive`
// warns about both cases.
//
// `name` is the display label and is free to change without touching anything else.

export type ArchiveCategory = {
  id: string;
  name: string;
  order: number;
  /**
   * How this category's items are laid out. 'grid' shows tappable thumbnails - use it for
   * picture sets. 'list' (the default) shows document rows with a download icon.
   */
  layout?: 'list' | 'grid';
  /**
   * Label prefix for items whose filename is just a number. "1.jpg" in a category with
   * itemLabel 'Quote Tile' displays as "Quote Tile 1" instead of a bare "1". Saves writing
   * 60-odd hand overrides in archiveMeta.ts for a numbered image set.
   */
  itemLabel?: string;
};

export const ARCHIVE_CATEGORIES: ArchiveCategory[] = [
  { id: 'success-on-purpose', name: 'Purpose Designed', order: 1 },
  { id: 'growth-environment', name: 'Environmental Setters', order: 2, layout: 'grid', itemLabel: 'Setter' },
  { id: 'Quote.Tiles', name: 'Quote Tiles', order: 3, layout: 'grid', itemLabel: 'Quote' },
  { id: 'gallery', name: 'Gallery', order: 4 },
  // Add new categories here, e.g.:
  // { id: 'habit-guides', name: 'Habit Guides', order: 5 },
  // ...and create assets/archive/habit-guides/ to match.
];

export function getSortedCategories(): ArchiveCategory[] {
  return [...ARCHIVE_CATEGORIES].sort((a, b) => a.order - b.order);
}
