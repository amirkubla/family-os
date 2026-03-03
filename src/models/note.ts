export interface Note {
  id: string;
  title?: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
  createdAt: number;
}
