# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/15cbf44a-67cf-4c6e-a781-1f914827aacc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/15cbf44a-67cf-4c6e-a781-1f914827aacc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/15cbf44a-67cf-4c6e-a781-1f914827aacc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 📘 Documentation Index

For detailed technical documentation, see the `/docs` folder:

| Document | Description |
|----------|-------------|
| [Analytics Overview](docs/analytics_overview.md) | Event tracking system – what's tracked, how it works, and how to add new events |
| [Admin Dashboard](docs/admin_dashboard.md) | How to access and use the analytics panel, including admin role setup |
| [Quota and Rate Limits](docs/quota_and_rate_limits.md) | Monthly quotas, hourly rate limits, and enforcement logic |
| [Architecture Overview](docs/architecture_overview.md) | High-level system architecture and component relationships |
| [Privacy & Data Flow](docs/privacy_data_flow.md) | Data handling, privacy protections, and user data management |
| [Testing Guide](docs/testing_guide.md) | How to test the application and its components |

### Quick Links for Developers

- **Add a new analytics event:** See [How to Add New Event Types](docs/analytics_overview.md#how-to-add-new-event-types)
- **Grant admin access:** See [How to Promote a User to Admin](docs/admin_dashboard.md#how-to-promote-a-user-to-admin)
- **Modify quotas:** See [Developer Guidelines](docs/quota_and_rate_limits.md#developer-guidelines)
