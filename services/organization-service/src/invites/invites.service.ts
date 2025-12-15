import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/update-invite.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async create(createInviteDto: CreateInviteDto) {
    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: createInviteDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if organization has any members
    const memberCount = await this.prisma.membership.count({
      where: { organizationId: createInviteDto.organizationId },
    });

    // If organization has members, check if user has permission (owner or admin)
    if (memberCount > 0) {
      const membership = await this.prisma.membership.findFirst({
        where: {
          organizationId: createInviteDto.organizationId,
          userId: createInviteDto.userId,
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'User is not a member of this organization',
        );
      }

      if (membership.role !== 'ADMIN') {
        throw new ForbiddenException('Only admins can create invites');
      }
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await this.prisma.invite.findFirst({
      where: {
        organizationId: createInviteDto.organizationId,
        email: createInviteDto.email,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (existingInvite) {
      throw new ConflictException(
        'An active invite already exists for this email',
      );
    }

    // Generate token and expiration (default 7 days, or use provided value)
    const token = randomBytes(32).toString('hex');
    const expiresInDays = createInviteDto.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await this.prisma.invite.create({
      data: {
        organizationId: createInviteDto.organizationId,
        email: createInviteDto.email,
        role: createInviteDto.role,
        token,
        expiresAt,
      },
      include: {
        organization: true,
      },
    });

    // ========================================
    // ASYNC EVENT: Emit invite.created to RabbitMQ
    // ========================================
    try {
      const eventEmitted = await this.rabbitMQService.emitInviteCreated(
        {
          id: invite.id,
          email: invite.email,
          organizationId: invite.organizationId,
          token: invite.token,
          role: invite.role,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
        invite.organization.name,
        'Admin',
      );

      if (eventEmitted) {
        this.logger.log(
          `📧 invite.created event emitted for invite ${invite.id} to ${invite.email}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Failed to emit invite.created event for invite ${invite.id}. Email notification may be delayed.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error emitting invite.created event: ${error.message}`,
        error.stack,
      );
    }

    return invite;
  }

  async findAll(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};

    return await this.prisma.invite.findMany({
      where,
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return invite;
  }

  async acceptInvite(id: string, acceptInviteDto: AcceptInviteDto) {
    const invite = await this.findOne(id);

    // Verify token
    if (invite.token !== acceptInviteDto.token) {
      throw new BadRequestException('Invalid token');
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite has expired');
    }

    // Check if user is already a member of this organization
    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        organizationId: invite.organizationId,
        userId: acceptInviteDto.userId,
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    // Create membership
    const membership = await this.prisma.membership.create({
      data: {
        organizationId: invite.organizationId,
        userId: acceptInviteDto.userId,
        role: invite.role,
      },
      include: {
        organization: true,
      },
    });

    // Delete the invite
    await this.prisma.invite.delete({
      where: { id },
    });

    return membership;
  }

  async remove(id: string) {
    // Check if invite exists
    await this.findOne(id);

    await this.prisma.invite.delete({
      where: { id },
    });

    return { message: 'Invite deleted successfully' };
  }
}
