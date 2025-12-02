import React from "react";
import { Button } from "../ui/button";
import { SelectedFileItem } from "./SelectedFileItem";

/**
 * Sidebar showing list of selected files with state buttons
 * @param {Array} filesWithRelativePaths - Array of file objects
 * @param {Map} fileStates - Map of file absolute paths to states
 * @param {Function} onSetFileState - Callback to set file state
 * @param {Function} onRemoveFile - Callback to remove file
 * @param {Function} onClearAllFiles - Callback to clear all files
 */
export function SelectedFilesList({
  filesWithRelativePaths,
  fileStates,
  onSetFileState,
  onRemoveFile,
  onClearAllFiles
}) {
  if (filesWithRelativePaths.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col w-1/3 p-1 gap-1 overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-xs font-semibold opacity-60">
          Selected Files ({filesWithRelativePaths.length})
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
            <SelectedFileItem
              key={file.absolute}
              file={file}
              currentState={currentState}
              onSetFileState={onSetFileState}
              onRemoveFile={onRemoveFile}
            />
          );
        })}
      </div>
    </div>
  );
}
