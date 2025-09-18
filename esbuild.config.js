import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

const buildFrontend = async () => {
  try {
     await build({
      entryPoints: ['frontend/src/app.ts'],
      bundle: true,
      outfile: 'dist/app.js',
      format: 'iife',
      target: 'es2020',
      platform: 'browser',
      minify: isProduction,
      sourcemap: !isProduction,
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
      },
      tsconfig: 'tsconfig.frontend.json',
      logLevel: 'info'
    });

    console.log('Frontend build completed successfully');
  } catch (error) {
    console.error('Frontend build failed:', error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (import.meta.url === `file://${__filename}`) {
  buildFrontend();
}