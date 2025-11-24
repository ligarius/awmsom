import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { WavesService } from './waves.service';
import { GenerateWavesDto } from './dto/generate-waves.dto';
import { AssignWaveDto } from './dto/assign-wave.dto';

@Controller('waves')
export class WavesController {
  constructor(private readonly wavesService: WavesService, private readonly tenantContext: TenantContextService) {}

  @Post('generate')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.CONFIG)
  generate(@Body() dto: GenerateWavesDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.generateWaves(tenantId, dto);
  }

  @Post(':id/release')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  release(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.releaseWave(tenantId, id);
  }

  @Post(':id/start')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  start(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.startWave(tenantId, id);
  }

  @Post(':id/complete')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  complete(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.completeWave(tenantId, id);
  }

  @Post(':id/cancel')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.cancelWave(tenantId, id);
  }

  @Post(':id/assign')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  assign(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AssignWaveDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.assignWave(tenantId, id, dto.pickerUserId);
  }

  @Post(':id/create-picking-tasks')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  createPickingTasks(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.createPickingTasksForWave(tenantId, id);
  }

  @Post(':id/generate-path')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.UPDATE)
  generatePath(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.generatePickingPathForWave(tenantId, id);
  }

  @Get()
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.READ)
  list(
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('pickerUserId') pickerUserId?: string,
    @Query('timeWindowFrom') timeWindowFrom?: string,
    @Query('timeWindowTo') timeWindowTo?: string,
  ) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.listWaves(tenantId, {
      warehouseId,
      status,
      pickerUserId,
      timeWindowFrom,
      timeWindowTo,
    });
  }

  @Get(':id')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.READ)
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.wavesService.getWave(tenantId, id);
  }
}
