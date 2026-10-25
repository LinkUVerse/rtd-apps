// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ArrowRight12 } from "rtd-apps-icons";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useMemo, useState } from "react";

export type TableCardProps<DataType extends object> = {
	refetching?: boolean;
	data: DataType[];
	columns: ColumnDef<DataType>[];
	sortTable?: boolean;
	defaultSorting?: SortingState;
};

function AscDescIcon({ sorting }: { sorting: "asc" | "desc" }) {
	return (
		<ArrowRight12
			fill="currentColor"
			className={clsx(sorting === "asc" ? "-rotate-90" : "rotate-90", "text-rtd")}
		/>
	);
}

export function TableCard<DataType extends object>({
	refetching,
	data,
	columns,
	sortTable,
	defaultSorting,
}: TableCardProps<DataType>) {
	const [sorting, setSorting] = useState<SortingState>(defaultSorting || []);

	const processedcol = useMemo<ColumnDef<DataType>[]>(
		() =>
			columns.map((column) => ({
				...column,
				...(!sortTable && { cell: ({ getValue }) => getValue() }),
			})),
		[columns, sortTable],
	);

	const table = useReactTable({
		data,
		columns: processedcol,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		enableSorting: !!sortTable,
		enableSortingRemoval: false,
		initialState: { sorting },
		state: { sorting },
	});

	return (
		<div
			className={clsx(
				"w-full overflow-x-auto transition-opacity",
				refetching && "opacity-50",
			)}
		>
			<table className="w-full min-w-max border-collapse text-left">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map(({ id, colSpan, column, isPlaceholder, getContext }) => (
								<th
									key={id}
									colSpan={colSpan}
									scope="col"
									className="h-10 whitespace-nowrap border-b border-line/90 pr-6 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-steel-dark last:pr-0"
									onClick={
										column.columnDef.enableSorting
											? column.getToggleSortingHandler()
											: undefined
									}
								>
									<div
										className={clsx(
											"flex items-center gap-1.5",
											column.columnDef.enableSorting &&
												"cursor-pointer select-none transition-colors hover:text-ink",
										)}
									>
										{isPlaceholder ? null : flexRender(column.columnDef.header, getContext())}
										{column.getIsSorted() && (
											<AscDescIcon sorting={column.getIsSorted() as "asc" | "desc"} />
										)}
									</div>
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id} className="group data-row">
							{row.getVisibleCells().map(({ column, id, getContext }) => (
								<td
									key={id}
									className="h-12 whitespace-nowrap pr-6 text-[13px] text-gray-75 transition-colors first:rounded-l-xl first:pl-3 last:rounded-r-xl last:pr-3 group-hover:text-ink"
								>
									{flexRender(column.columnDef.cell, getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
