import { describe, it, expect } from 'vitest';
import {
  staticFetchConfig,
  liveFetchConfig,
  pollingFetchConfig,
  manualFetchConfig,
} from './swr-config';

describe('SWR Config Presets', () => {
  describe('staticFetchConfig', () => {
    it('should disable revalidation on focus', () => {
      expect(staticFetchConfig.revalidateOnFocus).toBe(false);
    });

    it('should have 30 second deduping interval', () => {
      expect(staticFetchConfig.dedupingInterval).toBe(30000);
    });
  });

  describe('liveFetchConfig', () => {
    it('should enable revalidation on focus', () => {
      expect(liveFetchConfig.revalidateOnFocus).toBe(true);
    });

    it('should have no deduping interval', () => {
      expect(liveFetchConfig.dedupingInterval).toBe(0);
    });
  });

  describe('pollingFetchConfig', () => {
    it('should enable revalidation on focus', () => {
      expect(pollingFetchConfig.revalidateOnFocus).toBe(true);
    });

    it('should have 5 second refresh interval', () => {
      expect(pollingFetchConfig.refreshInterval).toBe(5000);
    });
  });

  describe('manualFetchConfig', () => {
    it('should disable revalidation on focus', () => {
      expect(manualFetchConfig.revalidateOnFocus).toBe(false);
    });

    it('should disable revalidation on reconnect', () => {
      expect(manualFetchConfig.revalidateOnReconnect).toBe(false);
    });

    it('should revalidate if stale on mount', () => {
      expect(manualFetchConfig.revalidateIfStale).toBe(true);
    });
  });
});
