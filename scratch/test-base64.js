const crypto = require('crypto');

function isValidBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

// Generar un buffer aleatorio de 100 bytes
const buf = crypto.randomBytes(100);

// Convertir a base64 estándar
const base64Standard = buf.toString('base64');
console.log('Standard Base64 length:', base64Standard.length);
console.log('Standard Base64 matches str:', isValidBase64(base64Standard));

// Convertir a base64 sin padding (algunas librerías lo omiten)
const base64NoPadding = base64Standard.replace(/=+$/, '');
console.log('No padding Base64 length:', base64NoPadding.length);
console.log('No padding Base64 matches str:', isValidBase64(base64NoPadding));

// Generar una cadena base64 con saltos de línea (como MIME base64)
const base64WithNewlines = base64Standard.match(/.{1,4}/g).join('\n');
console.log('With newlines matches str:', isValidBase64(base64WithNewlines));
