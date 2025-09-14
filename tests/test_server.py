import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from server import app


def test_index_route():
    client = app.test_client()
    response = client.get('/')
    assert response.status_code == 200
    assert b"<title>STP/STEP File Viewer</title>" in response.data


def test_static_asset_served():
    client = app.test_client()
    response = client.get('/style.css')
    assert response.status_code == 200


def test_nonexistent_route_returns_404():
    client = app.test_client()
    response = client.get('/does-not-exist')
    assert response.status_code == 404
