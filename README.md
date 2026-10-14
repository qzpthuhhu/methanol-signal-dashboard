# 甲醇主力预测看板

公开静态站（GitHub Pages）：甲醇期货 MA 主力 T+1 / T+5 研究预测看板。

数据仅为已导出的 JSON 摘要（`data/*.json`），不含 Choice 原始 CSV 或密钥。

## 访问密码

页面有一层简单登录遮罩（中文：请输入访问密码 / 进入看板 / 密码错误）。

- 仅在构建时写入 **SHA-256 哈希**（固定公开盐 `ma-dash-v1`），客户端对照哈希校验，并用 `sessionStorage` 记住本次会话。
- **这只是威慑（deterrence only），不是真正的安全**：静态站点 + 公开哈希可被逆向；请勿存放敏感机密。

## 本地预览

```bash
cd methanol-signal-dashboard   # 或本仓库根目录
python3 -m http.server 8080
# 浏览器打开 http://127.0.0.1:8080/
```

## GitHub Pages

本仓库启用 Pages：`main` 分支根目录。站点地址见仓库 Settings → Pages。

## 如何更新数据

1. 在私有研究仓库重新导出看板 JSON（仅摘要，勿提交 Choice CSV / secrets）。
2. 将 `data/latest.json`、`factors.json`、`history.json`、`method.json` 复制到本仓库 `data/`。
3. 如需更换密码：用离线脚本对 `salt + password` 做 SHA-256，更新 `js/auth-config.js` 中的 `hash`（切勿提交明文密码）。
4. `git add` → `commit` → `push origin main`；Pages 通常一两分钟内刷新。

预测 vs 真实图使用 [lightweight-charts](https://github.com/tradingview/lightweight-charts) 渲染蜡烛图（K 线），并叠加 T+1/T+5 目标价与方向标记；未到期样本不显示命中/未中。

## 数据文件

| 文件 | 内容 |
| --- | --- |
| `data/latest.json` | 最新信号摘要与 T+1/T+5 |
| `data/factors.json` | 技术面 / 基本面因子列表 + 面板最新行 |
| `data/history.json` | 主力 OHLC K 线、~半年 walk-forward 预测 vs 真实、信号标记 |
| `data/method.json` | 流水线说明与研究闸门 |

## 免责声明

研究用途。模型未通过验证闸门时为 research-only；不构成投资建议。
