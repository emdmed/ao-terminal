use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use portable_pty::{PtyPair, Child, MasterPty};
use std::io::Write;

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub child: Box<dyn Child + Send>,
    pub writer: Box<dyn Write + Send>,
}

pub type AppState = Arc<Mutex<HashMap<String, PtySession>>>;

pub fn create_state() -> AppState {
    Arc::new(Mutex::new(HashMap::new()))
}
