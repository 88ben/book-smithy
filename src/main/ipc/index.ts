import { registerFileSystemHandlers } from './fileSystem';
import { registerProjectHandlers } from './project';
import { registerExportHandlers } from './export';

export function registerIpcHandlers() {
  registerFileSystemHandlers();
  registerProjectHandlers();
  registerExportHandlers();
}
