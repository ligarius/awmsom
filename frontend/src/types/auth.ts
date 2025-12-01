export interface AuthCredentials {
  email: string;
  password: string;
  tenantId: string;
  challengeId?: string;
  mfaCode?: string;
  factorId?: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  mfaRequired?: boolean;
  challengeId?: string;
  factor?: MfaFactor;
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
