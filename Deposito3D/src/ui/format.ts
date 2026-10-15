export const fmtNum = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
export const plural = (n: number, one: string, many: string) => `${fmtNum(n)} ${n === 1 ? one : many}`;

interface DownloadsApi {
  save(req: { filename: string; data: string }): Promise<unknown>;
}
type ClaudeHost = { use?: (name: string) => Promise<unknown> };

/**
 * Ofrece un archivo para guardar. Dentro de claude.ai usa el mecanismo de descargas
 * del visor (las descargas directas están bloqueadas ahí); en un navegador común, un link.
 */
export async function downloadFile(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    try {
      const downloads = (await host.use('downloads')) as DownloadsApi | null;
      if (downloads) {
        await downloads.save({ filename: name, data: content });
        return;
      }
    } catch {
      return; // el usuario canceló o no está disponible
    }
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
