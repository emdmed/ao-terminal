import React from "react";
import { X } from "lucide-react";
import { FileStateButton } from "./FileStateButton";

/**
 * Individual file item in the selected files list
 * Shows file state buttons and remove button
 * @param {Object} file - File object with absolute path, relative path, and name
 * @param {string} currentState - Current file state
 * @param {Function} onSetFileState - Callback to set file state
 * @param {Function} onRemoveFile - Callback to remove file
 */
export function SelectedFileItem({ file, currentState, onSetFileState, onRemoveFile }) {
  return (
    <div className="flex flex-col gap-1 p-0 py-1.5 me-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <FileStateButton
            type="modify"
            isActive={currentState === 'modify'}
            onClick={() => onSetFileState(file.absolute, 'modify')}
          />
          <FileStateButton
            type="do-not-modify"
            isActive={currentState === 'do-not-modify'}
            onClick={() => onSetFileState(file.absolute, 'do-not-modify')}
          />
          <FileStateButton
            type="use-as-example"
            isActive={currentState === 'use-as-example'}
            onClick={() => onSetFileState(file.absolute, 'use-as-example')}
          />
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
    </div>
  );
}
