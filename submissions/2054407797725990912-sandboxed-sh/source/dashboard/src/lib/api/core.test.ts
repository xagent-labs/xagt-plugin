import { describe, it, expect } from 'vitest';
import { isNetworkError, LibraryUnavailableError } from './core';

describe('API Core', () => {
  describe('isNetworkError', () => {
    it('should return false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError({ message: 'object error' })).toBe(false);
      expect(isNetworkError(42)).toBe(false);
    });

    it('should return true for "Failed to fetch" errors', () => {
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('FAILED TO FETCH'))).toBe(true);
    });

    it('should return true for "NetworkError" errors', () => {
      expect(isNetworkError(new Error('NetworkError when attempting to fetch'))).toBe(true);
      expect(isNetworkError(new Error('networkerror'))).toBe(true);
    });

    it('should return true for "Load failed" errors', () => {
      expect(isNetworkError(new Error('Load failed'))).toBe(true);
      expect(isNetworkError(new Error('load failed'))).toBe(true);
    });

    it('should return true for "Network request failed" errors', () => {
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    });

    it('should return true for "offline" errors', () => {
      expect(isNetworkError(new Error('The network is offline'))).toBe(true);
      expect(isNetworkError(new Error('offline'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isNetworkError(new Error('Some other error'))).toBe(false);
      expect(isNetworkError(new Error('401 Unauthorized'))).toBe(false);
    });
  });

  describe('LibraryUnavailableError', () => {
    it('should be an instance of Error', () => {
      const error = new LibraryUnavailableError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new LibraryUnavailableError('test message');
      expect(error.name).toBe('LibraryUnavailableError');
    });

    it('should have status 503', () => {
      const error = new LibraryUnavailableError('test message');
      expect(error.status).toBe(503);
    });

    it('should preserve error message', () => {
      const error = new LibraryUnavailableError('Library not initialized');
      expect(error.message).toBe('Library not initialized');
    });
  });
});
