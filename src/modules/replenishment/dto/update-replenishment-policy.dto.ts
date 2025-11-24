import { PartialType } from '@nestjs/mapped-types';
import { CreateReplenishmentPolicyDto } from './create-replenishment-policy.dto';

export class UpdateReplenishmentPolicyDto extends PartialType(CreateReplenishmentPolicyDto) {}
