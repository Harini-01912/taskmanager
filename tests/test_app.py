import pytest

from app import create_app
from models import db


@pytest.fixture
def client():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        }
    )
    with app.test_client() as test_client:
        yield test_client
    with app.app_context():
        db.drop_all()


def create_task(client, title="Write tests", description="Cover the API"):
    return client.post(
        "/api/tasks", json={"title": title, "description": description}
    )


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json == {"status": "healthy"}


def test_create_list_and_count_tasks(client):
    response = create_task(client)
    assert response.status_code == 201
    task_id = response.json["task"]["id"]

    listing = client.get("/api/tasks")
    assert listing.status_code == 200
    assert listing.json["tasks"][0]["title"] == "Write tests"
    assert listing.json["counts"] == {"total": 1, "completed": 0, "pending": 1}

    assert client.patch(
        f"/api/tasks/{task_id}", json={"completed": True}
    ).status_code == 200
    assert client.get("/api/tasks?status=completed").json["counts"] == {
        "total": 1,
        "completed": 1,
        "pending": 0,
    }


def test_update_delete_and_not_found(client):
    task_id = create_task(client).json["task"]["id"]
    updated = client.put(
        f"/api/tasks/{task_id}",
        json={"title": "Updated", "description": "", "completed": True},
    )
    assert updated.status_code == 200
    assert updated.json["task"]["title"] == "Updated"
    assert updated.json["task"]["completed"] is True

    assert client.delete(f"/api/tasks/{task_id}").status_code == 200
    assert client.delete(f"/api/tasks/{task_id}").status_code == 404


def test_validation_search_and_status_filter(client):
    assert client.post("/api/tasks", json={"title": "   "}).status_code == 400
    assert client.post("/api/tasks", json={"title": "x" * 121}).status_code == 400
    create_task(client, "Prepare release", "Review all changes")
    create_task(client, "Buy groceries", "")
    assert len(client.get("/api/tasks?search=release").json["tasks"]) == 1
    assert client.get("/api/tasks?status=unknown").status_code == 400
    assert len(client.get("/api/tasks?status=pending").json["tasks"]) == 2
