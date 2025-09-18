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