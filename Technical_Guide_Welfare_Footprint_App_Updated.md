# Technical Guide: Welfare Footprint App

**Date:** October 7, 2025  
**Version:** 3.0 (Lovable Platform)

---

## 1. Purpose

This document serves as a technical guide and maintenance manual for the "Welfare Footprint" application, accessible at app.welfarefootprint.org. Its goal is to explain the application's architecture, the services used, and the process for making future updates, in a way that is understandable to both technical and non-technical team members.

**Important:** This version reflects the migration from Netlify to the Lovable platform.

---

## 2. Architecture Overview

To understand the application, we can use the analogy of a pop-up store:

- **The Application (The Store)**: A React-based web application built with Vite, TypeScript, and Tailwind CSS that users interact with in their browser.
- **Source Code (The Blueprint)**: Stored in a GitHub repository connected to Lovable. This is the single source of truth and syncs bidirectionally with Lovable.
- **Hosting & Backend (The Plot of Land & Secure Back Office)**: The application is hosted on Lovable with Lovable Cloud providing the backend infrastructure. Lovable Cloud uses Supabase Edge Functions to securely handle AI requests and process images.
- **Domain (The Store's Address)**: Managed by HostGator, which points the app.welfarefootprint.org address to the application hosted on Lovable.
- **Artificial Intelligence (The Brain)**: All AI analysis is performed using Lovable AI Gateway, which provides access to multiple AI models including Google Gemini 2.5 Flash without requiring direct API key management.

---

## 3. Components and Services Used

| Service | Role | Key Details |
|---------|------|-------------|
| **Lovable** | Development Platform & Hosting | Web-based editor for building and deploying the app. Provides automatic deployment when changes are published. |
| **Lovable Cloud** | Backend Infrastructure | Built on Supabase, provides Edge Functions for secure backend logic, AI integration, and serverless compute. |
| **GitHub** | Source Code Storage | Contains the React application code, components, and backend edge functions. Automatically syncs bidirectionally with Lovable. |
| **HostGator** | Domain Manager | Manages DNS records to point the app.welfarefootprint.org address to the application hosted on Lovable. |
| **Lovable AI Gateway** | AI Processing | Secure gateway to AI models (Google Gemini 2.5 Flash). API key is automatically managed by Lovable - no manual configuration needed. |

---

## 4. How to Update the Application

### Option 1: Using Lovable (Recommended for most changes)

1. **Access Lovable**: Log in to lovable.dev and open your project
2. **Make Changes**: Use the AI chat to request changes or edit code directly in Dev Mode
3. **Preview**: Changes are immediately visible in the preview window
4. **Publish**: Click the "Publish" button in the top right to deploy updates
5. **Auto-sync**: Changes automatically sync to your GitHub repository

### Option 2: Using GitHub (For direct code editing)

1. **Clone Repository**: Clone your GitHub repository locally or edit directly on GitHub
2. **Make Changes**: Edit the relevant files (React components in `src/`, Edge Functions in `supabase/functions/`)
3. **Commit & Push**: Commit changes and push to GitHub
4. **Auto-sync**: Lovable automatically detects and syncs the changes

Both methods maintain the same codebase - choose based on your preference and the type of update.

---

## 5. Backend & AI Processing (Lovable Cloud Architecture)

This section explains the secure backend architecture using Lovable Cloud.

### API Key Handling
- **Automatic Management**: The `LOVABLE_API_KEY` is automatically provisioned and securely stored by Lovable Cloud
- **No Manual Configuration**: Unlike the previous Netlify setup, you don't need to manually add or manage API keys
- **Zero Exposure**: The key is never exposed to the user's browser - all AI requests are proxied through backend edge functions

### Secure Edge Functions
All AI processing is handled by Supabase Edge Functions running on Lovable Cloud:

1. **analyze-image** (`supabase/functions/analyze-image/index.ts`)
   - User's browser sends the product image to this function
   - Function runs securely on Lovable's backend servers
   - Automatically retrieves the `LOVABLE_API_KEY` from environment variables
   - Calls the Lovable AI Gateway (https://ai.gateway.lovable.dev) with the image
   - Uses Google Gemini 2.5 Flash model for analysis
   - Returns structured analysis back to the browser

2. **generate-text** (`supabase/functions/generate-text/index.ts`)
   - Handles text generation requests
   - Uses the same secure API key management

3. **suggest-ethical-swap** (`supabase/functions/suggest-ethical-swap/index.ts`)
   - Provides ethical product alternatives
   - Leverages AI to suggest better welfare options

### Security Features
- **CORS Protection**: All functions implement proper CORS headers
- **JWT Verification**: Can be enabled per function in `supabase/config.toml`
- **Rate Limiting**: Built-in rate limiting through Lovable AI Gateway
- **Error Handling**: Comprehensive error handling for AI model failures or rate limits

### AI Model Configuration
- **Default Model**: `google/gemini-2.5-flash` (balanced performance and cost)
- **Available Models**: 
  - `google/gemini-2.5-pro` (highest quality, slower)
  - `google/gemini-2.5-flash` (balanced - default)
  - `google/gemini-2.5-flash-lite` (fastest, most economical)
  - OpenAI GPT-5 series (if needed)

### Cost Management
- **Usage-Based Pricing**: Lovable AI charges based on requests made
- **Free Tier**: Limited free usage included monthly
- **Monitoring**: View usage in Lovable Settings → Workspace → Usage
- **Top-Up**: Add credits as needed through the Lovable dashboard

---

## 6. Domain Connection Management (DNS)

The domain configuration in HostGator needs to be updated to point to Lovable's hosting:

### Updated DNS Settings

1. **Access HostGator DNS Management**
2. **Update the CNAME Record**:
   - **Host**: `app` (for app.welfarefootprint.org)
   - **Points to**: `[your-project-name].lovable.app`
   - **TTL**: Automatic or 3600

3. **Custom Domain in Lovable**:
   - Go to Project → Settings → Domains in Lovable
   - Add `app.welfarefootprint.org` as a custom domain
   - Follow the verification steps provided by Lovable
   - **Note**: A paid Lovable plan is required for custom domain connections

### Verification
- DNS changes may take up to 48 hours to propagate
- Lovable will verify domain ownership automatically
- SSL certificates are automatically provisioned by Lovable

---

## 7. Technology Stack

The application is built using modern web technologies:

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Integration**: Lovable AI Gateway
- **Deployment**: Lovable Platform

---

## 8. Key Differences from Previous Version (Netlify)

| Aspect | Previous (Netlify) | Current (Lovable) |
|--------|-------------------|-------------------|
| **Hosting** | Netlify | Lovable |
| **Backend** | Netlify Functions | Lovable Cloud (Supabase Edge Functions) |
| **AI API** | Direct Google Gemini API | Lovable AI Gateway |
| **API Key Management** | Manual env variables | Automatic (LOVABLE_API_KEY) |
| **Code Structure** | Single HTML file | React component architecture |
| **Deployment** | GitHub push → Netlify auto-deploy | Lovable Publish or GitHub sync |
| **Domain Setup** | CNAME to Netlify | CNAME to Lovable |
| **Development** | Code editor + GitHub | Lovable editor (AI-assisted) |

---

## 9. Troubleshooting

### AI Analysis Not Working
- Check Edge Function logs in Lovable → Backend
- Verify Lovable AI is enabled (should be automatic)
- Check for rate limiting (429 errors)
- Ensure sufficient credits in Lovable workspace

### Domain Not Loading
- Verify DNS settings in HostGator point to correct Lovable URL
- Check custom domain configuration in Lovable settings
- Wait for DNS propagation (up to 48 hours)
- Verify paid Lovable plan is active for custom domains

### GitHub Sync Issues
- Ensure GitHub integration is connected in Lovable
- Check for merge conflicts if editing in both places
- Verify repository permissions

---

## 10. Maintenance Checklist

**Monthly:**
- [ ] Review AI usage and costs in Lovable dashboard
- [ ] Check application performance and errors
- [ ] Verify domain SSL certificate is valid

**As Needed:**
- [ ] Update dependencies when Lovable suggests updates
- [ ] Review and test new AI model improvements
- [ ] Monitor user feedback and make UI/UX improvements

**Important Contacts:**
- Lovable Support: support@lovable.dev
- Lovable Documentation: https://docs.lovable.dev
- Lovable Discord Community: Available through docs

---

## 11. Additional Resources

- **Lovable Documentation**: https://docs.lovable.dev
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **React Documentation**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com

---

*This guide will be updated as the application evolves. Last updated: October 7, 2025*
