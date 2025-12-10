/**
 * MongoDB wrapper for storing OAuth tokens and user settings.
 */
import { MongoClient } from 'mongodb';
import { MONGO_URI } from './config.js';

let client;
let db;

async function getDb() {
    if (db) return db;
    client = new MongoClient(MONGO_URI, { ignoreUndefined: true });
    await client.connect();
    db = client.db(); // default DB from URI path
    await db.collection('oauth_tokens').createIndex({ user_email: 1 }, { unique: true });
    return db;
}

export async function saveTokens(userEmail, tokens) {
    const database = await getDb();
    await database.collection('oauth_tokens').updateOne(
        { user_email: userEmail },
        {
            $set: {
                tokens,
                updated_at: new Date()
            },
            $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
    );
}

export async function getTokens(userEmail) {
    const database = await getDb();
    const doc = await database.collection('oauth_tokens').findOne({ user_email: userEmail });
    return doc?.tokens || null;
}

export async function listUsers() {
    const database = await getDb();
    return database
        .collection('oauth_tokens')
        .find({})
        .project({ _id: 0, user_email: 1, updated_at: 1 })
        .sort({ updated_at: -1 })
        .toArray();
}

export async function closeDb() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

