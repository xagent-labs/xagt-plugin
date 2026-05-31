//! Skills.sh registry integration.
//!
//! This module provides integration with the skills.sh registry using the
//! `bunx skills` CLI. It handles searching, installing, and updating skills
//! from the community registry.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::process::Command;

/// A skill listing from the registry search results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrySkillListing {
    /// Repository identifier (e.g., "vercel-labs/agent-skills")
    pub identifier: String,
    /// Skill name within the repo
    pub name: String,
    /// Description of the skill
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Result of installing skills from the registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    /// Skills that were successfully installed
    pub installed: Vec<String>,
    /// Any errors encountered
    pub errors: Vec<String>,
}

/// Check if bun is available in the system.
pub async fn check_bun_available() -> bool {
    Command::new("bun")
        .arg("--version")
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Strip ANSI escape codes from a string.
fn strip_ansi(s: &str) -> String {
    let re = regex::Regex::new(r"\x1b\[[0-9;]*m").unwrap();
    re.replace_all(s, "").to_string()
}

fn parse_registry_skill_line(line: &str) -> Option<RegistrySkillListing> {
    let line = line.trim();
    if line.is_empty()
        || line.starts_with("Search")
        || line.starts_with("─")
        || line.starts_with("Install with")
        || line.starts_with("└")
        || line.starts_with("http")
        || !line.contains('/')
        || !line.contains('@')
    {
        return None;
    }

    let parts: Vec<&str> = line.splitn(2, '@').collect();
    if parts.len() != 2 {
        return None;
    }

    let repo = parts[0].trim();
    let skill_name = parts[1].split_whitespace().next().unwrap_or("").trim();
    if repo.is_empty() || skill_name.is_empty() {
        return None;
    }

    Some(RegistrySkillListing {
        identifier: repo.to_string(),
        name: skill_name.to_string(),
        description: None,
    })
}

/// Search for skills in the registry.
///
/// Uses `bunx skills find <query>` to search for skills.
/// Returns a list of matching skills with their identifiers and names.
pub async fn search_skills(query: &str) -> Result<Vec<RegistrySkillListing>> {
    // Try to run the search command and capture output
    let output = Command::new("bunx")
        .args(["skills", "find", query])
        .env("NO_COLOR", "1") // Try to disable colors
        .env("TERM", "dumb") // Also try dumb terminal
        .output()
        .await
        .context("Failed to run bunx skills find")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("skills search failed: {}", stderr);
    }

    // Parse the output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stdout = strip_ansi(&stdout);
    let mut skills = Vec::new();
    let mut seen = std::collections::HashSet::new();

    // Parse lines looking for skill identifiers like "owner/repo@skill"
    for line in stdout.lines() {
        let line = line.trim();
        if let Some(skill) = parse_registry_skill_line(line) {
            let identifier = format!("{}/{}", skill.identifier, skill.name);
            if seen.contains(&identifier) {
                continue;
            }
            seen.insert(identifier);
            skills.push(skill);
        }
    }

    Ok(skills)
}

/// List available skills in a repository without installing.
///
/// Uses `bunx skills add <identifier> --list` to see what skills are available.
pub async fn list_repo_skills(identifier: &str) -> Result<Vec<String>> {
    let output = Command::new("bunx")
        .args(["skills", "add", identifier, "--list"])
        .env("NO_COLOR", "1")
        .output()
        .await
        .context("Failed to run bunx skills add --list")?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut skills = Vec::new();

    // Parse skill names from the list output
    for line in stdout.lines() {
        let line = line.trim();
        // Look for lines that appear to be skill names
        if !line.is_empty()
            && !line.starts_with("Available")
            && !line.starts_with("─")
            && !line.contains("http")
        {
            // Clean up the skill name
            let name = line
                .trim_start_matches("- ")
                .trim_start_matches("• ")
                .trim();
            if !name.is_empty() && !name.contains(' ') {
                skills.push(name.to_string());
            }
        }
    }

    Ok(skills)
}

/// Install a skill from the registry to a target directory.
///
/// Uses `bunx skills add <identifier>` to install the skill.
/// The skill files will be placed in the library's skill directory.
pub async fn install_skill(
    identifier: &str,
    skill_names: Option<&[&str]>,
    target_dir: &Path,
) -> Result<InstallResult> {
    // Build the command
    let mut cmd = Command::new("bunx");
    cmd.args(["skills", "add", identifier, "-y"]);

    // Add specific skill names if provided
    if let Some(names) = skill_names {
        for name in names {
            cmd.args(["--skill", name]);
        }
    }

    // Set the working directory
    cmd.current_dir(target_dir);
    cmd.env("NO_COLOR", "1");
    cmd.env("TERM", "dumb");
    cmd.env("CI", "1");

    let output = cmd
        .output()
        .await
        .context("Failed to run bunx skills add")?;

    let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout));
    let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));

    // Parse installed skills from output
    let mut installed = Vec::new();
    let mut errors = Vec::new();

    if output.status.success() {
        // Parse successful installations from stdout
        for line in stdout.lines() {
            let line = line.trim();
            if line.contains("installed") || line.contains("Added") || line.contains("✓") {
                // Extract skill name from the line
                let parts: Vec<&str> = line.split_whitespace().collect();
                for part in parts {
                    if !part.contains("installed")
                        && !part.contains("Added")
                        && !part.starts_with("✓")
                        && !part.is_empty()
                    {
                        installed.push(part.to_string());
                        break;
                    }
                }
            }
        }
    } else {
        let detail = [stderr.trim(), stdout.trim()]
            .into_iter()
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>()
            .join("\n");
        let detail = if detail.is_empty() {
            format!(
                "bunx skills add exited with status {} and did not print output",
                output.status
            )
        } else {
            detail
        };
        errors.push(format!("Installation failed: {}", detail));
    }

    Ok(InstallResult { installed, errors })
}

/// Check for available updates to installed skills.
///
/// Uses `bunx skills check` to see if updates are available.
pub async fn check_updates(working_dir: &Path) -> Result<Vec<String>> {
    let output = Command::new("bunx")
        .args(["skills", "check"])
        .current_dir(working_dir)
        .env("NO_COLOR", "1")
        .output()
        .await
        .context("Failed to run bunx skills check")?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut updates = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.contains("update available") || line.contains("→") {
            updates.push(line.to_string());
        }
    }

    Ok(updates)
}

/// Update all installed skills to their latest versions.
///
/// Uses `bunx skills update` to update all skills.
pub async fn update_all(working_dir: &Path) -> Result<Vec<String>> {
    let output = Command::new("bunx")
        .args(["skills", "update"])
        .current_dir(working_dir)
        .env("NO_COLOR", "1")
        .output()
        .await
        .context("Failed to run bunx skills update")?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut updated = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.contains("updated") || line.contains("✓") {
            updated.push(line.to_string());
        }
    }

    Ok(updated)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_registry_skill_line_strips_install_counts() {
        let listing =
            parse_registry_skill_line("leonxlnx/taste-skill@design-taste-frontend 78.6K installs")
                .unwrap();

        assert_eq!(listing.identifier, "leonxlnx/taste-skill");
        assert_eq!(listing.name, "design-taste-frontend");
    }

    #[tokio::test]
    async fn test_bun_available() {
        // This test just checks if bun is installed
        let available = check_bun_available().await;
        println!("Bun available: {}", available);
    }
}
