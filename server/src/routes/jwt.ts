import jwt from "jsonwebtoken";
import * as trpc from "@trpc/server";
import { z } from "zod";

if (!process.env.JWT_SECRET) {
	throw "jwt secret not read properly!";
}

const router = trpc
	.router()
	.query("getPlaythroughs", {
		input: z.object({
			token: z.string(),
		}),
		async resolve({ input }) {
			try {
				let { playthroughs } = jwt.verify(
					input.token,
					process.env.JWT_SECRET!
				) as { playthroughs: string[] };
				let newToken = jwt.sign(
					{ playthroughs },
					process.env.JWT_SECRET!,
					{
						expiresIn: "7d",
					}
				) as string;
				return {
					playthroughs,
					newToken,
				};
			} catch (err) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: "Failed to authorize jwt",
				});
			}
		},
	})
	.mutation("addPlaythrough", {
		input: z.object({
			token: z.string().nullable(),
			playthroughId: z.string(),
		}),
		async resolve({ input }) {
			let playthroughs: string[] = [];
			if (input.token) {
				try {
					let decoded = jwt.verify(
						input.token,
						process.env.JWT_SECRET!
					) as { playthroughs: string[] };
					playthroughs = decoded.playthroughs;
				} catch (err) {
					playthroughs = [];
				}
			}
			playthroughs.push(input.playthroughId);
			return {
				newToken: jwt.sign({ playthroughs }, process.env.JWT_SECRET!, {
					expiresIn: "7d",
				}) as string,
			};
		},
	});
export default router;