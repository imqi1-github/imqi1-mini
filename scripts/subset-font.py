#!/usr/bin/env python3
"""
Font subsetting script: subsets remixicon font, keeping only the icons actually used,
outputs base64 inline CSS (for mini-program loading without local font path issues).

Usage:
    pip install -r requirements.txt
    python scripts/subset-font.py

Add icons: add icon names to ICONS list and re-run.
"""
import argparse
import base64
import io
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

# 项目实际用到的图标（remixicon 名，不含 ri- 前缀）
ICONS = [
    'arrow-right-s-line', 'time-line', 'image-line', 'file-text-line',
    'map-pin-line', 'links-line', 'chat-3-line',
    'window-fill', 'account-circle-fill', 'notification-fill',
    'links-fill', 'mail-fill',
]

SRC_DIR = Path(__file__).parent.parent / 'src' / 'static' / 'icon'
SRC_TTF = SRC_DIR / 'remixicon.ttf'
SRC_CSS = SRC_DIR / 'remixicon.css'
OUT_CSS = SRC_DIR / 'remixicon-subset.css'


def parse_args():
    parser = argparse.ArgumentParser(description='子集化 remixicon 字体，输出 base64 CSS')
    parser.add_argument('-o', '--output', type=Path, default=OUT_CSS, help=f'输出 CSS 路径 (默认: {OUT_CSS})')
    parser.add_argument('-i', '--icons', nargs='*', help=f'指定图标列表，不指定则使用内置 ICONS')
    parser.add_argument('--check', action='store_true', help='只检查图标是否在 CSS 中，不生成文件')
    return parser.parse_args()


def get_unicode(name: str, css_content: str) -> int:
    """从 CSS 内容中提取图标的 Unicode 码点"""
    pat = rf'\.ri-{re.escape(name)}:before\s*\{{\s*content:\s*"\\([0-9a-fA-F]+)"'
    m = re.search(pat, css_content)
    if not m:
        raise ValueError(f'未找到图标: {name}')
    return int(m.group(1), 16)


def main():
    args = parse_args()
    icons = args.icons or ICONS

    if not SRC_CSS.exists():
        print(f'错误: 未找到 CSS 文件 {SRC_CSS}', file=sys.stderr)
        sys.exit(1)

    css_content = SRC_CSS.read_text(encoding='utf-8')

    # 提取所有图标的码点
    name_to_cp = {}
    missing = []
    for name in icons:
        try:
            name_to_cp[name] = get_unicode(name, css_content)
        except ValueError:
            missing.append(name)

    if missing:
        print(f'错误: 未找到以下图标: {", ".join(missing)}', file=sys.stderr)
        sys.exit(1)

    if args.check:
        print(f'[OK] All {len(icons)} icons found')
        return

    # 子集化到内存 woff2
    if not SRC_TTF.exists():
        print(f'错误: 未找到 TTF 文件 {SRC_TTF}', file=sys.stderr)
        sys.exit(1)

    font = TTFont(SRC_TTF)
    options = subset.Options()
    options.flavor = 'woff2'
    options.desubroutinize = True
    options.layout_features = ['*']
    options.notdef_outline = True
    options.recalc_bounds = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(set(name_to_cp.values())))
    subsetter.subset(font)

    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    data = buf.getvalue()
    b64 = base64.b64encode(data).decode('ascii')

    print(f'子集字形数: {len(name_to_cp)}  子集 woff2 体积: {len(data):,} bytes  base64: {len(b64):,} chars')

    # 生成 CSS
    lines = [
        '/* 由 scripts/subset-font.py 自动生成，请勿手改。',
        ' * 新增图标：改 scripts/subset-font.py 的 ICONS 列表后重跑。 */',
        '@font-face {',
        '  font-family: "remixicon";',
        f'  src: url("data:font/woff2;charset=utf-8;base64,{b64}") format("woff2");',
        '  font-display: swap;',
        '}',
        '',
        '.ri {',
        '  font-family: "remixicon" !important;',
        '  font-style: normal;',
        '  -webkit-font-smoothing: antialiased;',
        '  -moz-osx-font-smoothing: grayscale;',
        '}',
        '',
    ]
    for name, cp in name_to_cp.items():
        lines.append(f'.ri-{name}::before {{ content: "\\{cp:x}"; }}')

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')
    print(f'已写出 {args.output}')


if __name__ == '__main__':
    main()
