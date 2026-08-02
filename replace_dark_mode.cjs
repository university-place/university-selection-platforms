const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'app/student/dashboard/page.tsx',
  'app/moe/dashboard/page.tsx',
];

for (const relPath of filesToProcess) {
  const absolutePath = path.join('c:/Users/hp/OneDrive/Desktop/university-selection-platforms', relPath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`File not found: ${absolutePath}`);
    continue;
  }

  let content = fs.readFileSync(absolutePath, 'utf8');

  // Replace bg-white with bg-card, except for cases where it's part of another class like bg-white/20
  // regex: bg-white(?=[\s"'])
  content = content.replace(/bg-white(?=[\s"'])/g, 'bg-card border-border');
  
  // Replace text-gray-900 or text-gray-800 with text-foreground
  content = content.replace(/text-gray-[89]00(?=[\s"'])/g, 'text-foreground');
  
  // Replace border-gray-100 or 200 with border-border
  content = content.replace(/border-gray-[123]00(?=[\s"'])/g, 'border-border');
  
  // Replace text-gray-400 or 500 or 600 with text-muted-foreground
  content = content.replace(/text-gray-[456]00(?=[\s"'])/g, 'text-muted-foreground');

  // Replace bg-gray-50 with bg-muted/30
  content = content.replace(/bg-gray-50(?=[\s"'])/g, 'bg-muted/30');
  
  // Replace border-b or border without specific color just to be safe it's using border-border
  // Tailwind v4 uses --color-border by default for border class, so `border` is fine.

  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log(`Updated ${relPath}`);
}
