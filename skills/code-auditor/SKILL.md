---
name: code-auditor
description: Verifies code quality against project standards (Tests, Types, Linting).
---

# Code Auditor

This skill allows you to verify the quality of the codebase and fix common issues.
It enforces the standards defined in `conductor/workflow.md`.

## Capabilities

### 1. Audit Code Quality
Run the full suite of checks (TypeScript, Prettier, Tests).

**Command:**
```bash
./skills/code-auditor/audit.sh
```

### 2. Fix Formatting
Automatically fix formatting issues using Prettier.

**Command:**
```bash
./skills/code-auditor/fix.sh
```

## Best Practices Reference

The project follows strict guidelines. Refer to `conductor/workflow.md` for details on:
- Test Coverage (>80%)
- Code Style
- Commit Guidelines

If you encounter errors, analyze the output of `audit.sh` and suggest or apply fixes.
