import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId?: string, userId?: string) {
    const where: any = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (userId) {
      where.userId = userId;
    }

    return await this.prisma.membership.findMany({
      where,
      include: {
        organization: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async update(id: string, updateMembershipDto: UpdateMembershipDto) {
    // Check if membership exists
    const targetMembership = await this.findOne(id);

    // Check if user has permission (admin) to update memberships
    const userMembership = await this.prisma.membership.findFirst({
      where: {
        organizationId: targetMembership.organizationId,
        userId: updateMembershipDto.userId,
      },
    });

    if (!userMembership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (userMembership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update memberships');
    }

    return await this.prisma.membership.update({
      where: { id },
      data: { role: updateMembershipDto.role },
      include: {
        organization: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Check if membership exists
    const targetMembership = await this.findOne(id);

    // Check if user has permission (admin) to delete memberships
    const userMembership = await this.prisma.membership.findFirst({
      where: {
        organizationId: targetMembership.organizationId,
        userId: userId,
      },
    });

    if (!userMembership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (userMembership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete memberships');
    }

    await this.prisma.membership.delete({
      where: { id },
    });

    return { message: 'Membership deleted successfully' };
  }
}
