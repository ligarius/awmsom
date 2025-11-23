import { Body, Controller, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Controller('public/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('register-tenant')
  async registerTenant(@Body() dto: RegisterTenantDto) {
    const result = await this.onboardingService.registerTenant(dto);
    return {
      tenantId: result.tenantId,
      adminEmail: result.adminEmail,
      planCode: result.planCode,
      message: result.message,
    };
  }
}
