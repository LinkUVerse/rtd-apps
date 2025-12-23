// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type RtdTransactionBlockResponse } from "rtd-typescript/client";
import {
	parseSerializedSignature,
	type SignatureScheme,
	type PublicKey,
} from "rtd-typescript/cryptography";
import { parsePartialSignatures } from "rtd-typescript/multisig";
import { toB64, normalizeRtdAddress } from "rtd-typescript/utils";
import { publicKeyFromRawBytes } from "rtd-typescript/verify";
import { Text } from "@linku/ui";

import { DescriptionItem, DescriptionList } from "~/ui/DescriptionList";
import { AddressLink } from "~/ui/InternalLink";
import { TabHeader } from "~/ui/Tabs";

type SignaturePubkeyPair = {
	signatureScheme: SignatureScheme;
	signature: Uint8Array;
} & ({ address: string } | { publicKey: PublicKey });

function SignaturePanel({
	title,
	signature: data,
}: {
	title: string;
	signature: SignaturePubkeyPair;
}) {
	const { signature, signatureScheme } = data;
	return (
		<TabHeader title={title}>
			<DescriptionList>
				<DescriptionItem title="Scheme" align="start" labelWidth="sm">
					<Text variant="pBody/medium" color="steel-darker">
						{signatureScheme}
					</Text>
				</DescriptionItem>
				<DescriptionItem title="Address" align="start" labelWidth="sm">
					<AddressLink
						noTruncate
						address={"address" in data ? data.address : data.publicKey.toRtdAddress()}
					/>
				</DescriptionItem>
				{"publicKey" in data ? (
					<DescriptionItem title="Rtd Public Key" align="start" labelWidth="sm">
						<Text variant="pBody/medium" color="steel-darker">
							{data.publicKey.toRtdPublicKey()}
						</Text>
					</DescriptionItem>
				) : null}
				<DescriptionItem title="Signature" align="start" labelWidth="sm">
					<Text variant="pBody/medium" color="steel-darker">
						{toB64(signature)}
					</Text>
				</DescriptionItem>
			</DescriptionList>
		</TabHeader>
	);
}

function getSignatureFromAddress(signatures: SignaturePubkeyPair[], rtdAddress: string) {
	return signatures.find(
		(signature) =>
			("address" in signature ? signature.address : signature.publicKey.toRtdAddress()) ===
			normalizeRtdAddress(rtdAddress),
	);
}

function getSignaturesExcludingAddress(
	signatures: SignaturePubkeyPair[],
	rtdAddress: string,
): SignaturePubkeyPair[] {
	return signatures.filter(
		(signature) =>
			("address" in signature ? signature.address : signature.publicKey.toRtdAddress()) !==
			normalizeRtdAddress(rtdAddress),
	);
}
type Props = {
	transaction: RtdTransactionBlockResponse;
};

export function Signatures({ transaction }: Props) {
	const sender = transaction.transaction?.data.sender;
	const gasData = transaction.transaction?.data.gasData;
	const transactionSignatures = transaction.transaction?.txSignatures;

	if (!transactionSignatures) return null;

	const isSponsoredTransaction = gasData?.owner !== sender;

	const deserializedTransactionSignatures = transactionSignatures
		.map((signature) => {
			const parsed = parseSerializedSignature(signature);
			if (parsed.signatureScheme === "MultiSig") {
				return parsePartialSignatures(parsed.multisig);
			}
			if (parsed.signatureScheme === "ZkLogin") {
				return {
					signatureScheme: parsed.signatureScheme,
					address: String(sender),
					signature: parsed.signature,
				};
			}

			return {
				...parsed,
				publicKey: publicKeyFromRawBytes(parsed.signatureScheme, parsed.publicKey),
			};
		})
		.flat();

	const userSignatures = isSponsoredTransaction
		? getSignaturesExcludingAddress(deserializedTransactionSignatures, gasData!.owner)
		: deserializedTransactionSignatures;

	const sponsorSignature = isSponsoredTransaction
		? getSignatureFromAddress(deserializedTransactionSignatures, gasData!.owner)
		: null;

	return (
		<div className="flex flex-col gap-8">
			{userSignatures.length > 0 && (
				<div className="flex flex-col gap-8">
					{userSignatures.map((signature, index) => (
						<div key={index}>
							<SignaturePanel title="User Signature" signature={signature} />
						</div>
					))}
				</div>
			)}

			{sponsorSignature && (
				<SignaturePanel title="Sponsor Signature" signature={sponsorSignature} />
			)}
		</div>
	);
}
