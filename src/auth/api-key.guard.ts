import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headerKey = request.headers['x-api-key'] || request.headers['authorization'];
    if (!headerKey) {
      throw new UnauthorizedException('API key required');
    }
    const raw = Array.isArray(headerKey)
      ? headerKey[0]
      : String(headerKey).startsWith('ApiKey ')
      ? String(headerKey).replace('ApiKey ', '')
      : String(headerKey);
    const validation = await this.apiKeysService.validateApiKey(raw);
    if (!validation) {
      throw new UnauthorizedException('Invalid API key');
    }
    request.user = {
      id: null,
      tenantId: validation.tenantId,
      isApiKey: true,
      canRead: validation.apiKey.canRead,
      canWrite: validation.apiKey.canWrite,
    };
    request.tenantId = validation.tenantId;
    request.apiKey = validation.apiKey;
    return true;
  }
}
