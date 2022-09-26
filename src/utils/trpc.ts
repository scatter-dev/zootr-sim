// src/utils/trpc.ts
import type { AppRouter } from "../server/router";
import { createReactQueryHooks } from "@trpc/react";
import type { inferProcedureOutput, inferProcedureInput } from "@trpc/server";
import { mapHeaderTextAtom, errorTextAtom, fetchingAtom } from "./atoms";
import { useUpdateAtom } from "jotai/utils";
import { useRouter } from "next/router";

export const trpc = createReactQueryHooks<AppRouter>();

/**
 * These are helper types to infer the input and output of query resolvers
 * @example type HelloOutput = inferQueryOutput<'hello'>
 */
export type inferQueryOutput<
	TRouteKey extends keyof AppRouter["_def"]["queries"]
> = inferProcedureOutput<AppRouter["_def"]["queries"][TRouteKey]>;

export type inferQueryInput<
	TRouteKey extends keyof AppRouter["_def"]["queries"]
> = inferProcedureInput<AppRouter["_def"]["queries"][TRouteKey]>;

export type inferMutationOutput<
	TRouteKey extends keyof AppRouter["_def"]["mutations"]
> = inferProcedureOutput<AppRouter["_def"]["mutations"][TRouteKey]>;

export type inferMutationInput<
	TRouteKey extends keyof AppRouter["_def"]["mutations"]
> = inferProcedureInput<AppRouter["_def"]["mutations"][TRouteKey]>;

export const usePlaythrough = (id: string) => {
	const router = useRouter();
	const setErrorText = useUpdateAtom(errorTextAtom);
	return trpc.useQuery(["playthrough.get", { id }], {
		retry: false,
		onError(err) {
			setErrorText(err.message);
			router.push("/play");
		},
	});
};

export const useCheckLocation = (id: string) => {
	const setFetching = useUpdateAtom(fetchingAtom);
	const setMapHeaderText = useUpdateAtom(mapHeaderTextAtom);
	const setErrorText = useUpdateAtom(errorTextAtom);
	const queryClient = trpc.useContext();

	const mutation = trpc.useMutation("playthrough.checkLocation", {
		onMutate({ location }) {
			setFetching(true);
			queryClient.setQueryData(
				["playthrough.get", { id }],
				(old: any) => {
					if (!old) {
						return undefined;
					}
					return {
						...old,
						checked: [...old.checked, location],
					};
				}
			);
		},
		onSuccess: ({ checked, item, known_locations }) => {
			queryClient.setQueryData(
				["playthrough.get", { id }],
				(old: any) => {
					if (!old) {
						return undefined;
					}
					return {
						...old,
						checked: [...old.checked, checked],
						items: item ? [...old.items, item] : old.items,
						known_locations,
					};
				}
			);
			setErrorText("");
			if (/Check .* Dungeons/.test(checked)) {
				setMapHeaderText(
					`You inspect the altar and gain information about the sacred ${
						checked.includes("Stone") ? "stones" : "medallions"
					}...`
				);
			} else {
				setMapHeaderText(`${checked}: ${item}`);
			}
		},
		onError: (err) => {
			setErrorText(err.message);
			queryClient.invalidateQueries(["playthrough.get"]);
		},
		onSettled: () => {
			setFetching(false);
		},
	});

	return (location: string) => mutation.mutate({ id, location });
};

export const useCheckStone = (id: string) => {
	const setFetching = useUpdateAtom(fetchingAtom);
	const setMapHeaderText = useUpdateAtom(mapHeaderTextAtom);
	const setErrorText = useUpdateAtom(errorTextAtom);
	const queryClient = trpc.useContext();

	const mutation = trpc.useMutation("playthrough.checkStone", {
		onMutate({ stone }) {
			setFetching(true);
			queryClient.setQueryData(
				["playthrough.get", { id }],
				(old: any) => {
					if (!old) {
						return undefined;
					}
					return {
						...old,
						checked: [...old.checked, stone],
					};
				}
			);
		},
		onSuccess: ({
			text,
			type,
			checked,
			item,
			location,
			path_locations,
			region,
		}) => {
			queryClient.setQueryData(
				["playthrough.get", { id }],
				(old: any) => {
					if (!old) {
						return undefined;
					}
					if (type === "barren") {
						return {
							...old,
							checked: [...old.checked, checked],
							known_barren: [...old.known_barren, region],
						};
					} else if (type === "woth") {
						return {
							...old,
							checked: [...old.checked, checked],
							known_woth: [...old.known_woth, region],
						};
					} else if (type === "path") {
						return {
							...old,
							checked: [...old.checked, checked],
							known_paths: {
								...old.known_paths,
								[region as string]: path_locations,
							},
						};
					} else if (type === "item") {
						return {
							...old,
							checked: [...old.checked, checked],
							known_locations: {
								...old.known_locations,
								[location as string]: item,
							},
						};
					} else if (type === "junk") {
						return {
							...old,
							checked: [...old.checked, checked],
						};
					}
				}
			);
			setErrorText("");
			setMapHeaderText(text);
		},
		onError: (err) => {
			setErrorText(err.message);
			queryClient.invalidateQueries(["playthrough.get"]);
		},
		onSettled: () => {
			setFetching(false);
		},
	});

	return (stone: string) => mutation.mutate({ id, stone });
};

export const useBeatGanon = (id: string) => {
	const queryClient = trpc.useContext();

	const mutation = trpc.useMutation("playthrough.beatGanon", {
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries(["playthrough.get"]);
		},
	});

	return () => mutation.mutate({ id });
};
