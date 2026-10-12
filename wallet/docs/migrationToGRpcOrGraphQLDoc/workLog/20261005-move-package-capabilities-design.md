# NET-04 NC3B：完整包合同实施前设计

按[NC3A–C](./20261005-native-service-capabilities-design.md)与[Task](../Task.md)继续，上一NC3A只读正例完成。当前native已存在并验证包0x2／明确UID、id响应；源码与[权威转换](../evidence/official/20261005-move-package-capabilities/manifest.json)查明：GetPackage不填Module.contents、typeOrigins或linkage；datatype.typeName使用查询storage包地址，definingId使用真正首次定义来源，不能从SDK注释推导二者相等。版本1originalId=storageId，升级包originalId从模块bytecode取address；本批不手写未经审核的Move bytecode解码器或伪造升级原地址验证。

| 子项 | 编码前状态 | 完整交付 |
| --- | --- | --- |
| B1 | 待实施 | 来源审核的Kiosk／PersonalKiosk／OriginByte完整字段／顺序／位置／abilities／泛型约束／phantom，函数visibility／entry／泛型／reference／参数与返回完整合同；递归和节点预算、原型及未知字段语义反例 |
| B2 | 待实施 | 对明确配置临时同链GetObject／GetPackage／GetObject逐包验证，完整BCS／digest／version／Immutable／module集合／typeOrigin与稳定引用；一个总期限、共享leaf、重复package去重、包与领域逐项负状态、只读真实报告 |
| B3 | 后续必需 | 尚未入目录的Coin／staking及其他读路径布局／动态名称包，NC3C独立registry／部署声明／revision；当前目录不能声称全钱包合同闭包 |

B1／B2先覆盖现有已配置Kiosk各路径，完整根目标不缩减；B3明确留在清单，无审核layout的name配置报告unsupported，不能默默套上默认Sui类型。目录基础包含0x2 UID／ID／Balance／VecSet／Table；framework Kiosk由显式kiosk=0x2或已配置OriginByte固定依赖使用，不推导PersonalKiosk、OriginByte、名称默认ID。kiosk任意非0x2当前reader已不支持，必须明确拒绝；PersonalKiosk含cap、Borrow与borrow_val／return_val，配置后还核验std Option。OriginByte发现包核验OwnerToken／NftRef／三DF键，执行包核验两个private entry完整泛型key+store、隐式TxContext、参数与返回；private entry可用于PTB，不能只接受public。空DF键dummy_field:bool取当前RTD编译合同，与既有BCS代码一致，不将其当所有Move版本通则。

## 结构和来源

手写审核模板直接取当前Move／钱包BCS及固定源码；禁止使用运行时GetPackage输出建立期望。abilities按集合语义规范排序，重复或未知拒绝；字段／variant／参数／返回有严格顺序及position。reference缺失表示按值，UNKNOWN=0不冒作缺失。datatype phantom必须显式boolean；函数泛型的phantom源码转换未提供，不猜false。signature体类别／typeName／typeParameter／实例化树均核验，≤16深度／4096节点、未知kind／不匹配附加payload／非法索引／重复字段／构造器原型旁路拒绝。

GetObject使用现有完整canonical BCS／digest／Immutable package校验；GetPackage storageId和version必须等于该对象，module名称全集必须精确等于BCS moduleMap，重复module／datatype／function拒绝。所有datatype真实definingId需与BCS typeOriginTable同名记录一致；所支持合同中的definingId还必须与reader实际拼装类型地址一致。全量bytecode来自BCS，返回其SHA及稳定object引用，不能以Module.contents缺失当空字节码通过。version1original必须storage；升级original仅作为服务声明保存，明确not-independently-decoded，不冒作从bytecode独立解析的事实。ABI／code关联为同链同selector／同version且前后对象稳定，不是密码学执行语义或部署签认，后者归C。

## 预算、输出和实施保护

默认30秒总期限，1–60000ms，单响应2MiB，GetPackage ≤256 modules／8192 descriptor项；实际leaf session.request持有到SDKbody／trailersettled。client只在探测内部，MVR空URL／POST与三只读方法白名单／omit credentials／redirect:error。身份开始／末验完整H0及必需u64范围、错链优先；忽略abort时调用结束但leaf仍结算，迟到／hash时会话失效不发布。每包本轮去重共享promise，绝无跨轮成功缓存。ABI不兼容不影响无关独立包，但依赖失败必须传播到领域结果；相同包多领域仍各自匹配合同。

输出逐包关联声明及逐组compatible／unsupported／unconfigured／incomplete／unavailable，明确catalog closure partial、部署签认not-verified、升级original独立解析未做、registry未验；没有ready／client／签名授权。名字配置存在但无审核layout明确unsupported，B3／C仍未完成。真实只读评估与全集单测／类型、失败记录及双方文档分别存档；不构建／Chrome或沿用历史C9为当前源码通过。指定最新debug与回放保护只读核验，绝不重启／resume、清genesis或操作原交易根；父49/98、trial_ready=false。
