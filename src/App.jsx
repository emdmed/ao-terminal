import { useState, useEffect } from "react";
import { Terminal } from "./components/Terminal";
import { Layout } from "./components/Layout";
import { themes, loadTheme } from "./themes/themes";
import { invoke } from "@tauri-apps/api/core";
import { useCwdMonitor } from "./hooks/useCwdMonitor";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Folder, File, ChevronUp } from "lucide-react";

function App() {
  const currentTheme = loadTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [terminalSessionId, setTerminalSessionId] = useState(null);

  // Monitor terminal CWD changes
  const detectedCwd = useCwdMonitor(terminalSessionId, sidebarOpen);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        setSidebarOpen((prev) => !prev);
      }
    };

    // Use capture phase to intercept before terminal
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Fetch folders when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      loadFolders();
    }
  }, [sidebarOpen]);

  // Auto-refresh sidebar when terminal session becomes available
  useEffect(() => {
    if (terminalSessionId && sidebarOpen && folders.length === 0) {
      loadFolders();
    }
  }, [terminalSessionId]);

  // Reload sidebar when terminal CWD changes
  useEffect(() => {
    if (detectedCwd && sidebarOpen) {
      console.log('CWD changed, reloading sidebar');
      loadFolders();
    }
  }, [detectedCwd]);

  const loadFolders = async (path) => {
    try {
      let targetPath = path;

      // If no explicit path, get terminal's CWD first
      if (!path) {
        if (!terminalSessionId) {
          console.log('No terminal session yet');
          setFolders([]);
          setCurrentPath('Waiting for terminal...');
          return;
        }

        // Get terminal's actual CWD FIRST
        targetPath = await invoke('get_terminal_cwd', { sessionId: terminalSessionId });
        console.log('Terminal CWD:', targetPath);
      }

      // Now load files from the correct directory
      const directories = await invoke('read_directory', { path: targetPath });
      console.log('Loaded', directories.length, 'items from:', targetPath);

      setFolders(directories);
      setCurrentPath(targetPath);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
      setCurrentPath('Error loading directory');
    }
  };

  const navigateToParent = async () => {
    if (!currentPath || currentPath === '/') {
      return; // Already at root
    }

    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    await loadFolders(parentPath);
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Layout
        sidebar={
          sidebarOpen && (
            <Sidebar collapsible="none">
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.7, flex: 1 }}>
                        {currentPath || 'No path'}
                      </div>
                      {currentPath && currentPath !== '/' && (
                        <button
                          onClick={navigateToParent}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.7,
                          }}
                          title="Go to parent directory"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </SidebarGroupLabel>
                  <SidebarGroupContent className="p-2">
                    <SidebarMenu>
                      {folders.length === 0 ? (
                        <div style={{ padding: '0.5rem', opacity: 0.5, fontSize: '0.875rem' }}>
                          No files or folders found
                        </div>
                      ) : (
                        folders.map((item) => (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              onClick={item.is_dir ? () => loadFolders(item.path) : undefined}
                              style={{ cursor: item.is_dir ? 'pointer' : 'default' }}
                            >
                              {item.is_dir ? (
                                <Folder className="w-4 h-4 mr-2" />
                              ) : (
                                <File className="w-4 h-4 mr-2" />
                              )}
                              {item.name}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          )
        }
      >
        <Terminal
          theme={themes[currentTheme]}
          onSessionReady={(id) => setTerminalSessionId(id)}
        />
      </Layout>
    </SidebarProvider>
  );
}

export default App;
