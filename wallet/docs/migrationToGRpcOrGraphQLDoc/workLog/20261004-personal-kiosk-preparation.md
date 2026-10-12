# PersonalKiosk 受控合约准备与 debug 编译

## 本轮结果

- 在 `link-u-smart-contract/all-in-one-deploy/localDeploy/prepare_wallet_personal_kiosk.py` 增加准备脚本：复制当前 RTD SDK 的 Kiosk 测试合约六个模块，保留源码字节，记录 SDK HEAD、diff SHA256、逐文件 SHA256、RTD 源码依赖和 compiler chain ID。禁止覆盖已有目录或悬空符号链接。
- 使用显式本地 RTD/MoveStdlib 依赖；新包管理器使用小写包名 `kiosk` 提供模块别名，不能沿用旧 `[addresses]` 表。首次旧表构建失败保留在 `20261004-personal-kiosk-build.log` / `-cwd.log`，未当作成功。
- 实际输出位于 `/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01/personal-kiosk-build-02`。使用指定 `rtd/target/debug/rtd`、dev `RTD_CONFIG_DIR`、`move build --build-env localnet --force` 编译退出码 0；六个本包字节码摘要见 `20261004-personal-kiosk-build-evidence.json`。
- 运行前复核当前 rtd HEAD `49a05a0de323b45a49d067a855c419e98d071afc`，工作区 diff SHA256 `a276d83fb53a4f3fb84c0c2e8e5f78f423aacfbb63dc07d3e225c25d012f4fdf`，debug CLI SHA256 `59946a99e95e2c088dc7713b5e484a2684ced622c647038333da9bd840286c97`，均匹配既有编译证据。
- 不绑定配置的编译曾回退协议版本 138；随后绑定现有 dev 配置重编译，最终日志 `20261004-personal-kiosk-build-bound.log` 没有该回退警告。仍有 SDK 原合约 `dynamic_field::exists_` 弃用警告，未修改其语义。
- 5 项准备脚本测试通过，覆盖 manifest、源文件原样保留、已有输出保留、悬空符号链接、非法 chain ID、缺失合约等边界；记录 `20261004-personal-kiosk-prepare-tests-py312.log`。系统 Python 3.9 缺少测试使用的 tomllib，初次导入失败保留在旧日志，最终使用已安装 Python 3.12。准备脚本本身可由 Python 3.9 执行。

## 未完成边界

本轮仅准备与编译，未签名、未提交、未发布；未改 profile 包地址。源码与钱包 `PERSONAL_CAP_BCS` 的 id + Option<KioskOwnerCap> 布局一致，尚无链上对象 BCS 证明。后续必须使用已恢复完成的独立测试账户，按原 H0 绑定、固定 bytes 模拟、持久化 pending、一次提交和原 digest 恢复完成发布，再验证真实 PersonalKiosk 持有、内容和转移。旧 deployer 未决交易不能通过新发交易绕过。RPC-22 / TRY 不勾选，总体仍 33/98。
