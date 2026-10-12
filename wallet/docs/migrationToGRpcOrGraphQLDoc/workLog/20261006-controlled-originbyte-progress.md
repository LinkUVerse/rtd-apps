# 受控OriginByte seed及独立原摘要审核

按[设计](./20261006-controlled-originbyte-design.md)完成O1–O3的有限夹具范围。当前C26产品保持1110文件／03a1df27…，原98父任务仍78项完成。部署源码和工具均在link-u-smart-contract/all-in-one-deploy/localDeploy，最新RTD源码debug／原链／原pending保留。

准备01核验同链两个package实际ABI、当前8debug和受控sender／target；13个原source尝试按原摘要和原BCS复核成功后，构建精确unsigned bytes并正式checks-enabled模拟，0签名／0Execute。执行01再次只读复核13笔，复用同一unsigned摘要EniYxyeMSiN3Mkrn6ziS6uPaeiBSFpkpbRt9kmMFjw1X，经一次正式模拟、一次签名及一次Execute成功，checkpoint1007816；原pending／receipt／recovered保留，没有重发。

[独立恢复02](./20261006-controlled-originbyte-recovery-02.json)验签并核对原交易BCS、effects、digest及checkpoint，0新模拟／签名／执行。实际两件NFT serial1／2、source与target两枚OwnerToken、共享Kiosk的BCS／UID／owner／数量2与0均核验；生产originByteOwnerToken解析也确认。OwnerToken只用于发现，不当成OwnerCap或交易授权。

[实际capability审核01](./20261006-controlled-originbyte-capability-01.json)进一步验证两处KioskOwnerCapDfKey的真实00键、Field派生ID／父owner、内部OwnerCap UID／for及规范原BCS，0新模拟／签名／执行；source与target实际cap绑定成立。

NFT实际属于动态对象字段，其Field属于source Kiosk；核验按实际Wrapper<Item>键推导并逐层检查Field BCS／子UID／对象owner。恢复01误用derived object推导函数，测试失败和原源码保留；恢复02改用deriveDynamicFieldID后通过。依据[Sui官方动态字段实现](https://github.com/MystenLabs/ts-sdks/blob/main/packages/sui/src/utils/dynamic-fields.ts)及[派生对象实现](https://github.com/MystenLabs/ts-sdks/blob/main/packages/sui/src/utils/derived-objects.ts)，二者的类型包裹不同；钱包生产dynamic-fields已使用正确函数，没有产品修改或第二笔交易。

source Kiosk为0xba2abfca6d6a6c59b62e01656507ef62fe4cda17a9446c0408a4de103acf8e6b；target空Kiosk为0xeaea52ef2d2f2e3cb9e8e784d57062f81a284ecb4ed3153924eca4872056ca33。O4／O5仍待真实认证GraphQL覆盖及当前Chrome已有目标／创建目标两种生产转移、写后读刷新、所有Kiosk分支汇总；不勾RPC-22／RPC-23／QA-A07。
