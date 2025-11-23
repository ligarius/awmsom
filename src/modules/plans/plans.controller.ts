import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ChangeTenantPlanDto } from './dto/change-tenant-plan.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { PlansService } from './plans.service';

@Controller('admin/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Get()
  findAll() {
    return this.plansService.listPlans();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.getPlan(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.plansService.updatePlan(id, dto);
  }

  @Post('change-tenant-plan')
  assignPlan(@Body() dto: ChangeTenantPlanDto) {
    return this.plansService.assignPlanToTenant(dto.tenantId, dto.planId);
  }
}
