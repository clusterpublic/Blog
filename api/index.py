from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
import time
import uuid
import urllib.parse
import re
from flask_cors import CORS

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

# Flask route to render the HTML template
@app.route('/')
def index():
    return render_template('index.html')

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
    blogs_per_page = 1000
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

@app.route('/api/getblog/<blogID>', methods=['GET'])
def get_blog(blogID):
    print(blogID)
    result = collection.find_one({"blog_id": blogID})
    
    if result:
        del result['_id']
        return jsonify(result)
    else:
        return jsonify([])



if __name__ == '__main__':
    app.run(debug=True)