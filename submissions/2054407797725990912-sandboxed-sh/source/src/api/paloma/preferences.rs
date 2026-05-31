//! Pure helpers for evaluating `PalomaUserPreferences` at decision time.
//!
//! Quiet hours and the per-user rate ceiling are the two knobs Phase 2 wires
//! up. Both are evaluated at delivery time (digest flush), not at alert
//! creation: alerts pile up in the pending queue during quiet windows and are
//! flushed when the user is reachable again.

use crate::api::mission_store::PalomaUserPreferences;
use chrono::{DateTime, TimeZone, Utc};
use chrono_tz::Tz;

/// Convert the stored timezone string to a `chrono_tz::Tz`. Unknown names fall
/// back to UTC so we never panic on a misconfigured preferences row.
pub fn timezone(prefs: &PalomaUserPreferences) -> Tz {
    prefs.timezone.parse::<Tz>().unwrap_or(chrono_tz::UTC)
}

/// True when `now` (UTC) falls inside the user's local quiet-hours window.
///
/// Windows that span midnight (e.g. start=23, end=8) are handled correctly:
/// the window matches hours in `[23..24) ∪ [0..8)`.
///
/// Returns `false` when quiet hours are not configured (either bound is
/// `None`) or when the bounds are out of range.
pub fn is_quiet_hours(prefs: &PalomaUserPreferences, now: DateTime<Utc>) -> bool {
    let (Some(start), Some(end)) = (prefs.quiet_hours_start, prefs.quiet_hours_end) else {
        return false;
    };
    if !(0..24).contains(&start) || !(0..24).contains(&end) {
        return false;
    }
    if start == end {
        // Zero-length window: treat as disabled to avoid permanent mute.
        return false;
    }
    let tz = timezone(prefs);
    let local_hour = tz
        .from_utc_datetime(&now.naive_utc())
        .format("%H")
        .to_string();
    let Ok(hour) = local_hour.parse::<i64>() else {
        return false;
    };
    if start < end {
        // Same-day window (e.g. 13..15): hour in [start, end).
        hour >= start && hour < end
    } else {
        // Spans midnight (e.g. 23..8): hour in [start, 24) or [0, end).
        hour >= start || hour < end
    }
}

/// When `failure_override_quiet` is set, critical alerts (production failures,
/// hard breakage) bypass quiet hours. Returns `true` when the candidate should
/// be delivered even though `is_quiet_hours` is true.
pub fn critical_overrides_quiet(prefs: &PalomaUserPreferences, is_critical: bool) -> bool {
    is_critical && prefs.failure_override_quiet
}

/// Result of the rate-ceiling check.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RateLimit {
    Allowed,
    OverHourly,
    OverDaily,
}

/// Apply the user's per-user rate ceiling given the count of interrupts
/// already delivered in the last hour and the last day.
pub fn check_rate_ceiling(
    prefs: &PalomaUserPreferences,
    sent_last_hour: i64,
    sent_last_day: i64,
) -> RateLimit {
    if sent_last_hour >= prefs.max_interrupts_per_hour {
        return RateLimit::OverHourly;
    }
    if sent_last_day >= prefs.max_interrupts_per_day {
        return RateLimit::OverDaily;
    }
    RateLimit::Allowed
}

#[cfg(test)]
mod tests {
    use super::*;

    fn prefs_with(tz: &str, start: Option<i64>, end: Option<i64>) -> PalomaUserPreferences {
        let mut p = PalomaUserPreferences::default_for(1, "2026-05-24T00:00:00Z");
        p.timezone = tz.to_string();
        p.quiet_hours_start = start;
        p.quiet_hours_end = end;
        p
    }

    fn utc(year: i32, month: u32, day: u32, h: u32, m: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(year, month, day, h, m, 0).unwrap()
    }

    #[test]
    fn default_owner_prefs_have_overnight_quiet_window() {
        let prefs = PalomaUserPreferences::default_for(42, "2026-05-24T00:00:00Z");
        assert_eq!(prefs.quiet_hours_start, Some(23));
        assert_eq!(prefs.quiet_hours_end, Some(8));
        assert!(prefs.failure_override_quiet);
    }

    #[test]
    fn quiet_hours_disabled_when_either_bound_missing() {
        let no_start = prefs_with("UTC", None, Some(8));
        let no_end = prefs_with("UTC", Some(23), None);
        let neither = prefs_with("UTC", None, None);
        let now = utc(2026, 5, 24, 2, 0);
        assert!(!is_quiet_hours(&no_start, now));
        assert!(!is_quiet_hours(&no_end, now));
        assert!(!is_quiet_hours(&neither, now));
    }

    #[test]
    fn quiet_hours_spans_midnight_for_overnight_windows_in_utc() {
        let prefs = prefs_with("UTC", Some(23), Some(8));
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 2, 34)));
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 7, 59)));
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 23, 5)));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 8, 0)));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 13, 0)));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 22, 59)));
    }

    #[test]
    fn quiet_hours_handles_same_day_window() {
        // 13–15 quiet for nap time.
        let prefs = prefs_with("UTC", Some(13), Some(15));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 12, 59)));
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 13, 0)));
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 14, 59)));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 15, 0)));
    }

    #[test]
    fn quiet_hours_respects_user_local_timezone() {
        // Owner in Europe/Paris (UTC+2 in May during DST). 23-08 local =
        // 21-06 UTC.
        let prefs = prefs_with("Europe/Paris", Some(23), Some(8));
        // 02:34 UTC = 04:34 local — inside quiet.
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 2, 34)));
        // 07:00 UTC = 09:00 local — outside quiet.
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 7, 0)));
        // 22:00 UTC = 00:00 local next day — inside quiet.
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 22, 0)));
    }

    #[test]
    fn zero_length_window_is_disabled() {
        let prefs = prefs_with("UTC", Some(5), Some(5));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 5, 0)));
    }

    #[test]
    fn unknown_timezone_falls_back_to_utc() {
        let prefs = prefs_with("Pluto/Olympus", Some(23), Some(8));
        // Behaves like UTC.
        assert!(is_quiet_hours(&prefs, utc(2026, 5, 24, 2, 0)));
        assert!(!is_quiet_hours(&prefs, utc(2026, 5, 24, 12, 0)));
    }

    #[test]
    fn critical_override_only_triggers_when_both_flags_true() {
        let mut prefs = prefs_with("UTC", Some(23), Some(8));
        prefs.failure_override_quiet = true;
        assert!(critical_overrides_quiet(&prefs, true));
        assert!(!critical_overrides_quiet(&prefs, false));
        prefs.failure_override_quiet = false;
        assert!(!critical_overrides_quiet(&prefs, true));
    }

    #[test]
    fn rate_ceiling_checks_hourly_first_then_daily() {
        let prefs = PalomaUserPreferences::default_for(1, "2026-05-24T00:00:00Z");
        assert_eq!(check_rate_ceiling(&prefs, 0, 0), RateLimit::Allowed);
        assert_eq!(check_rate_ceiling(&prefs, 1, 1), RateLimit::OverHourly);
        assert_eq!(check_rate_ceiling(&prefs, 0, 4), RateLimit::OverDaily);
        // Hourly check wins when both are at ceiling.
        assert_eq!(check_rate_ceiling(&prefs, 2, 5), RateLimit::OverHourly);
    }
}
