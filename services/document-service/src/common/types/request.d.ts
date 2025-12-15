export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  role: 'ADMIN' | 'USER';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
