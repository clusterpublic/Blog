https://us-east-1.console.aws.amazon.com/awsglobalview/home?region=us-east-1#GlobalSearch
Here all the instances are listed


its located at blog-editor




cd ~/Blog
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn python-dotenv


gunicorn deosnt downloads with requirements



to run it (before stop the existing gunicron processes)
(and always run it from the venv)
nohup gunicorn --bind 0.0.0.0:8000 index:app > gunicorn.log 2>&1 &

IT RUNS WITHIN SECONDS
IF ITS FAILS CHECK THE TRAILING LOGS