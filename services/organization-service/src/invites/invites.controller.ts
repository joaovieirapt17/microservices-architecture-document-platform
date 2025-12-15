import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/update-invite.dto';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new invitation' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({
    status: 409,
    description: 'Active invite already exists for this email',
  })
  create(@Body() createInviteDto: CreateInviteDto) {
    return this.invitesService.create(createInviteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invitations' })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Filter by organization UUID',
  })
  @ApiResponse({ status: 200, description: 'Returns all invitations' })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.invitesService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invitation by ID' })
  @ApiParam({ name: 'id', description: 'Invitation UUID', type: String })
  @ApiResponse({ status: 200, description: 'Returns the invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  findOne(@Param('id') id: string) {
    return this.invitesService.findOne(id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiParam({ name: 'id', description: 'Invitation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted and membership created',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or expired invitation',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  acceptInvite(
    @Param('id') id: string,
    @Body() acceptInviteDto: AcceptInviteDto,
  ) {
    return this.invitesService.acceptInvite(id, acceptInviteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invitation' })
  @ApiParam({ name: 'id', description: 'Invitation UUID', type: String })
  @ApiResponse({ status: 204, description: 'Invitation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  remove(@Param('id') id: string) {
    return this.invitesService.remove(id);
  }
}
