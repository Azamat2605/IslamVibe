# MongoDB Persistent Database Setup

This guide explains how to set up and verify persistent MongoDB storage for the IslamVibe chat application.

## Current Configuration

The application has been configured to use MongoDB instead of in-memory storage:

1. **`.env.local`** - Updated with MongoDB connection settings:
   ```
   MONGODB_URL="mongodb://localhost:27017/chat-ui"
   MONGODB_DB_NAME="chat-ui"
   MONGODB_DIRECT_CONNECTION="false"
   ```

2. **`src/lib/server/database.ts`** - Enhanced with:
   - Retry logic (5 attempts with exponential backoff)
   - Connection pooling configuration
   - Better error handling
   - Connection verification via ping command

## Setup Options

### Option 1: Docker (Recommended for Development)

1. Start MongoDB container:
   ```bash
   cd chat-ui
   docker-compose up -d mongo
   ```

2. Verify MongoDB is running:
   ```bash
   docker ps | findstr mongo
   ```

3. Initialize replica set (required for transaction support):
   ```bash
   docker exec -it chat-ui-mongo-1 mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
   ```

### Option 2: Local MongoDB Installation

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/macOS
   sudo systemctl start mongod
   ```

3. Verify installation:
   ```bash
   mongod --version
   ```

### Option 3: MongoDB Atlas (Cloud - Production)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/chat-ui
   ```

3. Update `.env.local`:
   ```
   MONGODB_URL="mongodb+srv://username:password@cluster.mongodb.net/chat-ui"
   ```

## Testing the Connection

Run the provided test script to verify MongoDB connectivity and persistence:

```bash
cd chat-ui
node test-mongodb-connection.js
```

Expected output:
```
Testing MongoDB connection...
URL: mongodb://localhost:27017/chat-ui
Database: chat-ui

1. Connecting to MongoDB...
✓ Connected successfully

2. Pinging database...
✓ Database ping successful

3. Checking collections...
✓ Found X collections:
   - conversations
   - settings
   - users
   ...

4. Testing conversation persistence...
✓ Test conversation inserted
✓ Conversation retrieved successfully
  Title: Test Conversation
  Messages: 1
  Session ID: test-session-1234567890
✓ Test conversation cleaned up

5. Testing message hierarchy (ancestors/children)...
✓ Conversation with message hierarchy inserted
✓ Message hierarchy preserved correctly
✓ Hierarchy test cleaned up

=== TEST COMPLETE ===
✓ All persistence tests passed!
```

## Starting the Application

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Verifying Persistence

### Method 1: Using the Application

1. Create a new conversation in the chat interface
2. Send a few messages
3. Refresh the page or restart the application
4. Verify that your conversation is still available

### Method 2: Direct Database Inspection

1. Connect to MongoDB:
   ```bash
   mongosh "mongodb://localhost:27017/chat-ui"
   ```

2. Check conversations collection:
   ```javascript
   use chat-ui
   db.conversations.find().pretty()
   db.conversations.countDocuments()
   ```

3. Check specific fields:
   ```javascript
   // Check updatedAt field
   db.conversations.find({}, {title: 1, updatedAt: 1, "messages.id": 1}).pretty()
   
   // Check message hierarchy
   db.conversations.find({"messages.children": {$exists: true}}).pretty()
   ```

## Troubleshooting

### Connection Issues

**Error: "Failed to connect to MongoDB"**

1. Verify MongoDB is running:
   ```bash
   # Docker
   docker ps | findstr mongo
   
   # Local
   mongosh --eval "db.serverStatus()"
   ```

2. Check connection URL in `.env.local`:
   ```bash
   cat .env.local | findstr MONGODB_URL
   ```

3. Test connection manually:
   ```bash
   mongosh "mongodb://localhost:27017"
   ```

**Error: "MongoServerSelectionError"**

1. For Docker, ensure replica set is initialized:
   ```bash
   docker exec -it chat-ui-mongo-1 mongosh --eval "rs.status()"
   ```

2. If not initialized:
   ```bash
   docker exec -it chat-ui-mongo-1 mongosh --eval "rs.initiate()"
   ```

### Data Not Persisting

1. Check if application is using in-memory mode:
   - Look for log message: "No MongoDB URL found, using in-memory server"
   - Verify `.env.local` is being loaded correctly

2. Check application logs:
   ```bash
   npm run dev 2>&1 | findstr -i mongo
   ```

3. Verify database writes:
   ```bash
   mongosh "mongodb://localhost:27017/chat-ui" --eval "db.conversations.stats()"
   ```

## Production Considerations

### 1. Connection Pooling
The configuration includes optimized connection pooling:
- `maxPoolSize: 50` - Maximum connections
- `minPoolSize: 5` - Minimum connections to maintain
- `maxIdleTimeMS: 10000` - Close idle connections after 10 seconds

### 2. Timeout Settings
- `serverSelectionTimeoutMS: 5000` - 5 seconds to select server
- `connectTimeoutMS: 10000` - 10 seconds to establish connection
- `socketTimeoutMS: 45000` - 45 seconds for socket operations

### 3. Retry Logic
The application will retry failed connections 5 times with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay
- Attempt 5: 8 seconds delay

### 4. Monitoring
Add these to your monitoring setup:
- Database connection health checks
- Connection pool usage metrics
- Query performance monitoring
- Error rate tracking

## Migration from In-Memory Storage

If you have existing data in in-memory storage:

1. Export data from in-memory MongoDB (if accessible)
2. Import into persistent MongoDB:
   ```bash
   mongorestore --uri="mongodb://localhost:27017/chat-ui" /path/to/backup
   ```
3. Update application configuration
4. Restart application

## Security Notes

1. **Authentication**: For production, enable MongoDB authentication
2. **Network Security**: Use VPN or IP whitelisting for database access
3. **Encryption**: Enable TLS for connections
4. **Backups**: Regular database backups are essential
5. **Monitoring**: Set up alerts for connection issues

## Support

For issues with this setup:
1. Check the application logs
2. Run the test script: `node test-mongodb-connection.js`
3. Consult MongoDB documentation
4. Check project issues on GitHub
