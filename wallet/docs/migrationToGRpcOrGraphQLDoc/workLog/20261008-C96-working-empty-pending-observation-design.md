# C96 进行中空prepared阶段的只读观察（编码前合同）

scope v4在真实新pending709569／staging version非空、其余两版本空、prepared0、原92149→59696 working且scope lock1阶段，被现行终态ledger正确拒绝。原完成空尾部与完整旧pending两个交接资格不变；本合同只解决readonly进度审核，禁止把进行中阶段作为交接凭据。

另存观察函数：精确保留现行SQL REPEATABLE READ READ ONLY、完整chain／fence／admission行、连续尾部与所有SHA及真实scope advisory lock。只允许明确active／epoch1／admission／fence、pending整数大于formal、原staging版本非空且另外两版本空、prepared0、lock1、真实C92原父和唯一child、working status的开始阶段。前后完整current authority、父birth／command、child birth和status相同才返回；漂移／错链／缺锁／无child／终态action／未知版本／epoch／admission均拒绝。

输出必须标注observationOnly=true、handoffAdmission=false，独立嵌套原ledger；没有共享capture_ledger入口，不改原C96 controller／runtime／policy／资格源码。读取过程无信号／SQL写／object写。完整和完成阶段仍不因观察函数而取得交接授权，实际控制器继续自己的fresh资格。

先测观察与授权的隔离、字段漂移及真实当前拒绝／观察成功，再用新scope driver仅替换观察函数。scope v3任务前缀错误及v4真实终态工具拒绝均保留，原报告文件没有创建，不伪造原输出；98父仍84/98。
