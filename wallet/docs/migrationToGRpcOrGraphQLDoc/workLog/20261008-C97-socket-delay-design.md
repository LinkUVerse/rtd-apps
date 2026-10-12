# C97 响应TCP调度隔离实验（编码前合同）

当前原guard实际Python3.13.15、HTTP/1.0，Handler及StreamRequestHandler的disable_nagle_algorithm均false；send_headers／body分开发送。该事实不证明40ms延迟或吞吐瓶颈，必须测量。当前C96观察已经自然3600.065秒结束、未尝试交接、0合格窗口／未安装；原92149／59696保持工作，不再启动该已用操作。

CPython[精确3.13.15源码](https://github.com/python/cpython/blob/v3.13.15/Lib/socketserver.py)中该属性通过TCP_NODELAY调整套接字调度，不改变TLS或HTTP内容。源码注释建议在缓冲写时使用，避免小包；本实验保留原wbufsize及原写入方式，仅考察单一属性的效果，不将实验视为生产推荐。候选唯一变化为Handler增加disable_nagle_algorithm=True；严格逐字逆向到原安装server.py，其他全部实际app文件和image base layers／Config必须相同。

P97-1：封存当前C96 scope03九文档、实际原配置／Python／源码身份和本设计；父98／84保持。

P97-2：构建隔离单属性overlay，真实TCP套接字setup的NODELAY值对照，确认原Handler方法与TLS／16请求上限逐字相同；原SQL／role／对象故障资格以及实际mTLS错误CA／SAN／缺失client证书保持。准备不计实际提速。

P97-3：两只只读临时preview，使用独立未占用loopback端口及原明确CA／client TLS。2／4并发分别ABBA、128个完整CP205／383000回复，保存全部body／headers／时间／SHA，原原文known完整bytes相等且全部200、各并发中位成对提速均≥1.20才有性能资格；还需真实故障检查。任一失败保留原输出，不重复同一操作或降低门。

P97-4：任何实际安装另做完整当前fresh归属／逐服务接续与回滚方案，先完成资格；本实验禁止修改原服务／源／八debug／29容器／25actors／1456保护文件／wallet1120产品source。原publisher与工作child不停止，不改admission／epoch／水位／正式marker，不重发原交易，不部署合约或Faucet；不将候选性能视为live索引或14父验收。

两只临时preview结束时先核对确切project／Id／image／只读mount，再正常停止／删除，保留所有原容器、卷、image和数据。临时容器命名、image与路径另存manifest；不清理五只未确认用途的旧退出容器。全部原失败／设计／资格保持，归属／数据变化时立即结束实验并留证。
