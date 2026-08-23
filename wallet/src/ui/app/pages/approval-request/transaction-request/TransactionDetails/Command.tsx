// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_src/ui/app/shared/text';
import { useI18n, type MessageKey, type MessageValues } from '_app/i18n';
import { ChevronDown12, ChevronRight12 } from 'rtd-apps-icons';
import {
	type Argument,
	type Commands,
	type TransactionData,
} from 'rtd-typescript/transactions';
import { toBase64 } from 'rtd-typescript/utils';
import { useState } from 'react';

type TransactionType = TransactionData['commands'][0];
type MakeMoveVecTransaction = ReturnType<(typeof Commands)['MakeMoveVec']>;
type PublishTransaction = ReturnType<(typeof Commands)['Publish']>;
type Translate = (key: MessageKey, values?: MessageValues) => string;

const commandLabelKeys: Record<TransactionType['$kind'], MessageKey> = {
	MoveCall: 'transaction.command.moveCall',
	MakeMoveVec: 'transaction.command.makeMoveVec',
	MergeCoins: 'transaction.command.mergeCoins',
	TransferObjects: 'transaction.command.transferObjects',
	SplitCoins: 'transaction.command.splitCoins',
	Publish: 'transaction.command.publish',
	Upgrade: 'transaction.command.upgrade',
	$Intent: 'transaction.command.intent',
};

const fieldLabelKeys: Record<string, MessageKey> = {
	kind: 'transaction.field.kind',
	package: 'transaction.field.package',
	module: 'transaction.field.module',
	function: 'transaction.field.function',
	typeArguments: 'transaction.field.typeArguments',
	arguments: 'transaction.field.arguments',
	type: 'transaction.field.type',
	elements: 'transaction.field.elements',
	destination: 'transaction.field.destination',
	sources: 'transaction.field.sources',
	objects: 'transaction.field.objects',
	address: 'transaction.field.address',
	coin: 'transaction.field.coin',
	amounts: 'transaction.field.amounts',
	modules: 'transaction.field.modules',
	dependencies: 'transaction.field.dependencies',
	packageId: 'transaction.field.packageId',
	ticket: 'transaction.field.ticket',
};

function convertCommandArgumentToString(
	arg:
		| null
		| string
		| number
		| string[]
		| number[]
		| Argument
		| Argument[]
		| MakeMoveVecTransaction['MakeMoveVec']['type']
		| PublishTransaction['Publish']['modules'],
	t: Translate,
): string | null {
	if (!arg) return null;

	if (typeof arg === 'string' || typeof arg === 'number') return String(arg);

	if (typeof arg === 'object' && 'None' in arg) {
		return null;
	}

	if (Array.isArray(arg)) {
		// Publish transaction special casing:
		if (typeof arg[0] === 'number') {
			return toBase64(new Uint8Array(arg as number[]));
		}

		return `[${arg.map((argVal) => convertCommandArgumentToString(argVal, t)).join(', ')}]`;
	}

	switch (arg.$kind) {
		case 'GasCoin':
			return t('transaction.argument.gasCoin');
		case 'Input':
			return `${t('transaction.argument.input')}(${arg.Input})`;
		case 'Result':
			return `${t('transaction.argument.result')}(${arg.Result})`;
		case 'NestedResult':
			return `${t('transaction.argument.nestedResult')}(${arg.NestedResult[0]}, ${arg.NestedResult[1]})`;
		default:
			// eslint-disable-next-line no-console
			console.warn('Unexpected command argument type.', arg);
			return null;
	}
}

function convertCommandToString(command: TransactionType, t: Translate) {
	let normalizedCommand;
	switch (command.$kind) {
		case 'MoveCall':
			normalizedCommand = {
				kind: t('transaction.command.moveCall'),
				...command.MoveCall,
				typeArguments: command.MoveCall.typeArguments,
			};
			break;
		case 'MakeMoveVec':
			normalizedCommand = {
				kind: t('transaction.command.makeMoveVec'),
				type: command.MakeMoveVec.type,
				elements: command.MakeMoveVec.elements,
			};
			break;
		case 'MergeCoins':
			normalizedCommand = {
				kind: t('transaction.command.mergeCoins'),
				destination: command.MergeCoins.destination,
				sources: command.MergeCoins.sources,
			};
			break;
		case 'TransferObjects':
			normalizedCommand = {
				kind: t('transaction.command.transferObjects'),
				objects: command.TransferObjects.objects,
				address: command.TransferObjects.address,
			};
			break;
		case 'SplitCoins':
			normalizedCommand = {
				kind: t('transaction.command.splitCoins'),
				coin: command.SplitCoins.coin,
				amounts: command.SplitCoins.amounts,
			};
			break;
		case 'Publish':
			normalizedCommand = {
				kind: t('transaction.command.publish'),
				modules: command.Publish.modules,
				dependencies: command.Publish.dependencies,
			};
			break;
		case 'Upgrade':
			normalizedCommand = {
				kind: t('transaction.command.upgrade'),
				modules: command.Upgrade.modules,
				dependencies: command.Upgrade.dependencies,
				packageId: command.Upgrade.package,
				ticket: command.Upgrade.ticket,
			};
			break;
		case '$Intent': {
			throw new Error(t('transaction.intentUnsupported'));
		}
	}

	const commandArguments = Object.entries(normalizedCommand);
	return commandArguments
		.map(([key, value]) => {
			const stringValue = convertCommandArgumentToString(value, t);

			if (!stringValue) return null;

			return `${fieldLabelKeys[key] ? t(fieldLabelKeys[key]) : key}: ${stringValue}`;
		})
		.filter(Boolean)
		.join(', ');
}

interface CommandProps {
	command: TransactionType;
}

export function Command({ command }: CommandProps) {
	const { t } = useI18n();
	const [expanded, setExpanded] = useState(true);

	return (
		<div>
			<button
				onClick={() => setExpanded((expanded) => !expanded)}
				aria-expanded={expanded}
				className="flex min-h-11 items-center gap-2 w-full rounded-[10px] bg-transparent border-none px-2 -mx-2 hover:bg-hero/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hero/40"
			>
				<Text variant="body" weight="semibold" color="steel-darker">
					<span className="whitespace-nowrap">
						{t(commandLabelKeys[command.$kind])}
					</span>
				</Text>
				<div className="h-px bg-gray-40 flex-1" />
				<div className="text-steel">
					{expanded ? <ChevronDown12 /> : <ChevronRight12 />}
				</div>
			</button>

			{expanded && (
				<div className="mt-2 break-words text-pBodySmall font-medium text-steel">
					({convertCommandToString(command, t)})
				</div>
			)}
		</div>
	);
}
