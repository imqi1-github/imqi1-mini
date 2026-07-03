import type { CodeLine, CodeToken, CodeTokenType } from '@/types/markdown'

// 轻量代码高亮：小程序无法用 DOM / v-html，故把代码切成带类型的片段，
// 由页面用原生 <text> 加颜色 class 渲染。这里做的是「够用」而非精确的
// 词法分析——按通用 C-like 规则识别字符串 / 注释 / 数字 / 函数名 / 标点，
// 再按语言关键字表着色。未知语言退化为「字符串 + 注释 + 数字」保守着色。

// 各语言关键字表（小写归一化匹配）。未列出的语言走通用规则、无关键字着色。
const KEYWORDS: Record<string, string[]> = {
  common: [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
    'continue', 'return', 'function', 'class', 'new', 'try', 'catch', 'finally',
    'throw', 'this', 'true', 'false', 'null', 'void', 'const', 'let', 'var',
  ],
  javascript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'default', 'break', 'continue', 'class', 'extends',
    'new', 'this', 'super', 'import', 'export', 'from', 'as', 'async', 'await',
    'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of',
    'delete', 'void', 'yield', 'true', 'false', 'null', 'undefined',
  ],
  typescript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'default', 'break', 'continue', 'class', 'extends',
    'implements', 'interface', 'type', 'enum', 'namespace', 'new', 'this',
    'super', 'import', 'export', 'from', 'as', 'async', 'await', 'try', 'catch',
    'finally', 'throw', 'typeof', 'instanceof', 'keyof', 'in', 'of', 'delete',
    'void', 'yield', 'public', 'private', 'protected', 'readonly', 'static',
    'abstract', 'declare', 'true', 'false', 'null', 'undefined',
  ],
  python: [
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
    'continue', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise',
    'with', 'lambda', 'yield', 'global', 'nonlocal', 'pass', 'del', 'in', 'is',
    'not', 'and', 'or', 'None', 'True', 'False', 'self', 'async', 'await',
  ],
  java: [
    'public', 'private', 'protected', 'class', 'interface', 'extends',
    'implements', 'abstract', 'final', 'static', 'void', 'new', 'return', 'if',
    'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
    'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'this', 'super',
    'import', 'package', 'instanceof', 'true', 'false', 'null', 'int', 'long',
    'double', 'float', 'boolean', 'char', 'byte', 'short', 'String',
  ],
  go: [
    'package', 'import', 'func', 'return', 'if', 'else', 'for', 'range',
    'switch', 'case', 'default', 'break', 'continue', 'var', 'const', 'type',
    'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select', 'fallthrough',
    'goto', 'nil', 'true', 'false', 'string', 'int', 'bool', 'error',
  ],
  rust: [
    'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl',
    'pub', 'use', 'mod', 'return', 'if', 'else', 'match', 'for', 'while', 'loop',
    'break', 'continue', 'in', 'ref', 'move', 'where', 'as', 'dyn', 'self',
    'Self', 'super', 'crate', 'true', 'false', 'None', 'Some', 'Ok', 'Err',
  ],
  c: [
    'int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned',
    'signed', 'struct', 'union', 'enum', 'typedef', 'const', 'static', 'extern',
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'break', 'continue', 'goto', 'sizeof', 'NULL', 'true', 'false',
  ],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case',
    'esac', 'function', 'return', 'in', 'echo', 'export', 'local', 'source',
    'cd', 'exit', 'set', 'unset', 'readonly',
  ],
}

// 语言别名归一化
const LANG_ALIAS: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  node: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  python3: 'python',
  golang: 'go',
  rs: 'rust',
  'c++': 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
}

function resolveLang(lang: string): string {
  const key = lang.trim().toLowerCase()
  return LANG_ALIAS[key] ?? key
}

// 行注释前缀：不同语言起始不同
function lineCommentToken(lang: string): string {
  if (lang === 'python' || lang === 'bash' || lang === 'ruby' || lang === 'yaml') return '#'
  return '//'
}

const IDENT_START = /[A-Za-z_$]/
const IDENT_PART = /[A-Za-z0-9_$]/
const DIGIT = /[0-9]/
const PUNCT = /[{}()[\]<>;,.:?!&|+\-*/%=~^@]/

/** 对单行代码做词法切分 */
function tokenizeLine(line: string, keywords: Set<string>, commentPrefix: string): CodeLine {
  const tokens: CodeToken[] = []
  let i = 0
  const n = line.length

  const push = (type: CodeTokenType, text: string) => {
    if (!text) return
    const last = tokens[tokens.length - 1]
    if (last && last.type === type) {
      last.text += text
    } else {
      tokens.push({ type, text })
    }
  }

  while (i < n) {
    const ch = line[i]

    // 行注释：从注释前缀到行尾
    if (line.startsWith(commentPrefix, i)) {
      push('comment', line.slice(i))
      break
    }

    // 字符串：单引号 / 双引号 / 反引号，处理转义
    if (ch === '"' || ch === '\'' || ch === '`') {
      const quote = ch
      let j = i + 1
      while (j < n) {
        if (line[j] === '\\') {
          j += 2
          continue
        }
        if (line[j] === quote) {
          j += 1
          break
        }
        j += 1
      }
      push('string', line.slice(i, j))
      i = j
      continue
    }

    // 数字：含小数、十六进制
    if (DIGIT.test(ch)) {
      let j = i + 1
      while (j < n && /[0-9a-fA-FxX._]/.test(line[j])) j += 1
      push('number', line.slice(i, j))
      i = j
      continue
    }

    // 标识符 / 关键字 / 函数名
    if (IDENT_START.test(ch)) {
      let j = i + 1
      while (j < n && IDENT_PART.test(line[j])) j += 1
      const word = line.slice(i, j)

      if (keywords.has(word)) {
        push('keyword', word)
      } else {
        // 后面紧跟 ( 视为函数名（跳过空格）
        let k = j
        while (k < n && line[k] === ' ') k += 1
        if (line[k] === '(') {
          push('function', word)
        } else {
          push('plain', word)
        }
      }
      i = j
      continue
    }

    // 标点
    if (PUNCT.test(ch)) {
      push('punctuation', ch)
      i += 1
      continue
    }

    // 其余（空格等）
    push('plain', ch)
    i += 1
  }

  return tokens
}

/** 把整段代码按行高亮成 CodeLine[] */
export function highlightCode(code: string, lang: string): CodeLine[] {
  const resolved = resolveLang(lang)
  const keywords = new Set(KEYWORDS[resolved] ?? [])
  const commentPrefix = lineCommentToken(resolved)

  return code.split('\n').map(line => tokenizeLine(line, keywords, commentPrefix))
}
