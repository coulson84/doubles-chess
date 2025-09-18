import { buildFrontend } from '../esbuild.config.ts';
import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

async function buildAll(): Promise<void> {
  console.log('🔨 Building Chess Doubles project...');

  // Ensure dist directory exists
  if (!existsSync('dist')) {
    await mkdir('dist', { recursive: true });
  }

  try {
    // Build Tailwind CSS
    console.log('🎨 Building Tailwind CSS...');
    const { spawn } = await import('child_process');
    await new Promise((resolve, reject) => {
      const cssProcess = spawn('npm', ['run', 'build:css'], { stdio: 'inherit' });
      cssProcess.on('close', (code) => {
        if (code === 0) resolve(void 0);
        else reject(new Error(`CSS build failed with code ${code}`));
      });
    });

    // Build frontend TypeScript
    console.log('📦 Building frontend...');
    await buildFrontend();

    // Copy static files
    console.log('📋 Copying static files...');
    await cp('public', 'dist', { recursive: true });

    console.log('✅ Build completed successfully!');
    console.log('📁 Output directory: ./dist');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();