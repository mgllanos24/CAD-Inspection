# CAD Inspection Viewer

## Prerequisites
- Python 3
- pip
- Flask (`pip install Flask`)

## Getting Started
1. Install dependencies:
   ```bash
   pip install Flask
   ```
2. From the project root, start the server:
   ```bash
   python server.py
   ```
3. Open your browser and navigate to [http://localhost:8080](http://localhost:8080).
4. Upload a `.stp`, `.step`, or `.sldprt` file and inspect the model.

## Running Tests
Execute the test suite with:
```bash
pytest
```

## Troubleshooting
- **Missing dependencies**: If `Flask` is not installed, run `pip install Flask`.
- **Asset loading errors**: Ensure the `vendor` directory and static assets are present and paths are correct.
- **Port in use**: If the server fails to start, make sure nothing else is using port `8080`.

