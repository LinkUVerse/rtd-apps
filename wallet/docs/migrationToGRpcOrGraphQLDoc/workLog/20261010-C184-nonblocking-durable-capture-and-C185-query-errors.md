# 同合同异步落盘与准备错误观察

C167第六轮最终failed保持：四拒绝、6对双方同byte签名及60旧签篡改拒绝完成；framework-ordinary/expirationLargeEpoch在批准前进入真实费用失败，私有最终6/0/0、Execute0、采集/退出零错误。C183实际捕获4拒绝及6正向UI响应，全部无txResultError，自身监听/内存正常移除。该轮未复现第五轮的签后失败，不能用它证明第五轮根因。新不重复批准集合累计26个once摘要。

原生历史保留下界在运行中持续推进；源码明确将同一次读取内的推进视为WalletNativeReadWindowChangedError，并在完整已结束读取后最多重读一次。其存在仅为诊断线索，不能代替第五轮后台原始错误或第六轮准备错误。没有修改这个保护、读期限、重读次数、权限、源码、数据、journal、水位或fence。

C184只调整取证运行开销：原immutable wx/0600文件、完整快照、文件fsync、目录fsync和每次request事件顺序保持；用async fs.open/writeFile/sync/close等待相同真实落盘，然后才继续fetch/fulfill。drain仅等待原工作和致命错误，close才完整复制记录，避免每次flush反复复制所有历史响应。原C182零转发严格边界和所有真正发送的原实体/头/终态/释放规则不变。[14项边界反例及原实体正例资格](./20261010-C184-nonblocking-qualification-01.json)为工具资格，尚非实际完整验收。

C185从已提交React树找到现有QueryClient，只调用只读getQueryCache/getAll，读取status=error的查询种类和原错误名/消息；不请求、refetch或mutate任何查询，也不复制账户密钥/token/签名。只在失败现场补充观察，避免费用失败只保留通用文案。

v9使用新预算143000167、新profile及完整4×4矩阵，26个旧once严格排除，不拼接旧partial。原16批准/16赞助同byte/160变字节原签拒绝/40模拟/16Verify/四单签拒绝、三私有入口/三store/密文/原14对象与赞助币/正常退出和独立审核全部保持。完成度仍11/12（91.7%）、总90/98。
