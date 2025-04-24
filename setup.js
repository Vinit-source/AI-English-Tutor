import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure a directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
    return;
  }
  
  // Check if it's a directory
  if (!fs.statSync(dirPath).isDirectory()) {
    // Rename the file to avoid conflict
    const newPath = `${dirPath}_file_${Date.now()}`;
    fs.renameSync(dirPath, newPath);
    console.log(`Renamed existing file ${dirPath} to ${newPath}`);
    
    // Create the directory
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  } else {
    console.log(`Directory already exists: ${dirPath}`);
  }
};

// Create SVG placeholder
const createSvgPlaceholder = (filePath, text) => {
  const svg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
    <rect width="50" height="50" fill="#f0f0f0" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="10" fill="#333">${text}</text>
  </svg>`;
  
  try {
    fs.writeFileSync(filePath, svg);
    console.log(`Created placeholder: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Error creating file ${filePath}:`, error.message);
  }
};

try {
  // 1. Create necessary directories
  const directories = [
    path.join(__dirname, 'src', 'components'),
    path.join(__dirname, 'src', 'styles'),
    path.join(__dirname, 'src', 'assets'),
    path.join(__dirname, 'src', 'assets', 'img')
  ];
  
  directories.forEach(ensureDir);
  
  // 2. Create placeholder images
  const imgDir = path.join(__dirname, 'src', 'assets', 'img');
  const placeholders = [
    { filename: 'phone-call.svg', text: 'Phone' },
    { filename: 'restaurant.svg', text: 'Restaurant' },
    { filename: 'nike-store.svg', text: 'Nike' },
    { filename: 'coffee-shop.svg', text: 'Coffee' },
    { filename: 'class.svg', text: 'Class' },
    { filename: 'birthday.svg', text: 'Birthday' }
  ];
  
  placeholders.forEach(({ filename, text }) => {
    createSvgPlaceholder(path.join(imgDir, filename), text);
  });
  
  console.log('Setup completed successfully!');
} catch (error) {
  console.error('Setup failed:', error.message);
}
