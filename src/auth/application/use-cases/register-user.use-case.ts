import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { IPasswordService } from '../../domain/interfaces/password.interface';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { User } from '../../domain/entities/user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
  ) {}

  async execute(
    userData: RegisterDto,
  ): Promise<{ user: User; message: string }> {
    // Validar datos de entrada
    const email = new Email(userData.email);
    const password = new Password(userData.password);

    // Verificar si el usuario ya existe
    const existingUser = await this.authRepository.findUserByEmail(
      email.toString(),
    );
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hashear la contraseña
    const hashedPassword = await this.passwordService.hash(password.toString());

    // Crear usuario
    const userResult = await this.authRepository.createUser({
      email: email.toString(),
      hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
    });

    const user = new User(
      userResult.id,
      email,
      userResult.firstName,
      userResult.lastName,
      userResult.phoneNumber,
      userResult.mfaEnabled,
      userResult.status,
      userResult.passwordChangedAt,
      userResult.lastSignInAt,
      userResult.createdAt,
      userResult.updatedAt,
    );

    return {
      user,
      message: 'User registered successfully',
    };
  }
}
