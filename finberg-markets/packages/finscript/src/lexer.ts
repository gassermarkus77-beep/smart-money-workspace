// ============================================================================
// FinScript — lexer
// Produces a flat token stream for the parser. Handles comments,
// numbers (int/float/hex/scientific), strings, identifiers, keywords,
// operators, punctuation, and significant newlines.
// ============================================================================

export type TokenKind =
  | 'ident' | 'number' | 'string' | 'bool' | 'na'
  | 'keyword' | 'op' | 'punct'
  | 'newline' | 'eof';

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  col: number;
}

const KEYWORDS = new Set([
  'indicator', 'strategy', 'library',
  'if', 'else', 'for', 'while', 'switch', 'case', 'default',
  'var', 'varip', 'const', 'fn', 'return',
  'true', 'false', 'na',
  'and', 'or', 'not', 'in',
]);

const PUNCT = new Set(['(', ')', '[', ']', '{', '}', ',', ':', ';', '.']);

const MULTI_CHAR_OPS = ['==', '!=', '<=', '>=', '=>', ':=', '++', '--', '&&', '||', '**'];

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0, line = 1, col = 1;
  const N = src.length;

  const emit = (kind: TokenKind, value: string, startCol: number): void => {
    tokens.push({ kind, value, line, col: startCol });
  };

  while (i < N) {
    const c = src[i]!;

    // Whitespace (not newline)
    if (c === ' ' || c === '\t' || c === '\r') { i++; col++; continue; }

    // Newline (significant — separates statements)
    if (c === '\n') {
      // Collapse consecutive newlines into single token
      if (tokens[tokens.length - 1]?.kind !== 'newline') emit('newline', '\n', col);
      i++; line++; col = 1; continue;
    }

    // Line comment
    if (c === '/' && src[i + 1] === '/') {
      while (i < N && src[i] !== '\n') i++;
      continue;
    }
    // Block comment
    if (c === '/' && src[i + 1] === '*') {
      i += 2; col += 2;
      while (i < N && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') { line++; col = 1; } else col++;
        i++;
      }
      i += 2; col += 2; continue;
    }

    // String
    if (c === '"' || c === "'") {
      const quote = c, start = col;
      let s = '';
      i++; col++;
      while (i < N && src[i] !== quote) {
        if (src[i] === '\\' && src[i + 1] !== undefined) { s += src[i + 1]; i += 2; col += 2; }
        else { s += src[i]; i++; col++; }
      }
      i++; col++;
      emit('string', s, start);
      continue;
    }

    // Number
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const start = col;
      let s = '';
      // Hex
      if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        s = '0x'; i += 2; col += 2;
        while (i < N && /[0-9a-fA-F]/.test(src[i]!)) { s += src[i]; i++; col++; }
      } else {
        while (i < N && /[0-9]/.test(src[i]!)) { s += src[i]; i++; col++; }
        if (src[i] === '.') { s += '.'; i++; col++;
          while (i < N && /[0-9]/.test(src[i]!)) { s += src[i]; i++; col++; }
        }
        if (src[i] === 'e' || src[i] === 'E') {
          s += src[i]; i++; col++;
          if (src[i] === '+' || src[i] === '-') { s += src[i]; i++; col++; }
          while (i < N && /[0-9]/.test(src[i]!)) { s += src[i]; i++; col++; }
        }
      }
      emit('number', s, start);
      continue;
    }

    // Identifier / keyword
    if (/[A-Za-z_]/.test(c)) {
      const start = col;
      let s = '';
      while (i < N && /[A-Za-z0-9_]/.test(src[i]!)) { s += src[i]; i++; col++; }
      if (s === 'true' || s === 'false') emit('bool', s, start);
      else if (s === 'na') emit('na', s, start);
      else if (KEYWORDS.has(s)) emit('keyword', s, start);
      else emit('ident', s, start);
      continue;
    }

    // Multi-char operator?
    const two = src.slice(i, i + 2);
    if (MULTI_CHAR_OPS.includes(two)) {
      emit('op', two, col);
      i += 2; col += 2;
      continue;
    }

    // Punctuation
    if (PUNCT.has(c)) {
      emit('punct', c, col);
      i++; col++;
      continue;
    }

    // Single-char operator
    if ('+-*/%<>=!?&|^~'.includes(c)) {
      emit('op', c, col);
      i++; col++;
      continue;
    }

    throw new SyntaxError(`Unexpected character '${c}' at line ${line}, col ${col}`);
  }

  emit('eof', '', col);
  return tokens;
}
