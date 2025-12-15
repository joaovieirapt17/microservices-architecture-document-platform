import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { UpdateMembershipDto } from './dto/update-membership.dto';

@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all memberships' })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filter by organization UUID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user UUID',
  })
  @ApiResponse({ status: 200, description: 'Returns all memberships' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.membershipsService.findAll(organizationId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a membership by ID' })
  @ApiParam({ name: 'id', description: 'Membership UUID', type: String })
  @ApiResponse({ status: 200, description: 'Returns the membership' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  findOne(@Param('id') id: string) {
    return this.membershipsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a membership role' })
  @ApiParam({ name: 'id', description: 'Membership UUID', type: String })
  @ApiResponse({ status: 200, description: 'Membership updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'User does not have permission' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  update(
    @Param('id') id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.membershipsService.update(id, updateMembershipDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a membership' })
  @ApiParam({ name: 'id', description: 'Membership UUID', type: String })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'UUID of the user performing the deletion',
  })
  @ApiResponse({ status: 204, description: 'Membership deleted successfully' })
  @ApiResponse({ status: 403, description: 'User does not have permission' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.membershipsService.remove(id, userId);
  }
}
