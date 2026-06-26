const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, 'src', 'pages');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it has SEED
  if (!content.includes('SEED')) return;

  // Replace const [items, setItems] = useState<any[]>(SEED);
  // or const [items, setItems] = useState(SEED);
  const useStateRegex = /const\s+\[\s*items\s*,\s*setItems\s*\]\s*=\s*useState(?:<[^>]+>)?\(\s*SEED\s*\)\s*;/g;
  
  if (useStateRegex.test(content)) {
    // Generate a table name from the file name
    const baseName = path.basename(filePath, '.tsx').toLowerCase();
    const tableName = baseName.replace(/[^a-z0-9]/g, '_') + '_table';

    content = content.replace(useStateRegex, `const { data: items, setData: setItems } = useSupabaseTable('${tableName}', SEED);`);
    
    // Add import if not present
    if (!content.includes('useSupabaseTable')) {
      const importStatement = `import { useSupabaseTable } from '@/hooks/useSupabaseTable';\n`;
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
      } else {
        content = importStatement + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Migrated ${path.basename(filePath)}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

traverse(PAGES_DIR);
console.log("Migration complete.");
