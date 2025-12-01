import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthUserGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = (request.headers?.authorization as string | undefined) ?? '';

    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    request.user = await this.authService.getAuthenticatedUser(authorization);

    return true;
  }
}
