# 2026-10-04 账户历史认证索引前缀

部署工具新增account编译组件：build_wallet_archive_verifier.py --component account，仅编译index_owner_tokens、advance_owner_tokens、index_kiosk_capabilities三个debug二进制；不覆盖运行publisher所绑定的verify_checkpoint_range等三项产物。复用当前rtd源码和Cargo.lock，offline-j4，31.64秒成功，记录HEAD／diff／源码及产物SHA，并新增编译前后源码一致检查。

certify_wallet_account_prefix.py以当前buildproof及fixture H0/generation绑定OwnerToken类型，经独立只读publication身份、TLS、固定对象version取得0–100共101个检查点；生成OwnerToken和标准Kiosk能力索引，逐行核对checkpoint/digest/blobSHA，前后重新核验PG发布事实及查询准入。成功结果在runtime/account-prefix-100；personalTypes为空如实反映未部署个人Kiosk扩展，未伪造相关覆盖。

首次运行发现将PG options透传给显式options调用造成参数重复，尚未创建输出目录或写入数据库；统一过滤options/autocommit后重新运行通过。保留完整构建日志和索引日志。证据：[认证前缀](../evidence/20261004-certified-account-prefix.json)。

此结果仅限认证前缀文件。账户索引独立DB、增量worker、账户API及钱包分页尚待接通；没有将token/能力索引当作全部账户历史覆盖。20/98不变。
