export const StatusBar = ({ viewMode, currentPath, sessionId, theme }) => {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-t text-xs font-mono"
      style={{
        backgroundColor: theme.background || '#1F1F28',
        color: theme.foreground || '#DCD7BA',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        height: '32px',
      }}
    >
      {/* Left section: Current path */}
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="overflow-hidden whitespace-nowrap" style={{ textOverflow: 'ellipsis' }}>
          {currentPath || '~'}
        </span>
      </div>

      {/* Right section: Session status */}
      <div className="flex items-center gap-2">
        <span style={{ color: theme.cursor || '#C8C093' }}>
          {sessionId ? `Session: ${sessionId.slice(0, 8)}` : 'No session'}
        </span>
      </div>
    </div>
  );
};
