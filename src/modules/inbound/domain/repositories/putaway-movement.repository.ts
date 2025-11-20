import { PutawayMovement } from '../entities/putaway-movement.entity';

export const PUTAWAY_MOVEMENT_REPOSITORY = 'PUTAWAY_MOVEMENT_REPOSITORY';

export interface PutawayMovementRepository {
  create(movement: PutawayMovement): Promise<PutawayMovement>;
}
