import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { InitializeRequest, InitializedNotification, DidOpenTextDocumentNotification,
  ShutdownRequest, ExitNotification } from 'vscode-languageserver-protocol/node';

// Angular owns all semantic analysis. This module only manages its LSP process.
export async function startAngular({ executable, workspace, tsProbe, ngProbe, timeoutMs = 15000 }) {
  const child = spawn(process.execPath, [executable, '--stdio', '--tsProbeLocations', tsProbe,
    '--ngProbeLocations', ngProbe, '--logToConsole', `--clientProcessId=${process.pid}`],
  { cwd: workspace, stdio: ['pipe', 'pipe', 'pipe'] });
  const messages = [];
  let stderr = '';
  let closed = false;
  const exited = new Promise(resolve => child.once('close', (code, signal) => { closed = true; resolve({ code, signal }); }));
  child.stderr.on('data', data => { stderr += data; });
  const connection = createMessageConnection(new StreamMessageReader(child.stdout), new StreamMessageWriter(child.stdin));
  connection.onNotification((method, params) => messages.push({ method, params }));
  connection.onRequest('workspace/configuration', ({ items }) => items.map(() => null));
  connection.onRequest('client/registerCapability', () => null);
  connection.onRequest('workspace/applyEdit', () => ({ applied: false, failureReason: 'Read-only lookup' }));
  connection.listen();

  async function request(method, params) {
    let timer;
    try {
      return await Promise.race([
        connection.sendRequest(method, params),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`LSP timeout: ${typeof method === 'string' ? method : method.method}`)), timeoutMs); }),
        exited.then(({ code, signal }) => { throw new Error(`Angular server exited (${code ?? signal}): ${stderr}`); }),
      ]);
    } finally { clearTimeout(timer); }
  }

  async function close() {
    if (!closed) {
      try {
        await Promise.race([request(ShutdownRequest.type), new Promise((_, reject) => {
          const t = setTimeout(() => reject(new Error('Shutdown deadline')), 1000); t.unref();
        })]);
        await connection.sendNotification(ExitNotification.type);
      } catch { child.kill('SIGTERM'); }
      const killer = setTimeout(() => child.kill('SIGKILL'), 1500);
      await exited;
      clearTimeout(killer);
    }
    connection.dispose();
    return { pid: child.pid, exited: closed, stderr };
  }

  child.on('error', error => { stderr += error.message; });
  try {
    const initialized = await request(InitializeRequest.type, {
      processId: process.pid, rootUri: pathToFileURL(workspace).href,
      workspaceFolders: [{ uri: pathToFileURL(workspace).href, name: 'lookup' }],
      capabilities: { general: { positionEncodings: ['utf-16'] }, textDocument: { definition: { linkSupport: true } } },
    });
    if (!initialized.capabilities.referencesProvider) throw new Error('Backend does not advertise references');
    if (initialized.capabilities.positionEncoding && initialized.capabilities.positionEncoding !== 'utf-16') {
      throw new Error('Unsupported backend coordinate encoding');
    }
    await connection.sendNotification(InitializedNotification.type, {});
    return {
      request, close, messages, initialized,
      async open(file) {
        await connection.sendNotification(DidOpenTextDocumentNotification.type, {
          textDocument: { uri: pathToFileURL(file).href, languageId: file.endsWith('.html') ? 'html' : 'typescript',
            version: 1, text: await readFile(file, 'utf8') },
        });
      },
    };
  } catch (error) { error.process = await close(); error.messages = messages; throw error; }
}
