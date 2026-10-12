# C105 待发布检查点的认证读取并发候选

本合同先于新增代码保存。原89/98、剩余9.18%及九父完整合同保持。C98父83360／当前child97199仍工作，正式553728／pending709569；不发送信号、不重启或提高7200秒超时。C104资源不足只阻止完整新物理环境；本候选采用当前已存在的私有只读客户端和小样本，0新Docker。

## 原合同与候选边界

以当前实际C96 child原字节为唯一原实现。只抽取待发布逐项循环内`stage = stat_latest(...)`、version存在检查及固定stage VersionId的完整SHA读取三段，逐字逆向恢复原block。固定最多16线程、每批最多16个future；全部已开始结果读取／关闭／排空后才按原序返回stage，任何错误拒绝该批和后续批。

主线程保留每项原local file SHA检查、原certificate元数据、全部SQL读取／逐项insert、`publish_object`完整copy／fixed bytes／latest验证及`before_write`、epoch／admission／commit／metadata／全量replica与最新版本检查。返回stage后，主线程额外再次读取stage最新版本，必须仍等于已认证版本，才进入原SQL／copy逻辑；不把提前读取当作稍后的latest证明。该候选不并发写SQL／S3，不缓存跨运行certificate，不删减任一检查点／三元数据对象或原committed-prefix完整审核。原完整prefix认证、namespace检查和提交字节保持。

读取线程仅原MinIO同进程客户端的GET／HEAD；当前FencedMinio对读请求不添加写epoch，不修改客户端字段。MinIO7.2.20官方tag及本机wheel的既有逐字证据继续核验；线程不可跨进程共享。最大额外内存为16个结果／固定读取buffer，不批量持有全range对象内容。

## 验证与采用

1. 封存新设计及现有Task／进度／current-state／C104原失败和独立审核。实际当前原来源、八debug、29／14／25、父PID／出生／命令及作用域完整ledger保持；不能将旧诊断当作当前运行状态。
2. 原stage body精确inverse、候选whole-child及whole-parent精确inverse，实际原venv的父／子--help。对抗测试覆盖1／4／16、全部序号、顺序、有界IO、所有started future结果排空、三段失败、关闭／release、stage latest漂移、local文件漂移与失败不越过原写入口；测试必须驱动原stage检查和实际候选loop片段，不能只测mock wrapper。
3. ABBA对照同一256个真实prepared检查点的原local＋stage读取及候选完整读取＋额外fresh latest。固定同版本／same SHA／完整GET响应与HEAD／close／release、全部实际请求仅GET／HEAD；每次开始和结束256个SQL事实、scope epoch／versions保持。小样本中位提升至少1.20才取得此读取片段性能资格，不是全publisher提速、正式发布或资产验收。原业务publisher允许自然推进，不能要求其全prepared行数冻结，更不因观察变动发送信号。
4. 合格候选仍未安装。只有原publisher真实自然终态／无child／lock0及完整before-freeze／drain／版本／prepared原行保留资格成立才另做安全交接；读取候选不得自行重启原child。真实709569提交后继续当前NFT696489全库存／M3／最终bytes及durable验收。

P105-1为精确源码与对抗资格，P105-2为实际只读ABBA及独立原帧审核，P105-3为真实自然边界交接，P105-4为真实发布／写后全覆盖与全部业务合同。任何准备资格不改变98父进度。
