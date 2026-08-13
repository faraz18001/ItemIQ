"""Smoke tests for the ItemIQ API."""


def _auth(tokens, role):
    return {"Authorization": f"Bearer {tokens['token'][role]}"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_login_returns_token(client, db):
    email = "student@test.itemiq"
    r = client.post("/api/auth/login", json={"identifier": email, "password": "password"})
    assert r.status_code == 200
    body = r.json()
    assert body["token"]
    assert body["user"]["role"] == "student"


def test_questions_redacted_for_student(client, tokens):
    h = _auth(tokens, "student")
    rows = client.get("/api/questions", headers=h).json()
    assert rows
    q = rows[0]
    assert all("isCorrect" not in o for o in q["options"])
    assert q["correctLabel"] is None
    assert q["explanation"] is None


def test_questions_show_key_for_faculty(client, tokens):
    h = _auth(tokens, "faculty")
    rows = client.get("/api/questions", headers=h).json()
    q = rows[0]
    assert any(o["isCorrect"] for o in q["options"])
    assert q["correctLabel"] == "C"


def test_create_question_and_submit(client, tokens):
    faculty = _auth(tokens, "faculty")
    q = client.post("/api/questions", headers=faculty, json={
        "subtopicId": str(tokens["question"].subtopic_id),
        "stem": "A brand new question for the test suite.",
        "options": ["a", "b", "c", "d"],
        "correct": 1,
        "facultyDifficulty": "Medium",
        "reference": "x",
        "submit": True,
    }).json()
    assert q["status"] == "submitted"
    r = client.post(f"/api/questions/{q['id']}/submit", headers=faculty).json()
    assert r["status"] == "submitted"


def test_review_lifecycle(client, tokens):
    faculty = _auth(tokens, "faculty")
    qbm = _auth(tokens, "qbm")
    sme = _auth(tokens, "sme")

    q = client.post("/api/questions", headers=faculty, json={
        "subtopicId": str(tokens["question"].subtopic_id),
        "stem": "Review lifecycle question.",
        "options": ["a", "b", "c", "d"],
        "correct": 2,
        "facultyDifficulty": "Hard",
        "reference": "y",
        "submit": True,
    }).json()

    # SME accepts at departmental stage -> moves to under_med_edu_review
    r = client.post(f"/api/questions/{q['id']}/reviews", headers=sme, json={
        "stage": "departmental", "decision": "accepted", "remarks": "ok",
    }).json()
    assert r["status"] == "under_med_edu_review"

    # QBM accepts at med_edu stage -> into the bank
    r = client.post(f"/api/questions/{q['id']}/reviews", headers=qbm, json={
        "stage": "med_edu", "decision": "accepted", "remarks": "keyed",
    }).json()
    assert r["status"] == "in_bank"
    assert r["correctLabel"] == "C"


def test_attempt_and_progress(client, tokens):
    h = _auth(tokens, "student")
    qid = tokens["question"].id
    r = client.post("/api/attempts", headers=h, json={"questionId": str(qid), "selected": 0})
    body = r.json()
    assert body["skipped"] is False
    assert body["correctLabel"] == "C"  # reveals the key after attempting
    prog = client.get("/api/progress/me", headers=h).json()
    assert prog["attempted"] >= 1


def test_bookmarks(client, tokens):
    h = _auth(tokens, "student")
    qid = str(tokens["question"].id)
    assert client.get("/api/bookmarks", headers=h).json() == []
    client.post("/api/bookmarks", headers=h, json={"questionId": qid})
    assert qid in client.get("/api/bookmarks", headers=h).json()
    client.delete(f"/api/bookmarks/{qid}", headers=h)
    assert client.get("/api/bookmarks", headers=h).json() == []


def test_mock_flow(client, tokens):
    h = _auth(tokens, "student")
    built = client.post("/api/mock/start", headers=h, json={"count": 2}).json()
    assert "paperId" in built and len(built["questions"]) == 2
    # student sees redacted options
    for q in built["questions"]:
        assert all("isCorrect" not in o for o in q["options"])
    answers = {}
    for q in built["questions"]:
        answers[q["id"]] = 0
    res = client.post(f"/api/mock/{built['paperId']}/submit", headers=h, json={"answers": answers}).json()
    assert res["total"] == 2 and res["answered"] == 2


def test_tos_autofill_and_analytics(client, tokens):
    qbm = _auth(tokens, "qbm")
    subtopic_id = str(tokens["question"].subtopic_id)
    tos = client.post("/api/tos", headers=qbm, json={
        "title": "Auto Blueprint", "entries": [
            {"subtopicId": subtopic_id, "qType": "MCQ", "difficulty": "Medium", "nRequired": 2},
        ],
    }).json()
    af = client.post(f"/api/tos/{tos['id']}/autofill", headers=qbm, json={}).json()
    assert af["questions"]
    paper = client.post("/api/papers", headers=qbm, json={
        "title": "Auto Paper", "tosId": tos["id"],
        "questionIds": [x["id"] for x in af["questions"]],
    }).json()
    assert paper["status"] == "draft"
    summaries = client.get("/api/analytics/papers", headers=qbm).json()["papers"]
    assert any(p["id"] == paper["id"] for p in summaries)
    detail = client.get(f"/api/analytics/papers/{paper['id']}", headers=qbm).json()
    assert detail["totalQuestions"] >= 1
    item = client.get(f"/api/analytics/items/{tokens['question'].id}", headers=qbm).json()
    assert "flags" in item and "examHistory" in item


def test_ai_critique(client, tokens):
    h = _auth(tokens, "faculty")
    r = client.post("/api/ai/critique", headers=h, json={
        "stem": "Short stem.", "options": ["a", "b", "c"], "correct": 0,
    }).json()
    assert r["verdict"] in ("sound", "minor_revision", "major_revision")
    assert "issues" in r and isinstance(r["issues"], list)


def test_diagnostics_admin_only(client, tokens):
    stud = _auth(tokens, "student")
    assert client.get("/api/diagnostics", headers=stud).status_code == 403
    adm = _auth(tokens, "admin")
    r = client.get("/api/diagnostics", headers=adm).json()
    assert r["healthy"] in (True, False)
    assert {"ok", "warn", "info", "fail"} == set(r["tally"])


def test_password_change_and_reset(client, db):
    h = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'identifier': 'student@test.itemiq', 'password': 'password'}).json()['token']}"}
    # wrong current
    r = client.post("/api/auth/password", headers=h, json={"currentPassword": "nope", "newPassword": "newpass12"})
    assert r.status_code == 400
    # correct change
    r = client.post("/api/auth/password", headers=h, json={"currentPassword": "password", "newPassword": "newpass12"})
    assert r.status_code == 200
    # login with new
    assert client.post("/api/auth/login", json={"identifier": "student@test.itemiq", "password": "newpass12"}).status_code == 200
