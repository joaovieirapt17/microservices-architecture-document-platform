import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../types/request';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');

      const payload = jwt.verify(token, secret) as JwtPayload;

      const user: AuthenticatedUser = {
        userId: payload.id,
        organizationId: payload.organizationId,
        role: payload.role as 'ADMIN' | 'USER',
      };

      request.user = user;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token validation failed: ${message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
