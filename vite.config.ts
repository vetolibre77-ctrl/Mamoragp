import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig} from 'vite';
import type {Plugin} from 'vite';

const SW_TEMPLATE = path.resolve(import.meta.dirname, 'src/pwa/sw-template.js');

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Remplace chaque marqueur du gabarit en exigeant qu'il apparaisse exactement
 * une fois : un marqueur oublié ou dupliqué fait échouer le build plutôt que de
 * produire un Service Worker silencieusement invalide.
 */
function fillTemplate(template: string, values: Record<string, string>): string {
  let output = template;
  for (const [marker, value] of Object.entries(values)) {
    const occurrences = output.split(marker).length - 1;
    if (occurrences !== 1) {
      throw new Error(
        `[mamora-offline-service-worker] marqueur ${marker} présent ${occurrences} fois dans le gabarit (attendu : 1).`,
      );
    }
    output = output.replace(marker, () => value);
  }
  return output;
}

/**
 * Génère `sw.js` après le build, avec la liste exacte des fichiers produits.
 * L'application entière (coquille HTML, chunks métier chargés à la demande,
 * styles, manifeste, icônes) est ainsi précachée : une fois ouverte, elle
 * démarre et fonctionne à 100 % hors ligne.
 */
function offlineServiceWorker(): Plugin {
  let outDir = '';
  let base = '/';

  return {
    name: 'mamora-offline-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    closeBundle() {
      const files = listFiles(outDir)
        .map(file => path.relative(outDir, file).split(path.sep).join('/'))
        .filter(file => !file.endsWith('.map') && file !== 'sw.js');

      const urls = files.map(file => encodeURI(`${base}${file}`));
      const template = fs.readFileSync(SW_TEMPLATE, 'utf8');

      // La version couvre à la fois les fichiers produits et le code du Service
      // Worker : modifier la stratégie de cache invalide donc aussi l'ancien cache.
      const version = crypto
        .createHash('sha1')
        .update(template)
        .update('\n')
        .update(urls.join('\n'))
        .digest('hex')
        .slice(0, 10);

      const output = fillTemplate(template, {
        __CACHE_VERSION__: version,
        __APP_SHELL__: encodeURI(`${base}index.html`),
        __PRECACHE_URLS__: JSON.stringify(urls, null, 2),
      });

      fs.writeFileSync(path.join(outDir, 'sw.js'), output);
      this.info(`${files.length} fichiers précachés dans sw.js (version ${version})`);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), offlineServiceWorker()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Les écrans métier sont chargés à la demande (React.lazy dans src/App.tsx).
      // On regroupe ici les grosses dépendances dans des chunks dédiés afin de
      // garder un cache navigateur stable et d'éviter des dizaines de micro-chunks.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/ },
              { name: 'vendor-charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
            ],
          },
        },
      },
    },
  };
});
