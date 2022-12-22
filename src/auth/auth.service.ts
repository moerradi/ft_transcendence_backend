import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { IntraUser } from 'src/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(user: IntraUser) {
    const { login, first_name, last_name, id, image } = user;
    const existingUser = await this.prisma.user.findUnique({
      where: {
        intra_id: id,
      },
    });
    if (!existingUser) {
      console.log('existingUser');
      const newUser = await this.prisma.user.create({
        data: {
          intra_id: id,
          login,
          first_name,
          last_name,
          avatar_url: image.versions.medium,
        },
      });
      return newUser;
    }
    console.log('newUser');
    return existingUser;
  }

  //   signUser(user: User) {
  // 	const
  //   }
}
