import { build } from 'esbuild';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export const buildFrontend = async (): Promise<void> => {
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

if (import.meta.url === `file://${resolve(process.argv[1])}`) {
  buildFrontend();
}