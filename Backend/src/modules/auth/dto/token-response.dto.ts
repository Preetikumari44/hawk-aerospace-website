import type { FirestoreUserDocument } from '../../../database/firestore/contracts';

export class TokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: string;
  refreshExpiresIn!: string;
  user!: FirestoreUserDocument;
}
