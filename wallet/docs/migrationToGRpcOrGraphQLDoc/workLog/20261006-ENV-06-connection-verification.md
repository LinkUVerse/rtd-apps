# ENV-06 G1–G2 连接与HTTP/2候选验证

原策略134空连接全部保留；候选128全局上限保留127／关闭7，加启动连接达到128。两次完整31协议均通过。候选未部署，原runtime renderer／manifest／TLS／publisher／水位保持。

HTTP/2首次01–04测试均失败并保留。04固定镜像实际trace证明stream129发生Protocol error，但测试只等待RST／GOAWAY，没有处理实际连接关闭。05添加64条合法未结束流后的独立PING控制：实际ACK、没有关闭或RST／GOAWAY；随后第65条stream129使对端关闭连接。33项协议与真实临时Chrome CORS／取消均通过。这是实际连接级拒绝，不能写成收到了RST帧；64 SETTINGS与单独PING对照共同排除只观察配置的误判。

证据：[原31](./20261006-ENV-06-original-connections-01.json)、[候选31](./20261006-ENV-06-candidate-connections-01.json)、[失败04](./20261006-ENV-06-candidate-http2-04.json)、[完整33](./20261006-ENV-06-candidate-http2-05.json)。固定Envoy源码[dispatch与onInvalidFrame](https://github.com/envoyproxy/envoy/blob/v1.39.1/source/common/http/http2/codec_impl.cc)、[RFC9113](https://www.rfc-editor.org/rfc/rfc9113.html)作为核对依据。

G3仍待：RTD tonic0.14.6 Ledger／Move构建器无显式max_encoding_message_size，SDK transport无额外响应单消息上限，现4MiB请求buffer不能代替原生响应编码预算。未修改RTD源码、未重编或安装候选。父ENV-06不勾选，53/98、trial_ready=false。

00:26只读TLS SQLmin372224、Displaythrough386503；00:29认证账本publishedHi586007／pendingHi726884、epoch1 active。原pending完整保留。首次只读脚本因重复options参数在连接前TypeError，合并参数后成功；不涉及数据库写入或回滚。
