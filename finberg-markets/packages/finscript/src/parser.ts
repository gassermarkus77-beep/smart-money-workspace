// ============================================================================
// FinScript — recursive descent parser
// Produces a ScriptNode AST from a token stream. Pratt parser for expressions
// to keep precedence handling sane.
// ============================================================================

import type { Token } from './lexer.js';
import type {
  AstNode, ScriptNode, ScriptHeader,
  DeclarationNode, ExpressionStatementNode, IfNode,
  CallNode, BinaryNode, UnaryNode,
  IdentifierNode, NumberNode, StringNode, BoolNode, NaNode,
} from './ast.js';

// Operator precedence (higher = tighter binding)
const BINARY_PREC: Record<string, number> = {
  'or': 1, 'and': 2,
  '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
  '**': 7,
};

export function parse(tokens: Token[]): ScriptNode {
  let pos = 0;
  const peek = (k = 0): Token => tokens[pos + k]!;
  const at = (kind: Token['kind'], value?: string): boolean =>
    peek().kind === kind && (value === undefined || peek().value === value);
  const eat = (kind: Token['kind'], value?: string): Token => {
    const t = peek();
    if (t.kind !== kind || (value !== undefined && t.value !== value)) {
      throw new SyntaxError(`Expected ${kind}${value ? ` '${value}'` : ''} at ${t.line}:${t.col}, got ${t.kind} '${t.value}'`);
    }
    pos++; return t;
  };
  const skipNewlines = (): void => {
    while (peek().kind === 'newline') pos++;
  };

  // ---- Header --------------------------------------------------------------
  const parseHeader = (): ScriptHeader => {
    skipNewlines();
    // //@version=N is consumed by the lexer as a comment; for v1 we require
    // a directive call at the very top: indicator(...) | strategy(...) | library(...)
    const kindTok = peek();
    if (kindTok.kind !== 'keyword' || !['indicator', 'strategy', 'library'].includes(kindTok.value)) {
      throw new SyntaxError(`Script must start with indicator(), strategy() or library()`);
    }
    pos++;
    eat('punct', '(');
    const titleTok = eat('string');
    const opts: Record<string, unknown> = {};
    while (!at('punct', ')')) {
      eat('punct', ',');
      const name = eat('ident').value;
      eat('op', '=');
      const value = parseAtom();
      opts[name] = literalValue(value);
    }
    eat('punct', ')');
    skipNewlines();
    return { version: 1, kind: kindTok.value as ScriptHeader['kind'], title: titleTok.value, options: opts };
  };

  // ---- Statement -----------------------------------------------------------
  const parseStatement = (): AstNode | null => {
    skipNewlines();
    if (at('eof')) return null;

    // if ...
    if (at('keyword', 'if')) return parseIf();
    // var/const decl: optional, plain assignment `x = expr` also creates a decl
    if (at('keyword', 'var') || at('keyword', 'const')) {
      pos++;
      const name = eat('ident').value;
      eat('op', '=');
      const value = parseExpr();
      return { type: 'Decl', name, value } satisfies DeclarationNode;
    }
    // Assignment: ident = expr   OR   ident := expr (reassign)
    if (peek().kind === 'ident' && (peek(1)?.value === '=' || peek(1)?.value === ':=')) {
      const name = eat('ident').value;
      const op = eat('op').value;
      const value = parseExpr();
      return { type: 'Decl', name, value, reassign: op === ':=' } satisfies DeclarationNode;
    }

    // Expression statement
    const expr = parseExpr();
    return { type: 'ExprStmt', expr } satisfies ExpressionStatementNode;
  };

  const parseIf = (): IfNode => {
    eat('keyword', 'if');
    const test = parseExpr();
    skipNewlines();
    // Block-style: indented by newline + statements until `else` or dedent (simplistic — single statement for now)
    const consequent: AstNode[] = [];
    const stmt = parseStatement();
    if (stmt) consequent.push(stmt);
    skipNewlines();
    let alternate: AstNode[] | undefined;
    if (at('keyword', 'else')) {
      pos++;
      skipNewlines();
      alternate = [];
      const elseStmt = parseStatement();
      if (elseStmt) alternate.push(elseStmt);
    }
    return { type: 'If', test, consequent, alternate };
  };

  // ---- Expression (Pratt) --------------------------------------------------
  const parseExpr = (minPrec = 0): AstNode => {
    let left = parseUnary();
    while (true) {
      const op = peek();
      const opVal = op.kind === 'op' ? op.value : (op.kind === 'keyword' ? op.value : '');
      const prec = BINARY_PREC[opVal];
      if (prec === undefined || prec < minPrec) break;
      pos++;
      const right = parseExpr(prec + 1);
      left = { type: 'Binary', op: opVal, left, right } satisfies BinaryNode;
    }
    return left;
  };

  const parseUnary = (): AstNode => {
    const t = peek();
    if ((t.kind === 'op' && (t.value === '-' || t.value === '+' || t.value === '!')) ||
        (t.kind === 'keyword' && t.value === 'not')) {
      pos++;
      return { type: 'Unary', op: t.value, argument: parseUnary() } satisfies UnaryNode;
    }
    return parseCallChain();
  };

  const parseCallChain = (): AstNode => {
    let node = parseAtom();
    while (true) {
      // Member access: x.y
      if (at('punct', '.')) {
        pos++;
        const name = eat('ident').value;
        node = { type: 'Binary', op: '.', left: node, right: { type: 'Ident', name } satisfies IdentifierNode };
        continue;
      }
      // Call: f(args)
      if (at('punct', '(')) {
        pos++;
        const args: CallNode['args'] = [];
        if (!at('punct', ')')) {
          args.push(parseArg());
          while (at('punct', ',')) { pos++; args.push(parseArg()); }
        }
        eat('punct', ')');
        node = { type: 'Call', callee: node, args } satisfies CallNode;
        continue;
      }
      break;
    }
    return node;
  };

  const parseArg = (): CallNode['args'][number] => {
    // Named: name = value
    if (peek().kind === 'ident' && peek(1)?.value === '=') {
      const name = eat('ident').value;
      eat('op', '=');
      return { name, value: parseExpr() };
    }
    return { value: parseExpr() };
  };

  const parseAtom = (): AstNode => {
    const t = peek();
    if (t.kind === 'number') { pos++; return { type: 'Number', value: Number(t.value) } satisfies NumberNode; }
    if (t.kind === 'string') { pos++; return { type: 'String', value: t.value } satisfies StringNode; }
    if (t.kind === 'bool')   { pos++; return { type: 'Bool', value: t.value === 'true' } satisfies BoolNode; }
    if (t.kind === 'na')     { pos++; return { type: 'Na' } satisfies NaNode; }
    if (t.kind === 'ident')  { pos++; return { type: 'Ident', name: t.value } satisfies IdentifierNode; }
    if (t.kind === 'keyword' && (t.value === 'true' || t.value === 'false')) {
      pos++; return { type: 'Bool', value: t.value === 'true' };
    }
    if (at('punct', '(')) {
      pos++;
      const e = parseExpr();
      eat('punct', ')');
      return e;
    }
    throw new SyntaxError(`Unexpected token ${t.kind} '${t.value}' at ${t.line}:${t.col}`);
  };

  const literalValue = (n: AstNode): unknown => {
    switch (n.type) {
      case 'Number': return n.value;
      case 'String': return n.value;
      case 'Bool':   return n.value;
      case 'Na':     return null;
      default:       return null;
    }
  };

  // ---- Drive ---------------------------------------------------------------
  const header = parseHeader();
  const body: AstNode[] = [];
  while (!at('eof')) {
    const s = parseStatement();
    if (s) body.push(s);
    skipNewlines();
  }
  return { type: 'Script', header, body };
}
