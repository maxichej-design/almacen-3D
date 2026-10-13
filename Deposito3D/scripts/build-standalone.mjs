// Genera "Deposito3D.html": un único archivo que se abre con doble clic,
// sin servidor ni instalación (JS y CSS quedan incrustados en el HTML).
// Uso: npm run build:standalone
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<script type="module" crossorigin src="\/?([^"]+)"><\/script>/, (_, src) => {
  const js = readFileSync(join(dist, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\/?([^"]+)">/, (_, href) => {
  return `<style>${readFileSync(join(dist, href), 'utf8')}</style>`;
});

if (/src="\/?assets\//.test(html) || /href="\/?assets\//.test(html)) {
  throw new Error('Quedaron referencias a assets sin incrustar');
}
writeFileSync('Deposito3D.html', html);
console.log(`Deposito3D.html generado (${(html.length / 1024).toFixed(0)} kB)`);
