export interface FirestoreDocumentBase {
  id?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  deletedAt?: string | Date | null;
}
