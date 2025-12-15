import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum StatusType {
  active = 'active',
  inactive = 'inactive',
  pending = 'pending',
  suspended = 'suspended',
}

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Acme Corporation',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Email address of the organization',
    example: 'contact@acme.com',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email' })
  @Length(1, 100, { message: 'Email must be at most 100 characters' })
  email: string;

  @ApiProperty({
    description:
      'Unique subdomain for the organization (lowercase letters, numbers, and hyphens only)',
    example: 'acme-corp',
    minLength: 1,
    maxLength: 50,
    pattern: '^[a-z0-9-]+$',
  })
  @IsNotEmpty({ message: 'Subdomain is required' })
  @IsString({ message: 'Subdomain must be a string' })
  @Length(1, 50, { message: 'Subdomain must be between 1 and 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Subdomain can only contain lowercase letters, numbers and hyphens',
  })
  subdomain: string;

  @ApiProperty({
    description: 'Business sector of the organization',
    example: 'Technology',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'Sector is required' })
  @IsString({ message: 'Sector must be a string' })
  @Length(1, 50, { message: 'Sector must be between 1 and 50 characters' })
  sector: string;

  @ApiProperty({
    description: 'City where the organization is located',
    example: 'Lisbon',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'City is required' })
  @IsString({ message: 'City must be a string' })
  @Length(1, 50, { message: 'City must be between 1 and 50 characters' })
  city: string;

  @ApiProperty({
    description: 'Street address of the organization',
    example: 'Rua das Flores, 123',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Address is required' })
  @IsString({ message: 'Address must be a string' })
  @Length(1, 100, { message: 'Address must be between 1 and 100 characters' })
  address: string;

  @ApiProperty({
    description: 'Contact phone number (minimum 9 digits)',
    example: 912345678,
    minimum: 100000000,
  })
  @IsNotEmpty({ message: 'Contact is required' })
  @IsInt({ message: 'Contact must be an integer' })
  @Min(100000000, { message: 'Contact must have at least 9 digits' })
  contact: number;

  @ApiProperty({
    description: 'Postal code in format 0000-000',
    example: '1000-001',
    minLength: 1,
    maxLength: 15,
    pattern: '^\\d{4}-\\d{3}$',
  })
  @IsNotEmpty({ message: 'Zip code is required' })
  @IsString({ message: 'Zip code must be a string' })
  @Length(1, 15, {
    message: 'Zip code must be between 1 and 15 characters',
  })
  @Matches(/^\d{4}-\d{3}$/, {
    message: 'Zip code must be in the format 0000-000',
  })
  zipCode: string;

  @ApiProperty({
    description: 'Current status of the organization',
    enum: StatusType,
    example: StatusType.active,
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(StatusType, {
    message:
      'Invalid status. Accepted values: active, inactive, pending, suspended',
  })
  status: StatusType;
}
