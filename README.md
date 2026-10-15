# Taskflow

A beginner-friendly task manager built with Flask, SQLite, SQLAlchemy, HTML, CSS, JavaScript, and Bootstrap 5. Tasks persist in a local SQLite database.

## Features

- Create, view, edit, and delete tasks
- Mark tasks as completed or pending
- Search by task title or details and filter by status
- Live total, completed, and pending counts
- Input validation with clear success and error messages
- Responsive dashboard and database health endpoint

## Requirements

- Python 3.9 or newer
- pip

## Install and run

1. Open a terminal in the project directory.
2. Create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   On macOS or Linux, activate it with `source .venv/bin/activate`.

3. Install dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

4. Start the web app:

   ```powershell
   python app.py
   ```

5. Visit http://127.0.0.1:5000. The SQLite database (`tasks.db`) is created automatically in Flask's instance directory.

To use a different database file, set `DATABASE_URL` before starting Flask, for example `sqlite:///my-tasks.db`. Set `FLASK_DEBUG=true` only for local development.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check application/database health |
| `GET` | `/api/tasks` | List tasks and counts; optional `search` and `status=all\|pending\|completed` query parameters |
| `POST` | `/api/tasks` | Create a task using JSON `title` and optional `description` |
| `PUT` | `/api/tasks/<id>` | Update title, description, and/or completion state |
| `PATCH` | `/api/tasks/<id>` | Update completion state or supplied task fields |
| `DELETE` | `/api/tasks/<id>` | Delete a task |

Task titles are required and limited to 120 characters. Descriptions are optional and limited to 500 characters. API responses use JSON.

Example:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5000/api/tasks `
  -ContentType "application/json" -Body '{"title":"Plan the week","description":"Pick three priorities"}'
```

## Run tests

```powershell
python -m pytest
```

Tests use an isolated in-memory SQLite database and do not modify the local task database.

## Project layout

```text
taskmanager/
├── app.py                 # Flask app factory and REST endpoints
├── models.py              # SQLAlchemy Task model
├── requirements.txt
├── templates/
│   └── index.html         # Dashboard markup
├── static/
│   ├── css/styles.css
│   └── js/app.js
└── tests/
    └── test_app.py
```

Bootstrap and the display font are loaded from CDNs; the application logic and custom styling are served locally.
