import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessReviewStatus, PermissionAction, PermissionResource, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { PLATFORM_ROLES } from '../../common/auth.constants';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private readonly excessivePermissionThreshold = Number(
    process.env.RBAC_EXCESSIVE_PERMISSION_THRESHOLD ?? 20,
  );
  private readonly fullPermissionSet = Object.values(PermissionResource).flatMap((resource) =>
    Object.values(PermissionAction).map((action) => ({ resource, action })),
  );

  async createRole(tenantId: string, dto: CreateRoleDto, actorUserId?: string) {
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        isSystem: dto.isSystem ?? false,
      },
    });

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.ROLES,
      action: PermissionAction.CREATE,
      entityId: role.id,
      metadata: { role },
    });

    return role;
  }

  async updateRole(tenantId: string, roleId: string, dto: UpdateRoleDto, actorUserId?: string) {
    const existing = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    const role = await this.prisma.role.update({ where: { id: roleId }, data: dto });

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.ROLES,
      action: PermissionAction.UPDATE,
      entityId: role.id,
      metadata: { before: existing, after: role },
    });

    return role;
  }

  async deleteRole(tenantId: string, roleId: string, actorUserId?: string) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.role.delete({ where: { id: roleId } }),
    ]);

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.ROLES,
      action: PermissionAction.DELETE,
      entityId: role.id,
      metadata: { role },
    });

    return { message: 'Role deleted' };
  }

  async setRolePermissions(tenantId: string, roleId: string, dto: SetRolePermissionsDto, actorUserId?: string) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissions.map((permission) => ({
          roleId,
          resource: permission.resource,
          action: permission.action,
        })),
      }),
    ]);

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.ROLES,
      action: PermissionAction.CONFIG,
      entityId: roleId,
      metadata: { permissions: dto.permissions },
    });

    return this.prisma.rolePermission.findMany({ where: { roleId } });
  }

  async assignRoleToUser(tenantId: string, dto: AssignRoleDto, actorUserId?: string) {
    const [user, role] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: dto.userId, tenantId } }),
      this.prisma.role.findFirst({ where: { id: dto.roleId, tenantId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found for tenant');
    }
    if (!role) {
      throw new NotFoundException('Role not found for tenant');
    }

    const assignment = await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: dto.userId, roleId: dto.roleId } },
      create: { userId: dto.userId, roleId: dto.roleId },
      update: {},
    });

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.USERS,
      action: PermissionAction.UPDATE,
      entityId: dto.userId,
      metadata: { assignedRoleId: dto.roleId },
    });

    return assignment;
  }

  async removeRoleFromUser(tenantId: string, dto: AssignRoleDto, actorUserId?: string) {
    const assignment = await this.prisma.userRole.findFirst({
      where: { userId: dto.userId, roleId: dto.roleId },
      include: { role: true, user: true },
    });

    if (!assignment || assignment.user?.tenantId !== tenantId || assignment.role?.tenantId !== tenantId) {
      throw new NotFoundException('Role assignment not found for tenant');
    }

    await this.prisma.userRole.delete({ where: { id: assignment.id } });

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.USERS,
      action: PermissionAction.UPDATE,
      entityId: dto.userId,
      metadata: { removedRoleId: dto.roleId },
    });

    return { message: 'Role removed from user' };
  }

  async getUserPermissions(tenantId: string, userId: string) {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });

    const hasPlatformRole = assignments.some((assignment) =>
      assignment.role?.name ? PLATFORM_ROLES.has(assignment.role.name) : false,
    );

    if (hasPlatformRole) {
      return this.fullPermissionSet;
    }

    const scopedAssignments = assignments.filter((assignment) => assignment.role?.tenantId === tenantId);

    const permissionsMap = new Map<string, { resource: PermissionResource; action: PermissionAction }>();

    for (const assignment of scopedAssignments) {
      for (const permission of assignment.role.permissions) {
        const key = `${permission.resource}_${permission.action}`;
        permissionsMap.set(key, { resource: permission.resource, action: permission.action });
      }
    }

    return Array.from(permissionsMap.values());
  }

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({ where: { tenantId }, include: { permissions: true } });
  }

  async getRole(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, tenantId }, include: { permissions: true } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async generateAccessReview(
    tenantId: string,
    options: {
      periodStart?: Date;
      periodEnd?: Date;
      responsibleUserId?: string;
      summary?: string;
      evidenceUrl?: string;
      actorUserId?: string;
    } = {},
  ) {
    const periodEnd = options.periodEnd ?? new Date();
    const periodStart = options.periodStart ?? new Date(periodEnd.getTime() - 1000 * 60 * 60 * 24 * 30);

    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: true,
        users: { include: { user: true } },
      },
    });

    const orphanedPermissions = roles
      .filter((role) => role.permissions.length > 0 && role.users.length === 0)
      .map((role) => ({
        roleId: role.id,
        name: role.name,
        permissions: role.permissions.map((permission) => ({
          resource: permission.resource,
          action: permission.action,
        })),
      }));

    const userPermissions = new Map<
      string,
      { userId: string; email?: string | null; displayName?: string | null; permissions: Set<string>; risky: number; roles: string[] }
    >();

    for (const role of roles) {
      const riskyActions = new Set<PermissionAction>([
        PermissionAction.CONFIG,
        PermissionAction.APPROVE,
        PermissionAction.DELETE,
      ]);
      for (const assignment of role.users) {
        const key = assignment.userId;
        if (!userPermissions.has(key)) {
          userPermissions.set(key, {
            userId: assignment.userId,
            email: assignment.user?.email,
            displayName: (assignment.user as any)?.displayName,
            permissions: new Set<string>(),
            risky: 0,
            roles: [],
          });
        }
        const snapshot = userPermissions.get(key)!;
        snapshot.roles.push(role.name);
        for (const permission of role.permissions) {
          const token = `${permission.resource}:${permission.action}`;
          snapshot.permissions.add(token);
          if (riskyActions.has(permission.action)) {
            snapshot.risky += 1;
          }
        }
      }
    }

    const excessiveAssignments = Array.from(userPermissions.values())
      .filter((record) => record.permissions.size > this.excessivePermissionThreshold || record.risky > 3)
      .map((record) => ({
        userId: record.userId,
        email: record.email,
        displayName: record.displayName,
        totalPermissions: record.permissions.size,
        riskyPermissions: record.risky,
        roles: record.roles,
      }));

    const review = await this.prisma.accessReview.create({
      data: {
        tenantId,
        periodStart,
        periodEnd,
        summary: options.summary,
        findings: {
          rolesAnalyzed: roles.length,
          assignmentsReviewed: userPermissions.size,
          generatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        orphaned: orphanedPermissions as Prisma.InputJsonValue,
        excessive: excessiveAssignments as Prisma.InputJsonValue,
        responsibleUserId: options.responsibleUserId,
        evidenceUrl: options.evidenceUrl,
      },
    });

    await this.auditService.recordLog({
      tenantId,
      userId: options.actorUserId,
      resource: PermissionResource.ROLES,
      action: PermissionAction.CONFIG,
      entityId: review.id,
      metadata: {
        type: 'access-review-generated',
        orphanedCount: orphanedPermissions.length,
        excessiveAssignments: excessiveAssignments.length,
      },
    });

    return review;
  }

  async listAccessReviews(tenantId: string) {
    return this.prisma.accessReview.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getAccessReview(tenantId: string, id: string) {
    const review = await this.prisma.accessReview.findFirst({ where: { id, tenantId } });
    if (!review) {
      throw new NotFoundException('Access review not found');
    }
    return review;
  }

  async updateAccessReviewStatus(
    tenantId: string,
    id: string,
    status: AccessReviewStatus,
    actorUserId?: string,
    evidenceUrl?: string,
    summary?: string,
  ) {
    const review = await this.getAccessReview(tenantId, id);
    const updated = await this.prisma.accessReview.update({
      where: { id },
      data: {
        status,
        reviewerUserId: actorUserId,
        evidenceUrl: evidenceUrl ?? review.evidenceUrl,
        summary: summary ?? review.summary,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.recordLog({
      tenantId,
      userId: actorUserId,
      resource: PermissionResource.ROLES,
      action: status === AccessReviewStatus.APPROVED ? PermissionAction.APPROVE : PermissionAction.DELETE,
      entityId: id,
      metadata: {
        type: 'access-review-decision',
        status,
        evidenceUrl: updated.evidenceUrl,
      },
    });

    return updated;
  }

  async exportAccessReview(tenantId: string, id: string) {
    const review = await this.getAccessReview(tenantId, id);

    return {
      id: review.id,
      tenantId: review.tenantId,
      periodStart: review.periodStart,
      periodEnd: review.periodEnd,
      status: review.status,
      summary: review.summary,
      evidenceUrl: review.evidenceUrl,
      orphaned: review.orphaned,
      excessive: review.excessive,
      findings: review.findings,
      reviewedAt: review.reviewedAt,
      responsibleUserId: review.responsibleUserId,
      reviewerUserId: review.reviewerUserId,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
