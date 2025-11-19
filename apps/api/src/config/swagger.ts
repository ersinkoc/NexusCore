import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NexusCore API',
      version: '1.0.0',
      description: 'Production-ready, modular, event-driven REST API',
      contact: {
        name: 'NexusCore Team',
        url: 'https://github.com/ersinkoc/NexusCore',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token stored in HTTP-only cookie',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            role: {
              type: 'string',
              enum: ['USER', 'MODERATOR', 'ADMIN'],
              description: 'User role',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (min 8 characters)',
            },
            firstName: {
              type: 'string',
              minLength: 1,
              description: 'First name',
            },
            lastName: {
              type: 'string',
              minLength: 1,
              description: 'Last name',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp',
            },
            uptime: {
              type: 'number',
              description: 'System uptime in seconds',
            },
            version: {
              type: 'string',
              description: 'API version',
            },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['up', 'down'],
                    },
                    responseTime: {
                      type: 'number',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['up', 'down'],
                    },
                    responseTime: {
                      type: 'number',
                    },
                    message: {
                      type: 'string',
                    },
                  },
                },
                memory: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['up', 'down'],
                    },
                    message: {
                      type: 'string',
                    },
                    details: {
                      type: 'object',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management (requires authentication)',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
