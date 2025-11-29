use std::fs;
use std::path::PathBuf;
use serde::Serialize;
use crate::state::AppState;
use walkdir::WalkDir;
use std::collections::HashSet;

#[derive(Serialize)]
pub struct DirectoryEntry {
    name: String,
    path: String,
    is_dir: bool,
}

#[derive(Serialize)]
pub struct RecursiveDirectoryEntry {
    name: String,
    path: String,
    is_dir: bool,
    depth: usize,
    parent_path: String,
}

#[tauri::command]
pub fn read_directory(path: Option<String>) -> Result<Vec<DirectoryEntry>, String> {
    let dir_path = if let Some(p) = path {
        PathBuf::from(p)
    } else {
        std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?
    };

    let entries = fs::read_dir(&dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        result.push(DirectoryEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
        });
    }

    // Sort: directories first, then files, both alphabetically
    result.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(result)
}

#[tauri::command]
pub fn get_terminal_cwd(session_id: String, state: tauri::State<AppState>) -> Result<String, String> {
    let sessions = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let session = sessions
        .get(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    // Get the PID of the child process (shell)
    let pid = session.child.process_id()
        .ok_or_else(|| "Failed to get process ID".to_string())?;

    #[cfg(target_os = "linux")]
    {
        // On Linux, read /proc/[pid]/cwd symlink
        let cwd_link = format!("/proc/{}/cwd", pid);
        fs::read_link(&cwd_link)
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to read cwd from /proc: {}", e))
    }

    #[cfg(not(target_os = "linux"))]
    {
        Err("Getting terminal cwd is only supported on Linux".to_string())
    }
}

#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn read_directory_recursive(
    path: Option<String>,
    max_depth: Option<usize>,
    max_files: Option<usize>
) -> Result<Vec<RecursiveDirectoryEntry>, String> {
    let root_path = if let Some(p) = path {
        PathBuf::from(p)
    } else {
        std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?
    };

    let max_depth = max_depth.unwrap_or(10);
    let max_files = max_files.unwrap_or(10000);

    // Directories to ignore
    let ignore_dirs: HashSet<&str> = [
        ".git",
        "node_modules",
        "target",
        "dist",
        "build",
        ".cache",
        ".next",
        ".nuxt",
        "__pycache__",
        ".venv",
        "venv",
    ]
    .iter()
    .copied()
    .collect();

    let mut entries = Vec::new();
    let root_path_str = root_path.to_string_lossy().to_string();

    // Walk directory tree
    for entry in WalkDir::new(&root_path)
        .max_depth(max_depth)
        .follow_links(false) // Don't follow symlinks
        .into_iter()
        .filter_entry(|e| {
            // Skip ignored directories
            if e.file_type().is_dir() {
                if let Some(name) = e.file_name().to_str() {
                    return !ignore_dirs.contains(name);
                }
            }
            true
        })
    {
        // Check if we've reached the file limit
        if entries.len() >= max_files {
            eprintln!("Warning: Reached max file limit of {}", max_files);
            break;
        }

        match entry {
            Ok(e) => {
                // Skip the root directory itself
                if e.path() == root_path {
                    continue;
                }

                // Skip symlinks
                if e.path_is_symlink() {
                    continue;
                }

                let path = e.path();
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let path_str = path.to_string_lossy().to_string();

                // Calculate parent path
                let parent_path = path
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|| root_path_str.clone());

                let is_dir = e.file_type().is_dir();
                let depth = e.depth();

                entries.push(RecursiveDirectoryEntry {
                    name,
                    path: path_str,
                    is_dir,
                    depth,
                    parent_path,
                });
            }
            Err(err) => {
                // Log error but continue processing
                eprintln!("Warning: Failed to read entry: {}", err);
            }
        }
    }

    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}
