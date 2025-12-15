import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export class CreateInviteDto {
  @ApiPropertyOptional({
    description:
      'UUID of the user creating the invite (required if organization has members)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId?: string;

  @ApiProperty({
    description: 'UUID of the organization to invite the user to',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'Organization ID is required' })
  @IsUUID('4', { message: 'Organization ID must be a valid UUID' })
  organizationId: string;

  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, {
    message: 'Invalid role. Accepted values: ADMIN, USER',
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Number of days until the invitation expires (default: 7)',
    example: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt({ message: 'Expires in days must be an integer' })
  @Min(1, { message: 'Expires in days must be at least 1 day' })
  @Max(30, { message: 'Expires in days must be at most 30 days' })
  expiresInDays?: number;
}
