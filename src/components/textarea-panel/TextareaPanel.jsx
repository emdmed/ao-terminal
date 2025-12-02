import React from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { SelectedFilesList } from "./SelectedFilesList";
import { ActionButtons } from "./ActionButtons";

/**
 * Main textarea panel component for multi-line input with file selection
 * Provides a space to compose commands and manage selected files
 */
export function TextareaPanel({
  value,
  onChange,
  onSend,
  onClose,
  textareaRef,
  disabled = false,
  selectedFiles,
  currentPath,
  onRemoveFile,
  onClearAllFiles,
  getRelativePath,
  fileStates,
  onSetFileState,
}) {
  const handleKeyDown = (e) => {
    // Enter creates new lines (default behavior)
    // Ctrl+Enter is handled by the useTextareaShortcuts hook
    if (e.key === 'Enter' && !e.ctrlKey) {
      // Allow default newline behavior
    }
  };

  const handleSend = () => {
    onSend();
    onClearAllFiles();
  };

  const fileArray = Array.from(selectedFiles || new Set());
  const filesWithRelativePaths = fileArray.map(absPath => ({
    absolute: absPath,
    relative: getRelativePath(absPath, currentPath),
    name: absPath.split('/').pop()
  }));

  return (
    <div className="flex flex-col border-t border-input bg-background p-2 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span id="textarea-instructions" className="text-xs text-muted-foreground font-mono">
          Multi-line Input (Ctrl+Enter to send, Ctrl+T to close)
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex gap-2 min-h-[120px] max-h-[300px]">
        <SelectedFilesList
          filesWithRelativePaths={filesWithRelativePaths}
          fileStates={fileStates}
          onSetFileState={onSetFileState}
          onRemoveFile={onRemoveFile}
          onClearAllFiles={onClearAllFiles}
        />

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Waiting for terminal session..." : "Type your command here... (Ctrl+Enter to send)"}
          aria-label="Multi-line command input"
          aria-describedby="textarea-instructions"
          className="flex-1 min-w-[250px] resize-none"
        />
      </div>

      {/* Action buttons */}
      <ActionButtons
        onClose={onClose}
        onSend={handleSend}
        disabled={disabled || (!value?.trim() && fileArray.length === 0)}
      />
    </div>
  );
}
