#!/bin/bash
# ═══════════════════════════════════════════════════════
# clean-vars.sh — 一键清除 Cloudflare 控制台中的旧 Vars
# ═══════════════════════════════════════════════════════
#
# 问题：旧版代码在 wrangler.toml 的 [vars] 中声明了 28 个变量，
#       推送到 Cloudflare 后写入了控制台 Vars 区。
#       新版已移除 [vars]，但控制台中的旧值不会自动删除。
#       这些残留变量会覆盖代码中的硬编码默认值，导致行为异常。
#
# 解决：用 Wrangler CLI 批量删除（比控制台手动点垃圾桶快 10 倍）
#
# 用法：
#   1. 安装 wrangler:  npm install -g wrangler
#   2. 登录:            wrangler login
#   3. 运行此脚本:     bash clean-vars.sh
#
# 或者直接在终端执行下面的命令（无需此脚本）

set -e

SCRIPT_NAME="riddle-web"

echo "🧙 Riddle Web — 清除旧 Vars"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 需要删除的旧变量列表（旧版 wrangler.toml [vars] 中声明的）
OLD_VARS=(
  "idle_timeout_ms"
  "min_dist_px"
  "max_dist_px"
  "pressure_min_px"
  "pressure_max_px"
  "poll_interval_ms"
  "stroke_interval_ms"
  "stroke_max_dur_ms"
  "svg_stroke_width"
  "max_lines"
  "line_height_px"
  "margin_top_px"
  "margin_x_px"
  "font_size_px"
  "reply_fade_delay_ms"
  "fade_duration_ms"
  "history_ttl_sec"
  "max_history_turns"
  "max_retries"
  "request_timeout_ms"
  "max_tokens"
  "temperature"
  "agnes_base_url"
  "agnes_cn_base_url"
  "zhipu_base_url"
  "agnes_model"
  "agnes_cn_model"
  "zhipu_model"
)

echo "📋 准备删除 ${#OLD_VARS[@]} 个旧变量..."
echo ""

for var in "${OLD_VARS[@]}"; do
  echo "  🗑️  删除 $var ..."
  wrangler vars delete "$var" --script-name "$SCRIPT_NAME" --yes 2>&1 | grep -v "^$" || true
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 完成！"
echo ""
echo "验证：运行以下命令查看剩余变量"
echo "  wrangler vars list --script-name $SCRIPT_NAME"
echo ""
echo "应该只看到 0 个 Vars（所有参数已在 config.ts 中硬编码）。"
echo "Secrets 不会受影响（agnes_keys, zhipu_keys 等仍保留）。"
echo ""
echo "如果 wrangler 命令失败，也可以手动在控制台删除："
echo "  Cloudflare Dashboard → Workers & Pages → riddle-web"
echo "  → Settings → Variables and Secrets → Vars 区 → 逐个删"
