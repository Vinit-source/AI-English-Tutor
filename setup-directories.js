import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to create
const directories = [
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'styles'),
  path.join(__dirname, 'src', 'assets'),
  path.join(__dirname, 'src', 'assets', 'img')
];

// Create all directories
directories.forEach(dir => {
  try {
    // Check if path exists
    const exists = fs.existsSync(dir);
    
    // If it exists but is not a directory, rename it first
    if (exists && !fs.statSync(dir).isDirectory()) {
      console.log(`Path exists but is not a directory: ${dir}`);
      fs.renameSync(dir, `${dir}_file_${Date.now()}`);
      console.log(`Renamed to avoid conflict`);
      exists = false;
    }
    
    // Create the directory if it doesn't exist
    if (!exists) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`Error handling directory ${dir}:`, error.message);
  }
});

console.log('Directory setup complete!');
