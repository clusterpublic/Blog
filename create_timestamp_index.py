from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
cluster_uri = 'mongodb+srv://mostuselessboy:iSyoN7VUAwcAnQL5@clusterblog.elmvpst.mongodb.net/?retryWrites=true&w=majority'
client = MongoClient(cluster_uri)
db = client['cluster_blog']
tweets_collection = db['tweets']

print("Creating index on 'timestamp' field for faster sorting...")

# Create descending index on timestamp for efficient sorting
result = tweets_collection.create_index([('timestamp', DESCENDING)])

print(f"✓ Index created: {result}")

# Show all indexes
print("\nAll indexes on tweets collection:")
for index in tweets_collection.list_indexes():
    print(f"  - {index['name']}: {index['key']}")

print("\n✓ Done! MongoDB will now sort by timestamp much faster.")

