// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { explorerDisplayString } from "rtd-apps-core/src/utils/explorer-kiosk";
import type { RtdObjectResponse } from "rtd-typescript/jsonRpc";

import { useResolveVideo } from "~/hooks/useResolveVideo";
import { ObjectDetails } from "~/ui/ObjectDetails";
import { parseObjectType } from "~/utils/objectUtils";
import { trimStdLibPrefix } from "~/utils/stringUtils";

type OwnedObjectTypes = {
	obj: RtdObjectResponse;
};

export default function OwnedObject({ obj }: OwnedObjectTypes) {
	const video = useResolveVideo(obj);

	return (
		<ObjectDetails
			noTypeRender
			variant="small"
			id={obj.data?.objectId}
			type={trimStdLibPrefix(parseObjectType(obj))}
			name={explorerDisplayString(obj, "name") ?? explorerDisplayString(obj, "description") ?? "--"}
			image={explorerDisplayString(obj, "image_url")}
			video={video}
		/>
	);
}
