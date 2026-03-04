export interface Chore {
  id: string;
  title: string;
  assignedTo?: string;
  assignedToMemberId?: string;
  done: boolean;
  selectedForToday: boolean;
  updatedAt: number;
  createdAt: number;
}
