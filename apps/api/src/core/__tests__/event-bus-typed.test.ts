import { EventBus } from '../event-bus';

describe('EventBus (Type-Safe)', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('emitTyped and onTyped', () => {
    it('should emit and receive typed events', (done) => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      };

      eventBus.onTyped('auth.registered', (data) => {
        expect(data).toEqual(payload);
        done();
      });

      eventBus.emitTyped('auth.registered', payload);
    });

    it('should handle multiple typed listeners', () => {
      let count = 0;
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      eventBus.onTyped('auth.login', () => {
        count++;
      });

      eventBus.onTyped('auth.login', () => {
        count++;
      });

      eventBus.emitTyped('auth.login', payload);

      expect(count).toBe(2);
    });

    it('should handle async typed event handlers', async () => {
      const payload = {
        post: {
          id: 'post-123',
          title: 'Test',
          slug: 'test',
          status: 'PUBLISHED',
          author: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
        },
        userId: 'user-123',
      };

      let received = false;

      eventBus.onTyped('post.created', async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        received = true;
        expect(data).toEqual(payload);
      });

      eventBus.emitTyped('post.created', payload);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toBe(true);
    });

    it('should handle errors in typed event handlers', (done) => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      eventBus.onTyped('auth.logout', () => {
        throw new Error('Handler error');
      });

      // Should not throw
      expect(() => {
        eventBus.emitTyped('auth.logout', payload);
      }).not.toThrow();

      // Give time for async error handling
      setTimeout(done, 10);
    });
  });

  describe('backward compatibility', () => {
    it('should still support generic emit and on', (done) => {
      const payload = { message: 'Hello' };

      eventBus.on('custom.event', (data) => {
        expect(data).toEqual(payload);
        done();
      });

      eventBus.emit('custom.event', payload);
    });
  });

  describe('mixed typed and generic events', () => {
    it('should handle both typed and generic events', () => {
      let typedCount = 0;
      let genericCount = 0;

      // Typed event
      eventBus.onTyped('auth.refresh', () => {
        typedCount++;
      });

      // Generic event
      eventBus.on('custom.event', () => {
        genericCount++;
      });

      eventBus.emitTyped('auth.refresh', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      eventBus.emit('custom.event', { test: true });

      expect(typedCount).toBe(1);
      expect(genericCount).toBe(1);
    });
  });

  describe('event unsubscription', () => {
    it('should unsubscribe from typed events using off', () => {
      let count = 0;

      const handler = () => {
        count++;
      };

      eventBus.on('test.event', handler);
      eventBus.emit('test.event', {});
      expect(count).toBe(1);

      eventBus.off('test.event', handler);
      eventBus.emit('test.event', {});
      expect(count).toBe(1); // Should not increment
    });
  });

  describe('once', () => {
    it('should only fire typed handler once', () => {
      let count = 0;
      const payload = { userId: 'user-123', email: 'test@example.com' };

      eventBus.once('auth.logout', () => {
        count++;
      });

      eventBus.emit('auth.logout', payload);
      eventBus.emit('auth.logout', payload);
      eventBus.emit('auth.logout', payload);

      expect(count).toBe(1);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific typed event', () => {
      let count1 = 0;
      let count2 = 0;

      eventBus.onTyped('auth.registered', () => count1++);
      eventBus.onTyped('auth.registered', () => count1++);
      eventBus.onTyped('auth.login', () => count2++);

      eventBus.emitTyped('auth.registered', {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      });
      eventBus.emitTyped('auth.login', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(count1).toBe(2);
      expect(count2).toBe(1);

      eventBus.removeAllListeners('auth.registered');
      count1 = 0;
      count2 = 0;

      eventBus.emitTyped('auth.registered', {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
      });
      eventBus.emitTyped('auth.login', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(count1).toBe(0);
      expect(count2).toBe(1);
    });

    it('should remove all listeners for all events', () => {
      let count1 = 0;
      let count2 = 0;

      eventBus.on('event1', () => count1++);
      eventBus.on('event2', () => count2++);

      eventBus.emit('event1', {});
      eventBus.emit('event2', {});
      expect(count1).toBe(1);
      expect(count2).toBe(1);

      eventBus.removeAllListeners();
      count1 = 0;
      count2 = 0;

      eventBus.emit('event1', {});
      eventBus.emit('event2', {});
      expect(count1).toBe(0);
      expect(count2).toBe(0);
    });
  });
});
