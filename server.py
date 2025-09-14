from flask import Flask, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/vendor/<path:filename>')
def vendor(filename):
    return send_from_directory('vendor', filename)

@app.route('/main.js')
def main_js():
    return send_from_directory('.', 'main.js')

@app.route('/style.css')
def style_css():
    return send_from_directory('.', 'style.css')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
