# 质押safe mode状态展示

## 发现与修复

StakeCard此前只有reward未知时显示safe mode，历史rate足以产生estimated奖励时会隐藏系统状态。现在safe mode显示独立于reward状态；仍保留估算奖励及inactive／pending状态，不把系统状态等同于历史奖励不存在，也不创造零收益。

新增三类仓位React测试：使用stakingFixture的同S GraphQL协议数据经真实WalletAssetReader.staking构造view，覆盖active／inactive／pending；检查safe mode始终出现、倒计时不出现、已知奖励仍保留，切换safeMode=false后提示移除。仅布局、币种格式化等展示边界mock。

## 验证与边界

5文件61项质押reader／rates／view／hook／卡片测试通过，完整钱包tsc退出0，日志20261004-staking-safe-mode-tests.log和-typecheck.log。

测试中的Rust对照读取20261003保存的BCS向量和Rust CSV输出。本轮没有重新运行或编译Rust，不能把测试标题中的current debug误读为本轮已新执行原生程序；原始证据仍作为固定基线。

已有20261004-live-staking-fresh-funds.json实链epoch2／APY一个有效样本证据，不能称为完全没有实链样本；该证据positions为空，非空仓位／激活赎回变化仍待。RPC-11／12尚待完成接口合同审计，RPC-13真实质押／赎回链路未验，未因这项展示修复勾选。再次调用Chrome自动化返回Mac仍锁定，需要用户手动解锁；其他编码工作可继续，所以整体目标保持active。

开发版Webpack构建与四入口静态审计通过，日志20261004-staking-safe-mode-webpack.log和-built-audit.json。
