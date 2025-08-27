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
} from './parser';

export {
  // Block Tree
  buildBlockTree,
  type Block,
  type BlockNode,
  type PropMeta,
  BlockType,
  type BlockGranularity,
  type BlockTreeBuilderOptions,
  type BlockTreeResult,
} from './block-tree';

export {
  // Codegen
  generateRenderFunction,
  compile,
  type CodegenOptions,
  type CodegenResult,
  type CompilerOptions,
  type CompilerResult,
  type RenderMetadata,
} from './codegen';

export {
  // SFC（.uf 单文件组件）
  parseSFC,
  compileSFC,
  SFC_COMPONENT_IDENT,
  SFC_EXPORT_IDENT,
  type SFCBlock,
  type SFCStyleBlock,
  type SFCParseOptions,
  type SFCParseResult,
  type SFCCompileOptions,
  type SFCCompileResult,
  type ScriptPayload,
} from './sfc';

// 版本信息
export const VERSION = '0.2.0';
export const PACKAGE_NAME = '@upfault/compiler';