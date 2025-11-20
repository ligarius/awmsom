import { Injectable } from '@nestjs/common';

@Injectable()
export class LocationsService {
  health() {
    return { status: 'ok', module: 'locations' };
  }
}
