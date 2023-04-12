import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaService) {}

  async getFriends(login: string) {
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
                avatar_url: true,
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
                avatar_url: true,
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new BadRequestException(`User with login "${login}" not found`);
    }
    const ret = [
      ...user.sent_requests.map((friendship: any) => friendship.addressee),
      ...user.received_requests.map((friendship: any) => friendship.requester),
    ];
    return ret;
  }

  async getFriendRequests(login: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        addressee: {
          login: login,
        },
        status: 'PENDING',
      },
      select: {
        requester: {
          select: {
            id: true,
            login: true,
            avatar_url: true,
          },
        },
      },
    });
    return friendships.map((friendship: any) => friendship.requester);
  }

  async getSentFriendRequests(login: string) {
    const fiendships = await this.prisma.friendship.findMany({
      where: {
        requester: {
          login: login,
        },
        status: 'PENDING',
      },
      select: {
        addressee: {
          select: {
            id: true,
            login: true,
            avatar_url: true,
          },
        },
      },
    });
    return fiendships.map((friendship: any) => friendship.addressee);
  }

  async sendFriendRequest(login: string, addressee: string) {
    if (login === addressee) {
      throw new BadRequestException(
        `You can't send friend request to yourself`,
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { login },
    });
    const addresseeUser = await this.prisma.user.findUnique({
      where: { login: addressee },
    });
    if (!user) {
      throw new BadRequestException(`User with login "${login}" not found`);
    }
    if (!addresseeUser) {
      throw new BadRequestException(`User with login "${addressee}" not found`);
    }
    const friendship = await this.prisma.friendship.findMany({
      where: {
        OR: [
          {
            requester_id: user.id,
            addressee_id: addresseeUser.id,
          },
          {
            requester_id: addresseeUser.id,
            addressee_id: user.id,
          },
        ],
      },
    });
    if (friendship && friendship.length > 0) {
      throw new BadRequestException(`Friendship already exists`);
    }
    try {
      await this.prisma.friendship.create({
        data: {
          requester_id: user.id,
          addressee_id: addresseeUser.id,
          status: 'PENDING',
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException(`Something went wrong`);
    }
    return { success: true };
  }

  async acceptFriendRequest(addressee_id: number, login: string) {
    // get friend id
    const requester = await this.prisma.user.findUnique({
      where: {
        login,
      },
    });
    if (!requester) {
      throw new BadRequestException(`User with id "${login}" not found`);
    }
    const friendship = await this.prisma.friendship.findUnique({
      where: {
        friendship_id: {
          requester_id: requester.id,
          addressee_id,
        },
      },
    });
    if (!friendship) {
      throw new BadRequestException(`Friendship not found`);
    } else if (friendship.status === 'ACCEPTED') {
      throw new BadRequestException(`Friendship already accepted`);
    }
    try {
      await this.prisma.friendship.update({
        where: {
          friendship_id: {
            requester_id: requester.id,
            addressee_id,
          },
        },
        data: {
          status: 'ACCEPTED',
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException(`Something went wrong`);
    }
    return { success: true };
  }

  async deleteFriendRequest(addressee_id: number, login: string) {
    const requester = await this.prisma.user.findUnique({
      where: {
        login,
      },
    });
    if (!requester) {
      throw new BadRequestException(`User with login "${login}" not found`);
    }

    const friendship = await this.prisma.friendship.findUnique({
      where: {
        friendship_id: {
          requester_id: requester.id,
          addressee_id,
        },
      },
    });
    if (!friendship) {
      throw new BadRequestException(`Friendship not found`);
    }
    try {
      await this.prisma.friendship.delete({
        where: {
          friendship_id: {
            requester_id: requester.id,
            addressee_id,
          },
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException(`Something went wrong`);
    }
    return { success: true };
  }

  async unfriend(addressee_id: number, login: string) {
    const requester = await this.prisma.user.findUnique({
      where: {
        login,
      },
    });
    if (!requester) {
      throw new BadRequestException(`User with login "${login}" not found`);
    }
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requester_id: requester.id,
            addressee_id: addressee_id,
          },
          {
            requester_id: addressee_id,
            addressee_id: requester.id,
          },
        ],
      },
    });
    if (!friendship) {
      throw new BadRequestException(`Friendship not found`);
    }
    try {
      await this.prisma.friendship.delete({
        where: {
          friendship_id: {
            requester_id: requester.id,
            addressee_id,
          },
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException(`Something went wrong`);
    }
    return { suceess: true };
  }

  async blockFriend(requester_id: number, login: string) {
    const toblock = await this.prisma.user.findUnique({
      where: {
        login: login,
      },
    });
    if (!toblock) {
      throw new BadRequestException(`User with login "${login}" not found`);
    }
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requester_id: requester_id,
            addressee_id: toblock.id,
          },
          {
            requester_id: toblock.id,
            addressee_id: requester_id,
          },
        ],
      },
    });
    if (!friendship) {
      throw new BadRequestException(`Friendship not found`);
    } else if (friendship.status === 'BLOCKED') {
      throw new BadRequestException(`Friendship already blocked`);
    }
    try {
      await this.prisma.friendship.update({
        where: {
          friendship_id: {
            requester_id: friendship.requester_id,
            addressee_id: friendship.addressee_id,
          },
        },
        data: {
          requester_id: requester_id,
          addressee_id: toblock.id,
          status: 'BLOCKED',
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException(`Something went wrong`);
    }
    return { suceess: true };
  }

  async unblockFriend(requester_id: number, login: string) {
    const toblock = await this.prisma.user.findUnique({
      where: {
        login: login,
      },
    });
    if (!toblock) {
      throw new BadRequestException(`User with login "${login}" not found`);
    }
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requester_id: requester_id,
            addressee_id: toblock.id,
          },
          {
            requester_id: toblock.id,
            addressee_id: requester_id,
          },
        ],
      },
    });
    if (!friendship) {
      throw new BadRequestException(`Friendship not found`);
    } else if (friendship.status !== 'BLOCKED') {
      throw new BadRequestException(`Friendship not blocked`);
    }
    try {
      await this.prisma.friendship.update({
        where: {
          friendship_id: {
            requester_id: friendship.requester_id,
            addressee_id: friendship.addressee_id,
          },
        },
        data: {
          requester_id: requester_id,
          addressee_id: toblock.id,
          status: 'ACCEPTED',
        },
      });
    } catch (e) {
      console.log(e);
      throw new BadRequestException(`Something went wrong`);
    }
    return { suceess: true };
  }
}
