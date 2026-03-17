from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities as app_activities

original_activities = deepcopy(app_activities)
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    app_activities.clear()
    app_activities.update(deepcopy(original_activities))
    yield


def test_root_redirect():
    # Arrange is done by fixture
    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code in (307, 308)
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_data():
    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_signup_for_activity_success():
    # Arrange
    new_email = "newstudent@mergington.edu"
    activity = "Chess Club"
    assert new_email not in app_activities[activity]["participants"]

    # Act
    response = client.post(f"/activities/{activity}/signup", params={"email": new_email})

    # Assert
    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {new_email} for {activity}"
    assert new_email in app_activities[activity]["participants"]


def test_signup_for_activity_already_signed_up():
    activity = "Chess Club"
    existing_email = app_activities[activity]["participants"][0]

    response = client.post(f"/activities/{activity}/signup", params={"email": existing_email})

    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"


def test_signup_for_activity_not_found():
    response = client.post("/activities/Nonexistent/signup", params={"email": "x@x.edu"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_signup_for_activity_full():
    activity = "Tiny Club"
    app_activities[activity] = {
        "description": "Tiny test club",
        "schedule": "Now",
        "max_participants": 1,
        "participants": ["existing@mergington.edu"],
    }

    response = client.post(f"/activities/{activity}/signup", params={"email": "new@mergington.edu"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"


def test_remove_participant_success():
    activity = "Chess Club"
    email = app_activities[activity]["participants"][0]

    response = client.delete(f"/activities/{activity}/participants/{email}")

    assert response.status_code == 200
    assert response.json()["message"] == f"Removed {email} from {activity}"
    assert email not in app_activities[activity]["participants"]


def test_remove_participant_not_found():
    response = client.delete("/activities/Chess Club/participants/unknown@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found"


def test_remove_participant_activity_not_found():
    response = client.delete("/activities/NoClub/participants/nonexistent@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
