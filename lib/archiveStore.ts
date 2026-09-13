// Public API for the Archive tab. Combines the auto-generated file list with
// any hand-written overrides and the category list. archive.tsx only ever
// imports from here - it doesn't need to know about the generated/meta split.

import { GENERATED_ARCHIVE_FILES } from './archiveFiles.generated';
import { ARCHIVE_META } from './archiveMeta';
import { ArchiveCategory, ARCHIVE_CATEGORIES, getSortedCategories } from './archiveCategories';

export type ArchiveItem = {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  fileType: string;
  isImage: boolean;
  file: number;
  order: number;
};

export { ArchiveCategory, ARCHIVE_CATEGORIES, getSortedCategories };

/**
 * Files whose name is just a number ("7.jpg") get a bare "7" as their auto-derived title.
 * When the category defines an itemLabel, turn that into "Quote 7" - a numbered picture set
 * shouldn't need 60 hand-written overrides in archiveMeta just to read properly.
 */
function displayTitle(rawTitle: string, category: ArchiveCategory | undefined): string {
  if (!category?.itemLabel) return rawTitle;
  return /^\d+(\.\d+)?$/.test(rawTitle) ? `${category.itemLabel} ${rawTitle}` : rawTitle;
}

export function getItemsForCategory(categoryId: string): ArchiveItem[] {
  const category = ARCHIVE_CATEGORIES.find((c) => c.id === categoryId);
  return GENERATED_ARCHIVE_FILES.filter((f) => f.categoryId === categoryId)
    .map((f) => {
      const meta = ARCHIVE_META[f.id] || {};
      return {
        id: f.id,
        categoryId: f.categoryId,
        title: meta.title || displayTitle(f.title, category),
        description: meta.description,
        fileType: f.fileType,
        isImage: f.isImage,
        file: f.file,
        order: meta.order ?? f.order,
      };
    })
    .sort((a, b) => a.order - b.order);
}
