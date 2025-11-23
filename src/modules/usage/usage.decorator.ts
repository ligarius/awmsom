import { SetMetadata } from '@nestjs/common';
import { UsageMetricKey } from './usage.service';

export const USAGE_LIMIT_KEY = 'USAGE_LIMIT_KEY';

export const UsageLimit = (metric: UsageMetricKey, increment = 1) =>
  SetMetadata(USAGE_LIMIT_KEY, { metric, increment });
