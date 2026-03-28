import { contextBridge, ipcRenderer } from 'electron';

const api = {
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    create: (name: string, location: string, enabledFeatures?: Record<string, boolean>) =>
      ipcRenderer.invoke('project:create', name, location, enabledFeatures),
    getInfo: (projectPath: string) =>
      ipcRenderer.invoke('project:getInfo', projectPath),
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    ensureFeatureDirs: (projectPath: string, feature: string) =>
      ipcRenderer.invoke('project:ensureFeatureDirs', projectPath, feature),
    deleteFeatureData: (projectPath: string, feature: string) =>
      ipcRenderer.invoke('project:deleteFeatureData', projectPath, feature),
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath) as Promise<string | null>,
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath),
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
    deleteFile: (filePath: string) =>
      ipcRenderer.invoke('fs:deleteFile', filePath),
    rename: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('fs:rename', oldPath, newPath),
    readJsonFile: (filePath: string) =>
      ipcRenderer.invoke('fs:readJsonFile', filePath),
    writeJsonFile: (filePath: string, data: unknown) =>
      ipcRenderer.invoke('fs:writeJsonFile', filePath, data),
  },
  export: {
    toMarkdown: (projectPath: string, outputPath: string) =>
      ipcRenderer.invoke('export:markdown', projectPath, outputPath),
    toPdf: (projectPath: string, outputPath: string) =>
      ipcRenderer.invoke('export:pdf', projectPath, outputPath),
    selectSavePath: (defaultName: string, filters: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('dialog:selectSavePath', defaultName, filters),
  },
};

export type BookSmithyAPI = typeof api;

contextBridge.exposeInMainWorld('bookSmithy', api);
