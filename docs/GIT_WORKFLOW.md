# Git Workflow — Academic Compass / Algomate

## Remote Setup

| Remote | Repository | Purpose |
|--------|-----------|---------|
| `origin` | https://github.com/Paritosh0404/Algomate.git | Production (Vercel deployment) |
| `dev` | https://github.com/08Ayush/academic_campass_2025.git | Development |

---

## First-Time Setup (New Developer)

Clone the development repo and add the production remote:

```bash
git clone https://github.com/08Ayush/academic_campass_2025.git
cd academic_campass_2025

git remote add origin https://github.com/Paritosh0404/Algomate.git
```

Verify remotes:

```bash
git remote -v
```

Expected output:
```
dev     https://github.com/08Ayush/academic_campass_2025.git (fetch)
dev     https://github.com/08Ayush/academic_campass_2025.git (push)
origin  https://github.com/Paritosh0404/Algomate.git (fetch)
origin  https://github.com/Paritosh0404/Algomate.git (push)
```

> **Note:** After cloning from `dev`, the default remote will be named `origin`. Rename it to `dev` and add the production remote as `origin`:
> ```bash
> git remote rename origin dev
> git remote add origin https://github.com/Paritosh0404/Algomate.git
> ```

---

## Daily Development Workflow

### 1. Switch to the working branch
```bash
git checkout latest
```

### 2. Pull latest changes before starting work
```bash
git pull dev latest
```

### 3. Make your changes, then stage and commit
```bash
git add .
git commit -m "your commit message"
```

### 4. Push to development repo
```bash
git push dev latest
```

---

## Deploying to Production (Vercel)

Push your `latest` branch into the `main` branch of the production repo:

```bash
git push origin latest:main
```

### Push to both at once
```bash
git push dev latest ; git push origin latest:main
```

---

## Branch Overview

| Branch | Purpose |
|--------|---------|
| `latest` | Main working branch for all development |
| `main` (origin/Algomate) | Production branch — deployed via Vercel |

---

## Useful Commands

| Task | Command |
|------|---------|
| Check current branch | `git branch` |
| See all branches (local + remote) | `git branch -a` |
| Check uncommitted changes | `git status` |
| Check remote URLs | `git remote -v` |
| View commit history | `git log --oneline` |
| Discard uncommitted changes | `git checkout -- .` |
| Remove stale remote branches | `git remote prune origin` |

---

## Handling Push Rejection (Force Push)

If the production remote rejects your push due to diverged history:

```bash
git push origin latest:main --force
```

> **Warning:** This overwrites the remote. Only use when you are sure your local code is the source of truth.
