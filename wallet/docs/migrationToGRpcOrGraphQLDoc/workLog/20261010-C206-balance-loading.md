# C206 首页余额持续 Loading 调查

用户报告首页RTD余额始终Loading。已在普通C51 Chrome原生页面复现：关闭DevTools／重新聚焦后余额区转圈，账户锁图标仍显示。网络现场已保存`20261010-C206-balance-loading-before-01.har`（953请求）；其中44个实际余额分页请求，多次成功响应为当前账户nodes空、hasNextPage=false。当前账户锁定，页面解锁入口在余额Loading容器内，准入blocked/error分支也完全跳过解锁入口。网络响应成功不等于用户可见余额成功。

待完成：隔离本地解锁入口与远端余额请求；回归四种状态；用户本地解锁后继续实际余额刷新验证。暂不改准入/撤权安全合同，不将空网络或失败状态写成0。

## 已确认原因与范围

当前C51账户处于锁定状态。原首页将UnlockAccountButton置于`Loading(isPending && !isFetched)`内部，余额准入阻断和错误两个提前return分支也没有解锁入口。ReadAdmission在focus/visibility变化时撤回当前数据，使用新准入key重新读取；因此切回页面/关闭DevTools可再次进入Loading，连本地解锁入口也被遮蔽。实际原生页面已复现此过程，随后读取完成时才出现解锁按钮。并非全部请求都挂死。

953条HAR中44个完整余额分页响应均为同一账户空集合、hasNextPage=false，H0及每条覆盖范围检查通过；这是索引快照数据，单独不等同当前链余额或完整reader收口。另直接通过原生gRPC执行GetServiceInfo→GetBalance→GetServiceInfo共3个只读请求，前后同H0且checkpoint1597494，当前RTD余额明确为0。因此解锁并完成读取后应该显示0 RTD，而不是无限Loading。见`20261010-C206-balance-page-observation-01.json`和`20261010-C206-native-current-balance-01.json`。

网络现场还有GraphQL504及取消请求，不能称全部后台请求稳定。锁定状态缺陷已明确定位；解锁后是否还存在独立Loading问题必须继续原生实测，不据当前代码修改直接宣称全部修复。

## 修复与检查

仅生产文件TokensDetails.tsx增加锁定账户独立返回分支，保留账户列表、名称和本地解锁按钮；余额未完成、准入blocked或错误均不再挡住解锁。没有更改read-admission、缓存撤回、余额reader、签名、执行或服务部署。后台source-map的全部模块及内容、manifest、profile和release registry保持一致。

- 48项定向回归通过（含7项新首页测试：锁定四状态、解锁后pending到真实空余额、未准入/错误不得显示假0）。
- RPC与production两项TypeScript检查通过。
- C206完整生产构建及closure审核通过，source e6c852eefd85531d7d55785594722802adfcbeaca8dc4805b28cb04c65150e44，1123个源文件。
- `20261010-C206-source-and-checks-01.json`验证旧源码身份逆向还原；只改一个生产文件并新增一个测试文件。
- `20261010-C206-ordinary-upgrade-prepared-01.json`已准备原路径更新，权限及配置未变，C201尚未替换。

## 安装前历史待办（已由下方实际安装记录取代）

原测试账户解锁界面已打开，请用户本地输入既有密码；未读取或记录密码。C206安装审核完成后已请求原路径升级确认（电脑操作工具要求市场外软件最终安装确认）。尚未获得本轮回复，未升级或计普通Chrome修复验收通过。升级会按既有流程完整保留C201目录及同ID账户。

前一轮ENV-07通过仅代表入口/权限/TLS合同；没有覆盖这次用户报告的首页锁定交互。总体92/98和试用未就绪保持，不将静态修复视为首页实测完成。


## 实际安装与解锁后续验

用户已明确批准C206原路径升级；现已完成独立C51普通Chrome安装，保留原扩展ID、测试账户与完整C201构建。`20261010-C206-ordinary-upgrade-installed-01.json`、`20261010-C206-installed-ordinary-browser-binding-01.json`及`20261010-C206-ordinary-bytecode-01.json`均passed，实际UI/worker静态字节一致。升级后首次打开和重新加载均立即出现本地“解锁账户”入口；用户自行完成再次解锁，没有读取密码或助记词。

解锁后原生AX观察与截图均实际显示“0X9D76…E5BC 资产组合 0 RTD”。随后通过浏览器“重新加载”按钮刷新，先出现网络校验提示，再进入Loading，最后自动恢复0 RTD。测试地址与此前只读原生gRPC的0余额结果一致。当前证明空余额的实际呈现及刷新恢复，不外推到非零余额/到账变化或全部网络请求稳定；重新校验期间仍有可见等待，需要单独优化。焦点切换验证继续记录。


## 本轮验收收口与剩余边界

当前零余额显示及刷新恢复验收通过，P206-3勾选。关闭DevTools后再次触发Loading，最后原生AX确认正常首页自动恢复0 RTD。切换扩展标签再返回后的恢复也观察到，但中间打开过DevTools，不记录为无干预性能测量。最终页面停留在正常钱包首页且余额可见。

新HAR `20261010-C206-balance-unlocked-after-01.har`（0600）含17请求：16个完整200 JSON响应、1个中断未计通过。审核脚本`qualify-C206-unlocked-balance.py`核验余额快照799393的Pin→Read→Revalidate：H0、快照digest、账户地址、两项coverage及空分页终态一致，见`20261010-C206-unlocked-balance-protocol-01.json`。浏览器可见证据单列于`20261010-C206-unlocked-balance-ui-01.json`，为本轮CUA原生AX/截图观察的人工记录，不伪称原始AX文件。

C206解决的是本地解锁入口被远端余额状态遮蔽；不是消除了所有远端等待。首次/刷新/焦点校验仍有可见等待，本轮没有测量准确耗时，也没有验证非零资金到账变化。已新增P206-5保留这些后续工作。总体仍92/98，签名恢复12/12、ENV8/8，未扩大任何父项的验收范围。
