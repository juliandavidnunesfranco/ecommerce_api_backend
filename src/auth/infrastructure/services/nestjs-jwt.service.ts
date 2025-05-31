import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IJwtService } from '../../domain/interfaces/jwt.interface';

@Injectable()
export class NestJsJwtService implements IJwtService {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(payload: any): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token);
  }
}
