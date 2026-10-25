// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Search16 } from "rtd-apps-icons";
import { Text, Combobox, ComboboxInput, ComboboxList } from "@linku/ui";

export type SearchResult = {
	id: string;
	label: string;
	type: string;
};

export type SearchProps = {
	onChange: (value: string) => void;
	onSelectResult?: (result: SearchResult) => void;
	placeholder?: string;
	isLoading: boolean;
	options?: SearchResult[];
	queryValue: string;
};

export function Search({
	onChange,
	onSelectResult,
	placeholder,
	options = [],
	isLoading = false,
	queryValue,
}: SearchProps) {
	return (
		<Combobox value={queryValue} onValueChange={onChange}>
			<div className="relative flex h-11 items-center">
				<div className="pointer-events-none absolute left-0 ml-3.5 block items-center text-xl text-rtd">
					<Search16 />
				</div>

				<ComboboxInput
					className="focus-ring h-11 w-full rounded-full border border-line/90 bg-white/75 pl-10 pr-4 font-mono text-[13px] font-medium text-ink shadow-sm outline-none backdrop-blur transition-colors placeholder:font-sans placeholder:text-[13px] placeholder:text-steel hover:border-rtd-light focus:border-rtd-light focus:bg-white"
					placeholder={placeholder}
				/>
			</div>

			<ComboboxList
				isLoading={isLoading}
				onSelect={({ item }) => {
					onSelectResult?.(item);
				}}
				options={options.map((item) => ({
					item,
					value: `${item.type}/${item.id}`,
					label: item.label,
					after: (
						<Text variant="caption/medium" color="steel">
							{item.type}
						</Text>
					),
				}))}
			/>
		</Combobox>
	);
}
