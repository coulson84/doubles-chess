import { context } from 'esbuild';
import { cp } from 'fs/promises';

async function devBuild(): Promise<void> {
  console.log('🔄 Starting development build with watch mode...');

  try {
    // Build frontend with watch mode
    const ctx = await context({
      entryPoints: ['frontend/src/app.ts'],
      bundle: true,
      outfile: 'dist/app.js',
      format: 'iife',
      target: 'es2020',
      platform: 'browser',
      minify: false,
      sourcemap: true,
      tsconfig: 'tsconfig.frontend.json',
      logLevel: 'info',
      loader: { '.ts': 'ts' },
    });

    await ctx.watch();

    // Copy static files initially
    await cp('public', 'dist', { recursive: true });

    console.log('👀 Watching for changes...');
    console.log('Press Ctrl+C to stop watching');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping watch mode...');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Development build failed:', error);
    process.exit(1);
  }
}

devBuild();