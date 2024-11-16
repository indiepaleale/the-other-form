import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  type: 'module',
  root: './src', // Assuming your main files are in the 'src' directory
  build: {
    outDir: '../dist', // Output directory for the build
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'), // Entry point for your application
      },
    },
  },
  server: {
    open: true, // Automatically open the app in the browser on server start
  },
  define: {
    // By default, Vite doesn't include shims for NodeJS/
    // necessary for segment analytics lib to work
    global: {},
  },
});