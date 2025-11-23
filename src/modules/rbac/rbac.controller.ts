import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AccessReviewStatus, PermissionAction, PermissionResource } from '@prisma/client';
import { TenantContextService } from '../../common/tenant-context.service';
import { Permissions } from '../../decorators/permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { TriggerAccessReviewDto } from './dto/trigger-access-review.dto';
import { UpdateAccessReviewStatusDto } from './dto/update-access-review-status.dto';
import { RbacService } from './rbac.service';

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService, private readonly tenantContext: TenantContextService) {}

  @Post('roles')
  @Permissions(PermissionResource.ROLES, PermissionAction.CREATE)
  createRole(@Body() dto: CreateRoleDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.createRole(tenantId, dto, userId);
  }

  @Get('roles')
  @Permissions(PermissionResource.ROLES, PermissionAction.READ)
  listRoles() {
    const tenantId = this.tenantContext.getTenantId();
    return this.rbacService.listRoles(tenantId);
  }

  @Get('roles/:id')
  @Permissions(PermissionResource.ROLES, PermissionAction.READ)
  getRole(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.rbacService.getRole(tenantId, id);
  }

  @Patch('roles/:id')
  @Permissions(PermissionResource.ROLES, PermissionAction.UPDATE)
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.updateRole(tenantId, id, dto, userId);
  }

  @Delete('roles/:id')
  @Permissions(PermissionResource.ROLES, PermissionAction.DELETE)
  deleteRole(@Param('id') id: string, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.deleteRole(tenantId, id, userId);
  }

  @Post('roles/:id/permissions')
  @Permissions(PermissionResource.ROLES, PermissionAction.CONFIG)
  setPermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.setRolePermissions(tenantId, id, dto, userId);
  }

  @Post('assign-role')
  @Permissions(PermissionResource.USERS, PermissionAction.UPDATE)
  assignRole(@Body() dto: AssignRoleDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.assignRoleToUser(tenantId, dto, userId);
  }

  @Delete('remove-role')
  @Permissions(PermissionResource.USERS, PermissionAction.UPDATE)
  removeRole(@Body() dto: AssignRoleDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.removeRoleFromUser(tenantId, dto, userId);
  }

  @Get('my-permissions')
  getMyPermissions(@Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    if (!userId) {
      return [];
    }
    return this.rbacService.getUserPermissions(tenantId, userId);
  }

  @Post('reviews/run')
  @Permissions(PermissionResource.REPORTS, PermissionAction.CREATE)
  triggerReview(@Body() dto: TriggerAccessReviewDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.generateAccessReview(tenantId, {
      periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
      periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      responsibleUserId: dto.responsibleUserId,
      summary: dto.summary,
      evidenceUrl: dto.evidenceUrl,
      actorUserId: userId,
    });
  }

  @Get('reviews')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  listReviews() {
    const tenantId = this.tenantContext.getTenantId();
    return this.rbacService.listAccessReviews(tenantId);
  }

  @Get('reviews/:id/export')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  exportReview(@Param('id') id: string) {
    const tenantId = this.tenantContext.getTenantId();
    return this.rbacService.exportAccessReview(tenantId, id);
  }

  @Patch('reviews/:id/status')
  @Permissions(PermissionResource.REPORTS, PermissionAction.APPROVE)
  updateReviewStatus(@Param('id') id: string, @Body() dto: UpdateAccessReviewStatusDto, @Req() req: Request) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = (req as any)?.user?.sub;
    return this.rbacService.updateAccessReviewStatus(
      tenantId,
      id,
      dto.status ?? AccessReviewStatus.PENDING,
      userId,
      dto.evidenceUrl,
      dto.summary,
    );
  }
}
