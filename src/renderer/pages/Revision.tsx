import React, { useEffect, useState } from 'react';
import { Camera, Clock, Eye, Trash2, ChevronRight } from 'lucide-react';
import { useProjectStore, type Snapshot } from '@renderer/stores/projectStore';
import { diffLines, type Change } from 'diff';

export function Revision() {
  const { projectPath } = useProjectStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(
    null,
  );
  const [compareSnapshot, setCompareSnapshot] = useState<Snapshot | null>(null);
  const [snapshotFiles, setSnapshotFiles] = useState<
    { name: string; content: string }[]
  >([]);
  const [diffResult, setDiffResult] = useState<Change[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (projectPath) loadSnapshots();
  }, [projectPath]);

  async function loadSnapshots() {
    if (!projectPath) return;
    try {
      const data = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Revisions/_index.json`,
      );
      setSnapshots(data?.snapshots || []);
    } catch {
      setSnapshots([]);
    }
  }

  async function handleCreateSnapshot() {
    if (!projectPath || !snapshotName.trim()) return;
    setCreating(true);
    try {
      const id = `snap-${Date.now()}`;
      const folder = `snapshot-${id}`;
      const snapshotDir = `${projectPath}/Revisions/snapshots/${folder}`;
      await window.bookSmithy.fs.mkdir(snapshotDir);

      const chaptersDir = `${projectPath}/Manuscript/chapters`;
      const files = await window.bookSmithy.fs.readDir(chaptersDir);
      for (const file of files) {
        if (file.name.endsWith('.md')) {
          const content = await window.bookSmithy.fs.readFile(file.path);
          if (content !== null) {
            await window.bookSmithy.fs.writeFile(
              `${snapshotDir}/${file.name}`,
              content,
            );
          }
        }
      }

      const snapshot: Snapshot = {
        id,
        name: snapshotName.trim(),
        createdAt: new Date().toISOString(),
        folder,
      };
      const updated = [snapshot, ...snapshots];
      setSnapshots(updated);
      await window.bookSmithy.fs.writeJsonFile(
        `${projectPath}/Revisions/_index.json`,
        { snapshots: updated },
      );
      setSnapshotName('');
    } finally {
      setCreating(false);
    }
  }

  async function handleViewSnapshot(snap: Snapshot) {
    if (!projectPath) return;
    setSelectedSnapshot(snap);
    setCompareSnapshot(null);
    setDiffResult([]);
    setSelectedFile(null);

    const dir = `${projectPath}/Revisions/snapshots/${snap.folder}`;
    try {
      const files = await window.bookSmithy.fs.readDir(dir);
      const mdFiles = [];
      for (const f of files) {
        if (f.name.endsWith('.md')) {
          const content = await window.bookSmithy.fs.readFile(f.path);
          if (content !== null) {
            mdFiles.push({ name: f.name, content });
          }
        }
      }
      setSnapshotFiles(mdFiles);
    } catch {
      setSnapshotFiles([]);
    }
  }

  async function handleCompare(snap: Snapshot) {
    if (!projectPath || !selectedSnapshot) return;
    setCompareSnapshot(snap);

    const selectedDir = `${projectPath}/Revisions/snapshots/${selectedSnapshot.folder}`;
    const compareDir = `${projectPath}/Revisions/snapshots/${snap.folder}`;

    const file = selectedFile || snapshotFiles[0]?.name;
    if (!file) return;

    try {
      const oldContent = (await window.bookSmithy.fs.readFile(`${compareDir}/${file}`)) ?? '';
      const newContent = (await window.bookSmithy.fs.readFile(`${selectedDir}/${file}`)) ?? '';
      setDiffResult(diffLines(oldContent, newContent));
    } catch {
      setDiffResult([]);
    }
  }

  async function handleSelectDiffFile(filename: string) {
    if (!projectPath || !selectedSnapshot || !compareSnapshot) return;
    setSelectedFile(filename);

    const selectedDir = `${projectPath}/Revisions/snapshots/${selectedSnapshot.folder}`;
    const compareDir = `${projectPath}/Revisions/snapshots/${compareSnapshot.folder}`;

    try {
      const oldContent = (await window.bookSmithy.fs.readFile(`${compareDir}/${filename}`)) ?? '';
      const newContent = (await window.bookSmithy.fs.readFile(`${selectedDir}/${filename}`)) ?? '';
      setDiffResult(diffLines(oldContent, newContent));
    } catch {
      setDiffResult([]);
    }
  }

  async function handleDeleteSnapshot(snap: Snapshot) {
    if (!projectPath) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Revisions/snapshots/${snap.folder}`,
    );
    const updated = snapshots.filter((s) => s.id !== snap.id);
    setSnapshots(updated);
    await window.bookSmithy.fs.writeJsonFile(
      `${projectPath}/Revisions/_index.json`,
      { snapshots: updated },
    );
    if (selectedSnapshot?.id === snap.id) {
      setSelectedSnapshot(null);
      setSnapshotFiles([]);
      setDiffResult([]);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Snapshot name (e.g., 'First draft complete')"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
          />
          <button
            onClick={handleCreateSnapshot}
            disabled={!snapshotName.trim() || creating}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-50 text-rose-400 rounded-lg text-sm font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create Snapshot'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
        <div className="w-72 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800/50">
            <span className="text-xs text-zinc-500 font-medium">
              Snapshots
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {snapshots.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">
                No snapshots yet. Create one to save your progress.
              </p>
            ) : (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    selectedSnapshot?.id === snap.id
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                  onClick={() => handleViewSnapshot(snap)}
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{snap.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(snap.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedSnapshot &&
                      selectedSnapshot.id !== snap.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompare(snap);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-blue-400 transition-all"
                          title="Compare with selected"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSnapshot(snap);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden flex flex-col">
          {compareSnapshot && diffResult.length > 0 ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50 text-xs text-zinc-500">
                <span className="text-rose-400">{compareSnapshot.name}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-emerald-400">
                  {selectedSnapshot?.name}
                </span>
                {snapshotFiles.length > 1 && (
                  <select
                    value={selectedFile || ''}
                    onChange={(e) => handleSelectDiffFile(e.target.value)}
                    className="ml-auto bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
                  >
                    {snapshotFiles.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                {diffResult.map((part, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap ${
                      part.added
                        ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500 pl-3'
                        : part.removed
                          ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500 pl-3'
                          : 'text-zinc-400 pl-3'
                    }`}
                  >
                    {part.value}
                  </div>
                ))}
              </div>
            </>
          ) : selectedSnapshot ? (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-zinc-200 mb-3">
                {selectedSnapshot.name}
              </h3>
              <div className="space-y-2">
                {snapshotFiles.map((file) => (
                  <div
                    key={file.name}
                    className="bg-zinc-800/50 rounded-lg p-3"
                  >
                    <div className="text-xs text-zinc-400 mb-1">
                      {file.name}
                    </div>
                    <div className="text-xs text-zinc-500 line-clamp-3 whitespace-pre-wrap">
                      {file.content.replace(/^---[\s\S]*?---\n*/, '').slice(0, 200)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-4">
                Select another snapshot and click the compare icon to see
                differences.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              Select a snapshot to view or compare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
