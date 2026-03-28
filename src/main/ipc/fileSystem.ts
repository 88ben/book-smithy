import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

export function registerFileSystemHandlers() {
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  });

  ipcMain.handle(
    'fs:writeFile',
    async (_event, filePath: string, content: string) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    },
  );

  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name),
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
    await fs.mkdir(dirPath, { recursive: true });
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
    await fs.rm(filePath, { recursive: true, force: true });
  });

  ipcMain.handle(
    'fs:rename',
    async (_event, oldPath: string, newPath: string) => {
      await fs.rename(oldPath, newPath);
    },
  );

  ipcMain.handle('fs:readJsonFile', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    'fs:writeJsonFile',
    async (_event, filePath: string, data: unknown) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    },
  );
}
