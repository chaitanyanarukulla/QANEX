# QANexus User Manual

Welcome to **QANexus**, your all-in-one platform for managing software quality. This manual will help you navigate the system, manage your projects, and leverage AI to deliver better software faster.

---

## 1. Introduction

QANexus is designed for Product Managers, QA Engineers, and Developers to collaborate on software delivery. It helps you:
- **Write better requirements** with AI feedback.
- **Manage testing** efficiently.
- **Track bugs** and prioritize them automatically.
- **Decide when to release** using data, not guesses.

---

## 2. Getting Started

### Accessing the Application
Navigate to the URL provided by your administrator (e.g., `http://localhost:3000` or your company's domain).

### Logging In
1. Enter your **Email** and **Password**.
2. Click **Login**.
3. If you don't have an account, contact your administrator to be added to a tenant.

### The Dashboard
Upon login, you will see the **Dashboard**, which gives you a high-level view of your project's health:
- **Recent Activity**: detailed log of what your team has been working on.
- **Release Confidence**: A score (0-100%) indicating how ready your software is for release.
- **Quick Actions**: Shortcuts to create requirements, test cases, or bugs.

---

## 3. Main Features & Guides

### 3.1 Requirements Hub
The Requirements Hub is where you define what needs to be built.

**How to Create a Requirement:**
1. Navigate to **Requirements** in the sidebar.
2. Click **+ New Requirement**.
3. Enter a **Title** (e.g., "User Login Page").
4. Write the description in the editor.
5. Click **Analyze with AI**. The system will score your requirement and suggest improvements (e.g., "Clarify what happens if the password is wrong").
6. Click **Save**.

### 3.2 Test Management
Ensure your features work as expected.

**Creating Test Cases:**
1. Go to **Test Cases**.
2. Click **+ Create Test Case**.
3. Fill in the details:
   - **Title**: Brief summary of the test.
   - **Steps**: Step-by-step instructions.
   - **Expected Result**: What should happen.
   - **Priority**: High, Medium, or Low.
4. **Link Requirement**: Associate this test with a specific requirement to track coverage.

**Running Tests:**
1. Go to **Test Runs**.
2. Create a new "Run" (e.g., "Regression Testing - v1.2").
3. Add test cases to the run.
4. Execute each test and mark it as **Pass**, **Fail**, or **Blocked**.

### 3.3 Bug Tracking
When things go wrong, track them here.

**Reporting a Bug:**
1. Navigate to **Bugs**.
2. Click **Report Bug**.
3. Enter a title and description.
4. **AI Triage**: The system will automatically suggest a **Severity** and **Priority** based on your description.
5. Assign it to a developer and set the status to **Open**.

### 3.4 Release Governance
Decide when to ship.

**Checking Release Readiness:**
1. Go to **Releases**.
2. Select the version you are planning to deploy.
3. Review the **Release Confidence Score (RCS)**.
   - **Green (>80%)**: Good to go.
   - **Yellow (50-80%)**: Proceed with caution.
   - **Red (<50%)**: High risk – review failing tests or critical bugs.

---

## 4. Tips & Best Practices

- **Use AI Frequently**: Run the AI analysis on every requirement. It catches edge cases you might miss.
- **Link Everything**: Always link Bugs to Test Cases, and Test Cases to Requirements. This builds the "traceability" that powers the Release Confidence Score.
- **Keep it Clean**: Archive old test runs and closed bugs to keep your views uncluttered.

---

## 5. Troubleshooting & FAQ

**Q: Why is my Release Confidence Score so low?**
A: This usually happens if you have strictly "High" severity open bugs or a large number of failing test cases linked to the release.

**Q: I cannot see the "Analyze" button for requirements.**
A: Ensure your administrator has configured an AI Provider (OpenAI, Gemini, etc.) in the tenant settings.

**Q: I forgot my password.**
A: Please contact your system administrator to reset your credentials.

**Error: "API Connection Failed"**
- Check your internet connection.
- If the problem persists, the backend server might be down. Contact IT support.

---

*Need more help? Contact your internal QANexus administrator.*
