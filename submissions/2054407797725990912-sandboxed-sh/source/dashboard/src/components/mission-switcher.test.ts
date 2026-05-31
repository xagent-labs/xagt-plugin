import { describe, expect, it } from 'vitest';

import type { Mission } from '@/lib/api';
import {
  getMissionSearchScore,
  getMissionCardDescription,
  getMissionCardTitle,
  getMissionQuickActions,
  getRunningMissionQuickActions,
  getRunningMissionSearchText,
  getMissionSearchText,
  missionMatchesSearchQuery,
  missionSearchRelevanceScore,
  runningMissionMatchesSearchQuery,
} from './mission-switcher';

function buildMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'mission-1',
    status: 'active',
    title: null,
    history: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('mission switcher search helpers', () => {
  it('hides short description when it is not meaningfully different from title', () => {
    const mission = buildMission({
      title: 'Fix login bug!',
      short_description: 'fix login bug',
    });

    const title = getMissionCardTitle(mission);
    const description = getMissionCardDescription(mission, title);

    expect(title).toBeNull();
    expect(description).toBeNull();
  });

  it('preserves Unicode text for metadata comparison and search', () => {
    const mission = buildMission({
      title: '修复登录错误',
      short_description: '调查 OAuth 回调失败',
    });

    const title = getMissionCardTitle(mission);
    const description = getMissionCardDescription(mission, title);

    // When title exists, a distinct short_description is surfaced as cardTitle
    // and getMissionCardDescription returns null to avoid duplication.
    expect(title).toBe('调查 OAuth 回调失败');
    expect(description).toBeNull();
    expect(missionMatchesSearchQuery(mission, '回调')).toBe(true);
    expect(missionSearchRelevanceScore(mission, '回调')).toBeGreaterThan(0);
  });

  it('includes both title and short description in search text when each adds value', () => {
    const mission = buildMission({
      title: 'OAuth callback failures',
      short_description: 'Investigate broken login redirect URI validation',
      backend: 'claude',
      status: 'blocked',
    });

    const searchText = getMissionSearchText(mission);

    expect(searchText).toContain('OAuth callback failures');
    expect(searchText).toContain('Investigate broken login redirect URI validation');
    expect(searchText).toContain('claude');
    expect(searchText).toContain('blocked');
  });

  it('uses the real default backend label when backend is missing', () => {
    const mission = buildMission({
      title: 'Investigate OAuth callback failures',
      short_description: 'Auth token exchange fails after redirect',
      backend: undefined,
    });

    const searchText = getMissionSearchText(mission);
    expect(searchText).toContain('claudecode');
  });

  it('supports query expansion for auth/login style intent matching', () => {
    const mission = buildMission({
      title: 'Investigate OAuth callback failures',
      short_description: 'Auth token exchange fails after redirect',
    });

    expect(missionMatchesSearchQuery(mission, 'login callback')).toBe(true);
    expect(missionMatchesSearchQuery(mission, 'signin token')).toBe(true);
  });

  it('supports abbreviation phrase expansion for mission relevance fallback', () => {
    const mission = buildMission({
      title: 'Fix session id timeout handling',
      short_description: 'Normalize cookie session id parsing in auth callback',
    });

    expect(missionMatchesSearchQuery(mission, 'sid timeout')).toBe(true);
    expect(missionSearchRelevanceScore(mission, 'sid timeout')).toBeGreaterThan(0);
  });

  it('ignores natural-language stopwords for mission relevance scoring', () => {
    const mission = buildMission({
      title: 'Fix login timeout during session refresh',
      short_description: 'Retry credential refresh when auth callback stalls',
    });

    const keywordScore = missionSearchRelevanceScore(mission, 'fix login timeout');
    const naturalLanguageScore = missionSearchRelevanceScore(
      mission,
      'where did we fix the login timeout'
    );

    expect(keywordScore).toBeGreaterThan(0);
    expect(naturalLanguageScore).toBe(keywordScore);
  });

  it('avoids false positives for very short query prefixes', () => {
    const mission = buildMission({
      title: 'Authentication callback refactor',
      short_description: 'Improve OAuth and credential handling',
    });

    expect(missionMatchesSearchQuery(mission, 'a')).toBe(false);
    expect(missionSearchRelevanceScore(mission, 'a')).toBe(0);
  });

  it('still matches common inflections like timeout/timeouts', () => {
    const mission = buildMission({
      title: 'Handle timeout retries for session refresh',
    });

    expect(missionMatchesSearchQuery(mission, 'timeouts')).toBe(true);
    expect(missionSearchRelevanceScore(mission, 'timeouts')).toBeGreaterThan(0);
  });

  it('ranks exact title phrase matches above weaker synonym matches', () => {
    const exactMission = buildMission({
      title: 'Login timeout when refreshing session',
      short_description: 'Timeout occurs after token refresh',
      updated_at: '2026-01-10T00:00:00Z',
    });
    const synonymMission = buildMission({
      id: 'mission-2',
      title: 'Authentication latency investigation',
      short_description: 'Investigate slow oauth callback exchanges',
      updated_at: '2026-01-11T00:00:00Z',
    });

    const query = 'login timeout';
    const exactScore = missionSearchRelevanceScore(exactMission, query);
    const synonymScore = missionSearchRelevanceScore(synonymMission, query);

    expect(exactScore).toBeGreaterThan(synonymScore);
    expect(exactScore).toBeGreaterThan(0);
    expect(synonymScore).toBeGreaterThan(0);
  });

  it('keeps non-matching missions at zero relevance', () => {
    const mission = buildMission({
      title: 'Refactor CSS variables',
      short_description: 'Tighten spacing and typography in dashboard',
    });

    expect(missionSearchRelevanceScore(mission, 'database migration')).toBe(0);
    expect(missionMatchesSearchQuery(mission, 'database migration')).toBe(false);
  });

  it('prefers backend search score when available', () => {
    const mission = buildMission({
      id: 'mission-42',
      title: 'Investigate flaky auth callback',
      short_description: 'Analyze timeout and retries',
    });

    const localCache = new Map<string, number>();
    const serverScores = new Map<string, number>([['mission-42', 77]]);
    const score = getMissionSearchScore(mission, 'auth timeout', localCache, undefined, serverScores);

    expect(score).toBe(77);
    expect(localCache.size).toBe(0);
  });

  it('falls back to local score when backend score is unavailable', () => {
    const mission = buildMission({
      id: 'mission-99',
      title: 'Fix session timeout regression',
      short_description: 'Reproduce timeout on refresh',
    });

    const localCache = new Map<string, number>();
    const first = getMissionSearchScore(mission, 'timeout', localCache);
    const second = getMissionSearchScore(mission, 'timeout', localCache);

    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first);
    expect(localCache.size).toBeGreaterThan(0);
  });

  it('keeps running missions searchable even without hydrated mission metadata', () => {
    const runningInfo = {
      mission_id: 'mission-running-123',
      state: 'running' as const,
      queue_len: 0,
      history_len: 12,
      seconds_since_activity: 3,
      health: { status: 'healthy' as const },
      expected_deliverables: 0,
      subtask_total: 0,
      subtask_completed: 0,
    };

    expect(getRunningMissionSearchText(runningInfo)).toContain('mission-running-123');
    expect(runningMissionMatchesSearchQuery(runningInfo, 'running')).toBe(true);
    expect(runningMissionMatchesSearchQuery(runningInfo, 'mission-running-123')).toBe(true);
    expect(runningMissionMatchesSearchQuery(runningInfo, 'no-match-term')).toBe(false);
  });

  it('supports synonym and stopword matching for running missions', () => {
    const runningInfo = {
      mission_id: 'mission-running-123',
      state: 'waiting_for_tool' as const,
      queue_len: 0,
      history_len: 12,
      seconds_since_activity: 3,
      health: { status: 'healthy' as const },
      expected_deliverables: 0,
      subtask_total: 0,
      subtask_completed: 0,
    };

    // 'waiting_for_tool' contains 'waiting', which is a synonym for 'blocked' and 'stalled'
    expect(runningMissionMatchesSearchQuery(runningInfo, 'stalled mission')).toBe(true);
    expect(runningMissionMatchesSearchQuery(runningInfo, 'where is my blocked mission')).toBe(true);
  });

  it('supports abbreviation phrase expansion for running mission fallback relevance', () => {
    const runningInfo = {
      mission_id: 'mission-login-pipeline-123',
      state: 'running' as const,
      queue_len: 0,
      history_len: 12,
      seconds_since_activity: 3,
      health: { status: 'healthy' as const },
      expected_deliverables: 0,
      subtask_total: 0,
      subtask_completed: 0,
    };

    expect(runningMissionMatchesSearchQuery(runningInfo, 'sso')).toBe(true);
    expect(runningMissionMatchesSearchQuery(runningInfo, 'ci')).toBe(true);
  });

  it('returns contextual quick actions for resumable terminal states', () => {
    const interrupted = buildMission({ status: 'interrupted', resumable: true });
    const blocked = buildMission({ status: 'blocked', resumable: true });
    const failed = buildMission({ status: 'failed', resumable: true });

    expect(getMissionQuickActions(interrupted, false).map((a) => a.label)).toEqual([
      'Resume',
      'Follow-up',
    ]);
    expect(getMissionQuickActions(blocked, false).map((a) => a.label)).toEqual([
      'Continue',
      'Follow-up',
    ]);
    expect(getMissionQuickActions(failed, false).map((a) => a.label)).toEqual([
      'Open Failure',
      'Retry',
      'Follow-up',
    ]);
  });

  it('does not expose resume quick action for non-resumable interrupted missions', () => {
    const mission = buildMission({ status: 'interrupted', resumable: false });

    expect(getMissionQuickActions(mission, false).map((a) => a.label)).toEqual(['Follow-up']);
  });

  it('exposes follow-up quick action for running missions', () => {
    const mission = buildMission({ status: 'active', resumable: true });
    expect(getMissionQuickActions(mission, true).map((a) => a.label)).toEqual(['Follow-up']);
  });

  it('exposes follow-up quick action for running rows without hydrated mission metadata', () => {
    expect(getRunningMissionQuickActions().map((a) => a.label)).toEqual(['Follow-up']);
  });

  it('still exposes failure jump action for non-resumable failed missions', () => {
    const mission = buildMission({ status: 'failed', resumable: false });
    expect(getMissionQuickActions(mission, false).map((a) => a.label)).toEqual([
      'Open Failure',
      'Follow-up',
    ]);
  });

  it('offers follow-up action for completed missions', () => {
    const mission = buildMission({ status: 'completed', resumable: false });
    expect(getMissionQuickActions(mission, false).map((a) => a.label)).toEqual(['Follow-up']);
  });
});
