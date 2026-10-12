# C263：大前缀列表慢请求与完整覆盖扫描候选

承接C262已完成的真实隐藏/恢复，本轮优先处理发布追平依赖。发布父22156及子78607实机仍存活，子进程继续使用原 `--through 1482841 --committed-audit-workers 16` 和原缓存目录；未停止、重启或修改当前发布器。

## 实际耗时证据

以现有受限publisher读取身份、正确TLS和20秒读取期限，观察同一个真实published桶：

| 读取 | 本轮结果 |
| --- | --- |
| 精确元数据前缀，1条首屏 | 25.8ms，成功 |
| 数字前缀 `1`，1000条首屏 | 20.0秒ReadTimeoutError |
| 全桶，1000条首屏 | 20.0秒ReadTimeoutError |
| 精确 `1000000.binpb.zst` 前缀 | 33.9ms，成功 |
| `100000` 前缀 | 0.920秒，完整11条 |
| `1000` 前缀 | 2.663秒，1000条，仍有后页 |
| `1`前缀，小页2条 | 4.999秒，仍有后页 |
| `1`中数字9子树之后的上边界 | 1.090秒，空列表 |
| 全局数字9子树之后的上边界 | 0.490秒，4条元数据 |

[大范围首屏失败](./20261011-C263-list-latency-01.json)、[细前缀首屏](./20261011-C263-narrow-list-latency-01.json)、[小页与Unicode边界](./20261011-C263-boundary-list-latency-01.json)。这些是有界控制探针，不能据此计算生产P95或宣布整个发布器已提速。

发布源码先完整扫描published命名空间，再进入已提交前缀校验；现有分区是十个首位数字及上下边界。原前缀进度文件仍旧于当前父。实测支持大命名空间枚举是提速候选点，但没有取得当前Python线程的精确执行行，不能将推断记为已确认阶段。原生产S3传输允许300秒读取及有界重试，本轮20秒探针超时不代表原300秒请求已失败。

## 隔离候选与资格

实现位于 `link-u-smart-contract/all-in-one-deploy/localDeploy/wallet_C263_namespace_partitions.py`，尚未部署。根据既有allowed集合细分繁忙数字前缀，最多4层、8并发；每个分支仍扫描数字子树之前与之后的全部名称。上边界有意与9子树的最高Unicode后缀重叠，不留下非法名称空隙。小页仅用于找到下边界，叶分区完整分页；非allowed名称立即失败。未降低对象固定VersionId、BCS证书、内容SHA、副本、fence、admission或原子提交检查。

[6组测试](./20261011-C263-namespace-tests-01.log)通过，包括23种非预期名称、随机Unicode集合、原合同允许的对象暂缺、并发上限、输入边界、异常传播和迭代器释放。

[实际SDK验证](./20261011-C263-namespace-sdk-01.json)把现有 `100000` 前缀的11对象映射为虚拟根，实际运行候选12分区、2并发。前后完整对象集合相同，小页、start-after和编码行为通过。但本轮耗时41.426秒，单次列表响应最高19.52秒，**不能宣称候选已带来稳定提速**。此为小范围SDK兼容和覆盖资格，完整当前published命名空间仍须另验。

[独立资格汇总](./20261011-C263-qualification-01.json)明确 `candidateInstalled=false`、`fullNamespaceAccepted=false`、`publicationCompletion=false`。

## 失败观察与资源清理

四轮短时 `mc admin trace` 未取得API事件，失败全部保留：[01](./20261011-C263-s3-trace-01.json)、[02](./20261011-C263-s3-trace-02.json)、[03](./20261011-C263-s3-trace-03.json)、[04](./20261011-C263-s3-trace-04.json)。04仅证实trace接口HTTP200；独立HEAD探针55–80ms成功却未出现在trace中，故不将“没有事件”解释为“没有请求”或死锁。

依据[MinIO官方trace用途](https://minio.community/community/minio-object-store/reference/minio-mc-admin/mc-admin-trace.html)及[官方客户端JSON实现](https://github.com/minio/mc/blob/master/cmd/admin-trace.go)，采集器兼容多行JSON并仅保留白名单字段。凭据、头部、正文和查询串不写日志。

01在Docker自动删除结束前采样导致 `temporaryContainerRemoved=false`；后续独立按4个精确ID查询，现均不存在。四个临时观察器已全部清理，未新增镜像。原链、对象存储、publisher、消费者均无信号；Display媒体仍供实际钱包使用，继续保留。

## 后续与任务口径

P263-1/2仅收口诊断、隔离候选及下一步决策，不表示生产提速。C264须验证当前完整allowed范围上的覆盖、异常合同与真实运行成本；不能证明安全及收益则不部署。达标后仍只在原发布器自然终态、无子进程且锁释放后，沿完整范围交接合同接续。

98原项保持93/98、QA19/22、REL3/5。最新完整回放仍引用C262的61.7955%，发布头仍引用C262的1006768→1482841/锁1；这些不是本轮重读。本轮无新增需要主人介入的事项。
