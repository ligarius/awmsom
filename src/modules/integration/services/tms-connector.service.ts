import { Injectable } from '@nestjs/common';
import { TmsShipmentDto } from '../dto/tms-shipment.dto';

@Injectable()
export class TmsConnectorService {
  notifyShipment(dto: TmsShipmentDto) {
    return {
      delivered: true,
      trackingCode: dto.trackingCode,
      carrier: dto.carrier,
      destination: dto.destination,
    };
  }
}
