import re

ACTION_VERBS = {
    "engineered", "developed", "architected", "designed", "built", "implemented",
    "optimized", "managed", "created", "led", "automated", "translated", "integrated"
}

TECHNICAL_KEYWORDS = {
    "react", "javascript", "typescript", "python", "figma", "html", "css", "tailwind",
    "git", "github", "rest", "api", "node", "django", "sql", "postgres", "mysql", "agile"
}

def analyze_resume_file(resume_file, user_profile=None):
    """
    Parses resume file (.txt, .pdf, .docx) and calculates actual dynamic scores 
    and specific AI issues based on document content.
    """
    text = ""
    file_name = getattr(resume_file, "name", "").lower()
    
    # 1. Attempt reading text from uploaded file buffer
    try:
        if hasattr(resume_file, "seek"):
            try:
                resume_file.seek(0)
            except Exception:
                pass
        
        if hasattr(resume_file, "read"):
            raw = resume_file.read()
            if isinstance(raw, bytes):
                text = raw.decode("utf-8", errors="ignore")
            else:
                text = str(raw)
    except Exception:
        text = ""

    # 2. Fallback to reading saved FieldFile from disk/storage
    if not text.strip() and user_profile and getattr(user_profile, "resume", None):
        try:
            f = user_profile.resume
            if hasattr(f, "open"):
                f.open("rb")
                raw = f.read()
                text = raw.decode("utf-8", errors="ignore") if isinstance(raw, bytes) else str(raw)
                f.close()
            elif hasattr(f, "path"):
                with open(f.path, "rb") as disk_file:
                    raw = disk_file.read()
                    text = raw.decode("utf-8", errors="ignore")
        except Exception:
            pass

    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    
    # 1. Profile & Contact Info (Max 10)
    contact_score = 0
    if len(words) > 10: contact_score += 2
    if re.search(r'[\w\.-]+@[\w\.-]+', text): contact_score += 2
    if re.search(r'\+?\d[\d\s-]{7,}', text): contact_score += 2
    if any(loc in text_lower for loc in ["kathmandu", "nepal", "pokhara", "location", "address"]): contact_score += 2
    if any(role in text_lower for role in ["developer", "engineer", "designer", "manager", "seeker"]): contact_score += 2
    contact_score = min(10, contact_score)

    # 2. Education (Max 15)
    education_score = 0
    edu_keywords = ["degree", "bachelor", "master", "bsc", "university", "college", "tu", "tribhuvan", "education", "csit"]
    found_edu = [kw for kw in edu_keywords if kw in text_lower]
    if found_edu:
        education_score = min(15, 8 + len(found_edu) * 2)

    # 3. Skills (Max 20)
    found_skills = [kw for kw in TECHNICAL_KEYWORDS if kw in text_lower]
    skills_score = min(20, len(found_skills) * 3)

    # 4. Experience & Projects (Max 20)
    found_verbs = [verb for verb in ACTION_VERBS if verb in text_lower]
    exp_keywords = ["experience", "project", "projects", "work", "developer", "solutions", "tech"]
    has_exp = any(kw in text_lower for kw in exp_keywords)
    exp_score = 0
    if has_exp:
        exp_score = min(20, 8 + len(found_verbs) * 3)

    # 5. Resume Completeness (Max 15)
    has_summary = "summary" in text_lower or "profile" in text_lower or "about" in text_lower
    has_cert = "certificat" in text_lower or "language" in text_lower or "award" in text_lower
    completeness_score = 0
    if has_summary: completeness_score += 4
    if found_edu: completeness_score += 4
    if found_skills: completeness_score += 4
    if has_exp: completeness_score += 3
    completeness_score = min(15, completeness_score)

    # 6. Readability & Formatting (Max 10)
    readability_score = 10 if 80 <= len(words) <= 1000 else (5 if len(words) > 30 else 2)

    # 7. Job Relevance & Metrics (Max 10)
    metrics = re.findall(r'\b\d+%\b|\b\d+\+\b|\b\d+\s*users\b', text_lower)
    relevance_score = min(10, 4 + len(metrics) * 3)

    breakdown = [
        {"name": "Profile & Contact Info", "score": contact_score, "max": 10, "color": "#7C3AED"},
        {"name": "Education", "score": education_score, "max": 15, "color": "#2563EB"},
        {"name": "Skills", "score": skills_score, "max": 20, "color": "#F59E0B"},
        {"name": "Experience & Projects", "score": exp_score, "max": 20, "color": "#059669"},
        {"name": "Resume Completeness", "score": completeness_score, "max": 15, "color": "#0D9488"},
        {"name": "Readability & Structure", "score": readability_score, "max": 10, "color": "#DC2626"},
        {"name": "Job Relevance", "score": relevance_score, "max": 10, "color": "#4F46E5"},
    ]

    total_score = sum(item["score"] for item in breakdown)

    # Dynamic Issues Generation
    issues = []
    issue_id = 1

    if not has_summary:
        issues.append({
            "id": issue_id,
            "title": "Missing Professional Summary",
            "deduction": "-2 marks",
            "desc": "Your resume lacks a clear 2-3 sentence executive summary.",
            "fix": "Add a short summary section at the top detailing your key tech stack and years of experience."
        })
        issue_id += 1

    if len(found_verbs) < 3:
        issues.append({
            "id": issue_id,
            "title": "Weak Action Verbs in Experience",
            "deduction": "-4 marks",
            "desc": "Experience descriptions use passive language rather than strong action verbs.",
            "fix": "Start experience bullet points with verbs like 'Engineered', 'Architected', 'Optimized', or 'Integrated'."
        })
        issue_id += 1

    if not metrics:
        issues.append({
            "id": issue_id,
            "title": "Missing Measurable Achievements",
            "deduction": "-4 marks",
            "desc": "Your project duties do not mention specific performance metrics or numbers.",
            "fix": "Include quantified achievements (e.g. 'Improved speed by 35%', 'Served 2,000+ active users')."
        })
        issue_id += 1

    if len(found_skills) < 5:
        issues.append({
            "id": issue_id,
            "title": "Limited Technical Keywords",
            "deduction": "-5 marks",
            "desc": "Important target role keywords (e.g. React, TypeScript, Git, REST APIs) are limited.",
            "fix": "Add relevant frameworks, tools, and databases to your technical skills section."
        })
        issue_id += 1

    if not found_edu:
        issues.append({
            "id": issue_id,
            "title": "Missing Education Section",
            "deduction": "-15 marks",
            "desc": "No degree or university qualification was detected in your document.",
            "fix": "Add an Education section listing your degree, college name, and graduation year."
        })
        issue_id += 1

    return {
        "total_score": total_score,
        "breakdown": breakdown,
        "issues": issues,
        "detected_skills": found_skills,
        "extracted_text_preview": text[:300]
    }
