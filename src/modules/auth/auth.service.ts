import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  health() {
    return { status: 'ok', module: 'auth' };
  }
}
