// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from 'rtd-typescript/bcs';
import {
	type DryRunTransactionBlockResponse,
	type ExecuteTransactionRequestType,
	type RtdClient,
	type RtdTransactionBlockResponse,
	type RtdTransactionBlockResponseOptions,
} from 'rtd-typescript/client';
import { messageWithIntent } from 'rtd-typescript/cryptography';
import { isTransaction, type Transaction } from 'rtd-typescript/transactions';
import { fromBase64, toBase64 } from 'rtd-typescript/utils';

const SIGNER_DEBUG_PREFIX = '[RTD Wallet Signer Debug]';

export type SignedTransaction = {
	transactionBlockBytes: string;
	signature: string;
};

export type SignedMessage = {
	messageBytes: string;
	signature: string;
};

export abstract class WalletSigner {
	client: RtdClient;

	constructor(client: RtdClient) {
		this.client = client;
	}

	abstract signData(data: Uint8Array, clientIdentifier?: string): Promise<string>;

	abstract getAddress(): Promise<string>;

	async signMessage(
		input: { message: Uint8Array },
		clientIdentifier?: string,
	): Promise<SignedMessage> {
		const signature = await this.signData(
			messageWithIntent('PersonalMessage', bcs.vector(bcs.u8()).serialize(input.message).toBytes()),
		);

		return {
			messageBytes: toBase64(input.message),
			signature,
		};
	}

	protected async prepareTransactionBlock(transactionBlock: Uint8Array | Transaction | string) {
		if (isTransaction(transactionBlock)) {
			// If the sender has not yet been set on the transaction, then set it.
			// NOTE: This allows for signing transactions with mis-matched senders, which is important for sponsored transactions.
			transactionBlock.setSenderIfNotSet(await this.getAddress());
			console.info(`${SIGNER_DEBUG_PREFIX} data before build`, transactionBlock.getData());
			const bytes = await transactionBlock.build({
				client: this.client,
			});
			console.info(`${SIGNER_DEBUG_PREFIX} data after build`, transactionBlock.getData());
			console.info(`${SIGNER_DEBUG_PREFIX} gas payment after build`, transactionBlock.getData().gasData.payment);
			return bytes;
		}

		if (typeof transactionBlock === 'string') {
			return fromBase64(transactionBlock);
		}

		if (transactionBlock instanceof Uint8Array) {
			return transactionBlock;
		}
		throw new Error('Unknown transaction format');
	}

	async signTransactionBlock(
		input: {
			transactionBlock: Uint8Array | Transaction;
		},
		clientIdentifier?: string,
	): Promise<SignedTransaction> {
		const bytes = await this.prepareTransactionBlock(input.transactionBlock);
		const signature = await this.signData(messageWithIntent('TransactionData', bytes));

		return {
			transactionBlockBytes: toBase64(bytes),
			signature,
		};
	}

	async signAndExecuteTransactionBlock(
		input: {
			transactionBlock: Uint8Array | Transaction;
			options?: RtdTransactionBlockResponseOptions;
			requestType?: ExecuteTransactionRequestType;
		},
		clientIdentifier?: string,
	): Promise<RtdTransactionBlockResponse> {
		const bytes = await this.prepareTransactionBlock(input.transactionBlock);
		console.info(`${SIGNER_DEBUG_PREFIX} prepared transaction bytes`, {
			byteLength: bytes.length,
			requestType: input.requestType,
			options: input.options,
		});
		const signed = await this.signTransactionBlock({
			transactionBlock: bytes,
		});
		console.info(`${SIGNER_DEBUG_PREFIX} signature received`, {
			transactionBlockByteLength: bytes.length,
			signatureCount: signed.signature ? 1 : 0,
		});

		console.info(`${SIGNER_DEBUG_PREFIX} executing transaction block`, {
			requestType: input.requestType,
			options: input.options,
		});
		const response = await this.client.executeTransactionBlock({
			transactionBlock: bytes,
			signature: signed.signature,
			options: input.options,
			requestType: input.requestType,
		});
		console.info(`${SIGNER_DEBUG_PREFIX} execute transaction response`, response);
		return response;
	}

	async dryRunTransactionBlock(input: {
		transactionBlock: Transaction | string | Uint8Array;
	}): Promise<DryRunTransactionBlockResponse> {
		return this.client.dryRunTransactionBlock({
			transactionBlock: await this.prepareTransactionBlock(input.transactionBlock),
		});
	}
}
