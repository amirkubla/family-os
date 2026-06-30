export interface Chore {
  id: string;
  title: string;
  assignedTo?: string;
  assignedToMemberId?: string;
  /** Assignee can be a kid instead of a member — mutually exclusive with assignedToMemberId. */
  kidId?: string;
  done: boolean;
  selectedForToday: boolean;
  /** Manual drag-to-reorder position; lower sorts first. */
  sortOrder: number;
  updatedAt: number;
  createdAt: number;
}
