export interface Chore {
  id: string;
  title: string;
  assignedTo?: string;
  assignedToMemberId?: string;
  done: boolean;
  selectedForToday: boolean;
  /** Manual drag-to-reorder position; lower sorts first. */
  sortOrder: number;
  updatedAt: number;
  createdAt: number;
}
