import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Send, X, File } from "lucide-react";

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

      <div className="flex gap-2 min-h-[120px] max-h-[300px]">
        {fileArray.length > 0 && (
          <div className="flex flex-col w-1/3 p-1 gap-1 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-xs font-semibold opacity-60">
                Selected Files ({fileArray.length})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAllFiles}
                className="text-xs h-5 px-2"
              >
                Clear all
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filesWithRelativePaths.map((file) => {
                const currentState = fileStates?.get(file.absolute) || 'modify';
                return (
                  <div key={file.absolute} className="flex flex-col gap-1 p-0 py-1.5 me-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <Button
                          onClick={() => onSetFileState(file.absolute, 'modify')}
                          size="icon-xs"
                          className="w-4 h-4"
                          variant={currentState === "modify" ? "" : "outline"}
                          title="Modify this file"
                        >
                          M
                        </Button>
                        <Button
                          onClick={() => onSetFileState(file.absolute, 'do-not-modify')}
                          size="icon-xs"
                          variant={currentState === "do-not-modify" ? "destructive" : "outline"}
                          className="w-4 h-4"
                          title="Do not modify this file"
                        >
                          D
                        </Button>
                        <Button
                          onClick={() => onSetFileState(file.absolute, 'use-as-example')}
                          size="icon-xs"
                          variant={currentState === "use-as-example" ? "" : "outline"}
                          className="w-4 h-4"
                          title="Use as example"
                        >
                          E
                        </Button>
                        <span className="text-xs truncate" title={file.absolute}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveFile(file.absolute)}
                        className="p-0.5 opacity-60 hover:opacity-100 hover:bg-white/10 rounded flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-1">

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={disabled || (!value?.trim() && fileArray.length === 0)}
        >
          <Send className="h-4 w-4 mr-2" />
          Send to Terminal
        </Button>
      </div>
    </div>
  );
}
