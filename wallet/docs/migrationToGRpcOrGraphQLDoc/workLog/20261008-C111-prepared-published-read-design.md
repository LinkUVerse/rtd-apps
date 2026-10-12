# C111 已复制 prepared 对象的完整读取候选

本方案先于候选代码。上轮是实际进展：C109／C110当前三内部及十二页完整限定审核和精确清理完成；原89/98、九父、剩余9.18%保持。当前C106父80964／child96887真实工作，两个完整只读快照在约六秒内prepared增加73，到626267；正式553728／pending709569不变。原工作批次、两组链／indexer、29容器／14健康／25actor、1456原文件及source／八debug保持，不因诊断文件或耗时重新启动。

当前源码在C105完整stage并发之后，仍逐项调用原`publish_object`，对已经复制的prepared对象串行执行published HEAD／固定VersionId完整GET／SHA校验。这是候选切入点，尚未通过实际计时证明其总耗时占比；不能把观察计数或速度外推作为正式提交或超时结论。

## 完整边界

以实际正在运行的C105候选02的child为原字节，只另存候选目录。原`publish_object`整个函数、全部SQL文本／参数、local SHA、certificate、epoch／admission／before_write、metadata、committed-prefix、replica和commit保持。原父只替换child绝对路径。不给当前进程发送信号，不改变14400秒原预算。

对每批最多16个已完成stage结果，在同进程线程中使用原`publish_object`函数的精确源码和只读client代理。代理只允许stat_object／get_object；COPY及其它方法在进入真实client之前拒绝。不存在published对象时仅生成“主线程必须执行完整原函数”的标签；不把缺失当成功。已存在时读取完整固定VersionId正文并按原SHA规则核验，返回该版本。

主线程按原顺序执行local SHA和原SQL，再消费对应结果：预读成功的版本必须再次HEAD仍为同一latest，并与原SQL recorded_version相等；否则拒绝。预读发现缺失的对象由主线程调用完整原函数，保留COPY、before_write和写后完整字节校验。所有SQL／S3写仍在原主线程串行执行，metadata调用完全不变。任一已开始future失败，排空该批、停止以后批；主线程失败或退出关闭迭代器，不保留未观察结果。不会跨运行复用证据，最大16结果而非完整range缓存。

这只是客户端读取调度选择，不是Sui协议要求，也不是分布式存储提交fencing修复。MinIO原7.2.20 SDK声明同进程线程安全，跨进程不能共享：[官方固定tag源码](https://github.com/minio/minio-py/blob/7.2.20/minio/api.py)。固定VersionId选择与完整正文仍实际核验；S3版本机制参考[官方版本文档](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)，不能拿文档替代当前MinIO的真实响应／SHA证据。

## 子任务与采用门

P111-1：封存原方案／任务／状态及正在运行的原child／parent／helpers，提取原完整函数，明确只读代理和串行写边界。

P111-2：真实原函数驱动的有界、顺序、排空、各读失败、缺失／出现／消失／版本漂移、recorded_version漂移、完整SHA与连接close／release对抗验证。新candidate完整child AST／文本逆变换，所有SQL字符串逐字保持，父仅child路径变化，原venv两入口--help。

P111-3：同一256个实际prepared对象及SQL七字段做ABBA，原C105完整stage读取保留；比较原published读与候选完整预读＋额外fresh HEAD。每份GET原body／version／length／SHA和关闭释放完整保存，只允许GET／HEAD。原／候选边界与256 SQL事实前后相同，原工作发布器可自然推进。读取片段中位提升≥1.20及独立原帧审核才获得候选性能资格，不等于全批提速或正式提交。

P111-4：完整候选源码／真实入口／测试与ABBA独立资格；不安装未合格候选。若额外HEAD使性能不成立，保存失败并保持当前运行。

P111-5：仅当前publisher真实自然终态、无child／lock0、完整原prepared/version行及fresh窗口保护成立后另行安全接续；0工作child信号。必须真实709569提交和全部696489七覆盖及原完整NFT／名称验收后，才能更新原98细分进度。该读取工具无权自行启动或交接publisher。
