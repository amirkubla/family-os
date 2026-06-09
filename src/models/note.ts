export interface Note {
  id: string;
  title?: string;
  body: string;
  pinned: boolean;
  /**
   * Optional kid ownership. undefined = family-wide note (shown on /home).
   * Non-null = note belongs to that kid (shown on /kid/[kidId]).
   */
  kidId?: string;
  updatedAt: number;
  createdAt: number;
}
