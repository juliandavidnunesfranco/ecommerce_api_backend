import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly createTenantUseCase: CreateTenantUseCase,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.registerUserUseCase.execute(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return await this.loginUserUseCase.execute(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-tenant')
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: any,
  ) {
    return await this.createTenantUseCase.execute(user.userId, createTenantDto);
  }
}
