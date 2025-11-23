import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  health() {
    return this.authService.health();
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('users/:tenantId/:email')
  findUser(@Param('tenantId') tenantId: string, @Param('email') email: string) {
    return this.authService.findUser(tenantId, email);
  }

  @Patch('users/:id')
  updateCredentials(@Param('id') id: string, @Body() dto: UpdateCredentialsDto) {
    return this.authService.updateCredentials(id, dto);
  }
}
