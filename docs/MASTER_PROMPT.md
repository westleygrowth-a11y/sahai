# PROJECT SAH AI — Autonomous Operations Management System

You are my lead software architect, senior full-stack developer, AI engineer, and product designer.

We are building **SAH AI**, a private, AI-powered operations management system for SAH educational institutions in Faisalabad, Pakistan.

This will be a long-term software development project. We will develop it collaboratively through Codex, reviewing and refining each module before moving to the next.

Your job is to help design, build, test, and improve a working application.

**Do not attempt to build every feature immediately. Start with a functional foundation and expand incrementally.**

## 1. Project vision

SAH AI is an autonomous AI Operations Manager that supervises the execution of work across the institution.

It must be able to:

- Manage a hierarchical organizational structure.
- Allow management to assign tasks through the chain of command.
- Allow authorized employees to delegate tasks to subordinates.
- Track responsibilities, deadlines, and progress.
- Automatically request updates from staff.
- Understand employee responses and identify blockers.
- Escalate overdue work through the appropriate hierarchy.
- Verify task submissions against completion requirements.
- Generate executive briefings.
- Eventually integrate biometric attendance, maintenance management, and other institutional workflows.

The central principle is:

**Management assigns outcomes. Department heads delegate responsibilities. Employees execute. AI coordinates, follows up, verifies, and escalates.**

The AI must assist management without replacing authorized human decision-making.

---

## 2. SAH organizational structure

The following hierarchy has been confirmed.

### Level 1 — CEO

The Chief Executive Officer is the highest authority in the system.

The CEO must be able to:
- See all organizations, departments, employees, and tasks.
- Assign tasks to directors.
- Assign tasks directly to department heads.
- Assign tasks directly to employees.
- Monitor task progress across the organization.
- Review escalated issues.
- Approve or reject submissions.
- Delegate assignments without changing employees' formal reporting relationships.

### Level 2 — Directors

There are two directors:

**Finance Director**
- Oversees Accounts Department.
- Assigns and monitors financial and accounts-related tasks.
- Reviews work submitted through the finance division.

**Operations Director**
- Oversees Academic Department.
- Oversees HR & Administration.
- Oversees Admissions Department.
- Oversees IT Department.
- Coordinates day-to-day operational activities.

Both directors report to the CEO.

### Level 3 — Department Heads

Under the Finance Director:
- Accounts Head

Under the Operations Director:
- Academic Department Head
- HR & Administration Head
- Admissions Head
- IT Head

Important: Principals are classified as Academic Department Heads. Do not create a separate Principal management level.

### Level 4 — Supervisors and Subdepartments

Maintenance Department operates under HR & Administration.

Example hierarchy:

CEO → Operations Director → HR & Administration Head → Maintenance Supervisor → Maintenance Technicians.

Other departments may also have supervisors and subordinate teams.

### Level 5 — Employees

Employees execute assigned tasks and can further delegate only when authorized.

The organizational hierarchy must be configurable through the admin interface rather than permanently hard-coded.

Support multiple SAH institutions and campuses within the same platform.

---

## 3. Chain-of-command delegation engine

This is the most important feature of the system.

Users must be able to assign tasks according to their permissions.

Example:

The CEO assigns the Operations Director:

"Ensure all classrooms and laboratories are prepared for inspection by November 10."

The Operations Director delegates:
- Academic readiness to Academic Head.
- Facility readiness to HR & Administration.
- IT readiness to IT Head.

The HR & Administration Head then delegates facility work to the Maintenance Supervisor.

The Maintenance Supervisor assigns individual jobs to technicians.

Every assignment must preserve the original task hierarchy.

### Task relationships

A task must contain:
- Unique task ID
- Parent task ID, if applicable
- Root task ID
- Task title
- Detailed instructions
- Originating assigner
- Accountable owner
- Assigned executor
- Reporting manager
- Institution
- Department
- Priority
- Creation date
- Due date and time
- Current status
- Required evidence
- Comments and updates
- Approval requirements
- Activity history

### Delegation principles

1. A manager can delegate within their authorized reporting structure.
2. Delegating a task does not remove accountability from the original owner.
3. The CEO may assign directly to any employee.
4. Direct CEO assignment does not change the employee's reporting relationship.
5. Department directors retain visibility over work within their divisions.
6. Subtask deadlines cannot exceed the parent deadline without authorized approval.
7. Cross-department assignments require appropriate permissions or manager coordination.
8. Completion of a subtask does not automatically close its parent task.
9. Parent task completion must consider all mandatory subtasks.
10. All reassignment and delegation activity must be auditable.

Support nested delegation with no arbitrary fixed depth, while preventing circular task relationships.

---

## 4. AI follow-up and accountability engine

Create a proactive AI assistant responsible for monitoring open work.

The system should automatically:

- Identify approaching deadlines.
- Request progress updates.
- Detect overdue assignments.
- Recognize reported blockers.
- Ask for missing information.
- Draft reminders.
- Alert responsible managers when needed.
- Escalate significant unresolved delays.
- Prepare consolidated task summaries.

### Example workflow

Monday:
A department head assigns a task due Friday.

Wednesday:
AI requests a progress update according to the configured reminder policy.

Employee replies:
"I cannot finish because Accounts hasn't sent the required information."

AI identifies a dependency and proposes a related task or follow-up with Accounts.

Thursday:
AI checks whether the dependency has been resolved.

Friday:
Employee submits work.

AI checks the submission against required evidence.

The authorized manager reviews and approves the completed task.

### Escalation rules

Default escalation path:

Employee → Supervisor → Department Head → Relevant Director → CEO.

Escalation must respect the actual reporting hierarchy.

For a task assigned directly by the CEO, the CEO remains the task requester and may receive direct completion notifications. Intermediate managers retain appropriate visibility.

Avoid excessive notifications.

Support:
- Working hours
- Reminder limits
- Quiet hours
- Escalation intervals
- Task priority
- Holidays and weekends
- Configurable notification policies

Use deterministic background jobs for deadlines and scheduling.

Use AI to understand responses and prepare communications.

Do not rely on an LLM to run timers or enforce permissions.

---

## 5. Roles and permissions

Implement secure role-based and reporting-line-based access control.

Roles:
- CEO
- Finance Director
- Operations Director
- Department Head
- Supervisor
- Employee
- System Administrator

System administration privileges must be separate from organizational management authority.

Users should only see information appropriate to their role and reporting relationships.

The CEO has full organizational oversight.

Sensitive HR and finance records must have additional access restrictions.

Every permission must be enforced server-side, not merely hidden in the frontend.

---

## 6. Task lifecycle

Implement the following task statuses:

- Draft
- Assigned
- Acknowledged
- In Progress
- Blocked
- Submitted for Review
- Changes Requested
- Completed
- Cancelled

Employees must be able to:
- Acknowledge assignments.
- Post progress updates.
- Report blockers.
- Upload evidence.
- Request deadline extensions.
- Submit work for review.

Managers must be able to:
- Delegate tasks.
- Create subtasks.
- Review progress.
- Request corrections.
- Approve completion.
- Reassign authorized tasks.
- Escalate issues.

Preserve all previous task updates and status changes in an immutable activity history.

---

## 7. Executive command center

Create a premium dark-mode executive interface.

Dashboard metrics:
- Total active tasks
- Pending assignments
- Overdue tasks
- Blocked tasks
- Awaiting approvals
- Tasks completed this week
- Department workload
- Escalations requiring attention
- Staff attendance summary, when integrated

Create separate dashboards for:
- CEO
- Directors
- Department Heads
- Employees

### CEO dashboard

The CEO should see:
- Organization-wide performance
- Finance and Operations divisions
- At-risk projects
- Important escalations
- Pending approvals
- Progress of directly assigned tasks
- AI-generated executive briefings

### Director dashboard

Each director should see:
- Department performance within their division
- Delegated assignments
- Subtask progress
- Department-head updates
- Overdue work
- Pending approvals

### Department Head dashboard

Show:
- Tasks assigned to the head
- Tasks delegated to their team
- Blockers
- Deadlines
- Staff updates
- Department-level performance

### Employee dashboard

Show:
- Assigned tasks
- Priorities
- Due dates
- Progress updates
- Evidence uploads
- Messages
- Submission status

---

## 8. AI management assistant

Provide a conversational AI interface.

Example instructions:

"Assign the Academic Head to prepare the faculty timetable by Friday."

"Which departments have overdue tasks?"

"What work is the HR Head waiting on?"

"Summarize all inspection-related assignments."

"Ask the Maintenance Supervisor for an update."

"Which assignments require the CEO's approval?"

The AI should convert natural-language instructions into structured proposed actions.

Before creating assignments or sending external communications, enforce authorization and configured approval rules.

Use the OpenAI API with structured tool calling.

The AI must not:
- Bypass the chain of command.
- Fabricate employee progress.
- Invent completed work.
- Approve its own sensitive actions.
- Expose restricted information.
- Automatically impose disciplinary action.

All AI actions must have an audit trail.

---

## 9. Staff communication

Create a centralized notification and messaging system.

Initial functionality:
- In-app notifications
- Internal task comments
- Update requests
- Reminders
- Escalation messages

Future integrations:
- WhatsApp Business API
- Email
- Mobile push notifications

Employees should be able to respond naturally, while the official task history remains stored in SAH AI.

Use simulated notifications during initial development.

Do not send real employee messages before communication channels are configured and authorized.

---

## 10. ZKTeco attendance integration

SAH already uses ZKTeco biometric attendance equipment.

The exact model and available API have not yet been confirmed.

Design a modular attendance integration with:
- Employee-to-device ID mapping
- Shift schedules
- Check-in and check-out events
- Late arrival detection
- Missing punch detection
- Leave and holiday records
- Attendance exceptions
- Attendance reports

Support compatible vendor software APIs, device protocols, secure local connectors, and CSV imports as applicable.

Initially implement a mock integration.

Do not assume every ZKTeco device exposes the same API.

Do not collect biometric templates or fingerprint data.

Attendance exceptions must not automatically trigger disciplinary decisions.

---

## 11. Campus maintenance management

Design this as a module under HR & Administration.

Implement:
- Campus and building records
- Rooms
- Assets
- Maintenance requests
- Work orders
- Technician assignment
- Preventive maintenance schedules
- Repair history
- Evidence uploads
- Completion verification

Support QR codes for assets and rooms.

Example:

A classroom teacher reports an AC fault.

The system creates a ticket, routes it through HR & Administration, assigns an authorized technician, tracks progress, and verifies completion.

Maintenance-related financial approvals must follow the appropriate authorization policy.

Build this module after the core task-delegation engine is functional.

---

## 12. Technical stack

Use:

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- Next.js server APIs or a clearly justified separate API layer

Database:
- PostgreSQL
- Prisma ORM

Authentication:
- Secure session-based authentication
- Role and reporting-line permissions

AI:
- OpenAI API
- Structured Outputs
- Server-side tool execution

Background processing:
- Persistent job queue
- Reliable scheduling
- Retries and idempotent jobs

Development:
- Docker Compose
- Environment variables
- Local development support on macOS

Testing:
- Unit tests
- Permission tests
- Workflow tests
- Integration tests

Use established maintained libraries where practical.

Avoid unnecessary microservices in the initial version.

---

## 13. Database design

Design a normalized database schema supporting:

- Institutions
- Campuses
- Departments
- Department hierarchy
- Employees
- Reporting relationships
- Roles
- Permissions
- Tasks
- Task delegation
- Subtasks
- Task dependencies
- Task updates
- Comments
- Attachments
- Approvals
- Notifications
- Escalation events
- AI actions
- Attendance records
- Maintenance assets
- Maintenance tickets
- Audit logs

Use appropriate indexes, constraints, migrations, and transactional updates.

Preserve a clear distinction between organizational reporting relationships and assignment-specific accountability.

---

## 14. User interface

Build a professional, premium SaaS-style application.

Design:
- Dark navy and charcoal
- Clean typography
- Restrained blue accent colors
- Professional executive aesthetics
- Responsive layout
- Sidebar navigation
- Clear hierarchy visualization
- Task tree views
- Kanban and list views
- AI assistant panel
- Notification center
- Executive reports

Avoid unnecessary visual clutter.

The system must feel like a real enterprise management platform, not a generic school management template.

---

## 15. First development milestone

Build the first working version with:

1. Authentication and initial CEO setup.
2. Configurable SAH organizational hierarchy.
3. Finance Director and Operations Director.
4. Department and employee records.
5. Role-based access permissions.
6. Task creation.
7. Nested delegation and subtasks.
8. Task status updates.
9. Deadline management.
10. Task activity history.
11. CEO dashboard.
12. Director dashboards.
13. Department Head dashboard.
14. Basic notification system.
15. Rules-based follow-up and escalation simulation.
16. Clearly labeled demonstration data.

Prioritize these features before implementing real biometric or messaging integrations.

Use a mock AI service if an API key is unavailable, but do not pretend it is real AI.

---

## 16. Quality requirements

The application must:
- Persist data correctly.
- Enforce permissions server-side.
- Handle invalid task delegation.
- Prevent circular task hierarchies.
- Track accountability across delegation levels.
- Preserve task history.
- Support timezone Asia/Karachi.
- Correctly handle deadlines and weekends.
- Distinguish real and simulated actions.
- Work on desktop and mobile.

Write tests for delegation, visibility, permissions, task status transitions, and escalation.

---

## 17. Development process

This is a collaborative, iterative project.

First:
1. Inspect the repository.
2. Identify any existing code.
3. Present a concise architecture and database outline.
4. List assumptions that require future confirmation.
5. Implement the initial foundation.

Do not stop after writing a plan.

Create actual source code, database migrations, API routes, frontend pages, seed data, and tests.

Run available checks and fix errors.

At the end of the first milestone, explain:
- What has been built.
- What works.
- What is simulated.
- How to run the project.
- What we should build next.

We will make future design decisions through conversation in Codex.

Start building SAH AI now.