use tauri::{AppHandle, Emitter};
use std::io::Read;
use std::thread;
use uuid::Uuid;
use crate::state::AppState;
use crate::pty::manager;

#[tauri::command]
pub fn spawn_terminal(
    rows: u16,
    cols: u16,
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<String, String> {
    // Generate a unique session ID
    let session_id = Uuid::new_v4().to_string();

    // Spawn the PTY
    let session = manager::spawn_pty(rows, cols)?;

    // Clone the master for the reader thread
    let mut reader = session
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    // Spawn a thread to read from PTY and emit events
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    // Convert bytes to string (handling UTF-8)
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();

                    // Emit event to frontend
                    let _ = app_clone.emit("terminal-output", serde_json::json!({
                        "session_id": session_id_clone,
                        "data": data,
                    }));
                }
                Ok(_) => {
                    // EOF reached, process exited
                    let _ = app_clone.emit("terminal-output", serde_json::json!({
                        "session_id": session_id_clone,
                        "data": "\r\n[Process exited]\r\n",
                    }));
                    break;
                }
                Err(e) => {
                    eprintln!("Error reading from PTY: {}", e);
                    break;
                }
            }
        }
    });

    // Store the session
    state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?
        .pty_sessions
        .insert(session_id.clone(), session);

    Ok(session_id)
}

#[tauri::command]
pub fn write_to_terminal(
    session_id: String,
    data: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let mut state_lock = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let session = state_lock
        .pty_sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    manager::write_to_pty(session, &data)
}

#[tauri::command]
pub fn resize_terminal(
    session_id: String,
    rows: u16,
    cols: u16,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let mut state_lock = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let session = state_lock
        .pty_sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    manager::resize_pty(session, rows, cols)
}

#[tauri::command]
pub fn close_terminal(session_id: String, state: tauri::State<AppState>) -> Result<(), String> {
    let mut state_lock = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    state_lock
        .pty_sessions
        .remove(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    Ok(())
}
