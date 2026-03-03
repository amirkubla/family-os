export interface Chore {
  id: string;
  title: string;
  assignedTo?: string;
  done: boolean;
  createdAt: number;
}
