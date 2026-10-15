import os

from flask import Flask, jsonify, render_template, request
from sqlalchemy import case, func, or_

from models import db, Task


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "local-development-key"),
        SQLALCHEMY_DATABASE_URI=os.environ.get(
            "DATABASE_URL", "sqlite:///tasks.db"
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    with app.app_context():
        db.create_all()

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/health")
    def health():
        try:
            db.session.execute(db.select(1))
        except Exception:
            app.logger.exception("Health check could not reach the database")
            return jsonify(status="unhealthy"), 503
        return jsonify(status="healthy"), 200

    @app.get("/api/tasks")
    def list_tasks():
        query = Task.query
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "all").strip().lower()

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(Task.title.ilike(pattern), Task.description.ilike(pattern))
            )
        if status == "completed":
            query = query.filter_by(completed=True)
        elif status == "pending":
            query = query.filter_by(completed=False)
        elif status != "all":
            return jsonify(error="Status must be all, completed, or pending."), 400

        tasks = query.order_by(Task.created_at.desc(), Task.id.desc()).all()
        counts = db.session.query(
            func.count(Task.id).label("total"),
            func.coalesce(func.sum(case((Task.completed.is_(True), 1), else_=0)), 0).label(
                "completed"
            ),
        ).one()
        total = counts.total
        completed_count = int(counts.completed)

        return jsonify(
            tasks=[task.to_dict() for task in tasks],
            counts={
                "total": total,
                "completed": completed_count,
                "pending": total - completed_count,
            },
        )

    @app.post("/api/tasks")
    def create_task():
        data, error = validated_payload(request.get_json(silent=True))
        if error:
            return jsonify(error=error), 400

        task = Task(title=data["title"], description=data["description"])
        db.session.add(task)
        db.session.commit()
        return jsonify(task=task.to_dict(), message="Task created successfully."), 201

    @app.route("/api/tasks/<int:task_id>", methods=["PUT", "PATCH"])
    def update_task(task_id):
        task = db.session.get(Task, task_id)
        if task is None:
            return jsonify(error="Task not found."), 404

        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Request body must be a JSON object."), 400

        if request.method == "PATCH" and "completed" in payload:
            if not isinstance(payload["completed"], bool):
                return jsonify(error="Completed must be true or false."), 400
            task.completed = payload["completed"]

        if "title" in payload or "description" in payload:
            data, error = validated_payload(payload, partial=True)
            if error:
                return jsonify(error=error), 400
            if "title" in data:
                task.title = data["title"]
            if "description" in data:
                task.description = data["description"]

        if request.method == "PUT" and "completed" in payload:
            if not isinstance(payload["completed"], bool):
                return jsonify(error="Completed must be true or false."), 400
            task.completed = payload["completed"]

        db.session.commit()
        return jsonify(task=task.to_dict(), message="Task updated successfully.")

    @app.delete("/api/tasks/<int:task_id>")
    def delete_task(task_id):
        task = db.session.get(Task, task_id)
        if task is None:
            return jsonify(error="Task not found."), 404
        db.session.delete(task)
        db.session.commit()
        return jsonify(message="Task deleted successfully.")

    return app


def validated_payload(payload, partial=False):
    if not isinstance(payload, dict):
        return None, "Request body must be a JSON object."

    result = {}
    for field, limit in (("title", 120), ("description", 500)):
        if field not in payload:
            if partial:
                continue
            result[field] = ""
            continue
        value = payload[field]
        if not isinstance(value, str):
            return None, f"{field.capitalize()} must be text."
        value = value.strip()
        if field == "title" and not value:
            return None, "Please enter a task title."
        if len(value) > limit:
            return None, f"{field.capitalize()} must be {limit} characters or fewer."
        result[field] = value

    if not partial and not result.get("title"):
        return None, "Please enter a task title."
    return result, None


app = create_app()


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "").lower() == "true")
