#!/usr/bin/env python3
"""
Script to reset all pins - removes all pinned entries from all tweets.
"""

import pymongo
from pymongo import MongoClient

def reset_all_pins():
    try:
        print("🔗 Connecting to MongoDB...")
        
        # MongoDB connection details
        cluster_uri = 'mongodb+srv://mostuselessboy:iSyoN7VUAwcAnQL5@clusterblog.elmvpst.mongodb.net/?retryWrites=true&w=majority'
        database_name = 'cluster'
        
        print(f"📊 Database: {database_name}")
        
        # Connect to MongoDB
        client = MongoClient(cluster_uri)
        db = client[database_name]
        tweets_collection = db['tweets']
        
        print("✅ Connected to MongoDB successfully!")
        
        print("🔍 Scanning for tweets with pinned field...")
        
        # Find all tweets that have a pinned field
        all_tweets_with_pins = list(tweets_collection.find({'pinned': {'$exists': True}}))
        
        print(f"📊 Found {len(all_tweets_with_pins)} tweets with pinned field")
        
        if len(all_tweets_with_pins) == 0:
            print("✅ No pinned entries found. Database is already clean!")
            return
        
        # Show what we found
        print("\n📋 Tweets with pins found:")
        for i, tweet in enumerate(all_tweets_with_pins[:10]):  # Show first 10
            pinned_info = tweet.get('pinned', {})
            print(f"  {i+1}. Tweet ID: {tweet.get('tweet_id', 'N/A')}")
            print(f"     Author: {tweet.get('author_name', 'N/A')}")
            print(f"     Pinned: {pinned_info}")
            print()
        
        if len(all_tweets_with_pins) > 10:
            print(f"     ... and {len(all_tweets_with_pins) - 10} more")
        
        # Automatically proceed with reset
        print(f"🧹 Automatically resetting pins for {len(all_tweets_with_pins)} tweets...")
        
        # Remove the pinned field from each tweet
        modified_count = 0
        for i, tweet in enumerate(all_tweets_with_pins):
            try:
                print(f"  Processing {i+1}/{len(all_tweets_with_pins)}: {tweet.get('tweet_id', 'unknown')}")
                result = tweets_collection.update_one(
                    {'_id': tweet['_id']},
                    {'$unset': {'pinned': ''}}
                )
                if result.modified_count > 0:
                    modified_count += 1
            except Exception as e:
                print(f"⚠️  Failed to update tweet {tweet.get('tweet_id', 'unknown')}: {e}")
        
        print(f"✅ Successfully removed pinned field from {modified_count} tweets")
        print("🎉 All pins have been reset!")
        
        # Verify reset by checking again
        print("🔍 Verifying reset...")
        remaining_tweets_with_pins = list(tweets_collection.find({'pinned': {'$exists': True}}))
        
        print(f"🔍 Verification: {len(remaining_tweets_with_pins)} tweets with pinned field remaining")
        
        if len(remaining_tweets_with_pins) == 0:
            print("🎉 SUCCESS: All pins have been completely reset!")
        else:
            print(f"⚠️  WARNING: {len(remaining_tweets_with_pins)} tweets still have pinned fields")
        
    except Exception as e:
        print(f"❌ Error during reset: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if 'client' in locals():
            client.close()
            print("🔌 MongoDB connection closed")

if __name__ == "__main__":
    reset_all_pins()
