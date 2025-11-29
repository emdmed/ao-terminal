import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Terminal } from "./components/Terminal";
import { Layout } from "./components/Layout";
import { StatusBar } from "./components/StatusBar";
import { FileTree } from "./components/FileTree";
import { SidebarHeader } from "./components/SidebarHeader";
import { FlatViewMenu } from "./components/FlatViewMenu";
import { themes, loadTheme } from "./themes/themes";
import { invoke } from "@tauri-apps/api/core";
import { useCwdMonitor } from "./hooks/useCwdMonitor";
import { useFlatViewNavigation } from "./hooks/useFlatViewNavigation";
import { useViewModeShortcuts } from "./hooks/useViewModeShortcuts";
import { useFileSearch } from "./hooks/useFileSearch";
import { analyzeJSFile } from "./utils/fileAnalyzer";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "./components/ui/button";
import { Folder, File, ChevronUp, ChevronRight, ChevronDown } from "lucide-react";

function App() {
  const currentTheme = loadTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [terminalSessionId, setTerminalSessionId] = useState(null);

  // Ref to access terminal's imperative methods
  const terminalRef = useRef(null);

  // Ref for search input
  const searchInputRef = useRef(null);

  // Flat view navigation hook
  const { folders, currentPath, setCurrentPath, loadFolders, navigateToParent } = useFlatViewNavigation(terminalSessionId);

  // Tree view state
  const [viewMode, setViewMode] = useState('flat'); // 'flat' | 'tree'
  const [treeData, setTreeData] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // File analysis state
  const [analyzedFiles, setAnalyzedFiles] = useState(new Map());
  const [expandedAnalysis, setExpandedAnalysis] = useState(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [allFiles, setAllFiles] = useState([]); // Flat list for indexing

  // Loading state
  const [treeLoading, setTreeLoading] = useState(false);

  // Search hook
  const { initializeSearch, search, clearSearch } = useFileSearch();

  // Helper function to build tree from flat list
  const buildTreeFromFlatList = (flatList, rootPath) => {
    const nodeMap = new Map();

    // Initialize all nodes
    flatList.forEach(entry => {
      nodeMap.set(entry.path, {
        ...entry,
        children: entry.is_dir ? [] : undefined,
        depth: entry.depth
      });
    });

    const rootNodes = [];

    // Build parent-child relationships
    flatList.forEach(entry => {
      const node = nodeMap.get(entry.path);

      if (entry.parent_path === rootPath || !entry.parent_path) {
        rootNodes.push(node);
      } else {
        const parent = nodeMap.get(entry.parent_path);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    });

    // Sort recursively: folders first, alphabetically
    const sortChildren = (nodes) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
      nodes.sort((a, b) => {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    };

    sortChildren(rootNodes);
    return rootNodes;
  };

  // Tree view helper functions (defined early for use in hooks)
  const loadTreeData = async () => {
    try {
      if (!terminalSessionId) {
        console.log('Terminal session not ready');
        setTreeData([]);
        setCurrentPath('Waiting for terminal...');
        return;
      }

      setTreeLoading(true);

      // Get terminal's current CWD
      const cwd = await invoke('get_terminal_cwd', { sessionId: terminalSessionId });
      console.log('Loading tree from CWD:', cwd);

      // Load ALL items recursively (NEW)
      const allEntries = await invoke('read_directory_recursive', {
        path: cwd,
        maxDepth: 10,
        maxFiles: 10000
      });

      console.log('Loaded', allEntries.length, 'items total');

      // Build hierarchical tree from flat list
      const treeNodes = buildTreeFromFlatList(allEntries, cwd);

      setTreeData(treeNodes);
      setCurrentPath(cwd);
      setAllFiles(allEntries);
      setTreeLoading(false);

      // Initialize search index
      initializeSearch(allEntries);
    } catch (error) {
      console.error('Failed to load tree data:', error);
      setTreeData([]);
      setCurrentPath('Error loading directory');
      setTreeLoading(false);
    }
  };

  // Keyboard shortcuts hook
  useViewModeShortcuts({
    sidebarOpen,
    setSidebarOpen,
    viewMode,
    setViewMode,
    onLoadFlatView: loadFolders,
    onLoadTreeView: loadTreeData
  });

  // Clear folder expansion state when sidebar closes
  useEffect(() => {
    if (!sidebarOpen) {
      setExpandedFolders(new Set());
      setExpandedAnalysis(new Set());
    }
  }, [sidebarOpen]);

  // Monitor terminal CWD changes
  const detectedCwd = useCwdMonitor(terminalSessionId, sidebarOpen);

  // Fetch data when sidebar opens (mode-specific)
  useEffect(() => {
    if (sidebarOpen) {
      if (viewMode === 'flat') {
        loadFolders();
      } else if (viewMode === 'tree') {
        loadTreeData();
      }
    }
  }, [sidebarOpen, viewMode]);

  // Auto-refresh sidebar when terminal session becomes available
  useEffect(() => {
    if (terminalSessionId && sidebarOpen && folders.length === 0) {
      loadFolders();
    }
  }, [terminalSessionId]);

  // Reload sidebar when terminal CWD changes (mode-specific)
  useEffect(() => {
    if (detectedCwd && sidebarOpen) {
      console.log('CWD changed, updating view');
      if (viewMode === 'flat') {
        loadFolders();
      } else if (viewMode === 'tree') {
        // For tree view, reload tree and clear search
        loadTreeData();
        setSearchQuery('');
        setSearchResults(null);
      }
    }
  }, [detectedCwd, viewMode]);

  // Search handler functions
  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchQuery || searchQuery.trim() === '') {
        setSearchResults(null);
        return;
      }

      const results = search(searchQuery);
      setSearchResults(results);

      // Auto-expand matching paths
      if (results && results.length > 0) {
        expandSearchResults(results);
      }
    }, 200); // 200ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  // Handle search focus from keyboard shortcut
  const handleSearchFocus = useCallback(() => {
    if (viewMode === 'tree' && sidebarOpen) {
      searchInputRef.current?.focus();
    }
  }, [viewMode, sidebarOpen]);

  // Keyboard shortcut for search focus (Ctrl+F) - for non-terminal focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+F or Cmd+F to focus search in tree mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && viewMode === 'tree' && sidebarOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, sidebarOpen]);

  // Helper functions for multi-file copy
  const getRelativePath = (absolutePath, cwdPath) => {
    const normalizedCwd = cwdPath.endsWith('/') ? cwdPath.slice(0, -1) : cwdPath;
    const normalizedFile = absolutePath.endsWith('/') ? absolutePath.slice(0, -1) : absolutePath;

    if (normalizedFile.startsWith(normalizedCwd + '/')) {
      return normalizedFile.slice(normalizedCwd.length + 1);
    }

    if (normalizedFile === normalizedCwd) {
      return '.';
    }

    return absolutePath;
  };

  const escapeShellPath = (path) => {
    // Single quotes preserve all special characters except single quote itself
    // To include a single quote: 'path'\''s name'
    return `'${path.replace(/'/g, "'\\''")}'`;
  };

  const sendFileToTerminal = async (absolutePath) => {
    if (!terminalSessionId) {
      console.warn('Terminal session not ready');
      return;
    }

    try {
      const relativePath = getRelativePath(absolutePath, currentPath);
      const escapedPath = escapeShellPath(relativePath);
      const textToSend = `${escapedPath} `;

      await invoke('write_to_terminal', {
        sessionId: terminalSessionId,
        data: textToSend
      });

      console.log('Sent to terminal:', textToSend);

      // Focus terminal after sending path
      if (terminalRef.current?.focus) {
        terminalRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to send file to terminal:', absolutePath, error);
    }
  };


  // Tree filtering function for search
  const filterTreeBySearch = (nodes, matchingPaths) => {
    if (!matchingPaths || matchingPaths.length === 0) {
      return nodes;
    }

    const matchingSet = new Set(matchingPaths);
    const parentPathsSet = new Set();

    // Build set of all parent paths
    matchingPaths.forEach(path => {
      let currentPath = path;
      while (currentPath && currentPath !== '/') {
        const lastSlash = currentPath.lastIndexOf('/');
        if (lastSlash <= 0) break;
        currentPath = currentPath.substring(0, lastSlash);
        parentPathsSet.add(currentPath);
      }
    });

    const filterNodes = (nodes) => {
      return nodes
        .map(node => {
          const isMatch = matchingSet.has(node.path);
          const isParentOfMatch = parentPathsSet.has(node.path);

          if (!isMatch && !isParentOfMatch) {
            return null; // Filter out
          }

          let filteredChildren = node.children;
          if (node.children && Array.isArray(node.children)) {
            filteredChildren = filterNodes(node.children);
          }

          return { ...node, children: filteredChildren };
        })
        .filter(Boolean);
    };

    return filterNodes(nodes);
  };

  // Auto-expand function for search results
  const expandSearchResults = (results) => {
    const pathsToExpand = new Set();

    // Expand all parent folders of matches
    results.forEach(result => {
      let currentPath = result.path;
      while (currentPath && currentPath !== '/') {
        const lastSlash = currentPath.lastIndexOf('/');
        if (lastSlash <= 0) break;
        currentPath = currentPath.substring(0, lastSlash);
        pathsToExpand.add(currentPath);
      }

      // Also expand matching folders themselves
      if (result.is_dir) {
        pathsToExpand.add(result.path);
      }
    });

    setExpandedFolders(pathsToExpand);
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        // Collapse
        next.delete(folderPath);
      } else {
        // Expand
        next.add(folderPath);
      }
      return next;
    });
  };


  // File analysis functions
  const analyzeFile = async (filePath) => {
    // Check cache - if already analyzed, just toggle expansion
    if (analyzedFiles.has(filePath)) {
      toggleAnalysisExpansion(filePath);
      return;
    }

    try {
      // Fetch file content from backend
      const content = await invoke('read_file_content', { path: filePath });

      // Parse and analyze
      const analysis = analyzeJSFile(content, filePath);

      // Cache results
      setAnalyzedFiles(new Map(analyzedFiles).set(filePath, analysis));

      // Expand panel
      setExpandedAnalysis(new Set(expandedAnalysis).add(filePath));
    } catch (error) {
      console.error('Failed to analyze file:', filePath, error);
      // Store error state
      setAnalyzedFiles(new Map(analyzedFiles).set(filePath, { error: error.message }));
    }
  };

  const toggleAnalysisExpansion = (filePath) => {
    setExpandedAnalysis(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const sendAnalysisItemToTerminal = async (itemName, category) => {
    if (!terminalSessionId) {
      console.warn('Terminal session not ready');
      return;
    }

    try {
      // Format with category context
      const textToSend = category
        ? `${itemName} ${category} `
        : `${itemName} `;

      await invoke('write_to_terminal', {
        sessionId: terminalSessionId,
        data: textToSend
      });

      // Focus terminal after sending
      if (terminalRef.current?.focus) {
        terminalRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to send to terminal:', itemName, error);
    }
  };

  // Create filtered tree data for display
  const displayedTreeData = useMemo(() => {
    if (!searchResults) {
      return treeData;
    }

    const matchingPaths = searchResults.map(r => r.path);
    return filterTreeBySearch(treeData, matchingPaths);
  }, [treeData, searchResults]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} style={{ height: '100%' }}>
      <Layout
        sidebar={
          sidebarOpen && (
            <Sidebar collapsible="none" className="border-e m-0 p-1 max-w-[300px]" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <SidebarContent style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <SidebarHeader
                  viewMode={viewMode}
                  currentPath={currentPath}
                  onNavigateParent={navigateToParent}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  onSearchClear={handleSearchClear}
                  showSearch={viewMode === 'tree'}
                  searchInputRef={searchInputRef}
                />
                <SidebarGroup style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <SidebarGroupContent className="p-1" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    {viewMode === 'flat' ? (
                      <FlatViewMenu
                        folders={folders}
                        onFolderClick={loadFolders}
                      />
                    ) : (
                      treeLoading ? (
                        <div className="p-4 text-center">
                          <div className="text-sm opacity-60">Loading directory tree...</div>
                        </div>
                      ) : (
                        <FileTree
                          nodes={displayedTreeData}
                          searchQuery={searchQuery}
                          expandedFolders={expandedFolders}
                          currentPath={currentPath}
                          onToggle={toggleFolder}
                          onSendToTerminal={sendFileToTerminal}
                          analyzedFiles={analyzedFiles}
                          expandedAnalysis={expandedAnalysis}
                          onAnalyzeFile={analyzeFile}
                          onToggleAnalysis={toggleAnalysisExpansion}
                          onSendAnalysisItem={sendAnalysisItemToTerminal}
                        />
                      )
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          )
        }
        statusBar={
          <StatusBar
            viewMode={viewMode}
            currentPath={currentPath}
            sessionId={terminalSessionId}
            theme={themes[currentTheme]}
          />
        }
      >
        <Terminal
          ref={terminalRef}
          theme={themes[currentTheme]}
          onSessionReady={(id) => setTerminalSessionId(id)}
          onSearchFocus={handleSearchFocus}
        />
      </Layout>
    </SidebarProvider>
  );
}

export default App;
