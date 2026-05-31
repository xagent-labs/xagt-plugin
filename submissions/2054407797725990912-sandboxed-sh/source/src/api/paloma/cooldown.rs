//! Per-mission, per-alert-class cooldown math.
//!
//! Owns cadence for "should we send the same kind of alert about the same
//! mission again?". Replaces the 30-minute bucket suffix that used to live in
//! `planner::alert_event_kind_at` — that approach generated a fresh alert key
//! every half-hour and bypassed the `INSERT OR IGNORE` dedup, producing the
//! overnight spam this phase exists to kill.
//!
//! The ladder is exponential: 0m → 30m → 2h → 8h → 24h. The first alert for a
//! given class fires immediately (step 0). Every successful send bumps the
//! step and pushes `next_eligible_at` further out. The caller is expected to
//! reset the state via `MissionStore::reset_paloma_cooldown_for_mission` on:
//!   * a `UserMessage` to the mission,
//!   * a status transition (anything that changes `Mission::status`),
//!   * an explicit `/resume`-style command.

use crate::api::mission_store::PalomaCooldownState;
use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;

/// Exponential backoff steps. Step `i` says "after the i-th send, wait this
/// long before the next send is eligible". Step 0 is "first send is
/// immediate" — the first entry is the gap between send #1 and send #2.
const BACKOFF_LADDER: &[Duration] = &[
    Duration::minutes(30),
    Duration::hours(2),
    Duration::hours(8),
    Duration::hours(24),
];

/// Wait time after the i-th send before the (i+1)-th send is eligible.
/// Steps past the ladder length clamp to the last entry (daily).
pub fn step_duration(step: i64) -> Duration {
    let idx = step.max(0) as usize;
    let clamped = idx.min(BACKOFF_LADDER.len().saturating_sub(1));
    BACKOFF_LADDER[clamped]
}

/// Compute the next eligibility timestamp after a successful send at `sent_at`
/// when the previous backoff step was `prev_step`.
pub fn next_eligible_at(prev_step: i64, sent_at: DateTime<Utc>) -> DateTime<Utc> {
    sent_at + step_duration(prev_step)
}

/// Bump a step to the next one. Saturates at the last ladder index so we never
/// get a runaway counter.
pub fn next_step(prev_step: i64) -> i64 {
    let max_step = BACKOFF_LADDER.len() as i64 - 1;
    (prev_step + 1).min(max_step)
}

/// True when an alert for `(mission, class, user)` should be allowed right
/// now. A missing `state` means we have never sent this kind of alert for
/// this mission, so the first send is always eligible.
pub fn is_eligible(state: Option<&PalomaCooldownState>, now: DateTime<Utc>) -> bool {
    let Some(state) = state else { return true };
    match DateTime::parse_from_rfc3339(&state.next_eligible_at) {
        Ok(parsed) => parsed.with_timezone(&Utc) <= now,
        Err(_) => true,
    }
}

/// Build the row to persist after a successful send. `prev` is the state we
/// just consulted (None for the first ever send of this class for this
/// mission). The returned row contains the *new* backoff step and eligibility.
pub fn record_send(
    prev: Option<&PalomaCooldownState>,
    telegram_user_id: i64,
    mission_id: Uuid,
    alert_class: &str,
    now: DateTime<Utc>,
) -> PalomaCooldownState {
    let new_step = match prev {
        Some(prev) => next_step(prev.backoff_step),
        None => 0,
    };
    PalomaCooldownState {
        mission_id,
        alert_class: alert_class.to_string(),
        telegram_user_id,
        last_sent_at: now.to_rfc3339(),
        next_eligible_at: next_eligible_at(new_step, now).to_rfc3339(),
        backoff_step: new_step,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn ts(year: i32, month: u32, day: u32, h: u32, m: u32, s: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(year, month, day, h, m, s).unwrap()
    }

    #[test]
    fn ladder_increases_and_clamps() {
        assert_eq!(step_duration(0), Duration::minutes(30));
        assert_eq!(step_duration(1), Duration::hours(2));
        assert_eq!(step_duration(2), Duration::hours(8));
        assert_eq!(step_duration(3), Duration::hours(24));
        assert_eq!(step_duration(4), Duration::hours(24));
        assert_eq!(step_duration(99), Duration::hours(24));
    }

    #[test]
    fn next_step_saturates_at_top() {
        assert_eq!(next_step(0), 1);
        assert_eq!(next_step(2), 3);
        assert_eq!(next_step(3), 3);
        assert_eq!(next_step(100), 3);
    }

    #[test]
    fn first_send_is_always_eligible() {
        let now = ts(2026, 5, 24, 1, 0, 0);
        assert!(is_eligible(None, now));
    }

    #[test]
    fn eligibility_respects_next_eligible_at() {
        let now = ts(2026, 5, 24, 4, 0, 0);
        let blocked = PalomaCooldownState {
            mission_id: Uuid::nil(),
            alert_class: "mission_long_running".to_string(),
            telegram_user_id: 1,
            last_sent_at: ts(2026, 5, 24, 3, 30, 0).to_rfc3339(),
            next_eligible_at: ts(2026, 5, 24, 5, 30, 0).to_rfc3339(),
            backoff_step: 1,
        };
        assert!(!is_eligible(Some(&blocked), now));

        let elapsed = PalomaCooldownState {
            next_eligible_at: ts(2026, 5, 24, 3, 59, 0).to_rfc3339(),
            ..blocked
        };
        assert!(is_eligible(Some(&elapsed), now));
    }

    #[test]
    fn record_send_starts_at_step_zero_then_walks_the_ladder() {
        let mission_id = Uuid::nil();
        let user_id = 42;
        let class = "mission_long_running";
        let t0 = ts(2026, 5, 24, 1, 0, 0);

        let first = record_send(None, user_id, mission_id, class, t0);
        assert_eq!(first.backoff_step, 0);
        assert_eq!(first.last_sent_at, t0.to_rfc3339());
        // After step 0, wait 30m before the next send.
        assert_eq!(
            first.next_eligible_at,
            (t0 + Duration::minutes(30)).to_rfc3339()
        );

        let t1 = t0 + Duration::minutes(35);
        let second = record_send(Some(&first), user_id, mission_id, class, t1);
        assert_eq!(second.backoff_step, 1);
        assert_eq!(
            second.next_eligible_at,
            (t1 + Duration::hours(2)).to_rfc3339()
        );

        let t2 = t1 + Duration::hours(2) + Duration::minutes(5);
        let third = record_send(Some(&second), user_id, mission_id, class, t2);
        assert_eq!(third.backoff_step, 2);
        assert_eq!(
            third.next_eligible_at,
            (t2 + Duration::hours(8)).to_rfc3339()
        );

        let t3 = t2 + Duration::hours(9);
        let fourth = record_send(Some(&third), user_id, mission_id, class, t3);
        assert_eq!(fourth.backoff_step, 3);
        assert_eq!(
            fourth.next_eligible_at,
            (t3 + Duration::hours(24)).to_rfc3339()
        );

        let t4 = t3 + Duration::hours(25);
        let fifth = record_send(Some(&fourth), user_id, mission_id, class, t4);
        // Saturates at step 3 (24h) — no runaway counter.
        assert_eq!(fifth.backoff_step, 3);
        assert_eq!(
            fifth.next_eligible_at,
            (t4 + Duration::hours(24)).to_rfc3339()
        );
    }

    #[test]
    fn simulated_overnight_run_produces_only_a_handful_of_alerts() {
        // Old behaviour: a 30-minute bucket flips every 30 minutes, so a
        // night that runs from 01:00 to 08:00 produced ~14 alerts. With the
        // ladder, that same window produces at most 4 (immediate, +30m, +2h,
        // +8h-which-falls-outside).
        let mission_id = Uuid::nil();
        let user_id = 1;
        let class = "mission_long_running";
        let start = ts(2026, 5, 24, 1, 0, 0);
        let end = ts(2026, 5, 24, 8, 30, 0);

        let mut state: Option<PalomaCooldownState> = None;
        let mut sent_at = start;
        let mut sends = 0;
        let mut now = start;
        while now <= end {
            if is_eligible(state.as_ref(), now) {
                state = Some(record_send(state.as_ref(), user_id, mission_id, class, now));
                sent_at = now;
                sends += 1;
            }
            now += Duration::minutes(5);
        }

        // Pre-fix behaviour was ~14 messages. We accept up to 4 (immediate,
        // +30m, +2h30m, +8h falls just after 08:30 so doesn't trigger).
        assert!(
            sends <= 4,
            "expected ≤4 sends in a 7.5h overnight window, got {sends}"
        );
        assert!(sends >= 3, "expected at least 3 sends, got {sends}");
        let _ = sent_at;
    }
}
