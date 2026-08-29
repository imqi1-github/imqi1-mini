// 构建后把微信 app.json 的 rpx 计算控制参数注入产物，抑制宽屏 rpx 过度放大。
// uni 的 pages.json globalStyle 对 rpxCalc* 透传到 app.json 存在已知 bug，故在构建后补齐。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appJson = join(__dirname, '..', 'dist', 'build', 'mp-weixin', 'app.json');

if (!existsSync(appJson)) {
  console.warn('[inject-rpxcalc] 未找到产物 app.json，跳过:', appJson);
  process.exit(0);
}

try {
  const d = JSON.parse(readFileSync(appJson, 'utf-8'));
  // 设备逻辑宽 > 750 时 rpx 回退到 375 基准，避免 iPad/平板/折叠展开时元素被等比放大得巨大
  d.rpxCalcMaxDeviceWidth = 750;
  d.rpxCalcBaseDeviceWidth = 375;
  writeFileSync(appJson, JSON.stringify(d, null, 2));
  console.log('[inject-rpxcalc] app.json 已注入 rpxCalcMaxDeviceWidth=750 / rpxCalcBaseDeviceWidth=375');
}
catch (e) {
  console.warn('[inject-rpxcalc] 注入失败（不影响构建）:', e.message);
  process.exit(0);
}
