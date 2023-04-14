/**
 * @upfault/compiler - UpFault 编译器
 * 
 * Template Parser + Block Tree + Code Generator
 * 版本: 0.2.0
 */

export {
  // Parser
  parse,
  createCompileContext,
  analyzeTemplate,
  type TemplateAST,
  type TemplateNode,
  type ElementNode,
  type TextNode,
  type InterpolationNode,
  type CommentNode,
  type ComponentNode,
  type SlotNode,
  type IfNode,
  type ForNode,
  type PropNode,
  type PropValue,
  type SourceLocation,
  type Position,
  type CompileContext,
  type ImportSpec,
  type ScopeContext,
  type VariableInfo,
  type CompileError,
  type CompileWarning,
  type ParseOptions,
  type ParseResult,
  type CompileTimeFlags,
