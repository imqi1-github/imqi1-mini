"""
子集化 remixicon 字体：只保留项目实际用到的图标字形，
输出 base64 内联的 CSS（供小程序真机加载，避免本地字体路径问题）。
新增图标时：把图标名加进 ICONS，重跑本脚本即可。
"""
import base64
import io
import re
from fontTools import subset
from fontTools.ttLib import TTFont

SRC_TTF = 'src/static/icon/remixicon.ttf'
SRC_CSS = 'src/static/icon/remixicon.css'
OUT_CSS = 'src/static/icon/remixicon-subset.css'

# 项目实际用到的图标（remixicon 名，不含 ri- 前缀）
ICONS = [
    'arrow-right-s-line', 'time-line', 'image-line', 'file-text-line',
    'map-pin-line', 'links-line', 'chat-3-line',
    'window-fill', 'account-circle-fill', 'notification-fill',
    'links-fill', 'mail-fill',
]

css = open(SRC_CSS, encoding='utf-8').read()

# 图标名 -> 码点
name_to_cp = {}
for n in ICONS:
    pat = r'\.ri-' + re.escape(n) + r':before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"'
    m = re.search(pat, css)
    if not m:
        raise SystemExit(f'未找到图标: {n}')
    name_to_cp[n] = int(m.group(1), 16)

unicodes = sorted(set(name_to_cp.values()))

# 子集化到内存 woff2
font = TTFont(SRC_TTF)
options = subset.Options()
options.flavor = 'woff2'
options.desubroutinize = True
options.layout_features = ['*']
options.notdef_outline = True
options.recalc_bounds = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)

buf = io.BytesIO()
font.flavor = 'woff2'
font.save(buf)
data = buf.getvalue()
b64 = base64.b64encode(data).decode('ascii')

print(f'子集字形数: {len(unicodes)}  子集 woff2 体积: {len(data)} bytes  base64: {len(b64)} chars')

# 生成 CSS：@font-face(base64) + 基类 .ri + 每个图标类
lines = []
lines.append('/* 由 scripts/subset-remixicon.py 自动生成，请勿手改。')
lines.append(' * 新增图标：改脚本 ICONS 列表后重跑。 */')
lines.append('@font-face {')
lines.append('  font-family: "remixicon";')
lines.append(f'  src: url("data:font/woff2;charset=utf-8;base64,{b64}") format("woff2");')
lines.append('  font-display: swap;')
lines.append('}')
lines.append('')
lines.append('.ri {')
lines.append('  font-family: "remixicon" !important;')
lines.append('  font-style: normal;')
lines.append('  -webkit-font-smoothing: antialiased;')
lines.append('  -moz-osx-font-smoothing: grayscale;')
lines.append('}')
lines.append('')
for n in ICONS:
    cp = name_to_cp[n]
    lines.append('.ri-%s::before { content: "\\%x"; }' % (n, cp))
lines.append('')

open(OUT_CSS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print(f'已写出 {OUT_CSS}')
