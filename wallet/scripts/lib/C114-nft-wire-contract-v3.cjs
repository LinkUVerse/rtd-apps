// Independent canonical audit of retained NFT simulation bytes; no wallet reader or network.
const assert = require('node:assert/strict');
const {GrpcTypes} = require('rtd-typescript/grpc');
const {Transaction} = require('rtd-typescript/transactions');
const {bcs, TypeTagSerializer} = require('rtd-typescript/bcs');
const {toBase64, normalizeStructTag, normalizeRtdAddress, deriveDynamicFieldID} = require('rtd-typescript/utils');
const parser = require('./C88-post-write-bytes.cjs');
const {assertLegacySharedKindEqual} = require('./audit-legacy-shared-kind.cjs');
const canonical = encoded => parser.canonical(bcs.TransactionData,parser.base64(encoded));
const reference = o => ({objectId:o.objectId,version:String(o.version),digest:o.digest});
function expiration(proto, local) {
  assert(proto); const kinds = GrpcTypes.TransactionExpiration_TransactionExpirationKind;
  if (local.$kind === 'None') {assert.equal(proto.kind,kinds.NONE);return}
  if (local.$kind === 'Epoch') {assert.equal(proto.kind,kinds.EPOCH);assert.equal(String(proto.epoch),String(local.Epoch));return}
  assert(['ValidDuring','Validity'].includes(local.$kind)); const v = local[local.$kind];
  assert.equal(proto.kind,local.$kind === 'Validity' ? kinds.VALIDITY : kinds.VALID_DURING);
  for (const [field,key] of [['minEpoch','minEpoch'],['epoch','maxEpoch'],['minTimestamp','minTimestamp'],['maxTimestamp','maxTimestamp']])
    assert.equal(proto[field] === undefined ? null : String(proto[field]),v[key] === null ? null : String(v[key]));
  assert.equal(proto.chain,v.chain);assert.equal(String(proto.nonce),String(v.nonce));
  if (local.$kind === 'Validity') {assert.equal(String(proto.allowedProposers?.epoch),v.allowedProposers.epoch);assert.deepEqual(proto.allowedProposers.proposers,v.allowedProposers.proposers)}
}
function owner(proto) {
  assert(proto);const k = GrpcTypes.Owner_OwnerKind;
  if (proto.kind === k.ADDRESS) return {$kind:'AddressOwner',AddressOwner:proto.address};
  if (proto.kind === k.OBJECT) return {$kind:'ObjectOwner',ObjectOwner:proto.address};
  if (proto.kind === k.SHARED) return {$kind:'Shared',Shared:{initialSharedVersion:String(proto.version)}};
  if (proto.kind === k.IMMUTABLE) return {$kind:'Immutable',Immutable:true};
  assert.equal(proto.kind,k.CONSENSUS_ADDRESS);
  return {$kind:'ConsensusAddressOwner',ConsensusAddressOwner:{owner:proto.address,startVersion:String(proto.version)}};
}
function object(value) {
  assert(value?.bcs?.value?.length && value.contents?.value?.length);
  const data = parser.canonical(bcs.Object,value.bcs.value);assert.equal(parser.typed('Object',value.bcs.value),value.digest);
  assert.equal(data.data.$kind,'Move');const move = data.data.Move;
  assert.equal(move.version,String(value.version));assert.equal(data.previousTransaction,value.previousTransaction);
  assert.equal(String(data.storageRebate),String(value.storageRebate));
  assert.deepEqual(Buffer.from(move.contents),Buffer.from(value.contents.value));
  assert.equal(bcs.Address.parse(Buffer.from(move.contents).subarray(0,32)),value.objectId);
  assert.deepEqual(Buffer.from(bcs.Owner.serialize(data.owner).toBytes()),Buffer.from(bcs.Owner.serialize(owner(value.owner)).toBytes()));
  let type;
  if (move.type.$kind === 'Other') type = TypeTagSerializer.tagToString({struct:move.type.Other});
  else if (move.type.$kind === 'GasCoin') type = '0x2::coin::Coin<0x2::rtd::RTD>';
  else if (move.type.$kind === 'StakedRtd') type = '0x3::staking_pool::StakedRtd';
  else {assert.equal(move.type.$kind,'Coin');type = '0x2::coin::Coin<' + TypeTagSerializer.tagToString(move.type.Coin) + '>'}
  assert.equal(normalizeStructTag(type),normalizeStructTag(value.objectType));
  return {objectId:value.objectId,version:String(value.version),digest:value.digest,type:normalizeStructTag(type),
    owner:data.owner,content:Buffer.from(move.contents),objectBcs:Buffer.from(value.bcs.value)};
}
function route(data,item) {
  const pt = data.V1.kind.ProgrammableTransaction;assert(pt);const commands = pt.commands;
  const input = arg => {assert.equal(arg.$kind,'Input');assert(Number.isInteger(arg.Input) && arg.Input >= 0 && arg.Input < pt.inputs.length);return pt.inputs[arg.Input]};
  const pureAddress = arg => {const v = input(arg);assert.equal(v.$kind,'Pure');return bcs.Address.parse(parser.base64(v.Pure.bytes))};
  const objectInput = arg => {const v = input(arg);assert.equal(v.$kind,'Object');return v.Object};
  const transfer = (command,objectArgument) => {assert.equal(command.$kind,'TransferObjects');assert.deepEqual(command.TransferObjects.objects,[objectArgument]);assert.equal(pureAddress(command.TransferObjects.address),item.to)};
  if (item.route === 'direct') {
    assert.equal(commands.length,1);const arg = commands[0].TransferObjects?.objects[0];assert(arg);
    const value = objectInput(arg);assert(['ImmOrOwnedObject','SharedObject'].includes(value.$kind));assert.equal(value[value.$kind].objectId,item.objectId);
    transfer(commands[0],arg);return {abi:'direct-address',recipient:item.to};
  }
  if (['framework-kiosk','personal-kiosk'].includes(item.route)) {
    const personal = item.route === 'personal-kiosk',takeIndex = personal ? 1 : 0;
    assert.deepEqual(commands.map(c => c.$kind),personal ? ['MoveCall','MoveCall','TransferObjects','MoveCall'] : ['MoveCall','TransferObjects']);
    const take = commands[takeIndex].MoveCall;
    assert.equal(take.package,normalizeRtdAddress('0x2'));assert.equal(take.module,'kiosk');assert.equal(take.function,'take');assert.deepEqual(take.typeArguments,[item.objectType]);assert.equal(take.arguments.length,3);
    const kiosk = objectInput(take.arguments[0]);assert(['SharedObject','ImmOrOwnedObject'].includes(kiosk.$kind));
    assert.equal(pureAddress(take.arguments[2]),item.objectId);
    if (personal) {
      const borrow = commands[0].MoveCall,ret = commands[3].MoveCall;
      assert.equal(borrow.module,'personal_kiosk');assert.equal(borrow.function,'borrow_val');assert.equal(borrow.arguments.length,1);objectInput(borrow.arguments[0]);
      assert.equal(ret.package,borrow.package);assert.equal(ret.module,'personal_kiosk');assert.equal(ret.function,'return_val');assert.deepEqual(ret.typeArguments,borrow.typeArguments);assert.deepEqual(borrow.typeArguments,[]);
      assert.deepEqual(take.arguments[1],{$kind:'NestedResult',NestedResult:[0,0]});
      assert.deepEqual(ret.arguments,[borrow.arguments[0],{$kind:'NestedResult',NestedResult:[0,0]},{$kind:'NestedResult',NestedResult:[0,1]}]);
    } else objectInput(take.arguments[1]);
    transfer(commands[takeIndex+1],{$kind:'NestedResult',NestedResult:[takeIndex,0]});
    return {abi:personal ? 'personal-borrow-take-return' : 'framework-take',recipient:item.to,kioskId:kiosk[kiosk.$kind].objectId};
  }
  assert.equal(item.route,'originbyte-kiosk');assert.equal(commands.length,1);
  const call = commands[0].MoveCall;assert(call && call.module === 'ob_kiosk');assert.equal(call.arguments.length,3);assert.deepEqual(call.typeArguments,[item.objectType]);
  const source = objectInput(call.arguments[0]);assert.equal(source.$kind,'SharedObject');assert.equal(source.SharedObject.mutable,true);assert.equal(pureAddress(call.arguments[2]),item.objectId);
  if (call.function === 'p2p_transfer') {
    const target = objectInput(call.arguments[1]);assert.equal(target.$kind,'SharedObject');assert.equal(target.SharedObject.mutable,true);assert.notEqual(target.SharedObject.objectId,source.SharedObject.objectId);
    if (item.targetKioskId !== undefined) assert.equal(target.SharedObject.objectId,item.targetKioskId);
    return {abi:'originbyte-existing-shared-target',recipient:item.to,targetKioskId:target.SharedObject.objectId,sourceKioskId:source.SharedObject.objectId};
  }
  assert.equal(call.function,'p2p_transfer_and_create_target_kiosk');assert.equal(pureAddress(call.arguments[1]),item.to);
  return {abi:'originbyte-new-pure-recipient',recipient:item.to,sourceKioskId:source.SharedObject.objectId};
}
function errorDetails(headers) {
  assert(/^(?:[1-9]|1[0-6])$/.test(headers['grpc-status']));assert(headers['grpc-message']);
  const encoded = headers['grpc-status-details-bin'];assert(encoded);
  const bytes = Buffer.from(encoded,'base64');assert(bytes.length && bytes.toString('base64').replace(/=+$/,'') === encoded.replace(/=+$/,''));
  let position = 0;const fields = [];
  const uint = () => {let value = 0n,shift = 0n;for (let n = 0;n < 10;n++) {assert(position < bytes.length);const byte = bytes[position++];value |= BigInt(byte & 127) << shift;if (!(byte & 128)) return value;shift += 7n}assert.fail('Overlong status varint')};
  while (position < bytes.length) {
    const tag = uint(),field = Number(tag >> 3n),wire = Number(tag & 7n);assert(field > 0);
    if (wire === 0) fields.push({field,value:uint()});
    else {assert.equal(wire,2);const size = uint();assert(size <= BigInt(bytes.length-position));const value = bytes.subarray(position,position+Number(size));position += Number(size);fields.push({field,value})}
  }
  const codes = fields.filter(f => f.field === 1),messages = fields.filter(f => f.field === 2);assert.equal(codes.length,1);assert.equal(messages.length,1);
  assert.equal(String(codes[0].value),headers['grpc-status']);assert(Buffer.isBuffer(messages[0].value));
  assert.equal(messages[0].value.toString('utf8'),decodeURIComponent(headers['grpc-message']));
  assert(fields.every(f => [1,2,3].includes(f.field)));
  return {status:Number(headers['grpc-status']),message:messages[0].value.toString('utf8'),detailsBase64:bytes.toString('base64'),additionalDetails:fields.filter(f => f.field === 3).map(f => {assert(Buffer.isBuffer(f.value));return f.value.toString('base64')})};
}
function outcome(effects,objects,item,abi) {
  assert.equal(effects.$kind,'V2');const changes = effects.V2.changedObjects,write = changes.filter(([id]) => id === item.objectId);
  assert.equal(write.length,1);assert.equal(write[0][1].outputState.$kind,'ObjectWrite');const holder = write[0][1].outputState.ObjectWrite[1];
  if (item.route !== 'originbyte-kiosk') {assert.equal(holder.$kind,'AddressOwner');assert.equal(holder.AddressOwner,item.to);return {nftRecipient:item.to}}
  assert.equal(holder.$kind,'ObjectOwner');let target;
  if (abi.abi === 'originbyte-existing-shared-target') target = abi.targetKioskId;
  else {
    const candidates = changes.filter(([id,v]) => v.idOperation.$kind === 'Created' && v.outputState.ObjectWrite?.[1].$kind === 'Shared');
    const matching = candidates.filter(([id]) => deriveDynamicFieldID(id,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',bcs.Address.serialize(item.objectId).toBytes()) === holder.ObjectOwner);
    assert.equal(matching.length,1);target = matching[0][0];
    const tokens = objects.filter(o => o.type.endsWith('::ob_kiosk::OwnerToken') && o.owner.AddressOwner === item.to && o.content.length === 96 && bcs.Address.parse(o.content.subarray(32,64)) === target && bcs.Address.parse(o.content.subarray(64)) === item.to);
    assert.equal(tokens.length,1);assert(changes.some(([id,v]) => id === tokens[0].objectId && v.idOperation.$kind === 'Created'));
  }
  assert.equal(holder.ObjectOwner,deriveDynamicFieldID(target,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',bcs.Address.serialize(item.objectId).toBytes()));
  const kiosks = objects.filter(o => o.objectId === target && o.type === normalizeStructTag('0x2::kiosk::Kiosk'));
  assert(kiosks.length);assert(kiosks.every(o => o.owner.$kind === 'Shared' && bcs.Address.parse(o.content.subarray(40,72)) === item.to));
  return {nftRecipient:item.to,targetKioskId:target,nftDynamicObjectOwner:holder.ObjectOwner};
}
async function simulation(wire,prepared,{resolution=false,allowFailure=false,item}={}) {
  assert.equal(wire.url,'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction');assert.equal(wire.status,200);
  const request = GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(wire.requestBase64,false));
  assert.equal(request.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
  let data;if (!resolution) {data = canonical(prepared.bytesBase64);assert.equal(parser.typed('TransactionData',parser.base64(prepared.bytesBase64)),prepared.digest);
    assert.equal(toBase64(request.transaction.bcs.value),prepared.bytesBase64);assert.equal(request.doGasSelection,data.V1.gasData.payment.length === 0 && BigInt(data.V1.gasData.price) > 0n);
    assert.deepEqual(request.readMask.paths,['transaction','command_outputs']);}
  if (wire.bodyUnavailable || !wire.responseBase64) {assert(allowFailure && !resolution);return {request,error:errorDetails(wire.headers)}}
  let response;
  try {response = GrpcTypes.SimulateTransactionResponse.fromBinary(parser.grpcBody(wire.responseBase64,true))}
  catch (error) {assert(allowFailure && !resolution);const headers = {...wire.headers};
    const raw = parser.base64(wire.responseBase64);let pos = 0,trailers = '';
    while (pos < raw.length) {assert(pos+5 <= raw.length);const flag = raw[pos],size = raw.readUInt32BE(pos+1);pos += 5;assert(pos+size <= raw.length);assert([0,128].includes(flag));if (flag === 128) trailers += raw.subarray(pos,pos+size).toString();pos += size}
    for (const line of trailers.split('\r\n').filter(Boolean)) {const at = line.indexOf(':');assert(at > 0);const key = line.slice(0,at).toLowerCase(),value = line.slice(at+1).trim();if (headers[key] !== undefined) assert.equal(headers[key],value);headers[key] = value}
    return {request,error:errorDetails(headers)};
  }
  const tx = response.transaction;assert(tx?.transaction && tx.effects);
  if (resolution) {
    assert(request.doGasSelection && !request.transaction.bcs?.value && request.transaction.kind);
    assert(tx.effects.status?.success && !tx.effects.status.error);assertLegacySharedKindEqual(tx.transaction.kind.data,request.transaction.kind.data);
    const expected = canonical(prepared.bytesBase64).V1,selected = tx.transaction.gasPayment;assert(selected);
    assert.equal(request.transaction.sender,expected.sender);assert.equal(tx.transaction.sender,expected.sender);
    assert.equal(selected.owner,expected.gasData.owner);assert.equal(String(selected.price),expected.gasData.price);assert.equal(String(selected.budget),expected.gasData.budget);assert.deepEqual(selected.objects.map(reference),expected.gasData.payment);
    return {request,response,gasSelection:true,selected:expected.gasData};
  }
  assert.equal(toBase64(tx.transaction.bcs.value),prepared.bytesBase64);
  if (tx.digest !== undefined) assert.equal(tx.digest,prepared.digest);assert.equal(tx.transaction.digest,prepared.digest);
  assert.equal(tx.transaction.sender,data.V1.sender);const gas = tx.transaction.gasPayment;
  assert.equal(gas.owner,data.V1.gasData.owner);assert.equal(String(gas.price),data.V1.gasData.price);assert.equal(String(gas.budget),data.V1.gasData.budget);assert.deepEqual(gas.objects.map(reference),data.V1.gasData.payment);expiration(tx.transaction.expiration,data.V1.expiration);
  const rebuilt = await Transaction.from(JSON.stringify(require('rtd-typescript/grpc').parseGrpcSimulateTransactionResponse(response,{include:{transaction:true,bcs:true,effects:true}}).Transaction?.transaction ?? require('rtd-typescript/grpc').parseGrpcSimulateTransactionResponse(response,{include:{transaction:true,bcs:true,effects:true}}).FailedTransaction.transaction)).build();
  assert.equal(toBase64(rebuilt),prepared.bytesBase64);
  const effects = parser.canonical(bcs.TransactionEffects,tx.effects.bcs.value),body = effects[effects.$kind];
  assert.equal(parser.typed('TransactionEffects',tx.effects.bcs.value),tx.effects.digest);assert.equal(body.transactionDigest,prepared.digest);assert.equal(tx.effects.transactionDigest,prepared.digest);assert.equal(body.executedEpoch,String(tx.effects.epoch));
  assert.equal(body.status.$kind === 'Success',tx.effects.status.success);assert.equal(tx.effects.version,effects.$kind === 'V2' ? 2 : 1);
  assert.equal(Boolean(tx.effects.status.error),!tx.effects.status.success);if (!allowFailure) assert.equal(tx.effects.status.success,true);
  for (const key of ['computationCost','storageCost','storageRebate','nonRefundableStorageFee']) assert.equal(String(tx.effects.gasUsed[key]),body.gasUsed[key]);
  assert.deepEqual(tx.effects.dependencies,body.dependencies);assert.equal(tx.effects.eventsDigest ?? null,body.eventsDigest);
  if (effects.$kind === 'V2') {assert.equal(tx.effects.auxiliaryDataDigest ?? null,body.auxDataDigest);assert.equal(String(tx.effects.lamportVersion),body.lamportVersion);assert.deepEqual(tx.effects.changedObjects.map(o => o.objectId),body.changedObjects.map(([id]) => id));assert.deepEqual(tx.effects.unchangedConsensusObjects.map(o => o.objectId),body.unchangedConsensusObjects.map(([id]) => id))}
  const objects = (tx.objects?.objects ?? []).map(object);
  const abi = item ? route(data,item) : null,result = item && tx.effects.status.success ? outcome(effects,objects,item,abi) : null;
  return {request,response,data,effects,objects,abi,outcome:result,canonicalFinalBytesAndEffects:true,success:tx.effects.status.success};
}
module.exports = {canonical,expiration,object,route,errorDetails,outcome,simulation};
