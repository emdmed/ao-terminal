use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Sender};
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
    watcher_stops: Arc<Mutex<HashMap<PathBuf, Sender<()>>>>,
    enabled: Arc<Mutex<bool>>,
}

impl GitStatsCache {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(Mutex::new(HashMap::new())),
            watcher_stops: Arc::new(Mutex::new(HashMap::new())),
            enabled: Arc::new(Mutex::new(true)),
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
        // Check if watchers are enabled
        let enabled = self.enabled.lock().ok().map(|e| *e).unwrap_or(false);
        if !enabled {
            return Ok(());
        }

        let git_dir = repo_path.join(".git");
        if !git_dir.exists() {
            return Err("Not a git repository".to_string());
        }

        // Check if already watching
        if let Ok(stops) = self.watcher_stops.lock() {
            if stops.contains_key(&repo_path) {
                return Ok(());
            }
        }

        // Create channel for stop signal
        let (stop_tx, stop_rx) = channel::<()>();

        // Clone Arc for watcher callback
        let entries = self.entries.clone();
        let repo_path_clone = repo_path.clone();
        let git_dir_clone = git_dir.clone();

        // Spawn watcher thread
        std::thread::spawn(move || {
            // Create watcher
            let mut watcher = match notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
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
            }) {
                Ok(w) => w,
                Err(e) => {
                    eprintln!("Failed to create watcher: {}", e);
                    return;
                }
            };

            // Watch .git directory
            if let Err(e) = watcher.watch(&git_dir_clone, RecursiveMode::NonRecursive) {
                eprintln!("Failed to watch git directory: {}", e);
                return;
            }

            // Keep watcher alive until stop signal
            loop {
                match stop_rx.recv_timeout(Duration::from_secs(1)) {
                    Ok(_) | Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                        // Stop signal received or sender dropped
                        drop(watcher);
                        break;
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                        // Continue watching
                    }
                }
            }
        });

        // Store stop sender
        if let Ok(mut stops) = self.watcher_stops.lock() {
            stops.insert(repo_path, stop_tx);
        }

        Ok(())
    }

    // Stop watcher for a specific repository
    #[allow(dead_code)]
    fn stop_watcher(&self, repo_path: &Path) {
        if let Ok(mut stops) = self.watcher_stops.lock() {
            stops.remove(repo_path);
            // Dropping the sender signals the thread to stop
        }
    }

    // Stop all watchers
    pub fn stop_all_watchers(&self) {
        if let Ok(mut stops) = self.watcher_stops.lock() {
            stops.clear();
            // Dropping all senders signals all threads to stop
        }
    }

    // Enable watchers
    pub fn enable_watchers(&self) {
        if let Ok(mut enabled) = self.enabled.lock() {
            *enabled = true;
        }
    }

    // Disable watchers and stop all active watchers
    pub fn disable_watchers(&self) {
        if let Ok(mut enabled) = self.enabled.lock() {
            *enabled = false;
        }
        self.stop_all_watchers();
    }

    // Check if watchers are enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled.lock().ok().map(|e| *e).unwrap_or(false)
    }
}
