use crate::api::mission_store::TelegramAlert;
use std::collections::HashMap;
use uuid::Uuid;

pub fn alert_rank(alert: &TelegramAlert) -> i32 {
    match alert.importance.as_str() {
        "high" => 0,
        "normal" => 1,
        _ => 2,
    }
}

pub fn alert_digest_line(alert: &TelegramAlert) -> String {
    let mut lines = alert.body.lines();
    let lead = lines
        .next()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .unwrap_or(alert.title.as_str());
    let latest = lines.find_map(|line| line.trim().strip_prefix("Latest: "));
    match latest {
        Some(latest) if !latest.trim().is_empty() => {
            format!("- {lead} Latest: {}", latest.trim())
        }
        _ => format!("- {lead}"),
    }
}

/// Collapse pending alerts to at most one entry per mission. Keeps the
/// highest-priority alert (lowest `alert_rank`), breaking ties by newest
/// `created_at`. Alerts without a mission_id pass through unchanged.
///
/// This prevents the "2 mission updates: - X awaiting input - X awaiting
/// input" pattern that showed up when the bucket-suffix bug stacked multiple
/// pending alerts per mission.
pub fn dedupe_by_mission(alerts: &[TelegramAlert]) -> Vec<TelegramAlert> {
    let mut by_mission: HashMap<Uuid, TelegramAlert> = HashMap::new();
    let mut without_mission = Vec::new();
    for alert in alerts {
        match alert.mission_id {
            Some(mission_id) => match by_mission.get(&mission_id) {
                Some(existing) => {
                    let candidate_rank = alert_rank(alert);
                    let existing_rank = alert_rank(existing);
                    let replace = candidate_rank < existing_rank
                        || (candidate_rank == existing_rank
                            && alert.created_at > existing.created_at);
                    if replace {
                        by_mission.insert(mission_id, alert.clone());
                    }
                }
                None => {
                    by_mission.insert(mission_id, alert.clone());
                }
            },
            None => without_mission.push(alert.clone()),
        }
    }
    let mut out: Vec<TelegramAlert> = by_mission.into_values().collect();
    out.extend(without_mission);
    // Sort by (rank, created_at) so callers downstream can rely on a stable
    // ordering even after dedup shuffled the map.
    out.sort_by(|a, b| {
        alert_rank(a)
            .cmp(&alert_rank(b))
            .then_with(|| a.created_at.cmp(&b.created_at))
    });
    out
}

pub fn alert_digest_text<F>(alerts: &[TelegramAlert], redact: F) -> String
where
    F: Fn(&str) -> String,
{
    let deduped = dedupe_by_mission(alerts);
    if deduped.len() == 1 {
        return redact(deduped[0].body.trim());
    }

    let high_count = deduped
        .iter()
        .filter(|alert| alert.importance == "high")
        .count();
    let mut text = if high_count > 0 {
        format!(
            "{} mission update{} {} attention:",
            high_count,
            if high_count == 1 { "" } else { "s" },
            if high_count == 1 { "needs" } else { "need" }
        )
    } else {
        format!(
            "{} mission update{}:",
            deduped.len(),
            if deduped.len() == 1 { "" } else { "s" }
        )
    };
    for alert in deduped.iter().take(8) {
        text.push('\n');
        text.push_str(&alert_digest_line(alert));
    }
    let remaining = deduped.len().saturating_sub(8);
    if remaining > 0 {
        text.push_str(&format!(
            "\n- {} more update{}",
            remaining,
            if remaining == 1 { "" } else { "s" }
        ));
    }
    redact(&text)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_alert(
        mission_id: Option<Uuid>,
        importance: &str,
        title: &str,
        body: &str,
        created_at: &str,
    ) -> TelegramAlert {
        TelegramAlert {
            id: Uuid::new_v4(),
            telegram_user_id: 1,
            mission_id,
            event_kind: "test".to_string(),
            importance: importance.to_string(),
            title: title.to_string(),
            body: body.to_string(),
            status: "pending".to_string(),
            telegram_message_id: None,
            last_error: None,
            created_at: created_at.to_string(),
            sent_at: None,
            acknowledged_at: None,
        }
    }

    #[test]
    fn dedup_collapses_multiple_alerts_for_the_same_mission() {
        let mission = Uuid::new_v4();
        let alerts = vec![
            make_alert(
                Some(mission),
                "high",
                "Concrete Audit",
                "Concrete Audit is waiting for your input.",
                "2026-05-24T07:09:00Z",
            ),
            make_alert(
                Some(mission),
                "normal",
                "Concrete Audit",
                "Concrete Audit is still running.",
                "2026-05-24T06:59:00Z",
            ),
        ];

        let deduped = dedupe_by_mission(&alerts);
        assert_eq!(
            deduped.len(),
            1,
            "expected dedup to keep one entry per mission"
        );
        assert_eq!(deduped[0].importance, "high");
        assert!(deduped[0].body.contains("waiting for your input"));
    }

    #[test]
    fn dedup_keeps_newer_when_priorities_match() {
        let mission = Uuid::new_v4();
        let alerts = vec![
            make_alert(
                Some(mission),
                "normal",
                "M",
                "older",
                "2026-05-24T01:00:00Z",
            ),
            make_alert(
                Some(mission),
                "normal",
                "M",
                "newer",
                "2026-05-24T02:00:00Z",
            ),
        ];
        let deduped = dedupe_by_mission(&alerts);
        assert_eq!(deduped.len(), 1);
        assert_eq!(deduped[0].body, "newer");
    }

    #[test]
    fn dedup_preserves_alerts_without_mission_id() {
        let alerts = vec![
            make_alert(
                None,
                "normal",
                "Sys",
                "system note 1",
                "2026-05-24T01:00:00Z",
            ),
            make_alert(
                None,
                "normal",
                "Sys",
                "system note 2",
                "2026-05-24T02:00:00Z",
            ),
        ];
        let deduped = dedupe_by_mission(&alerts);
        assert_eq!(deduped.len(), 2);
    }

    #[test]
    fn digest_text_does_not_show_same_mission_twice() {
        // Reproduces the bug from the original spammy night: same mission,
        // two different event_kinds piled up in the pending queue, both
        // appeared in the digest.
        let mission = Uuid::new_v4();
        let alerts = vec![
            make_alert(
                Some(mission),
                "high",
                "Concrete Audit",
                "Concrete Audit is waiting for your input.\n\nLatest: now active.",
                "2026-05-24T07:09:00Z",
            ),
            make_alert(
                Some(mission),
                "high",
                "Concrete Audit",
                "Concrete Audit is waiting for your input.\n\nLatest: now active.",
                "2026-05-24T07:10:00Z",
            ),
        ];
        let text = alert_digest_text(&alerts, |t| t.to_string());
        // Single-alert short form (after dedup), not the "2 mission updates"
        // header.
        assert!(text.contains("Concrete Audit is waiting"));
        assert!(!text.contains("2 mission updates"));
    }
}
