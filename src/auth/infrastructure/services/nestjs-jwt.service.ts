import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { IJwtService } from '../../domain/interfaces/jwt.interface';
import { JWT_SERVICE_TOKEN } from '../../../common/constants'; // Asegúrate de crear este archivo

@Injectable()
export class NestJsJwtService implements IJwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  async generateToken(payload: any): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token);
  }
}

// Exporta el provider que vincula la interfaz con la implementación
export const JwtServiceProvider = {
  provide: JWT_SERVICE_TOKEN,
  useClass: NestJsJwtService,
};
