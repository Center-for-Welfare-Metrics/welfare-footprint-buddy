# Documentation Index

This directory contains all technical documentation for the Welfare Footprint App.

## Available Documentation

### 📋 Core Documentation

- **[Architecture Overview](./architecture_overview.md)** - High-level system architecture, data flow, and component structure
- **[AI Handler Proposal](./ai-handler-proposal.md)** - Planned model-agnostic AI abstraction layer

### 📚 Planned Documentation

The following documentation files are recommended for future creation:

#### API Documentation
- **`api_endpoints.md`** - Complete reference for all Edge Functions
  - Function signatures
  - Request/response schemas
  - Error codes and handling
  - Usage examples with curl/JavaScript

#### Component Documentation  
- **`component_guide.md`** - Detailed guide for all React components
  - Props interfaces
  - State management patterns
  - Usage examples
  - Component dependencies

#### Development Guides
- **`setup_guide.md`** - Local development environment setup
  - Prerequisites
  - Installation steps
  - Environment variables
  - Running locally

- **`deployment_guide.md`** - Production deployment process
  - Build configuration
  - Environment setup
  - CI/CD pipeline
  - Rollback procedures

#### Testing & Quality
- **`testing_guide.md`** - Testing strategy and practices
  - Unit test examples
  - Integration testing
  - E2E testing with Playwright
  - Test coverage goals

- **`code_style_guide.md`** - Coding standards and conventions
  - TypeScript patterns
  - React best practices
  - Naming conventions
  - File organization

#### User-Facing Documentation
- **`user_manual.md`** - End-user guide
  - Feature walkthroughs
  - FAQ
  - Troubleshooting
  - Privacy policy

#### Data & Database
- **`database_schema.md`** - Database design documentation
  - ERD diagrams
  - Table descriptions
  - RLS policies
  - Migration history

---

## Documentation Standards

### File Format
- Use Markdown (`.md`) for all documentation
- Include a "Last Updated" date at the top
- Use clear section headers with anchor links
- Add code examples in fenced code blocks with syntax highlighting

### Structure
Each documentation file should include:
1. **Title and metadata** (last updated, version)
2. **Table of contents** (for longer docs)
3. **Overview/Purpose** section
4. **Main content** with clear sections
5. **Related documentation** links
6. **Changelog** (if applicable)

### Maintenance
- Update documentation when making architectural changes
- Review quarterly for accuracy
- Archive outdated documentation in `/docs/archive/`

---

## Contributing to Documentation

When adding new features or making significant changes:

1. **Update existing docs** - Don't let documentation drift from reality
2. **Add examples** - Code snippets, screenshots, diagrams
3. **Link between docs** - Create a web of related information
4. **Keep it concise** - Respect the reader's time
5. **Use diagrams** - Mermaid, ASCII art, or images for complex concepts

---

**Questions?** Contact the development team or open an issue.
