import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from '../types/request';

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    if (!user) {
      throw new Error('User not found in request. Is MockAuthGuard applied?');
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
