# REL-01：独立生产产物与依赖审计

实施前范围：生产模式构建原四入口，输出到本任务私有全新目录，当前dist/C16逐文件保持。使用原production配置；仅在构建进程中将output以及CopyPlugin的绝对manifest输出一起重定向，不修改产品配置，不上传source map。保持当前显式审核Local profile，生产模式不冒充可发布部署或可试用验收。

构建前后核验产品源码、锁文件、profile、构建与审计脚本以及原dist完整清单。记录实际Webpack compilation依赖、入口到chunk关系、所有输出JS与map、模块源码和哈希；审计所有JS对应source map，而非仅四个入口。旧RTD/Sui JSON-RPC传输模块、39个旧线协议方法、旧Kit、旧客户端调用与测试/fixture进入实际产物均拒绝。结构校验依赖定义jsonrpc属性只允许已审核的不含网络调用validator，不可泛化为忽略jsonrpc。

验证包括恶意模块/旧方法/新chunk/source缺失/输出变化反例与当前实际生产构建。REL-01限定发布依赖和静态产物，全部功能真实流量仍归REL-02，试用、证书、授权及共同快照不能由本项代替。失败保留，只有稳定成功构建及完整依赖和chunk审计通过才收口。
