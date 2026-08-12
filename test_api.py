from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("--- 1. QBM CREATES A QUESTION REQUEST ---")
req_response = client.post("/api/questions/requests", json={
    "topic_id": 1,
    "assigned_to": 2 # Faculty Dr. Smith
})
print(f"Status: {req_response.status_code}")
print(f"Response: {req_response.json()}\n")
req_id = req_response.json()["id"]

print("--- 2. FACULTY SUBMITS A PDF WITH REFERENCES ---")
sub_response = client.post("/api/questions/submissions", json={
    "request_id": req_id,
    "pdf_path": "/home/syedfaraz/Projects/Workhseet-Generator/9702_w25_qp_13.pdf",
    "references": "Bailey & Love's Short Practice of Surgery, 27th Ed, Ch 73"
})
print(f"Status: {sub_response.status_code}")
print(f"Response: {sub_response.json()}\n")
sub_id = sub_response.json()["id"]

print("--- 3. SME REVIEWS THE SUBMISSION ---")
rev_response = client.post(f"/api/questions/submissions/{sub_id}/review", json={
    "comment": "Looks clinically accurate.",
    "decision": "APPROVED"
})
print(f"Status: {rev_response.status_code}")
print(f"Response: {rev_response.json()}\n")

print("--- 4. QBM REVIEWS THE SUBMISSION (TRIGGERS ALGORITHM) ---")
final_rev_response = client.post(f"/api/questions/submissions/{sub_id}/review", json={
    "comment": "Formatting is perfect. Approving for extraction.",
    "decision": "APPROVED"
})
print(f"Status: {final_rev_response.status_code}")
print(f"Response: {final_rev_response.json()}\n")

print("--- 5. CHECKING PDF SUBMISSION STATUS ---")
get_sub = client.get("/api/questions/submissions")
print(f"Status: {get_sub.status_code}")
print(f"Response: {get_sub.json()}\n")
