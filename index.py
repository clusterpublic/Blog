from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
from pymongo import MongoClient
import time
import uuid
import urllib.parse
import re
from flask_cors import CORS
from bson import ObjectId
import requests

app = Flask(__name__, template_folder='site', static_folder='assets')
CORS(app)
def create_safe_url(blog_title):
    clean_title = re.sub(r'[^a-zA-Z0-9 \-]', '', blog_title)
    encoded_title = urllib.parse.quote(clean_title.replace(' ', '-'))
    safe_url = encoded_title.lower()
    return safe_url

# MongoDB connection
cluster_uri = 'mongodb+srv://mostuselessboy:iSyoN7VUAwcAnQL5@clusterblog.elmvpst.mongodb.net/?retryWrites=true&w=majority'
client = MongoClient(cluster_uri)
db = client['cluster']
collection = db.blogs
tweets_collection = db.tweets
creator_showcase_collection = db.creator_showcase
faqs_collection = db.faqs
jobs_collection = db.jobs
job_applications_collection = db.job_applications
    
# Flask route to render the HTML template
@app.route('/')
def index():
    return render_template('index.html')

# Blog Manager Dashboard
@app.route('/manager')
def blog_manager():
    return render_template('manager.html')

# Blog Editor for creating new blogs
@app.route('/editor')
def blog_editor():
    return render_template('editor.html')

# Blog Editor for editing existing blogs
@app.route('/editor/<blog_id>')
def edit_blog(blog_id):
    return render_template('editor.html', blog_id=blog_id)

# Tweets Manager Dashboard
@app.route('/tweets')
def tweets_manager():
    return render_template('tweets.html')

# Creator Showcase Manager Dashboard
@app.route('/creator_showcase')
def creator_showcase_manager():
    return render_template('creator_showcase.html')

# Flask route to handle blog uploads
@app.route('/upload_blog', methods=['POST'])
def upload_blog():
    # Get the entered password from the request
    entered_password = request.form.get('password')

    # Check if the entered password is correct
    if entered_password != 'clustertothemoon':
        return(jsonify({'success': False, 'message': 'Wrong Password'}))
    # Proceed with blog upload if the password is correct
    title = request.form.get('title')
    thumbnail = request.form.get('thumbnail')
    content = request.form.get('content')
    description = request.form.get('description')   
    # Generate a unique blog_id
    blog_id = str(uuid.uuid4())

    # Create a blog entry
    blog_entry = {
        'blog_id': f"""{create_safe_url(title)}-{str(time.time()).split('.')[0]}""",
        'title': title,
        'thumbnail': thumbnail,
        'content': content,
        'description': description,
        'timestamp': time.time()
    }

    # Update the 'allblogs' array with the new entry
    # collection.update_one({}, {'$push': {'allblogs': blog_entry}}, upsert=True)
    collection.insert_one(blog_entry)


    return jsonify({'success': True, 'message': 'Blog uploaded successfully'})


@app.route('/api/getblogpage/<int:pagination_index>', methods=['GET'])
def get_blogs_by_page(pagination_index):
    blogs_per_page = 10
    skip_value = max(0, (pagination_index - 1) * blogs_per_page)

    projection = {'title': 1, 'thumbnail': 1, 'description': 1, 'blog_id':1}
    result = collection.find({}, projection).sort({ '_id': -1 }).skip(skip_value).limit(blogs_per_page)

    count_documents = collection.count_documents({})
    has_next_page = count_documents > (skip_value + blogs_per_page)
    if count_documents > 0:
        blogs = [{k: v for k, v in x.items() if k != '_id'} for x in result]
        response = {
            'blogs': blogs,
            'has_next_page': has_next_page
        }
        return jsonify(response)
    else:
        return jsonify({'has_next_page': False, 'blogs': []})

@app.route('/api/blog', methods=['GET'])
def get_blog():
    blogID = request.args.get('blogID')
    if not blogID:
        return jsonify({'error': 'blogID parameter is required'}), 400
    
    print(blogID)
    result = collection.find_one({"blog_id": blogID})
    
    if result:
        del result['_id']
        return jsonify(result)
    else:
        return jsonify([])

# Get all blogs for management dashboard
@app.route('/api/get_all_blogs', methods=['GET'])
def get_all_blogs():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if search:
            query = {
                '$or': [
                    {'title': {'$regex': search, '$options': 'i'}},
                    {'description': {'$regex': search, '$options': 'i'}},
                    {'blog_id': {'$regex': search, '$options': 'i'}}
                ]
            }
        
        # Get total count
        total_blogs = collection.count_documents(query)
        
        # Get blogs with pagination
        blogs = list(collection.find(query, {
            'title': 1, 
            'description': 1, 
            'blog_id': 1, 
            'timestamp': 1,
            'thumbnail': 1
        }).sort('timestamp', -1).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization
        for blog in blogs:
            blog['_id'] = str(blog['_id'])
        
        return jsonify({
            'blogs': blogs,
            'total': total_blogs,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_blogs + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update existing blog
@app.route('/api/update_blog/<blog_id>', methods=['PUT'])
def update_blog(blog_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Prepare update data
        update_data = {
            'title': data.get('title'),
            'description': data.get('description'),
            'content': data.get('content'),
            'thumbnail': data.get('thumbnail'),
            'last_updated': time.time()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # Update the blog
        result = collection.update_one(
            {'blog_id': blog_id},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'message': 'Blog not found'}), 404
        
        return jsonify({'success': True, 'message': 'Blog updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Delete blog
@app.route('/api/delete_blog/<blog_id>', methods=['DELETE'])
def delete_blog(blog_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Delete the blog
        result = collection.delete_one({'blog_id': blog_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Blog not found'}), 404
        
        return jsonify({'success': True, 'message': 'Blog deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Get blog for editing
@app.route('/api/get_blog_for_edit/<blog_id>', methods=['GET'])
def get_blog_for_edit(blog_id):
    try:
        result = collection.find_one({"blog_id": blog_id})
        
        if result:
            # Convert ObjectId to string
            result['_id'] = str(result['_id'])
            return jsonify({'success': True, 'blog': result})
        else:
            return jsonify({'success': False, 'message': 'Blog not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# URL validation functions for creator showcase
def validate_instagram_url(url):
    """Validate Instagram post URL format"""
    patterns = [
        r'https?://(?:www\.)?instagram\.com/p/[A-Za-z0-9_-]+/?',
        r'https?://(?:www\.)?instagram\.com/reel/[A-Za-z0-9_-]+/?',
        r'https?://(?:www\.)?instagram\.com/tv/[A-Za-z0-9_-]+/?'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

def validate_twitter_url(url):
    """Validate Twitter/X post URL format"""
    patterns = [
        r'https?://(?:www\.)?twitter\.com/\w+/status/\d+',
        r'https?://(?:www\.)?x\.com/\w+/status/\d+',
        r'https?://twitter\.com/\w+/status/\d+',
        r'https?://x\.com/\w+/status/\d+'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

def validate_youtube_url(url):
    """Validate YouTube video URL format"""
    patterns = [
        r'https?://(?:www\.)?youtube\.com/watch\?v=[A-Za-z0-9_-]+',
        r'https?://(?:www\.)?youtu\.be/[A-Za-z0-9_-]+',
        r'https?://youtube\.com/watch\?v=[A-Za-z0-9_-]+',
        r'https?://youtu\.be/[A-Za-z0-9_-]+',
        r'https?://(?:www\.)?youtube\.com/embed/[A-Za-z0-9_-]+',
        r'https?://(?:www\.)?youtube\.com/shorts/[A-Za-z0-9_-]+'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

def generate_embed_url(post_url, platform):
    """Generate embed URL based on platform and post URL"""
    if platform == 'instagram':
        # Instagram embed URL format - handle both /p/ and /reel/
        if '/p/' in post_url:
            post_id = post_url.split('/p/')[-1].split('/')[0].split('?')[0]
            return f"https://www.instagram.com/p/{post_id}/embed/"
        elif '/reel/' in post_url:
            post_id = post_url.split('/reel/')[-1].split('/')[0].split('?')[0]
            return f"https://www.instagram.com/reel/{post_id}/embed/"
        elif '/tv/' in post_url:
            post_id = post_url.split('/tv/')[-1].split('/')[0].split('?')[0]
            return f"https://www.instagram.com/tv/{post_id}/embed/"
        return post_url
    elif platform == 'twitter':
        # Twitter embed URL format
        tweet_id = extract_tweet_id(post_url)
        if tweet_id:
            return f"https://twitter.com/i/status/{tweet_id}"
        return post_url
    elif platform == 'youtube':
        # YouTube embed URL format
        video_id = None
        if 'youtube.com/watch?v=' in post_url:
            video_id = post_url.split('v=')[1].split('&')[0]
        elif 'youtu.be/' in post_url:
            video_id = post_url.split('youtu.be/')[1].split('?')[0]
        elif 'youtube.com/shorts/' in post_url:
            video_id = post_url.split('shorts/')[1].split('?')[0]
        elif 'youtube.com/embed/' in post_url:
            video_id = post_url.split('embed/')[1].split('?')[0]
        
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
        return post_url
    return post_url

# Extract tweet ID from URL
def extract_tweet_id(tweet_url):
    # Extract tweet ID from various Twitter URL formats
    patterns = [
        r'twitter\.com/\w+/status/(\d+)',
        r'x\.com/\w+/status/(\d+)',
        r'twitter\.com/\w+/statuses/(\d+)',
        r'x\.com/\w+/statuses/(\d+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, tweet_url)
        if match:
            return match.group(1)
    return None

def extract_space_id(space_url):
    """Extract space ID from Twitter Space URL formats"""
    patterns = [
        r'twitter\.com/i/spaces/([A-Za-z0-9_-]+)',
        r'x\.com/i/spaces/([A-Za-z0-9_-]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, space_url)
        if match:
            return match.group(1)
    return None

def is_space_url(url):
    """Check if URL is a Twitter Space URL"""
    patterns = [
        r'^https?://(?:www\.)?twitter\.com/i/spaces/[A-Za-z0-9_-]+$',
        r'^https?://(?:www\.)?x\.com/i/spaces/[A-Za-z0-9_-]+$'
    ]
    return any(re.match(pattern, url) for pattern in patterns)

# Fetch tweet data from Twitter API
def fetch_tweet_data(tweet_id):
    url = f"https://twitter241.p.rapidapi.com/tweet?pid={tweet_id}"
    headers = {
        "x-rapidapi-host": "twitter241.p.rapidapi.com",
        "x-rapidapi-key": "7f43a93dcemsh15f97e671454c24p1a21efjsn5220bb3fc9af"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch tweet data: {str(e)}")

# Fetch space data from Twitter Spaces API
def fetch_space_data(space_id):
    url = f"https://twitter241.p.rapidapi.com/spaces?id={space_id}"
    headers = {
        "x-rapidapi-host": "twitter241.p.rapidapi.com",
        "x-rapidapi-key": "7f43a93dcemsh15f97e671454c24p1a21efjsn5220bb3fc9af"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch space data: {str(e)}")

# Alternative parsing method for different API response structures
def parse_tweet_data_alternative(tweet_data, tweet_type):
    try:
        # Try to find tweet data in different possible structures
        main_tweet = None
        user_info = None
        
        # Method 1: Look for direct tweet data
        if 'tweet' in tweet_data:
            main_tweet = tweet_data['tweet']
        elif 'data' in tweet_data and 'tweet' in tweet_data['data']:
            main_tweet = tweet_data['data']['tweet']
        
        # Method 2: Look in nested structures
        if not main_tweet and 'data' in tweet_data:
            data = tweet_data['data']
            # Try different possible paths
            for key in ['tweet', 'result', 'tweet_results']:
                if key in data:
                    if isinstance(data[key], dict) and 'result' in data[key]:
                        main_tweet = data[key]['result']
                        break
                    elif isinstance(data[key], dict):
                        main_tweet = data[key]
                        break
        
        if not main_tweet:
            raise Exception("Could not find tweet data in any expected structure")
        
        # Extract basic tweet information
        tweet_id = main_tweet.get('id', main_tweet.get('rest_id', ''))
        text = main_tweet.get('text', main_tweet.get('full_text', ''))
        
        # Extract user information
        if 'user' in main_tweet:
            user_info = main_tweet['user']
        elif 'author' in main_tweet:
            user_info = main_tweet['author']
        elif 'core' in main_tweet and 'user_results' in main_tweet['core']:
            user_results = main_tweet['core']['user_results']
            if 'result' in user_results:
                user_info = user_results['result']
        
        if not user_info:
            # Create default user info
            user_info = {
                'name': 'Unknown User',
                'screen_name': 'unknown',
                'profile_image_url_https': ''
            }
        
        # Extract media
        images = []
        if 'media' in main_tweet:
            for media in main_tweet['media']:
                if media.get('type') == 'photo':
                    images.append({
                        'url': media.get('media_url_https', media.get('url', '')),
                        'alt': media.get('display_url', 'Tweet image')
                    })
        
        # Create tweet object
        tweet_obj = {
            'tweet_id': str(tweet_id),
            'text': text,
            'author_name': user_info.get('name', 'Unknown'),
            'author_username': user_info.get('screen_name', 'unknown'),
            'author_profile_image': user_info.get('profile_image_url_https', ''),
            'images': images,
            'tweet_type': tweet_type,
            'created_at': main_tweet.get('created_at', ''),
            'favorite_count': main_tweet.get('favorite_count', 0),
            'retweet_count': main_tweet.get('retweet_count', 0),
            'reply_count': main_tweet.get('reply_count', 0),
            'timestamp': time.time()
        }
        
        return tweet_obj
        
    except Exception as e:
        raise Exception(f"Alternative parsing failed: {str(e)}")

# Parse tweet data and extract relevant information
def parse_tweet_data(tweet_data, tweet_type):
    try:
        # Debug: Print the structure to understand the response
        print("Tweet data structure:", list(tweet_data.keys()) if isinstance(tweet_data, dict) else "Not a dict")
        
        # Navigate through the complex JSON structure
        if 'data' not in tweet_data:
            raise Exception("No 'data' field in response")
        
        data = tweet_data['data']
        if 'threaded_conversation_with_injections_v2' not in data:
            raise Exception("No 'threaded_conversation_with_injections_v2' field in data")
        
        conversation = data['threaded_conversation_with_injections_v2']
        if 'instructions' not in conversation:
            raise Exception("No 'instructions' field in conversation")
        
        instructions = conversation['instructions']
        if not instructions or len(instructions) == 0:
            raise Exception("No instructions found")
        
        # Look for the instruction with entries (usually the second one)
        entries = None
        for instruction in instructions:
            if 'entries' in instruction:
                entries = instruction['entries']
                break
        
        if not entries:
            raise Exception("No 'entries' field found in any instruction")
        
        # Find the main tweet (not replies)
        main_tweet = None
        for entry in entries:
            if entry.get('entryId', '').startswith('tweet-'):
                content = entry.get('content', {})
                if 'itemContent' in content:
                    item_content = content['itemContent']
                    if 'tweet_results' in item_content:
                        tweet_results = item_content['tweet_results']
                        if 'result' in tweet_results:
                            main_tweet = tweet_results['result']
                            break
        
        if not main_tweet:
            raise Exception("Could not find main tweet in response")
        
        # Extract tweet information
        if 'legacy' not in main_tweet:
            raise Exception("No 'legacy' field in main tweet")
        
        tweet_info = main_tweet['legacy']
        
        # Extract user information
        if 'core' not in main_tweet or 'user_results' not in main_tweet['core']:
            raise Exception("No user information found")
        
        user_results = main_tweet['core']['user_results']
        if 'result' not in user_results or 'legacy' not in user_results['result']:
            raise Exception("No user legacy information found")
        
        user_info = user_results['result']['legacy']
        
        # Extract text content
        text = tweet_info.get('full_text', '')
        
        # Extract author information
        author_name = user_info.get('name', 'Unknown')
        author_username = user_info.get('screen_name', 'unknown')
        author_profile_image = user_info.get('profile_image_url_https', '')
        
        # Extract media (images)
        images = []
        if 'extended_entities' in tweet_info and 'media' in tweet_info['extended_entities']:
            for media in tweet_info['extended_entities']['media']:
                if media.get('type') == 'photo':
                    images.append({
                        'url': media.get('media_url_https', ''),
                        'alt': media.get('display_url', 'Tweet image')
                    })
        
        # Create tweet object
        tweet_obj = {
            'tweet_id': main_tweet.get('rest_id', ''),
            'text': text,
            'author_name': author_name,
            'author_username': author_username,
            'author_profile_image': author_profile_image,
            'images': images,
            'tweet_type': tweet_type,
            'created_at': tweet_info.get('created_at', ''),
            'favorite_count': tweet_info.get('favorite_count', 0),
            'retweet_count': tweet_info.get('retweet_count', 0),
            'reply_count': tweet_info.get('reply_count', 0),
            'timestamp': time.time()
        }
        
        return tweet_obj
        
    except Exception as e:
        # Try alternative parsing method
        print(f"Primary parsing failed: {str(e)}")
        print("Trying alternative parsing method...")
        try:
            return parse_tweet_data_alternative(tweet_data, tweet_type)
        except Exception as e2:
            # Add more detailed error information
            import traceback
            error_details = traceback.format_exc()
            print(f"Error parsing tweet data: {str(e2)}")
            print(f"Traceback: {error_details}")
            raise Exception(f"Failed to parse tweet data with both methods: {str(e)} | {str(e2)}")

# Parse space data and extract relevant information
def parse_space_data(space_data):
    try:
        if 'data' not in space_data or 'audioSpace' not in space_data['data']:
            raise Exception("No audioSpace data found in response")

        audio_space = space_data['data']['audioSpace']
        metadata = audio_space.get('metadata', {})
        participants = audio_space.get('participants', {})

        # Extract space information with null safety
        space_id = metadata.get('rest_id')
        space_title = metadata.get('title')
        space_state = metadata.get('state')
        
        # Calculate duration safely
        space_duration = None
        if metadata.get('ended_at') and metadata.get('started_at'):
            try:
                ended = int(metadata['ended_at'])
                started = int(metadata['started_at'])
                space_duration = ended - started
            except (ValueError, TypeError):
                space_duration = None

        # Extract creator information safely
        creator = metadata.get('creator_results', {}).get('result', {}).get('legacy', {})
        author_name = creator.get('name', 'Unknown')
        author_username = creator.get('screen_name', 'unknown')
        author_profile_image = creator.get('profile_image_url_https', '')

        # Extract participant information safely
        space_admins = []
        for admin in participants.get('admins', []):
            space_admins.append({
                'username': admin.get('twitter_screen_name'),
                'display_name': admin.get('display_name'),
                'avatar_url': admin.get('avatar_url'),
                'is_verified': admin.get('is_verified', False)
            })

        space_speakers = []
        for speaker in participants.get('speakers', []):
            space_speakers.append({
                'username': speaker.get('twitter_screen_name'),
                'display_name': speaker.get('display_name'),
                'avatar_url': speaker.get('avatar_url'),
                'is_verified': speaker.get('is_verified', False)
            })

        # Extract tweet information if available
        tweet_info = metadata.get('tweet_results', {}).get('result', {}).get('legacy', {})
        text = tweet_info.get('full_text', space_title or '')

        # Helper function to safely convert timestamp to ISO string
        def safe_timestamp(timestamp):
            if not timestamp:
                return None
            try:
                parsed = int(timestamp)
                return time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(parsed / 1000))
            except (ValueError, TypeError):
                return None

        # Create space object
        space_obj = {
            'tweet_id': space_id,
            'text': text,
            'author_name': author_name,
            'author_username': author_username,
            'author_profile_image': author_profile_image,
            'images': [],  # Spaces don't have images in the same way
            'tweet_type': 'space',
            'created_at': safe_timestamp(metadata.get('created_at')),
            'favorite_count': tweet_info.get('favorite_count', 0),
            'retweet_count': tweet_info.get('retweet_count', 0),
            'reply_count': tweet_info.get('reply_count', 0),
            'timestamp': time.time(),
            
            # Space-specific fields with null safety
            'space_id': space_id,
            'space_title': space_title,
            'space_state': space_state,
            'space_duration': space_duration,
            'total_live_listeners': metadata.get('total_live_listeners'),
            'total_replay_watched': metadata.get('total_replay_watched'),
            'is_space_available_for_replay': metadata.get('is_space_available_for_replay'),
            'space_admins': space_admins,
            'space_speakers': space_speakers,
            'space_participant_count': participants.get('total'),
            'scheduled_start': safe_timestamp(metadata.get('scheduled_start')),
            'started_at': safe_timestamp(metadata.get('started_at')),
            'ended_at': safe_timestamp(metadata.get('ended_at'))
        }

        return space_obj

    except Exception as e:
        raise Exception(f"Failed to parse space data: {str(e)}")

# Add tweet
@app.route('/api/add_tweet', methods=['POST'])
def add_tweet():
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        tweet_url = data.get('tweet_url')
        tweet_type = data.get('tweet_type', 'tweet')  # 'tweet' or 'space'
        
        if not tweet_url:
            return jsonify({'success': False, 'message': 'Tweet URL is required'}), 400
        
        # Validate URL format based on content type
        if tweet_type == 'space':
            # For spaces, URL must be in space format
            if not is_space_url(tweet_url):
                return jsonify({'success': False, 'message': 'For Space content type, please use a valid Space URL format: https://x.com/i/spaces/...'}), 400
            
            # Extract space ID from URL
            space_id = extract_space_id(tweet_url)
            if not space_id:
                return jsonify({'success': False, 'message': 'Invalid space URL format'}), 400
            
            # Check if space already exists
            existing_space = tweets_collection.find_one({'space_id': space_id})
            if existing_space:
                return jsonify({'success': False, 'message': 'Space already exists'}), 400
            
            # Fetch space data from Twitter Spaces API
            space_data = fetch_space_data(space_id)
            
            # Parse space data
            parsed_tweet = parse_space_data(space_data)
        else:
            # For all other types, URL must be in regular tweet format
            if is_space_url(tweet_url):
                return jsonify({'success': False, 'message': 'For this content type, please use a valid Tweet URL format: https://twitter.com/username/status/... or https://x.com/username/status/...'}), 400
            
            # Extract tweet ID from URL
            tweet_id = extract_tweet_id(tweet_url)
            if not tweet_id:
                return jsonify({'success': False, 'message': 'Invalid tweet URL format'}), 400
            
            # Check if tweet already exists
            existing_tweet = tweets_collection.find_one({'tweet_id': tweet_id})
            if existing_tweet:
                return jsonify({'success': False, 'message': 'Tweet already exists'}), 400
            
            # Fetch tweet data from Twitter API
            tweet_data = fetch_tweet_data(tweet_id)
            
            # Parse tweet data
            parsed_tweet = parse_tweet_data(tweet_data, tweet_type)
        
        # Save to database
        tweets_collection.insert_one(parsed_tweet)
        
        return jsonify({'success': True, 'message': 'Tweet added successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Get all tweets
@app.route('/api/get_all_tweets', methods=['GET'])
def get_all_tweets():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 12))
        search = request.args.get('search', '')
        tweet_type = request.args.get('type', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if search:
            query['$or'] = [
                {'text': {'$regex': search, '$options': 'i'}},
                {'author_name': {'$regex': search, '$options': 'i'}},
                {'author_username': {'$regex': search, '$options': 'i'}},
                {'tweet_id': {'$regex': search, '$options': 'i'}}
            ]
        
        if tweet_type:
            query['tweet_type'] = tweet_type
        
        # Get total count
        total_tweets = tweets_collection.count_documents(query)
        
        # Get tweets with pagination - include all fields including Space-specific data
        tweets = list(tweets_collection.find(query).sort('created_at', -1).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization
        for tweet in tweets:
            tweet['_id'] = str(tweet['_id'])
        
        return jsonify({
            'tweets': tweets,
            'total': total_tweets,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_tweets + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete tweet
@app.route('/api/delete_tweet/<tweet_id>', methods=['DELETE'])
def delete_tweet(tweet_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Delete the tweet
        result = tweets_collection.delete_one({'tweet_id': tweet_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Tweet not found'}), 404
        
        return jsonify({'success': True, 'message': 'Tweet deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Debug endpoint to see raw API response
@app.route('/api/debug_tweet/<tweet_id>', methods=['GET'])
def debug_tweet(tweet_id):
    try:
        # Fetch tweet data from Twitter API
        tweet_data = fetch_tweet_data(tweet_id)
        
        # Return the raw response for debugging
        return jsonify({
            'success': True,
            'tweet_id': tweet_id,
            'raw_response': tweet_data,
            'response_structure': {
                'top_level_keys': list(tweet_data.keys()) if isinstance(tweet_data, dict) else 'Not a dict',
                'data_keys': list(tweet_data.get('data', {}).keys()) if 'data' in tweet_data else 'No data field'
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Creator Showcase API endpoints

# Add creator showcase
@app.route('/api/add_creator_showcase', methods=['POST'])
def add_creator_showcase():
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        creator_name = data.get('creator_name')
        image_url = data.get('image_url')
        platform = data.get('platform')
        post_url = data.get('post_url')
        
        # Validate required fields
        if not all([creator_name, image_url, platform, post_url]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        # Validate platform
        if platform not in ['instagram', 'twitter', 'youtube']:
            return jsonify({'success': False, 'message': 'Invalid platform. Must be instagram, twitter, or youtube'}), 400
        
        # Validate URL based on platform
        url_valid = False
        if platform == 'instagram':
            url_valid = validate_instagram_url(post_url)
        elif platform == 'twitter':
            url_valid = validate_twitter_url(post_url)
        elif platform == 'youtube':
            url_valid = validate_youtube_url(post_url)
        
        if not url_valid:
            return jsonify({'success': False, 'message': f'Invalid {platform} URL format'}), 400
        
        # Generate embed URL
        embed_post_url = generate_embed_url(post_url, platform)
        
        # Create creator showcase entry
        creator_entry = {
            'creator_name': creator_name,
            'image_url': image_url,
            'platform': platform,
            'post_url': post_url,
            'embed_post_url': embed_post_url,
            'timestamp': time.time()
        }
        
        # Save to database
        creator_showcase_collection.insert_one(creator_entry)
        
        return jsonify({'success': True, 'message': 'Creator showcase added successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Get all creator showcases
@app.route('/api/get_all_creator_showcases', methods=['GET'])
def get_all_creator_showcases():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 12))
        search = request.args.get('search', '')
        platform_filter = request.args.get('platform', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if search:
            query['$or'] = [
                {'creator_name': {'$regex': search, '$options': 'i'}},
                {'platform': {'$regex': search, '$options': 'i'}}
            ]
        
        if platform_filter:
            query['platform'] = platform_filter
        
        # Get total count
        total_showcases = creator_showcase_collection.count_documents(query)
        
        # Get showcases with pagination
        showcases = list(creator_showcase_collection.find(query, {
            'creator_name': 1,
            'image_url': 1,
            'platform': 1,
            'post_url': 1,
            'embed_post_url': 1,
            'timestamp': 1
        }).sort('timestamp', -1).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization
        for showcase in showcases:
            showcase['_id'] = str(showcase['_id'])
        
        return jsonify({
            'showcases': showcases,
            'total': total_showcases,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_showcases + per_page - 1) // per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete creator showcase
@app.route('/api/delete_creator_showcase/<showcase_id>', methods=['DELETE'])
def delete_creator_showcase(showcase_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Convert string ID to ObjectId
        from bson import ObjectId
        try:
            object_id = ObjectId(showcase_id)
        except:
            return jsonify({'success': False, 'message': 'Invalid showcase ID'}), 400
        
        # Delete the showcase
        result = creator_showcase_collection.delete_one({'_id': object_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Creator showcase not found'}), 404
        
        return jsonify({'success': True, 'message': 'Creator showcase deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Prompt Protocol Data API - Returns latest 20 blogs, all creators, and all tweets with separate categories
@app.route('/api/prompt-protocol-data', methods=['GET'])
def get_prompt_protocol_data():
    try:
        # Get latest 20 blogs
        latest_blogs = list(collection.find({}, {
            'title': 1, 
            'description': 1, 
            'blog_id': 1, 
            'timestamp': 1,
            'thumbnail': 1
        }).sort('timestamp', -1).limit(20))
        
        # Convert ObjectId to string for JSON serialization
        for blog in latest_blogs:
            blog['_id'] = str(blog['_id'])
        
        # Get all creator showcases
        all_creators = list(creator_showcase_collection.find({}, {
            'creator_name': 1,
            'image_url': 1,
            'platform': 1,
            'post_url': 1,
            'embed_post_url': 1,
            'timestamp': 1
        }).sort('timestamp', -1))
        
        # Convert ObjectId to string for JSON serialization
        for creator in all_creators:
            creator['_id'] = str(creator['_id'])
        
        # Get all tweets and separate them by type - include all fields including Space-specific data
        all_tweets = list(tweets_collection.find({}).sort('created_at', -1))
        
        # Convert ObjectId to string for JSON serialization
        for tweet in all_tweets:
            tweet['_id'] = str(tweet['_id'])
        
        # Separate tweets by type - tweets includes all types except spaces
        tweets = [tweet for tweet in all_tweets if tweet.get('tweet_type') != 'space']
        spaces = [tweet for tweet in all_tweets if tweet.get('tweet_type') == 'space']
        
        # Prepare response data
        response_data = {
            'success': True,
            'data': {
                'latest_blogs': {
                    'count': len(latest_blogs),
                    'blogs': latest_blogs
                },
                'creators': {
                    'count': len(all_creators),
                    'creators': all_creators
                },
                'tweets': {
                    'count': len(tweets),
                    'tweets': tweets
                },
                'spaces': {
                    'count': len(spaces),
                    'spaces': spaces
                }
            },
            'metadata': {
                'total_blogs': collection.count_documents({}),
                'total_creators': creator_showcase_collection.count_documents({}),
                'total_tweets': tweets_collection.count_documents({'tweet_type': {'$ne': 'space'}}),
                'total_spaces': tweets_collection.count_documents({'tweet_type': 'space'}),
                'generated_at': time.time()
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e),
            'message': 'Failed to fetch prompt protocol data'
        }), 500

# ==================== FAQ MANAGEMENT ====================

# FAQ Manager Dashboard Route
@app.route('/faq-manager')
def faq_manager():
    return render_template('faq-manager.html')

# Create new FAQ
@app.route('/api/faq', methods=['POST'])
def create_faq():
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Validate required fields
        if not data.get('title') or not data.get('description'):
            return jsonify({'error': 'Title and description are required'}), 400
        
        # Get the next position (highest position + 1)
        max_position_cursor = faqs_collection.find().sort('position', -1).limit(1)
        max_position_list = list(max_position_cursor)
        next_position = 1
        if max_position_list:
            max_doc = max_position_list[0]
            next_position = max_doc.get('position', 0) + 1
        
        # Create FAQ document
        faq_doc = {
            'title': data['title'],
            'description': data['description'],
            'position': data.get('position', next_position),
            'timestamp': time.time(),
            'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Insert into MongoDB
        result = faqs_collection.insert_one(faq_doc)
        
        if result.inserted_id:
            return jsonify({
                'success': True,
                'message': 'FAQ created successfully',
                'faq_id': str(result.inserted_id)
            }), 201
        else:
            return jsonify({'error': 'Failed to create FAQ'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get all FAQs with pagination and search
@app.route('/api/faqs', methods=['GET'])
def get_all_faqs():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if search:
            query = {
                '$or': [
                    {'title': {'$regex': search, '$options': 'i'}},
                    {'description': {'$regex': search, '$options': 'i'}}
                ]
            }
        
        # Get total count
        total_faqs = faqs_collection.count_documents(query)
        
        # Get FAQs with pagination (sorted by position, then by timestamp)
        faqs = list(faqs_collection.find(query).sort([('position', 1), ('timestamp', -1)]).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization and ensure position field exists
        for faq in faqs:
            faq['_id'] = str(faq['_id'])
            # Ensure position field exists for backward compatibility
            if 'position' not in faq:
                faq['position'] = 999  # Default high position for existing FAQs
        
        return jsonify({
            'faqs': faqs,
            'total': total_faqs,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_faqs + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get single FAQ by ID
@app.route('/api/faq/<faq_id>', methods=['GET'])
def get_faq(faq_id):
    try:
        faq = faqs_collection.find_one({'_id': ObjectId(faq_id)})
        
        if faq:
            faq['_id'] = str(faq['_id'])
            return jsonify(faq)
        else:
            return jsonify({'error': 'FAQ not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update FAQ
@app.route('/api/faq/<faq_id>', methods=['PUT'])
def update_faq(faq_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Validate required fields
        if not data.get('title') or not data.get('description'):
            return jsonify({'error': 'Title and description are required'}), 400
        
        # Update document
        update_data = {
            'title': data['title'],
            'description': data['description'],
            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Include position if provided
        if 'position' in data:
            update_data['position'] = data['position']
        
        result = faqs_collection.update_one(
            {'_id': ObjectId(faq_id)},
            {'$set': update_data}
        )
        
        if result.matched_count:
            return jsonify({'success': True, 'message': 'FAQ updated successfully'})
        else:
            return jsonify({'error': 'FAQ not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete FAQ
@app.route('/api/faq/<faq_id>', methods=['DELETE'])
def delete_faq(faq_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        result = faqs_collection.delete_one({'_id': ObjectId(faq_id)})
        
        if result.deleted_count:
            return jsonify({'success': True, 'message': 'FAQ deleted successfully'})
        else:
            return jsonify({'error': 'FAQ not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update FAQ position
@app.route('/api/faq/<faq_id>/position', methods=['PUT'])
def update_faq_position(faq_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        if 'position' not in data:
            return jsonify({'error': 'Position is required'}), 400
        
        new_position = int(data['position'])
        
        # Get current FAQ
        current_faq = faqs_collection.find_one({'_id': ObjectId(faq_id)})
        if not current_faq:
            return jsonify({'error': 'FAQ not found'}), 404
        
        old_position = current_faq.get('position', 0)
        
        # Update the FAQ's position
        result = faqs_collection.update_one(
            {'_id': ObjectId(faq_id)},
            {'$set': {
                'position': new_position,
                'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }}
        )
        
        if result.matched_count:
            return jsonify({'success': True, 'message': 'FAQ position updated successfully'})
        else:
            return jsonify({'error': 'FAQ not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Reorder FAQs
@app.route('/api/faqs/reorder', methods=['PUT'])
def reorder_faqs():
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        if 'faq_positions' not in data:
            return jsonify({'error': 'faq_positions array is required'}), 400
        
        faq_positions = data['faq_positions']
        
        # Update positions for all FAQs
        for item in faq_positions:
            faq_id = item.get('faq_id')
            position = item.get('position')
            
            if not faq_id or position is None:
                continue
                
            faqs_collection.update_one(
                {'_id': ObjectId(faq_id)},
                {'$set': {
                    'position': position,
                    'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
                }}
            )
        
        return jsonify({'success': True, 'message': 'FAQs reordered successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get all FAQs without pagination (for reordering)
@app.route('/api/faqs/all', methods=['GET'])
def get_all_faqs_no_pagination():
    try:
        # Get all FAQs sorted by position
        faqs = list(faqs_collection.find().sort([('position', 1), ('timestamp', -1)]))
        
        # Convert ObjectId to string for JSON serialization and ensure position field exists
        for faq in faqs:
            faq['_id'] = str(faq['_id'])
            # Ensure position field exists for backward compatibility
            if 'position' not in faq:
                faq['position'] = 999  # Default high position for existing FAQs
        
        return jsonify({'faqs': faqs})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Initialize positions for existing FAQs (migration endpoint)
@app.route('/api/faqs/init-positions', methods=['POST'])
def init_faq_positions():
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Get all FAQs without position field
        faqs_without_position = list(faqs_collection.find({'position': {'$exists': False}}).sort('timestamp', 1))
        
        # Assign positions starting from 1
        for index, faq in enumerate(faqs_without_position):
            faqs_collection.update_one(
                {'_id': faq['_id']},
                {'$set': {'position': index + 1}}
            )
        
        return jsonify({
            'success': True,
            'message': f'Initialized positions for {len(faqs_without_position)} FAQs',
            'count': len(faqs_without_position)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== JOB POSTING MANAGEMENT ====================

# Job Manager Dashboard Route
@app.route('/job-manager')
def job_manager():
    return render_template('job-manager.html')

# Create new job posting
@app.route('/api/job', methods=['POST'])
def create_job():
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Validate required fields
        required_fields = ['role_name', 'location', 'type', 'description', 'role_category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate enum values
        valid_types = ['fulltime', 'intern', 'advisory', 'parttime', 'contract']
        valid_roles = ['product', 'design', 'tech', 'management', 'social', 'marketing', 'sales']
        
        if data['type'] not in valid_types:
            return jsonify({'error': f'Invalid type. Must be one of: {", ".join(valid_types)}'}), 400
        
        if data['role_category'] not in valid_roles:
            return jsonify({'error': f'Invalid role category. Must be one of: {", ".join(valid_roles)}'}), 400
        
        # Create job document
        job_doc = {
            'role_name': data['role_name'],
            'location': data['location'],
            'type': data['type'],
            'description': data['description'],
            'role_category': data['role_category'],
            'timestamp': time.time(),
            'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'is_active': data.get('is_active', True)
        }
        
        # Insert into MongoDB
        result = jobs_collection.insert_one(job_doc)
        
        if result.inserted_id:
            return jsonify({
                'success': True,
                'message': 'Job posting created successfully',
                'job_id': str(result.inserted_id)
            }), 201
        else:
            return jsonify({'error': 'Failed to create job posting'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get all job postings with pagination and filtering
@app.route('/api/jobs', methods=['GET'])
def get_all_jobs():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        job_type = request.args.get('type', '')
        role_category = request.args.get('role_category', '')
        location = request.args.get('location', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {'is_active': True}  # Only show active jobs by default
        
        if search:
            query['$or'] = [
                {'role_name': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'location': {'$regex': search, '$options': 'i'}}
            ]
        
        if job_type:
            query['type'] = job_type
        
        if role_category:
            query['role_category'] = role_category
        
        if location:
            query['location'] = {'$regex': location, '$options': 'i'}
        
        # Get total count
        total_jobs = jobs_collection.count_documents(query)
        
        # Get jobs with pagination
        jobs = list(jobs_collection.find(query).sort('timestamp', -1).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization
        for job in jobs:
            job['_id'] = str(job['_id'])
        
        return jsonify({
            'jobs': jobs,
            'total': total_jobs,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_jobs + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get all jobs for admin (including inactive)
@app.route('/api/admin/jobs', methods=['GET'])
def get_all_jobs_admin():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if search:
            query = {
                '$or': [
                    {'role_name': {'$regex': search, '$options': 'i'}},
                    {'description': {'$regex': search, '$options': 'i'}},
                    {'location': {'$regex': search, '$options': 'i'}}
                ]
            }
        
        # Get total count
        total_jobs = jobs_collection.count_documents(query)
        
        # Get jobs with pagination
        jobs = list(jobs_collection.find(query).sort('timestamp', -1).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization
        for job in jobs:
            job['_id'] = str(job['_id'])
        
        return jsonify({
            'jobs': jobs,
            'total': total_jobs,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_jobs + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get single job by ID
@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    try:
        job = jobs_collection.find_one({'_id': ObjectId(job_id)})
        
        if job:
            job['_id'] = str(job['_id'])
            return jsonify(job)
        else:
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update job posting
@app.route('/api/job/<job_id>', methods=['PUT'])
def update_job(job_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Validate required fields if provided
        if 'type' in data:
            valid_types = ['fulltime', 'intern', 'advisory', 'parttime', 'contract']
            if data['type'] not in valid_types:
                return jsonify({'error': f'Invalid type. Must be one of: {", ".join(valid_types)}'}), 400
        
        if 'role_category' in data:
            valid_roles = ['product', 'design', 'tech', 'management', 'social', 'marketing', 'sales']
            if data['role_category'] not in valid_roles:
                return jsonify({'error': f'Invalid role category. Must be one of: {", ".join(valid_roles)}'}), 400
        
        # Update document
        update_data = {
            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Only update provided fields
        allowed_fields = ['role_name', 'location', 'type', 'description', 'role_category', 'is_active']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        result = jobs_collection.update_one(
            {'_id': ObjectId(job_id)},
            {'$set': update_data}
        )
        
        if result.matched_count:
            return jsonify({'success': True, 'message': 'Job posting updated successfully'})
        else:
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete job posting
@app.route('/api/job/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        result = jobs_collection.delete_one({'_id': ObjectId(job_id)})
        
        if result.deleted_count:
            return jsonify({'success': True, 'message': 'Job posting deleted successfully'})
        else:
            return jsonify({'error': 'Job not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Job Application Validation Functions
def validate_application_form_data(data):
    """
    Validate job application form data
    Returns: dict with 'isValid', 'errors', and 'warnings'
    """
    errors = []
    warnings = []
    
    # Check if data exists
    if not data or not isinstance(data, dict):
        return {
            'isValid': False,
            'errors': ['No data received or invalid data format'],
            'warnings': []
        }
    
    # Required field validations
    required_fields = ['fullName', 'email', 'educationLevel', 'yearsExperience', 'resumeUrl', 'jobId']
    
    for field in required_fields:
        if not data.get(field) or not isinstance(data[field], str) or data[field].strip() == '':
            errors.append(f'{field} is required and cannot be empty')
    
    # Full name validation
    if data.get('fullName') and isinstance(data['fullName'], str):
        trimmed_name = data['fullName'].strip()
        if len(trimmed_name) < 2:
            errors.append('Full name must be at least 2 characters long')
        if len(trimmed_name) > 100:
            errors.append('Full name cannot exceed 100 characters')
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', trimmed_name):
            errors.append('Full name contains invalid characters')
    
    # Email validation
    if data.get('email') and isinstance(data['email'], str):
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, data['email'].strip()):
            errors.append('Invalid email format')
        if len(data['email']) > 254:
            errors.append('Email address is too long')
    
    # Education level validation
    if data.get('educationLevel') and isinstance(data['educationLevel'], str):
        valid_education_levels = [
            'high-school', 'associate', 'bachelor', 'master', 'phd', 'other'
        ]
        if data['educationLevel'] not in valid_education_levels:
            errors.append('Invalid education level selected')
    
    # Years of experience validation
    if data.get('yearsExperience') and isinstance(data['yearsExperience'], str):
        valid_experience_levels = [
            '0-1', '1-2', '2-3', '3-5', '5-7', '7-10', '10+'
        ]
        if data['yearsExperience'] not in valid_experience_levels:
            errors.append('Invalid years of experience selected')
    
    # Resume URL validation (Google Drive)
    if data.get('resumeUrl') and isinstance(data['resumeUrl'], str):
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(data['resumeUrl'].strip())
            
            # Check if it's a Google Drive URL
            if 'drive.google.com' not in parsed_url.netloc:
                errors.append('Resume URL must be a Google Drive link')
            elif parsed_url.scheme != 'https':
                errors.append('Resume URL must use HTTPS protocol')
            # Allow any Google Drive URL format
        except Exception:
            errors.append('Invalid resume URL format')
    
    # Job ID validation
    if data.get('jobId') and isinstance(data['jobId'], str):
        job_id = data['jobId'].strip()
        if len(job_id) < 1:
            errors.append('Job ID cannot be empty')
        # You can add additional job ID validation here if needed
    
    # LinkedIn URL validation (optional)
    if data.get('linkedinUrl') and data['linkedinUrl'].strip() != '':
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(data['linkedinUrl'].strip())
            hostname = parsed_url.netloc.lower()
            pathname = parsed_url.path.lower()
            
            valid_hostname = hostname in ['www.linkedin.com', 'linkedin.com']
            has_valid_path = pathname.startswith('/in/') and len(pathname.split('/')) >= 3
            
            if not valid_hostname or not has_valid_path:
                warnings.append('LinkedIn URL format appears invalid')
        except Exception:
            warnings.append('Invalid LinkedIn URL format')
    
    # Twitter URL validation (optional)
    if data.get('twitterUrl') and data['twitterUrl'].strip() != '':
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(data['twitterUrl'].strip())
            hostname = parsed_url.netloc.lower()
            pathname = parsed_url.path
            
            valid_hostnames = [
                'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'
            ]
            
            is_valid_hostname = hostname in valid_hostnames
            has_username = len(pathname) > 1 and not pathname.endswith('/')
            
            if not is_valid_hostname or not has_username:
                warnings.append('Twitter/X URL format appears invalid')
        except Exception:
            warnings.append('Invalid Twitter/X URL format')
    
    # Additional security validations
    if data.get('fullName') and len(data['fullName']) > 500:
        errors.append('Full name is suspiciously long')
    
    # Check for potential SQL injection or XSS attempts
    suspicious_patterns = [
        r'<script',
        r'javascript:',
        r'on\w+\s*=',
        r'union\s+select',
        r'drop\s+table',
        r'delete\s+from'
    ]
    
    all_text_fields = [
        data.get('fullName', ''),
        data.get('email', ''),
        data.get('resumeUrl', ''),
        data.get('linkedinUrl', ''),
        data.get('twitterUrl', '')
    ]
    
    for field in all_text_fields:
        if field and isinstance(field, str):
            for pattern in suspicious_patterns:
                if re.search(pattern, field, re.IGNORECASE):
                    errors.append('Suspicious content detected in form data')
                    break
    
    return {
        'isValid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

def sanitize_application_data(data):
    """
    Sanitize job application data
    Returns: dict with sanitized data
    """
    return {
        'fullName': data.get('fullName', '').strip(),
        'email': data.get('email', '').strip().lower(),
        'educationLevel': data.get('educationLevel', ''),
        'yearsExperience': data.get('yearsExperience', ''),
        'resumeUrl': data.get('resumeUrl', '').strip(),
        'linkedinUrl': data.get('linkedinUrl', '').strip(),
        'twitterUrl': data.get('twitterUrl', '').strip(),
        'jobId': data.get('jobId', '').strip()
    }

# Job Application Submission
@app.route('/api/submit-job-application', methods=['POST'])
def submit_job_application():
    try:
        data = request.get_json()
        
        # Debug logging
        print(f"Received application data: {data}")
        
        # Check if data is None (no JSON sent)
        if data is None:
            return jsonify({
                'success': False,
                'message': 'No JSON data received',
                'errors': ['Request must contain valid JSON data'],
                'warnings': []
            }), 400
        
        # Validate and sanitize the application data
        validation_result = validate_application_form_data(data)
        
        print(f"Validation result: {validation_result}")
        
        if not validation_result['isValid']:
            return jsonify({
                'success': False,
                'message': 'Validation failed',
                'errors': validation_result['errors'],
                'warnings': validation_result['warnings']
            }), 400
        
        # Log warnings if any
        if validation_result['warnings']:
            print(f"Application form warnings: {validation_result['warnings']}")
        
        # Sanitize the data
        sanitized_data = sanitize_application_data(data)
        
        # Create application document with additional metadata
        application_doc = {
            'fullName': sanitized_data['fullName'],
            'email': sanitized_data['email'],
            'educationLevel': sanitized_data['educationLevel'],
            'yearsExperience': sanitized_data['yearsExperience'],
            'resumeUrl': sanitized_data['resumeUrl'],
            'linkedinUrl': sanitized_data['linkedinUrl'],
            'twitterUrl': sanitized_data['twitterUrl'],
            'jobId': sanitized_data['jobId'],
            'timestamp': time.time(),
            'submitted_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'submitted'  # submitted, reviewed, accepted, rejected
        }
        
        # Insert into MongoDB
        result = job_applications_collection.insert_one(application_doc)
        
        if result.inserted_id:
            return jsonify({
                'success': True,
                'message': 'Application submitted successfully',
                'application_id': str(result.inserted_id),
                'data': sanitized_data
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to submit application'
            }), 500
        
    except Exception as e:
        print(f"Application submission error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

# Debug endpoint to test application submission
@app.route('/api/debug-application', methods=['POST'])
def debug_application():
    try:
        data = request.get_json()
        print(f"Debug - Raw request data: {data}")
        print(f"Debug - Data type: {type(data)}")
        print(f"Debug - Data keys: {list(data.keys()) if data else 'None'}")
        
        return jsonify({
            'success': True,
            'message': 'Debug endpoint reached',
            'received_data': data,
            'data_type': str(type(data)),
            'data_keys': list(data.keys()) if data else None
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Debug error: {str(e)}'
        }), 500

# Admin API endpoints for managing applications

# Get all job applications for admin (with pagination and filtering)
@app.route('/api/admin/applications', methods=['GET'])
def get_all_applications_admin():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        status_filter = request.args.get('status', '')
        education_filter = request.args.get('education', '')
        job_id_filter = request.args.get('job_id', '')
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Build query
        query = {}
        if search:
            query['$or'] = [
                {'fullName': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}},
                {'educationLevel': {'$regex': search, '$options': 'i'}}
            ]
        
        if status_filter:
            query['status'] = status_filter
        
        if education_filter:
            query['educationLevel'] = education_filter
        
        if job_id_filter:
            query['jobId'] = job_id_filter
        
        # Get total count
        total_applications = job_applications_collection.count_documents(query)
        
        # Get applications with pagination
        applications = list(job_applications_collection.find(query).sort('timestamp', -1).skip(skip).limit(per_page))
        
        # Convert ObjectId to string for JSON serialization and fetch job details
        for application in applications:
            application['_id'] = str(application['_id'])
            
            # Fetch job details if jobId exists
            if application.get('jobId'):
                try:
                    job = jobs_collection.find_one({'_id': ObjectId(application['jobId'])})
                    if job:
                        application['jobDetails'] = {
                            'role_name': job.get('role_name', 'Unknown Job'),
                            'location': job.get('location', 'Unknown Location'),
                            'type': job.get('type', 'Unknown Type'),
                            'role_category': job.get('role_category', 'Unknown Category')
                        }
                    else:
                        application['jobDetails'] = {
                            'role_name': 'Job Not Found',
                            'location': 'N/A',
                            'type': 'N/A',
                            'role_category': 'N/A'
                        }
                except Exception as e:
                    print(f"Error fetching job details for jobId {application.get('jobId')}: {e}")
                    application['jobDetails'] = {
                        'role_name': 'Invalid Job ID',
                        'location': 'N/A',
                        'type': 'N/A',
                        'role_category': 'N/A'
                    }
            else:
                application['jobDetails'] = {
                    'role_name': 'No Job ID',
                    'location': 'N/A',
                    'type': 'N/A',
                    'role_category': 'N/A'
                }
        
        return jsonify({
            'applications': applications,
            'total': total_applications,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_applications + per_page - 1) // per_page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update application status
@app.route('/api/admin/application/<application_id>', methods=['PUT'])
def update_application_status(application_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        # Validate status
        valid_statuses = ['submitted', 'reviewed', 'accepted', 'rejected']
        if 'status' in data and data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        # Update document
        update_data = {
            'updated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Only update provided fields
        allowed_fields = ['status']
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        result = job_applications_collection.update_one(
            {'_id': ObjectId(application_id)},
            {'$set': update_data}
        )
        
        if result.matched_count:
            return jsonify({'success': True, 'message': 'Application updated successfully'})
        else:
            return jsonify({'error': 'Application not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete application
@app.route('/api/admin/application/<application_id>', methods=['DELETE'])
def delete_application(application_id):
    try:
        data = request.get_json()
        
        # Verify password
        if data.get('password') != 'clustertothemoon':
            return jsonify({'success': False, 'message': 'Wrong Password'}), 401
        
        result = job_applications_collection.delete_one({'_id': ObjectId(application_id)})
        
        if result.deleted_count:
            return jsonify({'success': True, 'message': 'Application deleted successfully'})
        else:
            return jsonify({'error': 'Application not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve the modular header component
@app.route('/components/header.html')
def serve_header():
    return send_file('site/components/header.html')

# Serve the header loader script
@app.route('/components/header-loader.js')
def serve_header_loader():
    return send_file('site/components/header-loader.js')

# Test page for header loading
@app.route('/test-header')
def test_header():
    return send_file('site/test-header.html')

# Ask Cluster AI endpoint
@app.route('/ask-cluster-ai', methods=['POST'])
def ask_cluster_ai():
    print("=== ASK CLUSTER AI ENDPOINT HIT ===")
    try:
        # Get the question from the request
        data = request.get_json()
        print(f"Received data: {data}")
        
        if not data or 'question' not in data:
            print("Error: No question provided")
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question']
        print(f"Question: {question}")
        
        # Get FAQs from the database
        faqs = list(faqs_collection.find({}, {
            'title': 1,
            'description': 1
        }).sort([('position', 1), ('timestamp', -1)]))
        
        # Get careers/jobs from the database
        careers = list(jobs_collection.find({'is_active': True}, {
            'role_name': 1,
            'location': 1,
            'type': 1,
            'description': 1,
            'role_category': 1
        }).sort('timestamp', -1))
        
        # Format FAQs for the prompt
        faqs_text = ""
        for faq in faqs:
            faqs_text += f"Q: {faq.get('title', '')}\nA: {faq.get('description', '')}\n\n"
        
        # Format careers for the prompt
        careers_text = ""
        for career in careers:
            careers_text += f"Role: {career.get('role_name', '')}\nLocation: {career.get('location', '')}\nType: {career.get('type', '')}\nCategory: {career.get('role_category', '')}\nDescription: {career.get('description', '')}\n\n"
        print(faqs_text)
        print(careers_text)
        # Create the prompt
        prompt = f"""<SYSTEM INSTRUCTION>
You're CluBot, your job is to only answer the question from the <DATASET> and nothing out of context. Be so strict with your rules.
You will give quirky response as well. Try to promote our company and brag about it.
</SYSTEM INSTRUCTION>
<DATASET>
#FAQS
{faqs_text}

#CAREERS
{careers_text}
</DATASET>
<OUTPUT INSTRUCTION>
Always respond in json and nothing else. Never give json with three "```json" in start . Just plain json in response and nothing else
</OUTPUT INSTRUCTION>
<OUTPUT FORMAT>
{{"message": "Yeah! These things are available..."}}
</OUTPUT FORMAT>

Question: {question}"""
        
        # Call Gemini REST API
        api_key = 'AIzaSyCGVB4WF_rUNainEZ_ZM3s6rbYcxjIwNXY'
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}'
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        
        # Make the API request
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        # Parse the response
        response_data = response.json()
        
        # Extract the generated text
        if 'candidates' in response_data and len(response_data['candidates']) > 0:
            generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
        else:
            return jsonify({'error': 'No response generated from Gemini API'}), 500
        
        # Try to parse the response as JSON
        try:
            import json
            response_text = generated_text.strip()
            # Remove any markdown formatting if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse as JSON to validate
            json_response = json.loads(response_text)
            return jsonify(json_response)
        except json.JSONDecodeError:
            # If not valid JSON, wrap in the expected format
            return jsonify({"message": generated_text})
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)