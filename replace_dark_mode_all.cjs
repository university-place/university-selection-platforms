const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('app', function(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace bg-white with bg-card
  content = content.replace(/bg-white(?=[\s"'`])/g, 'bg-card');
  
  // Replace text-gray-900 or 800 with text-foreground
  content = content.replace(/text-gray-[89]00(?=[\s"'`])/g, 'text-foreground');
  
  // Replace border-gray-100/200/300 with border-border
  content = content.replace(/border-gray-[123]00(?=[\s"'`])/g, 'border-border');
  
  // Replace text-gray-400/500/600/700 with text-muted-foreground
  content = content.replace(/text-gray-[4567]00(?=[\s"'`])/g, 'text-muted-foreground');

  // Replace bg-gray-50/100 with bg-muted/30
  content = content.replace(/bg-gray-[50|100](?=[\s"'`])/g, 'bg-muted/30');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
