# C142完整读取源授权前复查对齐

C142初稿尚未监听或安装。对照原serve_wallet_interval_parallel_pool_candidate.py的point路径，原流程为snapshot、双端latest、body SHA、public.recheck（第二次真实SQL及额外源端latest）、第二次双端latest、真实mTLS authorize。初稿将部分复查移到授权之后，但缺少原额外源端HEAD和授权前第二次SQL，不能按“原检查完整保留”称正向资格。

保留全部初稿/18局部测试/缺证负向/31反例及原失败，不修改其源文件。v2只在授权前新增source.recheck([row])与latest(row)，所有旧检查仍按原顺序存在；授权后独立snapshot/双端latest/正文SHA与2秒时效亦保持。每个正向point共3次真实SQL、7次HEAD（source4/replica3），每次共享仅同时在途namespace观察、0完成结果缓存，现有4名额不变。

使用抽取真实point/latest AST及实际线程对调用顺序/两端结算/各阶段失败封闭作隔离依赖验证，明确不是实际SQL/S3/mTLS或完整输入认证。随后必须等C141全709570输入/quorum/独立审核完成，才能运行真实HTTP原帧及ABBA对照和完整范围原始数据比较。候选没有证书时仍禁止监听，原C139回放/两链/indexer/发布者保持；NFT业务专项后置。
