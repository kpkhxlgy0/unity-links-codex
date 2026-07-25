[English](README.md)

# Codex++ 的 Unity Asset Links

## 功能

Unity Asset Links 是 Unity Links 集成的 Codex++ 侧。它拦截 Codex Desktop 中符合条件的本地文件链接，并通过
项目专用的 Windows Named Pipe 将链接发送给匹配的 Unity Editor。

- `Assets` 链接使用 Unity 常规资源打开行为，并保留行号和列号。
- `ProjectSettings` 链接打开 Unity 的 Project Settings 窗口。
- `Packages` 链接打开 Unity Package Manager。

配套的 Unity 包位于
[unity-links-unity](https://github.com/kpkhxlgy0/unity-links-unity)。

## 环境要求

- Windows 10 或 11。
- Codex++ 1.0.0 或更高版本。
- 每个目标 Unity 项目都已安装配套 Unity 包。

当前 Named Pipe 通信仅支持 Windows。

## 从 Codex++ 商店安装

审核通过后，打开 Codex++ Settings，进入 **Tweak Store**，找到 **Unity Asset Links** 并安装。启用 tweak；
如果设置页提示需要重启，再重启 Codex++。

商店会锁定审核通过的 Git commit。manifest 的版本检查会链接到本仓库，方便用户检查后续公开版本。

## 本地开发

克隆本仓库，并将仓库根目录链接到 Codex++：

```powershell
git clone https://github.com/kpkhxlgy0/unity-links-codex.git
Set-Location unity-links-codex
codexplusplus dev (Resolve-Path .).Path
```

如果需要同时开发 Unity 包和 Windows 维护脚本，请使用 `--recurse-submodules` 克隆总入口仓库
[unity-links](https://github.com/kpkhxlgy0/unity-links)。

## 验证

```powershell
npm test
codexplusplus validate-tweak (Resolve-Path .).Path
```

打开已安装配套包的 Unity 项目后，可以使用 `scripts/send-open.js` 分别检查 `Assets`、`ProjectSettings` 和
`Packages` 路径。

## 兼容性

组件版本 `0.2.1` 与 `unity-links-unity` 版本 `0.2.1` 配套验证。总入口仓库会固定一对共同验证过的组件
commit。

## 发布流程

1. 在 `manifest.json` 和 `package.json` 中更新同一个稳定版本号。
2. 将版本修改提交并推送到 `master`。
3. 运行本仓库的 `Release` workflow，输入不带前导 `v` 的版本号。
4. 等待测试和 Codex++ 校验通过。
5. 检查并手动发布生成的 Draft Release。
6. 使用已发布的准确 commit 提交 Codex++ Tweak Store 审核。

不要移动或复用发布标签。

## 开源协议

本项目使用 [MIT License](LICENSE)。
