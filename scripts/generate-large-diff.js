#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Performance test configuration
const config = {
  sizes: {
    small: { files: 5, linesPerFile: 100 },
    medium: { files: 20, linesPerFile: 500 },
    large: { files: 50, linesPerFile: 1000 },
    xlarge: { files: 100, linesPerFile: 2000 },
  },
};

function generateFileContent(fileIndex, lines) {
  const chunks = [];

  chunks.push(`import React from 'react';
import { useState, useEffect } from 'react';

interface Component${fileIndex}Props {
  id: string;
  data: any[];
  onUpdate: (id: string, data: any) => void;
}

export function Component${fileIndex}({ id, data, onUpdate }: Component${fileIndex}Props) {
  const [state, setState] = useState(data);
  const [loading, setLoading] = useState(false);
`);

  // Generate method bodies with realistic code
  const methodCount = Math.floor(lines / 20);
  for (let i = 0; i < methodCount; i++) {
    chunks.push(`
  const handleAction${i} = async (item: any) => {
    setLoading(true);
    try {
      const response = await fetch(\`/api/endpoint${i}/\${item.id}\`);
      const result = await response.json();
      setState(prev => [...prev, result]);
      onUpdate(id, result);
    } catch (error) {
      console.error('Error in action ${i}:', error);
    } finally {
      setLoading(false);
    }
  };
`);
  }

  // Generate JSX
  chunks.push(`
  return (
    <div className="component-${fileIndex}">
      <h2>Component ${fileIndex}</h2>
      {loading && <div>Loading...</div>}
      <div className="content">
`);

  // Add some JSX elements
  for (let i = 0; i < 10; i++) {
    chunks.push(`        <div className="item-${i}" key="${i}">
          <span>Item ${i}</span>
          <button onClick={() => handleAction${i % methodCount}({ id: '${i}' })}>
            Action ${i}
          </button>
        </div>
`);
  }

  chunks.push(`      </div>
    </div>
  );
}
`);

  return chunks.join('');
}

function generateModifiedFileContent(fileIndex, lines) {
  const content = generateFileContent(fileIndex, lines);
  const lines_array = content.split('\n');

  // Modify random lines to create realistic diffs
  const modifications = Math.floor(lines * 0.3); // Modify 30% of lines
  const modifiedLines = new Set();

  for (let i = 0; i < modifications; i++) {
    const lineIndex = Math.floor(Math.random() * lines_array.length);
    if (!modifiedLines.has(lineIndex) && lines_array[lineIndex].trim()) {
      modifiedLines.add(lineIndex);

      // Different types of modifications
      const modType = Math.random();
      if (modType < 0.3) {
        // Change variable names
        lines_array[lineIndex] = lines_array[lineIndex].replace(/item/g, 'element');
      } else if (modType < 0.6) {
        // Add comments
        lines_array[lineIndex] =
          `  // Modified: ${new Date().toISOString()}\n${lines_array[lineIndex]}`;
      } else {
        // Change string literals
        lines_array[lineIndex] = lines_array[lineIndex].replace(/'([^']+)'/g, "'modified-$1'");
      }
    }
  }

  // Add some new lines
  const additions = Math.floor(lines * 0.1); // Add 10% new lines
  for (let i = 0; i < additions; i++) {
    const insertIndex = Math.floor(Math.random() * lines_array.length);
    lines_array.splice(insertIndex, 0, `  // New line added at ${new Date().toISOString()}`);
  }

  return lines_array.join('\n');
}

function generateUnifiedDiff(filename, oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple unified diff format generator
  const diff = [];

  // Diff header
  diff.push(`diff --git a/${filename} b/${filename}`);
  diff.push(`index 0000000..1111111 100644`);
  diff.push(`--- a/${filename}`);
  diff.push(`+++ b/${filename}`);

  // For simplicity, we'll create a basic diff showing all lines
  // In a real implementation, you'd use a proper diff algorithm
  const maxLines = Math.max(oldLines.length, newLines.length);
  let contextStart = 0;
  let oldCount = 0;
  let newCount = 0;
  const chunk = [];

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine !== newLine) {
      if (oldLine !== undefined) {
        chunk.push(`-${oldLine}`);
        oldCount++;
      }
      if (newLine !== undefined) {
        chunk.push(`+${newLine}`);
        newCount++;
      }
    } else if (oldLine !== undefined) {
      chunk.push(` ${oldLine}`);
      oldCount++;
      newCount++;
    }
  }

  // Add the hunk header
  diff.push(`@@ -1,${oldCount} +1,${newCount} @@`);
  diff.push(...chunk);

  return diff.join('\n');
}

function generateDiff(size) {
  const { files, linesPerFile } = config.sizes[size];
  const diffs = [];

  for (let i = 0; i < files; i++) {
    const filename = `src/components/Component${i}.tsx`;
    const oldContent = generateFileContent(i, linesPerFile);
    const newContent = generateModifiedFileContent(i, linesPerFile);

    diffs.push(generateUnifiedDiff(filename, oldContent, newContent));
  }

  return diffs.join('\n\n');
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const size = args[0] || 'medium';

  if (!config.sizes[size]) {
    console.error(`Invalid size: ${size}`);
    console.error(`Available sizes: ${Object.keys(config.sizes).join(', ')}`);
    process.exit(1);
  }

  const diff = generateDiff(size);
  console.log(diff);
}

main();
