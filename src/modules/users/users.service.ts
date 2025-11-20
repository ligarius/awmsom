import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  health() {
    return { status: 'ok', module: 'users' };
  }
}
