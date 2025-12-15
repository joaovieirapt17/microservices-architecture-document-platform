import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    // Check if subdomain already exists
    const existingSubdomain = await this.prisma.organization.findFirst({
      where: { subdomain: createOrganizationDto.subdomain },
    });

    if (existingSubdomain) {
      throw new ConflictException('Subdomain is already in use');
    }

    // Check if email already exists
    const existingEmail = await this.prisma.organization.findFirst({
      where: { email: createOrganizationDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email is already in use');
    }

    // Create the organization
    const organization = await this.prisma.organization.create({
      data: createOrganizationDto,
    });

    return organization;
  }

  async findAll() {
    return await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        memberships: true,
        invites: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    // Check if organization exists
    await this.findOne(id);

    // If updating subdomain, check if it already exists
    if (updateOrganizationDto.subdomain) {
      const existingSubdomain = await this.prisma.organization.findFirst({
        where: {
          subdomain: updateOrganizationDto.subdomain,
          NOT: { id },
        },
      });

      if (existingSubdomain) {
        throw new ConflictException('Subdomain is already in use');
      }
    }

    // If updating email, check if it already exists
    if (updateOrganizationDto.email) {
      const existingEmail = await this.prisma.organization.findFirst({
        where: {
          email: updateOrganizationDto.email,
          NOT: { id },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email is already in use');
      }
    }

    return await this.prisma.organization.update({
      where: { id },
      data: updateOrganizationDto,
    });
  }

  async remove(id: string) {
    // Check if organization exists
    await this.findOne(id);

    await this.prisma.organization.delete({
      where: { id },
    });

    return { message: 'Organization deleted successfully' };
  }
}
