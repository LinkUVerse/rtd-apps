# 当前认证校验 debug 性能审计与候选合同

当前98父完成78，trial_ready=false。只读进程审计确认原publisher58791仍working，其owned子进程51396正在等待native verifier51450，校验明确through907824。原批次、pending、链与所有数据库保持，不因等待长而清除或重放。

2秒原生CPU采样显示热点包含Blake2b compress／rotate_right、BLS乘法、serde／BCS及文件读取。原始采样只保存在私有runtime，公开报告只列函数和样本数，不包含进程命令或DB凭据。这是当前有限诊断，不据此承诺吞吐提升。

依据[Cargo官方profile说明](https://doc.rust-lang.org/cargo/reference/profiles.html#overrides)，dev允许按package调整opt-level，同时保留debug符号／断言／溢出检查。不得以release替代主人要求的当前RTD源码debug，不减任何quorum、内容hash、连续性或对象／交易校验。

- [x] V1 核对当前RTD HEAD／diff／全部变更文件与旧可信provenance，原helper所有Rust源码／manifest／lock；准备原缓存的APFS独立副本与新helper目录，原运行产物不改。
- [x] V2 仅独立target/debug候选，对Blake2、BCS／serde、fastcrypto、rtd-types与verifier package有界opt-level优化，debug／debug-assertions／overflow-checks明确true，offline／locked编译。失败和未完成不能记为built。
- [x] V3 在相同真实有限checkpoint集合比较原／候选原字节和终态；完整正式certifier负面矩阵（错误genesis／内容／quorum／连续性／版本）通过后，才评价性能，保留完整input SHA和原运行产物。
- [ ] V4 是否安装需等原working批次终结并完成来源／角色绑定和生命周期独立计划；当前不安装、不发信号、不更新source spec或信任根。原debug／当前C25业务证据保持。

已有verify_checkpoint_range的resume接口明确要求“prior verifier run pinned by trusted provenance”；普通调用者给定SHA不能认证committee。本批没有把该接口直接接入publisher或凭自身摘要跳过已有前缀认证。候选只调整编译优化，所有现行验证要求保持。

V1/V2依据build-01，源码及helper未变、独立target/debug、dev断言/溢出检查保持。V3依据benchmark-02：当前真实1024 checkpoint两序两轮原输出和最终BCS相同、有限测得2.9275倍。negative-03当前真实8 checkpoint、新旧各15项完整原生矩阵通过：全量/续读、quorum/内容/交易/效果/输出对象篡改、previous连续性、seed genesis/version/SHA、缺失/序号/压缩。故意修改测试seed仅本机故障注入，未赋予普通caller摘要认证能力。01输出行计数断言误写、negative-01缺失可选proto.digest及02无效BLS点在转换阶段拒绝均保留；修正测试夹具用另一个真实合法签名后才证明quorum层拒绝。V4仍待：原working批次未结束，不安装，不切换trust/source spec。
