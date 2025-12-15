# AG_RULES.md

This file defines the Rules of Engagement for the "SmartGallery" project.The following rules must be strictly adhered to for optimal performance, cost control, and context management:

        
- **Rule 1 (Transparency):** Always explain your plan before writing code. Use "Artifacts" for plans, not just chat.
- **Rule 2 (Modularity):** Backend and Frontend must be separate directories (`/backend`, `/frontend`).
- **Rule 3 (Security):** Never hardcode API keys. Use `.env` for local and GCP Secret Manager for prod.
- **Rule 4 (Testing):** Every major function must have a corresponding unit test.
- **Rule 5 (Deployment):** All code must be Dockerized. Deployment target is GCP Cloud Run.
- **Rule 6 (File Filtering):** DO NOT read or index any files, logs, or subdirectories found within the following folders: `node_modules`, `.git`, `dist/`, `build/`, `google-cloud-sdk` or`vendor/`.
- **Rule 8 (Dependency Context):** The list of project dependencies should be determined ONLY by reading the content of the `package.json` or equivalent manifest file (e.g., `requirements.txt`). Do not read dependency source code.
- **Rule 9 (Command Output):** If you execute any command in the terminal, you MUST use the most verbose suppression flags available (e.g., `--quiet`, `-q`, `--silent`, `-y`) to minimize output logs.
- **Rule 10 (Tool Installation):** If you need to install system tools (like SDKs or CLIs), always install them to the usaer's home directory (~/) or the system temp directory. Never install tools into the current project repository root.