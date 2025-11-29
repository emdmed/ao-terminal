import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronUp, Search, X, GitBranch } from 'lucide-react';

export function SidebarHeader({
  viewMode,
  currentPath,
  onNavigateParent,
  searchQuery,
  onSearchChange,
  onSearchClear,
  showSearch,
  searchInputRef,
  showGitChangesOnly,
  onToggleGitFilter
}) {
  return (
    <div style={{
      padding: '4px 8px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      flexShrink: 0
    }}>
      {/* Mode badge + parent navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
      }}>
        <Badge variant={viewMode === 'tree' ? 'info' : 'success'}>
          {viewMode === 'tree' ? 'CLAUDE MODE' : 'NAVIGATION MODE'}
        </Badge>
        <div style={{ display: 'flex', gap: '4px' }}>
          {showSearch && (
            <Button
              onClick={onToggleGitFilter}
              size="icon-xs"
              variant={showGitChangesOnly ? 'default' : 'ghost'}
              title={showGitChangesOnly ? "Show all files (Ctrl+G)" : "Show only files with git changes (Ctrl+G)"}
            >
              <GitBranch className="w-3 h-3" />
            </Button>
          )}
          {currentPath && currentPath !== '/' && (
            <Button
              onClick={onNavigateParent}
              size="icon-xs"
              variant="ghost"
              title="Go to parent directory"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search input - only in tree mode */}
      {showSearch && (
        <div style={{ position: 'relative' }}>
          <Search className="w-3 h-3" style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.5
          }} />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search files... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: '28px',
              paddingRight: searchQuery ? '28px' : '8px',
              fontSize: '0.75rem',
              height: '28px'
            }}
          />
          {searchQuery && (
            <button
              onClick={onSearchClear}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
                padding: '2px'
              }}
              className="hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
