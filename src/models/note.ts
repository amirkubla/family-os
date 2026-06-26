export interface Note {
  id: string;
  title?: string;
  body: string;
  pinned: boolean;
  /** Manual drag-to-reorder position; lower sorts first. */
  sortOrder: number;
  /**
   * Ownership — at most one of these is set:
   *   kidId          → belongs to that kid (shown on /kid/[kidId]).
   *   ownerMemberId  → belongs to that family member (parent).
   *   both undefined → family-wide / general (no owner).
   */
  kidId?: string;
  ownerMemberId?: string;
  updatedAt: number;
  createdAt: number;
}
