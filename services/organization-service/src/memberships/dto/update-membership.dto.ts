import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export class UpdateMembershipDto {
  @ApiProperty({
    description: 'UUID of the user performing the update',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({
    description: 'New role to assign to the member',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, {
    message: 'Invalid role. Accepted values: ADMIN, USER',
  })
  role: UserRole;
}
