use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::path::{Path, PathBuf};
use notify::{Watcher, RecursiveMode, Event};
use notify::event::{EventKind, ModifyKind};

// Cache entry with TTL
#[derive(Clone, Debug)]
struct CacheEntry {
    stats: HashMap<String, crate::fs::GitStats>,
    cached_at: Instant,
}

// Cache configuration
const CACHE_TTL_SECONDS: u64 = 5;

// Main cache structure
pub struct GitStatsCache {
    entries: Arc<Mutex<HashMap<PathBuf, CacheEntry>>>,
}

impl GitStatsCache {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    // Get stats from cache or return None if expired/missing
    pub fn get(&self, repo_path: &Path) -> Option<HashMap<String, crate::fs::GitStats>> {
        let entries = self.entries.lock().ok()?;
        let entry = entries.get(repo_path)?;

        // Check TTL
        let elapsed = entry.cached_at.elapsed();
        if elapsed > Duration::from_secs(CACHE_TTL_SECONDS) {
            return None;
        }

        Some(entry.stats.clone())
    }

    // Store stats in cache
    pub fn set(&self, repo_path: PathBuf, stats: HashMap<String, crate::fs::GitStats>) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.insert(repo_path, CacheEntry {
                stats,
                cached_at: Instant::now(),
            });
        }
    }

    // Invalidate specific repository
    #[allow(dead_code)]
    pub fn invalidate(&self, repo_path: &Path) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.remove(repo_path);
        }
    }

    // Setup filesystem watcher for a repository
    pub fn setup_watcher(&self, repo_path: PathBuf) -> Result<(), String> {
        let git_dir = repo_path.join(".git");
        if !git_dir.exists() {
            return Err("Not a git repository".to_string());
        }

        // Clone Arc for watcher thread
        let entries = self.entries.clone();
        let repo_path_clone = repo_path.clone();

        // Create watcher
        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    // Check if index or HEAD was modified
                    let should_invalidate = matches!(
                        event.kind,
                        EventKind::Modify(ModifyKind::Data(_)) | EventKind::Modify(ModifyKind::Any)
                    ) && event.paths.iter().any(|p| {
                        p.ends_with("index") || p.ends_with("HEAD")
                    });

                    if should_invalidate {
                        if let Ok(mut entries) = entries.lock() {
                            entries.remove(&repo_path_clone);
                        }
                    }
                }
                Err(e) => eprintln!("Watch error: {:?}", e),
            }
        }).map_err(|e| format!("Failed to create watcher: {}", e))?;

        // Watch .git directory
        watcher.watch(&git_dir, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch git directory: {}", e))?;

        // Spawn thread to keep watcher alive
        std::thread::spawn(move || {
            let _watcher = watcher; // Keep watcher alive
            loop {
                std::thread::sleep(Duration::from_secs(60));
            }
        });

        Ok(())
    }
}
