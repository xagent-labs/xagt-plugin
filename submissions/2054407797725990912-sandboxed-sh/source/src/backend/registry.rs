use std::collections::HashMap;
use std::sync::Arc;

use super::Backend;

#[derive(Debug, Clone)]
pub struct BackendInfo {
    pub id: String,
    pub name: String,
}

pub struct BackendRegistry {
    backends: HashMap<String, Arc<dyn Backend>>,
    default_backend: String,
}

impl BackendRegistry {
    pub fn new(default_backend: impl Into<String>) -> Self {
        Self {
            backends: HashMap::new(),
            default_backend: default_backend.into(),
        }
    }

    pub fn register(&mut self, backend: Arc<dyn Backend>) {
        self.backends.insert(backend.id().to_string(), backend);
    }

    pub fn list(&self) -> Vec<BackendInfo> {
        let mut list: Vec<_> = self
            .backends
            .values()
            .map(|backend| BackendInfo {
                id: backend.id().to_string(),
                name: backend.name().to_string(),
            })
            .collect();
        list.sort_by(|a, b| a.name.cmp(&b.name));
        list
    }

    pub fn get(&self, id: &str) -> Option<Arc<dyn Backend>> {
        self.backends.get(id).cloned()
    }

    pub fn default_backend(&self) -> Option<Arc<dyn Backend>> {
        self.get(&self.default_backend)
            .or_else(|| self.backends.values().next().cloned())
    }

    pub fn default_id(&self) -> &str {
        &self.default_backend
    }
}
