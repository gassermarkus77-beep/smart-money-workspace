// ============================================================================
// FinScript — AST node types
// ============================================================================

export type AstNode =
  | ScriptNode
  | DeclarationNode
  | ExpressionStatementNode
  | IfNode
  | CallNode
  | BinaryNode
  | UnaryNode
  | IdentifierNode
  | NumberNode
  | StringNode
  | BoolNode
  | NaNode;

export interface ScriptNode {
  type: 'Script';
  header: ScriptHeader;
  body: AstNode[];
}

export interface ScriptHeader {
  version: number;
  kind: 'indicator' | 'strategy' | 'library';
  title: string;
  options: Record<string, unknown>;
}

export interface DeclarationNode {
  type: 'Decl';
  name: string;
  value: AstNode;
  reassign?: boolean;
}

export interface ExpressionStatementNode {
  type: 'ExprStmt';
  expr: AstNode;
}

export interface IfNode {
  type: 'If';
  test: AstNode;
  consequent: AstNode[];
  alternate?: AstNode[];
}

export interface CallNode {
  type: 'Call';
  callee: AstNode;
  args: Array<{ name?: string; value: AstNode }>;
}

export interface BinaryNode {
  type: 'Binary';
  op: string;
  left: AstNode;
  right: AstNode;
}

export interface UnaryNode {
  type: 'Unary';
  op: string;
  argument: AstNode;
}

export interface IdentifierNode { type: 'Ident'; name: string }
export interface NumberNode     { type: 'Number'; value: number }
export interface StringNode     { type: 'String'; value: string }
export interface BoolNode       { type: 'Bool'; value: boolean }
export interface NaNode         { type: 'Na' }
