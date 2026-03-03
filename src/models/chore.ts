export interface Chore {
  id: string;
  title: string;
  assignedTo?: string;
  done: boolean;
  selectedForToday: boolean;
  updatedAt: number;
  createdAt: number;
}
