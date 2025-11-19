import request from 'supertest';
import express, { Express } from 'express';
import docsRoutes from '../docs.routes';

// Mock swagger config
jest.mock('../../../config/swagger', () => ({
  swaggerSpec: {
    openapi: '3.0.0',
    info: {
      title: 'NexusCore API',
      version: '1.0.0',
    },
    paths: {},
  },
}));

describe('Docs Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use('/docs', docsRoutes);
  });

  describe('GET /docs/json', () => {
    it('should return OpenAPI spec as JSON', async () => {
      const response = await request(app).get('/docs/json').expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toBe('NexusCore API');
    });

    it('should have correct content type header', async () => {
      const response = await request(app).get('/docs/json');

      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    it('should return valid OpenAPI 3.0 structure', async () => {
      const response = await request(app).get('/docs/json').expect(200);

      expect(response.body).toMatchObject({
        openapi: '3.0.0',
        info: expect.objectContaining({
          title: expect.any(String),
          version: expect.any(String),
        }),
      });
    });
  });

  describe('GET /docs', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(app).get('/docs');

      // Swagger UI should respond (might be 200 or 301/302 for redirect)
      expect([200, 301, 302]).toContain(response.status);
    });

    it('should have swagger-ui middleware configured', async () => {
      const response = await request(app).get('/docs');

      // Should not return 404
      expect(response.status).not.toBe(404);
    });
  });
});
