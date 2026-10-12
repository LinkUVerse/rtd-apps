# 支持的发布审计并发方案：未安装

4096个真实checkpoint的4/8/8/4只读对照与四个错误VersionId拒绝均通过；暖缓存下收益有限，不承诺2倍速度，也不表示新checkpoint复制会加速。

prepare03保留原venv/publisher3664、14400秒预算、八debug与独立主verifier、六消费者、控制/副本/全前缀认证门禁，仅候选参数4→8。guard执行01（0秒）与[02（900秒）](./20261006-supported-publisher-capacity-install-02.json)完成：原工作批次没有自然published/idle/无子进程/pending=null边界，因此installed=false、serviceSignals=0。不终止working batch，不改epoch/pending，不用进度文件冒作认证。

[最新只读copy进度](./20261006-publication-copy-progress-02.json)逐checkpoint ledger最高810669，较先前788711实际增加21958；正式published726884/pending907824/epoch1/active保持。独立查询水位仍726884；copy行不是正式发布、GraphQL/NFT/name覆盖或试用完成。下一次安装仍须原自然边界和完整来源验证。


## 安装等待03（1800秒）与04续期

[03实际终态](./20261006-supported-publisher-capacity-install-03.json)通过边界守卫合同，但 installed=false、0信号；仍working、原child63025，SQL published726884/pending907824/epoch1，无自然published/idle边界。原工作未被停止，暖缓存对照不等于新参数已安装。新的独立04等待沿用同plan和1800秒上限；仍由fresh idle<3s、无child、SQL pending=null及全量原source/debug/六消费者/原持久材料检查决定是否有资格安装，不能以超时或请求进度代替这些条件。

04终态passed=true/installed=false/serviceSignals=0，最后SQL仍published726884/pending907824/epoch1、child63025，未出现自然边界；原JSON/log保留。05继续同plan最长1800秒等待。仍仅fresh published/idle、无child、SQL pending=null且所有来源/debug/PID/配置门禁成立才允许唯一publisher4→8变更；不停止working、不手改任何pending/epoch。


05实际终态[安装05](./20261006-supported-publisher-capacity-install-05.json)同样installed=false/serviceSignals=0，原child63025仍working、SQL published726884/pending907824/epoch1。[06实际终态](./20261006-supported-publisher-capacity-install-06.json)同样installed=false/serviceSignals=0；没有新的原链安装guard运行，不停止working。最新[copy06](./20261006-publication-copy-progress-06.json)最高907824已复制，不能代替全认证/副本/SQL正式发布或索引覆盖。


## 独立新链安装成功

[新链安装01](./20261006-default-generation-supported-capacity-install-01.json)在published45455/pending=null/epoch1、状态fresh published、无child的自然边界实际完成4→8，仅1个新publisher信号，新PID32015，7200秒预算/15秒间隔保持。原publisher3664不变。原链未安装与新链已安装分别记录，不共享成功结论。[双链SQL04](./20261006-dual-generation-publication-progress-04.json)新published45455/pending60072/copy52667，原published726884/pending907824/copy907824；copy不是认证发布。

07最长1800秒守卫已实际终态[07](./20261006-supported-publisher-capacity-install-07.json)：passed=true、installed=false、serviceSignals=0；原publisher3664/配置4并发保持，没有新的原链安装guard运行。新链publisher32015的8并发仍独立；[SQL08](./20261006-dual-generation-publication-progress-08.json)原published907824、新67667，均pending=null/epoch1；读取状态不是手动清空pending。
