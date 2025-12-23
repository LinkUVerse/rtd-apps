// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	type MoveCallRtdTransaction,
	type RtdArgument,
	type RtdMovePackage,
} from "rtd-typescript/client";
import { Text } from "@linku/ui";
import { type ReactNode } from "react";

import { flattenRtdArguments } from "./utils";
import { ErrorBoundary } from "~/components/error-boundary/ErrorBoundary";
import { ObjectLink } from "~/ui/InternalLink";

export type TransactionProps<T> = {
	type: string;
	data: T;
};

function TransactionContent({ children }: { children?: ReactNode }) {
	return (
		<Text variant="pBody/normal" color="steel-dark">
			{children}
		</Text>
	);
}

function ArrayArgument({ data }: TransactionProps<(RtdArgument | RtdArgument[])[] | undefined>) {
	return (
		<TransactionContent>
			{data && (
				<span className="break-all">
					<Text variant="pBody/medium">({flattenRtdArguments(data)})</Text>
				</span>
			)}
		</TransactionContent>
	);
}

function MoveCall({ data }: TransactionProps<MoveCallRtdTransaction>) {
	const {
		module,
		package: movePackage,
		function: func,
		arguments: args,
		type_arguments: typeArgs,
	} = data;

	return (
		<TransactionContent>
			<Text variant="pBody/medium">
				(package: <ObjectLink objectId={movePackage} />, module:{" "}
				<ObjectLink objectId={`${movePackage}?module=${module}`} label={`'${module}'`} />, function:{" "}
				<span className="break-all text-hero-dark">{func}</span>
				{args && <span className="break-all">, arguments: [{flattenRtdArguments(args)}]</span>}
				{typeArgs && <span className="break-all">, type_arguments: [{typeArgs.join(", ")}]</span>}
			</Text>
		</TransactionContent>
	);
}

export function Transaction({
	type,
	data,
}: TransactionProps<(RtdArgument | RtdArgument[])[] | MoveCallRtdTransaction | RtdMovePackage>) {
	if (type === "MoveCall") {
		return (
			<ErrorBoundary>
				<MoveCall type={type} data={data as MoveCallRtdTransaction} />
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary>
			<ArrayArgument
				type={type}
				data={type !== "Publish" ? (data as (RtdArgument | RtdArgument[])[]) : undefined}
			/>
		</ErrorBoundary>
	);
}
