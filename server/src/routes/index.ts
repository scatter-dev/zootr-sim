import axios from "axios";
import express from "express";
import createSeed, { sampleSeed } from "../services/createSeed";
import Playthrough from "../models/Playthrough";
import Seed from "../models/Seed";
import mongoose from "mongoose";

type Locations = {
	[location: string]: string | { item: string; price: number };
};

let router = express.Router();

router.get("/", async (req, res) => {
	let seed = await createSeed({
		settingsString:
			"AJTWXCHYKAA8KLAHJAASAECCWCHGLTDDAKAAJAEAC2AJSDGBLADLED7JKQUXEANKCAJAAYMASBFAB",
	});
	console.log(seed);
	res.send(seed);
});

router.get("/getSampleSeed", (req, res) => {
	res.send(sampleSeed);
});

router.get("/startPlaythrough", async (req, res) => {
	let seed: typeof sampleSeed;
	if (req.query.sampleSeed) {
		seed = sampleSeed;
	} else {
		if (!req.query.settingsString) {
			return res.status(400).send("Request must include settings string");
		}
		try {
			seed = await createSeed({
				seed: req.query.seed as string,
				settingsString: req.query.settingsString as string,
			});
		} catch (err) {
			if (
				err.response.status === 403 &&
				err.response.data.includes("Invalid API Key")
			) {
				return res
					.status(500)
					.send(
						"Invalid API key - this is a server issue, please report this!"
					);
			} else if (
				err.response.status === 400 &&
				err.response.data.includes("settings_string")
			) {
				return res.status(400).send("Invalid settings string!");
			} else if (
				err.response.status === 403 &&
				err.response.data.includes("once every")
			) {
				return res
					.status(429)
					.send("Rate limited - try again in 5 seconds.");
			} else {
				console.log(err);
				return res
					.status(500)
					.send("Unknown server error - please report this!");
			}
		}
	}
	let locations = seed.locations as Locations;
	let locArray = Object.keys(seed.locations).map((key) => {
		let el = locations[key];
		if (typeof el === "string") {
			return { location: key, item: el };
		} else {
			return { location: key, item: el.item, price: el.price };
		}
	});
	let seedDocument = new Seed({
		locations: Object.keys(seed.locations).map((key) => {
			let el = locations[key];
			if (typeof el === "string") {
				return { location: key, item: el };
			} else {
				return { location: key, item: el.item, price: el.price };
			}
		}),
	});
	seedDocument.save();
	let playthroughDocument = new Playthrough({
		seed: seedDocument,
		checked: [],
		items: [],
	});
	playthroughDocument.save();
	res.send({
		id: playthroughDocument.id,
		locations: seedDocument.locations.map((el) => el.location),
	});
});

export default router;
