import { Injectable } from '@nestjs/common';

@Injectable()
export class PaginationService {
  buildPaginationParams(page = 1, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safePage = Math.max(page, 1);
    return {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  }
}
