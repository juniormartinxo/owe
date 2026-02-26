const vscode = require('vscode');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { promisify } = require('node:util');

const execFile = promisify(cp.execFile);
const IS_WSL =
  Boolean(process.env.WSL_DISTRO_NAME) ||
  os.release().toLowerCase().includes('microsoft');

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'antigravity.openInWindowsExplorer',
    async (resource) => {
      try {
        const targetUri = await resolveTargetUri(resource);
        if (!targetUri) {
          vscode.window.showWarningMessage('No file or folder selected to open in Windows Explorer.');
          return;
        }

        const targetInfo = await resolveExplorerTarget(targetUri);
        await openInWindowsExplorer(targetInfo.path, targetInfo.select);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Unable to open in Windows Explorer: ${message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function resolveTargetUri(resource) {
  if (Array.isArray(resource) && resource.length > 0 && resource[0] instanceof vscode.Uri) {
    return resource[0];
  }

  if (resource instanceof vscode.Uri) {
    return resource;
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document?.uri) {
    return activeEditor.document.uri;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  return workspaceFolder?.uri;
}

async function resolveExplorerTarget(uri) {
  const stat = await safeStat(uri);
  const isDirectory =
    stat?.type === vscode.FileType.Directory ||
    (!stat && uri.path.endsWith('/'));

  if (uri.scheme === 'file') {
    const localPath = uri.fsPath;
    const windowsPath = await toWindowsPath(localPath);
    return { path: windowsPath, select: !isDirectory };
  }

  if (uri.scheme === 'vscode-remote') {
    const authority = uri.authority || '';
    if (authority.startsWith('wsl+')) {
      const distro = decodeURIComponent(authority.slice(4));
      if (!distro) {
        throw new Error('Could not detect WSL distro from URI.');
      }

      const remotePath = decodeURIComponent(uri.path).replace(/\//g, '\\');
      const windowsPath = `\\\\wsl.localhost\\${distro}${remotePath}`;
      return { path: windowsPath, select: !isDirectory };
    }

    throw new Error(`Unsupported remote authority: ${authority}`);
  }

  throw new Error(`Unsupported URI scheme: ${uri.scheme}`);
}

async function safeStat(uri) {
  try {
    return await vscode.workspace.fs.stat(uri);
  } catch {
    return undefined;
  }
}

async function toWindowsPath(inputPath) {
  if (!inputPath) {
    throw new Error('Invalid path.');
  }

  if (inputPath.startsWith('\\\\')) {
    return inputPath;
  }

  if (process.platform === 'win32') {
    return inputPath;
  }

  if (!IS_WSL) {
    throw new Error(`Current platform (${process.platform}) is not supported.`);
  }

  const { stdout } = await execFile('wslpath', ['-w', inputPath]);
  const windowsPath = stdout.trim();
  if (!windowsPath) {
    throw new Error(`Could not convert path: ${inputPath}`);
  }

  return windowsPath;
}

async function openInWindowsExplorer(targetPath, select) {
  const normalizedPath = normalizeForExplorer(targetPath);
  const explorerPath = normalizeWslUncPath(normalizedPath);
  const uncPath = isUncPath(explorerPath);

  // /select is unreliable for UNC paths (including WSL shares) and can trigger duplicate windows.
  if (select && !uncPath) {
    await runExplorer(['/select,', explorerPath]);
    return;
  }

  const openTarget = select && uncPath ? path.win32.dirname(explorerPath) : explorerPath;
  await runExplorer([openTarget]);
}

async function runExplorer(args) {
  try {
    await execFile('explorer.exe', args);
  } catch (error) {
    if (error && typeof error === 'object') {
      if (error.code === 'ENOENT') {
        throw new Error('explorer.exe was not found. Use this command from Windows or WSL.');
      }

      if (error.code === 'EACCES') {
        throw new Error('explorer.exe is not executable in this environment.');
      }
    }
    // explorer.exe frequently returns non-zero exit codes even when the window opens successfully.
  }
}

function normalizeForExplorer(targetPath) {
  if (targetPath.startsWith('\\\\')) {
    return targetPath;
  }

  if (process.platform === 'win32') {
    return path.win32.normalize(targetPath);
  }

  // In WSL, wslpath already returns a valid Windows path (for example, C:\Users\...).
  return targetPath;
}

function normalizeWslUncPath(targetPath) {
  return targetPath.replace(/^\\\\wsl\$\\/i, '\\\\wsl.localhost\\');
}

function isUncPath(targetPath) {
  return targetPath.startsWith('\\\\');
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
