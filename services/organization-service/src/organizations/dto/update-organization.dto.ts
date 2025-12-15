import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

enum StatusType {
  active = 'active',
  inactive = 'inactive',
  pending = 'pending',
  suspended = 'suspended',
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email' })
  @Length(1, 100, { message: 'Email must be at most 100 characters' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Subdomain must be a string' })
  @Length(1, 50, { message: 'Subdomain must be between 1 and 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Subdomain can only contain lowercase letters, numbers and hyphens',
  })
  subdomain?: string;

  @IsOptional()
  @IsString({ message: 'Sector must be a string' })
  @Length(1, 50, { message: 'Sector must be between 1 and 50 characters' })
  sector?: string;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @Length(1, 50, { message: 'City must be between 1 and 50 characters' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @Length(1, 100, { message: 'Address must be between 1 and 100 characters' })
  address?: string;

  @IsOptional()
  @IsInt({ message: 'Contact must be an integer' })
  @Min(100000000, { message: 'Contact must have at least 9 digits' })
  contact?: number;

  @IsOptional()
  @IsString({ message: 'Zip code must be a string' })
  @Length(1, 15, {
    message: 'Zip code must be between 1 and 15 characters',
  })
  @Matches(/^\d{4}-\d{3}$/, {
    message: 'Zip code must be in the format 0000-000',
  })
  zipCode?: string;

  @IsOptional()
  @IsEnum(StatusType, {
    message:
      'Invalid status. Accepted values: active, inactive, pending, suspended',
  })
  status?: StatusType;
}
