import { swaggerSpec } from '../swagger';

describe('Swagger Configuration', () => {
  // Cast to any to access swaggerJsdoc properties
  const spec = swaggerSpec as any;

  describe('swaggerSpec', () => {
    it('should have valid OpenAPI version', () => {
      expect(spec.openapi).toBe('3.0.0');
    });

    it('should have API info', () => {
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.info.description).toBeDefined();
    });

    it('should have servers configuration', () => {
      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
      expect(spec.servers.length).toBeGreaterThan(0);
    });

    it('should have components defined', () => {
      expect(spec.components).toBeDefined();
    });

    it('should have security schemes', () => {
      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    });

    it('should have schemas', () => {
      expect(spec.components.schemas).toBeDefined();
    });

    it('should have tags', () => {
      expect(spec.tags).toBeDefined();
      expect(Array.isArray(spec.tags)).toBe(true);
    });

    it('should have paths', () => {
      expect(spec.paths).toBeDefined();
      expect(typeof spec.paths).toBe('object');
    });

    it('should be valid JSON serializable', () => {
      expect(() => JSON.stringify(swaggerSpec)).not.toThrow();
    });

    it('should have bearerAuth security scheme', () => {
      const bearerAuth = spec.components.securitySchemes.bearerAuth;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
      expect(bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should have cookieAuth security scheme', () => {
      const cookieAuth = spec.components.securitySchemes.cookieAuth;
      expect(cookieAuth.type).toBe('apiKey');
      expect(cookieAuth.in).toBe('cookie');
      expect(cookieAuth.name).toBe('refreshToken');
    });

    it('should have Error schema', () => {
      const schemas = spec.components.schemas;
      expect(schemas.Error).toBeDefined();
    });

    it('should have User schema', () => {
      const schemas = spec.components.schemas;
      expect(schemas.User).toBeDefined();
    });

    it('should have AuthResponse schema', () => {
      const schemas = spec.components.schemas;
      expect(schemas.AuthResponse).toBeDefined();
    });

    it('should have proper server URL', () => {
      const server = spec.servers[0];
      expect(server.url).toBeDefined();
      expect(server.description).toBeDefined();
    });

    it('should have version from environment or default', () => {
      expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have contact information', () => {
      expect(spec.info.contact).toBeDefined();
      expect(spec.info.contact.name).toBe('NexusCore Team');
    });

    it('should have license information', () => {
      expect(spec.info.license).toBeDefined();
      expect(spec.info.license.name).toBe('MIT');
    });
  });
});
