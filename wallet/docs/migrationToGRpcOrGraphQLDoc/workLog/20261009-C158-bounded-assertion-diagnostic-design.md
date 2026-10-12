# 完整独立审核的大体积差异诊断

C154实际live仍通过且不重复业务；独立02、03两次进程exit137、无结果，不能记通过，具体kill原因尚无直接证据。真实报告56.116MiB、10318事件80.504MiB；主机128GiB、系统空闲75%，不据此称全局内存不足。保留两次terminal。限制1024MiB heap与显式GC后仍失败，必须继续定位。

拟仅改变审核断言失败的表示形式：equal仍Object.is、deepEqual仍Node util.isDeepStrictEqual、notDeepEqual为其反值，真/假语义与标准strict assert逐项实际对照；失败只含比较种类和调用栈，不生成完整几十MiB实体的差异文本。所有原正向条件和22实际变异保留。先运行数值、负零、NaN、原型、Date/Map/Set/cycle/typed bytes等正负及实际大Buffer拒绝，再以相同56MiB原输入、1024MiB heap和新独立输出定位；不能用此降低来源/数据/规范签名/反例标准或冒充业务验收。
