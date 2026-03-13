#!/usr/bin/env node

/**
 * Test script to verify MongoDB connection and persistence
 * Run with: node test-mongodb-connection.js
 */

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Read .env.local file to get MongoDB URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env.local");
let envContent = "";

try {
	envContent = fs.readFileSync(envPath, "utf8");
} catch (err) {
	console.error("Error reading .env.local file:", err.message);
	process.exit(1);
}

// Parse MONGODB_URL from .env.local
const mongodbUrlMatch = envContent.match(/MONGODB_URL="?([^"\n]+)"?/);
const dbNameMatch = envContent.match(/MONGODB_DB_NAME="?([^"\n]+)"?/);

if (!mongodbUrlMatch) {
	console.error("MONGODB_URL not found in .env.local file");
	process.exit(1);
}

const MONGODB_URL = mongodbUrlMatch[1];
const DB_NAME = dbNameMatch ? dbNameMatch[1] : "chat-ui";

console.log("Testing MongoDB connection...");
console.log("URL:", MONGODB_URL);
console.log("Database:", DB_NAME);

async function testConnection() {
	const client = new MongoClient(MONGODB_URL, {
		serverSelectionTimeoutMS: 5000,
		connectTimeoutMS: 10000,
	});

	try {
		console.log("\n1. Connecting to MongoDB...");
		await client.connect();
		console.log("✓ Connected successfully");

		console.log("\n2. Pinging database...");
		const db = client.db(DB_NAME);
		await db.command({ ping: 1 });
		console.log("✓ Database ping successful");

		console.log("\n3. Checking collections...");
		const collections = await db.listCollections().toArray();
		console.log(`✓ Found ${collections.length} collections:`);
		collections.forEach((col) => console.log(`   - ${col.name}`));

		console.log("\n4. Testing conversation persistence...");
		const conversations = db.collection("conversations");

		// Create a test conversation
		const testConversation = {
			_id: new Date().getTime().toString(),
			title: "Test Conversation",
			messages: [
				{
					id: "msg1",
					content: "Hello, this is a test message",
					from: "user",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			createdAt: new Date(),
			updatedAt: new Date(),
			model: "islamvibe-ai",
			sessionId: "test-session-" + Date.now(),
		};

		// Insert test conversation
		await conversations.insertOne(testConversation);
		console.log("✓ Test conversation inserted");

		// Retrieve the conversation
		const retrieved = await conversations.findOne({ _id: testConversation._id });
		if (retrieved) {
			console.log("✓ Conversation retrieved successfully");
			console.log(`  Title: ${retrieved.title}`);
			console.log(`  Messages: ${retrieved.messages.length}`);
			console.log(`  Session ID: ${retrieved.sessionId}`);
		} else {
			console.log("✗ Failed to retrieve conversation");
		}

		// Clean up: remove test conversation
		await conversations.deleteOne({ _id: testConversation._id });
		console.log("✓ Test conversation cleaned up");

		console.log("\n5. Testing message hierarchy (ancestors/children)...");
		const conversationWithHierarchy = {
			_id: "hierarchy-test-" + Date.now(),
			title: "Hierarchy Test",
			messages: [
				{
					id: "root",
					content: "Root message",
					from: "user",
					createdAt: new Date(),
					updatedAt: new Date(),
					ancestors: [],
					children: ["child1", "child2"],
				},
				{
					id: "child1",
					content: "First child message",
					from: "assistant",
					createdAt: new Date(),
					updatedAt: new Date(),
					ancestors: ["root"],
					children: [],
				},
				{
					id: "child2",
					content: "Second child message",
					from: "user",
					createdAt: new Date(),
					updatedAt: new Date(),
					ancestors: ["root"],
					children: [],
				},
			],
			createdAt: new Date(),
			updatedAt: new Date(),
			model: "islamvibe-ai",
		};

		await conversations.insertOne(conversationWithHierarchy);
		console.log("✓ Conversation with message hierarchy inserted");

		// Verify hierarchy was saved
		const hierarchyCheck = await conversations.findOne({
			_id: conversationWithHierarchy._id,
			"messages.id": "root",
		});

		if (hierarchyCheck && hierarchyCheck.messages[0].children.includes("child1")) {
			console.log("✓ Message hierarchy preserved correctly");
		} else {
			console.log("✗ Message hierarchy not preserved correctly");
		}

		// Clean up
		await conversations.deleteOne({ _id: conversationWithHierarchy._id });
		console.log("✓ Hierarchy test cleaned up");

		console.log("\n=== TEST COMPLETE ===");
		console.log("✓ All persistence tests passed!");
		console.log("\nNext steps:");
		console.log("1. Start the chat-ui application");
		console.log("2. Create a new conversation in the UI");
		console.log("3. Check MongoDB to verify it was saved:");
		console.log(`   mongosh "${MONGODB_URL}"`);
		console.log(`   use ${DB_NAME}`);
		console.log("   db.conversations.find().pretty()");
	} catch (error) {
		console.error("\n✗ Test failed:", error.message);
		console.error("\nTroubleshooting tips:");
		console.log("1. Make sure MongoDB is running:");
		console.log("   - Docker: docker-compose up -d mongo");
		console.log("   - Local: mongod --dbpath /path/to/data");
		console.log("2. Check if the URL is correct in .env.local");
		console.log("3. Verify network connectivity to MongoDB");
		process.exit(1);
	} finally {
		await client.close();
		console.log("\nConnection closed");
	}
}

// Run the test
testConnection().catch(console.error);
