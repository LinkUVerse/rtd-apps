# 新链独立账户归档重建 A1–A6

新正式 published67667 已覆盖 Personal 包66105和 cap创建67518；原两个账户 worker 仍使用原 root/personalTypes=[]，不能改写已有 sealed 根或将其冒作 Personal 历史全集。指定 LD 另建完整认证账户根、独立 SQL 数据库/最小权限角色、reader/API/入口，不修改原数据库/reader/worker/key/pending。新六pin候选profile revision2保留原profile，账户端点41956仅为候选，尚未宣称可用。

- [x] A1：实际 PublishedTokenSource 原算法逐batch≤1000取得正式0–67667；固定VersionId HTTPS GET、前后latest HEAD和bodySHA，最后全部SQL/HEAD重新核对；原scope/current source/eightdebug/native/publisher/全部服务不变，失败材料保留，无未认证copy替代。
- [x] A2：当前源码debug的 index_owner_tokens / index_kiosk_capabilities 对下载完整prefix独立验证quorum/连续性/交易/对象，并实际产生含新Personal类型的完整根；逐checkpoint与发布SQL digest/blobSHA核对，原始产物不可替换。
- [x] A3：独立账户SQL数据库、token/capability/reader最小权限角色；schema完整、两个根完整原子导入与sealed/端点检查。原数据库/root/sealed lineage保持，不向原token同类型唯一root中插入竞争根。
- [x] A4：新reader绑定这两个认证root/personalTypes及原GraphQL正式身份，独立API41951/TLS41952/loopback41956。公开范围为实际GraphQL/正式发布/两个根交集；root较新不冒作GraphQL已覆盖，不启动public_hi尚未到达root的续写worker。
- [ ] A5：实际四角色/六覆盖旗标/错误H0/未来/header/cursor/源身份门禁，已覆盖seed后的非空历史及生产地址风险语义、Chrome内容/最终NFT与名称目标；原账户入口保持。
- [ ] A6：根达到真实continuation边界再启新bounded worker，保留原worker；全部生效配置/metadata/pin/闭包/当前source及实际回归证明齐备后更新父任务。没有全HBase重建/完整generation Chrome，不勾选QA-A17等完整父合同。

执行细化：原download03完成67668次固定GET后进入原顺序全量recheck，过程保留运行。独立final-audit01以不可变download-complete marker和原procedure SHA为起点，对全部原raw重新比对fresh published SQL/bodySHA/size，并以原不变source.recheck按8个独立batch并发做全部SQL/latest HEAD复核，fresh guard/原生/source/debug保护前后成立才接受A1；不编辑/停止原审计、不复用认证结果缓存。账户原普通debug完整验证较慢，额外源码相同debug-assertions/overflow-checks=true的优化debug编译单独保留；完整根认证仍必须成功并逐checkpoint对齐。

A2实际debug attempt02两项通过：各67668个完整quorum/连续性检查点与fresh published SQL digest/blobSHA全量一致，耗时token262.15s、capability262.45s；token2次transition/live2，capability1次transition/tracked1含新Personal类型，完整原产物SHA固定。账户服务尚未导入，A1最终来源复核和A3–A6分别验收。

A1独立final-download01实际67668份固定GET产物全bodySHA/size、fresh RR SQL及全部HEAD再复核通过，8 batch并发138.40s；原顺序审核未停止/替换。A3首次import01两个根已原子导入/全部SQL比对/只读reader接受，但最后guard拒绝。原因是通用部署函数给新unused publication角色附加SELECT/USAGE，使frozen catalog ACL改变（并非容量瞬时503）；原失败及finalize01保留。repair01单事务撤回仅该新角色归档SELECT/USAGE，提交条件是catalog hash精确恢复原7d0190...，没有改变原frozen proof/image/原角色或重启服务；fresh guard通过。独立readonly finalize02全量SQL/payload/标记DB/角色/无继承与生产只读reader再次通过，未重放DDL/import。A4 API41951启动中，入口/共同范围/正例和Chrome仍待。

A4后验通过：实际API41951、TLS41952、独立loopback41954/55/56保留原四入口；新版C28 profile revision3/六pin声明保持原review2 authority，AST profile/registry逐字一致，生产编译0错误/2warnings及5280module/7JS完整闭包通过。transport-audit01生产只读reader实际交集18694–22759（根67667不扩大公开范围）；三TLS CA/localhost SAN握手、九真实Origin/preflight/GET拒绝及fresh发布门禁通过。positive-roles01真实四角色、六flags、0–205原回执/native比较、错误H0/未来/spoof拒绝通过。positive-C28-assets-chrome01真实生产worker/UI完整字节/四入口/资产及history/真实锁定/full journal保持共10检查通过。原窗口/原profile/原两workers保持，无normal HTTPS验收。A5正面NFT/Personal/name窗口未覆盖，A6配置已完整独立bootstrap认证准备，batch1000/fetch8仍不启动，未勾选A5/A6或父任务。

原顺序download03终态补充：全部顺序SQL/HEAD recheck后，terminal guard拒绝，失败日志保留，不写原download-evidence/pass。该终态与import01的unused角色ACL事件相同阶段，具体日志时间单列。独立final-download01已在导入前实际完成全部并发复核+guard验证；后续原catalog精确恢复、readonly roots/实际reader/API/三TLS/四角色/Chrome再次通过。原失败不改为通过、不中止/替换原审计，不把一次原终态失败忽略。
