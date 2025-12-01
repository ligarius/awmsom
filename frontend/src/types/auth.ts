export interface AuthCredentials {
  email: string;
  password: string;
  tenantId: string;
  challengeId?: string;
  mfaCode?: string;
  factorId?: string;
}

export type AuthResponse = AuthSuccessResponse | AuthMfaChallenge;

export interface AuthSuccessResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  mfaRequired?: false;
}

export interface AuthMfaChallenge {
  mfaRequired: true;
  challengeId: string;
  factor?: MfaFactor;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  tenant?: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
}

export interface MfaFactor {
  id: string;
  type: string;
  channelHint?: string;
}
