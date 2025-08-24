# Security Guidelines

## Development Security

### Environment Variables
All sensitive data must be stored in environment variables, never hardcoded in source code.

**Frontend (.env.local):**
```bash
# Demo passwords for local development only
DEMO_PASSWORD=your_secure_demo_password
ADMIN_PASSWORD=your_secure_admin_password
```

**Backend (.env):**
```bash
# Database credentials
DATABASE_URL=postgresql://user:password@localhost/db
SECRET_KEY=your-secret-key-here
```

### Mock Data Security
- All mock passwords and tokens are for development only
- Production deployments must use proper authentication systems
- Test files use placeholder passwords, not real credentials

### Git Security
- Never commit sensitive data to version control
- Use .gitignore to exclude .env files
- Review all commits for exposed secrets before pushing

### Production Deployment
- All demo/mock authentication must be disabled
- Use proper password hashing (bcrypt, argon2)
- Implement proper JWT token management
- Enable all security headers and CSRF protection

## Reporting Security Issues

If you discover a security vulnerability, please email security@dreflowpro.com instead of creating a public issue.