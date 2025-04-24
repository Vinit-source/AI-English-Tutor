import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure assets directory exists
const assetsDir = path.join(__dirname, 'src', 'assets');
const imgDir = path.join(assetsDir, 'img');

try {
  // Create assets directory if it doesn't exist
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`Created assets directory: ${assetsDir}`);
  }
  
  // Handle img directory
  if (fs.existsSync(imgDir)) {
    // Check if it's actually a directory
    if (!fs.statSync(imgDir).isDirectory()) {
      // Rename the file to avoid conflict
      const newPath = `${imgDir}_file_${Date.now()}`;
      fs.renameSync(imgDir, newPath);
      console.log(`Renamed existing file ${imgDir} to ${newPath}`);
      
      // Create the directory
      fs.mkdirSync(imgDir);
      console.log(`Created img directory: ${imgDir}`);
    }
  } else {
    fs.mkdirSync(imgDir);
    console.log(`Created img directory: ${imgDir}`);
  }
  
  // Create placeholder images for scenarios
  const createPlaceholder = (filename, text) => {
    const filePath = path.join(imgDir, filename);
    
    // Create a simple SVG as a placeholder
    const svg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="50" fill="#f0f0f0" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="10" fill="#333">${text}</text>
    </svg>`;
    
    try {
      fs.writeFileSync(filePath, svg);
      console.log(`Created placeholder: ${filename}`);
    } catch (error) {
      console.error(`Error creating placeholder ${filename}:`, error.message);
    }
  };
  
  // Create sample images
  createPlaceholder('phone-call.svg', 'Phone');
  createPlaceholder('restaurant.svg', 'Restaurant');
  createPlaceholder('nike-store.svg', 'Nike');
  createPlaceholder('coffee-shop.svg', 'Coffee');
  createPlaceholder('class.svg', 'Class');
  createPlaceholder('birthday.svg', 'Birthday');
  
  console.log('Image assets setup complete!');
} catch (error) {
  console.error('Error setting up assets:', error.message);
}
