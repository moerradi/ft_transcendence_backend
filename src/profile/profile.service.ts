import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfileService {
  // add prisma injection
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getFriends(login: string): Promise<User[]> {
    const user = await this.prisma.user.findUnique({
      where: { login },
      include: {
        sent_requests: {
          where: { status: 'ACCEPTED' },
          select: {
            addressee: {
              select: {
                id: true,
                login: true,
              },
            },
          },
        },
        received_requests: {
          where: { status: 'ACCEPTED' },
          select: {
            requester: {
              select: {
                id: true,
                login: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error(`User with login "${login}" not found`);
    }

    const friends = [
      ...user.sent_requests.map((friendship: any) => friendship.addressee),
      ...user.received_requests.map((friendship: any) => friendship.requester),
    ];

    return friends;
  }

  // add method to get profile by username (only public data)
  async getProfile(login: string) {
    const user = await this.prisma.user.findUnique({
      where: { login },
      select: {
        login: true,
        first_name: true,
        last_name: true,
        avatar_url: true,
        exp: true,
        level: true,
        matches_as_player_one: {
          select: {
            id: true,
            player_one_id: true,
            player_two_id: true,
            game_mode: true,
            player_one_score: true,
            player_two_score: true,
            started_at: true,
            finished_at: true,
          },
          orderBy: {
            started_at: 'desc',
          },
          take: 10,
        },
        matches_as_player_two: {
          select: {
            id: true,
            player_one_id: true,
            player_two_id: true,
            game_mode: true,
            player_one_score: true,
            player_two_score: true,
            started_at: true,
            finished_at: true,
          },
          orderBy: {
            started_at: 'desc',
          },
          take: 10,
        },
      },
    });
    if (!user) return null;
    const matchHistory = [
      ...user.matches_as_player_one,
      ...user.matches_as_player_two,
    ].sort((a, b) => (a.started_at > b.started_at ? -1 : 1));

    const last10Matches = matchHistory.slice(0, 10);
    const friends = await this.getFriends(login);
    return {
      login: user.login,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      exp: user.exp,
      level: user.level,
      matchHistory: last10Matches,
      friends: friends,
    };
  }

  async searchProfiles(searchString: string) {
    return await this.prisma.user.findMany({
      where: {
        OR: [
          {
            first_name: {
              startsWith: searchString,
              mode: 'insensitive',
            },
          },
          {
            last_name: {
              startsWith: searchString,
              mode: 'insensitive',
            },
          },
          {
            login: {
              startsWith: searchString,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        login: true,
        first_name: true,
        last_name: true,
        avatar_url: true,
      },
      orderBy: {
        login: 'asc',
      },
      take: 5,
    });
  }

  async getProfileMatches(login: string, take: string, skip: string) {
    const takeint = parseInt(take);
    const skipint = parseInt(skip);
    const user = await this.prisma.user.findUnique({
      where: { login },
      select: {
        matches_as_player_one: {
          select: {
            id: true,
            player_one_id: true,
            player_two_id: true,
            game_mode: true,
            player_one_score: true,
            player_two_score: true,
            status: true,
            started_at: true,
            finished_at: true,
          },
          orderBy: {
            started_at: 'desc',
          },
          take: takeint,
          skip: skipint,
        },
        matches_as_player_two: {
          select: {
            id: true,
            player_one_id: true,
            player_two_id: true,
            game_mode: true,
            player_one_score: true,
            player_two_score: true,
            status: true,
            started_at: true,
            finished_at: true,
          },
          orderBy: {
            started_at: 'desc',
          },
          take: takeint,
          skip: skipint,
        },
      },
    });
    if (!user) return null;
    const matchHistory = [
      ...user.matches_as_player_one,
      ...user.matches_as_player_two,
    ]
      .sort((a, b) => (a.started_at > b.started_at ? -1 : 1))
      .slice(skipint, skipint + takeint);
    return matchHistory;
  }
  async getProfileSettings(userId: number) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        login: true,
        first_name: true,
        last_name: true,
        avatar_url: true,
        two_factor_auth_enabled: true,
      },
    });
  }

  async getAllProfiles(take: string, skip: string) {
    const takeint = parseInt(take);
    const skipint = parseInt(skip);
    return await this.prisma.user.findMany({
      select: {
        id: true,
        login: true,
        first_name: true,
        last_name: true,
        avatar_url: true,
      },
      orderBy: {
        login: 'asc',
      },
      take: takeint,
      skip: skipint,
    });
  }

  async updateProfileSettings(userId: number, data: any) {
    return await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateProfileAvatar(userId: number, avatar_url: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { avatar_url },
    });
  }
  async updateProfileLogin(userId: number, login: string) {
    // check if login is already taken
    const user = await this.prisma.user.findUnique({
      where: { login },
    });
    if (user) {
      throw new BadRequestException('Login is already taken');
    }
    return await this.prisma.user.update({
      where: { id: userId },
      data: { login },
    });
  }
}