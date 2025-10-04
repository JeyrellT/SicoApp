const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const filePath = path.join(__dirname, '..', 'public', 'cleaned', 'SancionProveedores.csv');

const text = fs.readFileSync(filePath, 'utf8');

const preprocess = (chunk, delimiterHint) => {
  if (!chunk) return chunk;

  const delimiter = delimiterHint || (chunk.includes(';') ? ';' : ',');
  const newline = chunk.includes('\r\n') ? '\r\n' : '\n';

  let textContent = chunk.replace(/^\uFEFF/, '');
  let lines = textContent.split(/\r?\n/);

  const countUnquotedDelimiters = (line, sep) => {
    let count = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === '"') {
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && char === sep) {
        count += 1;
      }
    }

    return count;
  };

  const unwrapLine = (line) => {
    const trimmed = line.trim();
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replace(/""/g, '"');
    }
    return line;
  };

  const sampleLines = lines
    .slice(0, Math.min(lines.length, 10))
    .filter(line => line.trim().length > 0);

  const shouldUnwrapAllLines = sampleLines.length > 0 && sampleLines.every(rawLine => {
    const trimmed = rawLine.trim();
    return trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"') &&
      countUnquotedDelimiters(trimmed, delimiter) === 0;
  });

  const dataSample = lines
    .slice(1, Math.min(lines.length, 11))
    .filter(line => line.trim().length > 0);

  const shouldUnwrapDataLines = !shouldUnwrapAllLines &&
    dataSample.length > 0 &&
    dataSample.every(rawLine => {
      const trimmed = rawLine.trim();
      return trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"') &&
        countUnquotedDelimiters(trimmed, delimiter) === 0;
    });

  if (shouldUnwrapAllLines) {
    lines = lines.map(line => unwrapLine(line));
  } else if (shouldUnwrapDataLines) {
    lines = lines.map((line, index) => index === 0 ? line : unwrapLine(line));
  }

  return lines.join(newline);
};

const processedText = preprocess(text);

const result = Papa.parse(processedText, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  delimitersToGuess: [',', ';']
});

console.log('Errors:', result.errors);
console.log('Delimiter detected:', result.meta.delimiter);
console.log('Fields:', result.meta.fields);
console.log('First record keys:', Object.keys(result.data[0] || {}));
console.log('First record:', result.data[0]);
