import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import { MfaEnrollDto } from './dto/mfa-enroll.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { AuthUserGuard } from './guards/auth-user.guard';
import { Response } from 'express';

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

  @Post('login/oauth')
  oauthLogin(@Body() dto: OAuthLoginDto) {
    return this.authService.oauthLogin(dto);
  }

  @Get('oauth/authorize')
  async oauthAuthorize(
    @Query('provider') provider = 'oidc-demo',
    @Query('tenantId') tenantId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Query('nonce') nonce: string,
    @Res() res: Response,
  ) {
    const authorizeUrl = await this.authService.buildOAuthAuthorizeUrl(provider, tenantId, redirectUri, state, nonce);
    return res.redirect(authorizeUrl);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('mfa/factors')
  enrollFactor(@Body() dto: MfaEnrollDto) {
    return this.authService.enrollFactor(dto);
  }

  @Post('mfa/verify')
  verifyMfa(@Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfa(dto);
  }

  @UseGuards(AuthUserGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.getAuthenticatedUser(req.headers.authorization, req.user);
  }

  @Get('tenants/:tenantId/users')
  listUsers(@Param('tenantId') tenantId: string) {
    return this.authService.listUsers(tenantId);
  }

  @Get('users/:tenantId/:email')
  findUser(@Param('tenantId') tenantId: string, @Param('email') email: string) {
    return this.authService.findUser(tenantId, email);
  }

  @Patch('users/:id')
  updateCredentials(@Param('id') id: string, @Body() dto: UpdateCredentialsDto) {
    return this.authService.updateCredentials(id, dto);
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id') id: string) {
    return this.authService.deactivateUser(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }
}
