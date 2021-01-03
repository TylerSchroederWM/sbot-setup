const fs = require("fs");
const home = require("os").homedir();

var argv = require("minimist")(process.argv.slice(2));
var clientFactory = require("ssb-client");
var path = require("path");
var pull = require("pull-stream");

// Change to 'true' to get debugging output
DEBUG = false

DEFAULT_CHANNEL_METADATA = {
	lastMsgTimestamp: 0
}
DEFAULT_CHANNEL_OBJECT = {
	messages: []
}
MESSAGE_SEPERATOR = "---------------"
MESSAGE_SEPERATOR_COLOR = "\x1b[33m"
MESSAGE_COLOR = "\x1b[0m"
SBOT_ROOT = path.join(home, ".ssb");
SBOT_CHANNEL_DIR = path.join(SBOT_ROOT, "channels");
SBOT_CHANNEL_DATA = path.join(SBOT_CHANNEL_DIR, ".data");

if (!fs.existsSync(SBOT_ROOT)) {
	debug("no ~/.ssb folder detected, creating it...");
	fs.mkdirSync(SBOT_ROOT);
}

if (!fs.existsSync(SBOT_CHANNEL_DIR)) {
	debug("no channels folder detected, creating it...");
	fs.mkdirSync(SBOT_CHANNEL_DIR);
}

if (!fs.existsSync(SBOT_CHANNEL_DATA)) {
	debug("no channel metadata file found, creating it...");
	fs.writeFileSync(SBOT_CHANNEL_DATA, "{}");
}

clientFactory(function (err, client) {
	if(err) {
		console.log("[FATAL] Error when starting scuttlebot: " + err);
		throw err;
	}

	var metadata = JSON.parse(fs.readFileSync(SBOT_CHANNEL_DATA));

	if(!argv._ || argv._.length == 0) {
		console.log("No channel provided. To get messages for a channel, try 'node channels.js example'");
		console.log("(note that 'node channels.js #example' will not work because '#' is a protected character)\n");

		var trackedChannels = getTrackedChannels(metadata);
		if(trackedChannels.length) {
			console.log("Currently tracked channels are:");
			for(const channelNameIndex in trackedChannels) {
				console.log(trackedChannels[channelNameIndex]); // i'm going to find whoever decided to make for...in loops work like this in javascript and impale them on a rusty fencepole
			}
		}
		else {
			console.log("No channels are currently tracked.")
			process.exit(0);
		}

		process.exit(0);
	}

	var channelName = "#" + argv._[0];
	var trackedChannelData = getChannelData(channelName, metadata); // only get data for the first channel given (easy to change this if needed)
	var trackedChannelMessages = getChannelMessages(channelName);

	debug("fetched " + trackedChannelMessages["messages"].length + " messages from cache");


	var feedStreamOptions = {
		type: "post"
	}
	if(trackedChannelData.lastMsgTimestamp) {
		feedStreamOptions.gt = trackedChannelData.lastMsgTimestamp;
	}

	var feedStream = client.messagesByType(feedStreamOptions);


	debug("pulling messages from feedstream with settings " + JSON.stringify(feedStreamOptions));
	pull(feedStream, pull.collect(function(err, msgs) {
		if(err) {
			console.log("Error when fetching messages: " + err);
			throw err;
		}

		debug("found " + msgs.length + " messages after " + (feedStreamOptions.gt ? feedStreamOptions.gt : "0"));

		if(msgs) {
			for(var msg_index in msgs) {
				var msg = msgs[msg_index]; // i am going to find whoever decided to make for...in loops work like this in javascript and abandon them in death valley with an entire cactus up their ass
				if(msg.value.content.text && typeof(msg.value.content.text) == "string" && msg.value.content.text.includes(channelName)) {
					trackedChannelMessages.messages.push(msg);
				}
				if(msg.value.content.channel && msg.value.content.channel === channelName.substring(1)) {
					trackedChannelMessages.messages.push(msg);
				}
			}
		}

		console.log("Found " + trackedChannelMessages["messages"].length + " messages:");
		console.log(MESSAGE_SEPERATOR_COLOR, MESSAGE_SEPERATOR);

		for(var msg_index in trackedChannelMessages["messages"]) {
			var msg = trackedChannelMessages["messages"][msg_index]; // i'm going to find whoever decided to make for..in loops like this in javascript and airdrop them into the open maw of mount kilimanjaro
			console.log(MESSAGE_COLOR, msg.value.content.text);
			console.log(MESSAGE_SEPERATOR_COLOR, MESSAGE_SEPERATOR);
		}

		updateChannelMessages(channelName, trackedChannelMessages, metadata);

		client.close(true, () => {});
	}));
});

function getTrackedChannels(data) {
		return Object.keys(data);
}

function getChannelData(channelName, data) {
	if(!data[channelName]) {
		data[channelName] = {
			lastMsgTimestamp: 0,
		}
	}

	return data[channelName];
}

function getChannelMessages(channelName) {
	var messageCachePath = path.join(SBOT_CHANNEL_DIR, channelName);
	if (!fs.existsSync(messageCachePath)) {
		return DEFAULT_CHANNEL_OBJECT;
	}

	var raw = fs.readFileSync(messageCachePath, "utf8");
	return JSON.parse(raw);
}

function updateChannelMessages(channelName, channelJson, metadata) {
	fs.writeFileSync(path.join(SBOT_CHANNEL_DIR, channelName), JSON.stringify(channelJson));

	if(!channelJson.messages || channelJson.messages.length == 0) {
		process.exit(0);
	}

	if(metadata.channelName == undefined) {
		metadata[channelName] = DEFAULT_CHANNEL_METADATA;
	}

	metadata[channelName].lastMsgTimestamp = channelJson["messages"].slice(-1)[0].timestamp; // once we've successfully updated messages, update the most recent message ID
	fs.writeFileSync(SBOT_CHANNEL_DATA, JSON.stringify(metadata));
}

function debug(message) {
	if(DEBUG) {
		var timestamp = new Date();
		console.log("[" + timestamp.toISOString() + "] " +  message);
	}
}
