import { EventBus } from '../event-bus';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('emit and on', () => {
    it('should emit and receive events', (done) => {
      const eventName = 'test.event';
      const payload = { message: 'Hello World' };

      eventBus.on(eventName, (data: any) => {
        expect(data).toEqual(payload);
        done();
      });

      eventBus.emit(eventName, payload);
    });

    it('should handle multiple listeners for same event', () => {
      const eventName = 'test.event';
      const payload = { count: 0 };
      let count = 0;

      eventBus.on(eventName, () => {
        count++;
      });

      eventBus.on(eventName, () => {
        count++;
      });

      eventBus.emit(eventName, payload);

      expect(count).toBe(2);
    });

    it('should handle async event handlers', async () => {
      const eventName = 'async.event';
      const payload = { data: 'test' };
      let received = false;

      eventBus.on(eventName, async (data: any) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        received = true;
        expect(data).toEqual(payload);
      });

      eventBus.emit(eventName, payload);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toBe(true);
    });
  });

  describe('once', () => {
    it('should only fire handler once', () => {
      const eventName = 'once.event';
      const payload = { value: 1 };
      let count = 0;

      eventBus.once(eventName, () => {
        count++;
      });

      eventBus.emit(eventName, payload);
      eventBus.emit(eventName, payload);
      eventBus.emit(eventName, payload);

      expect(count).toBe(1);
    });

    it('should handle errors in once handler gracefully', async () => {
      const eventName = 'once.error.event';
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      eventBus.once(eventName, errorHandler);

      // Emit event - error should be caught and logged
      await eventBus.emit(eventName, { test: 'data' });

      expect(errorHandler).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('one-time'),
        expect.any(Error)
      );
    });
  });

  describe('off', () => {
    it('should remove specific event handler', () => {
      const eventName = 'remove.event';
      let count = 0;

      const handler = () => {
        count++;
      };

      eventBus.on(eventName, handler);
      eventBus.emit(eventName, {});
      expect(count).toBe(1);

      eventBus.off(eventName, handler);
      eventBus.emit(eventName, {});
      expect(count).toBe(1); // Should not increment
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      const eventName = 'clear.event';
      let count = 0;

      eventBus.on(eventName, () => {
        count++;
      });
      eventBus.on(eventName, () => {
        count++;
      });

      eventBus.emit(eventName, {});
      expect(count).toBe(2);

      eventBus.removeAllListeners(eventName);
      count = 0;

      eventBus.emit(eventName, {});
      expect(count).toBe(0);
    });

    it('should remove all listeners for all events', () => {
      let count1 = 0;
      let count2 = 0;

      eventBus.on('event1', () => {
        count1++;
      });
      eventBus.on('event2', () => {
        count2++;
      });

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

  describe('error handling', () => {
    it('should catch errors in event handlers', (done) => {
      const eventName = 'error.event';

      eventBus.on(eventName, () => {
        throw new Error('Handler error');
      });

      // Should not throw
      expect(() => {
        eventBus.emit(eventName, {});
      }).not.toThrow();

      // Give time for async error handling
      setTimeout(done, 10);
    });
  });
});
