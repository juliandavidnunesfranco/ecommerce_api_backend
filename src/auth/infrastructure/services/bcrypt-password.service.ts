import { Injectable } from '@nestjs/common';
import { IPasswordService } from '../../domain/interfaces/password.interface';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BcryptPasswordService implements IPasswordService {
  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
