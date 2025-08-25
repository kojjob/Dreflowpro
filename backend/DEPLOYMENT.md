# DReflowPro ETL Platform - Production Deployment Guide

This guide covers deploying the DReflowPro ETL Platform to production using Docker containers.

## Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- A server with at least 4GB RAM and 2 CPU cores
- A domain name pointing to your server
- SSL certificates (handled automatically via Let's Encrypt)

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd backend
   cp .env.example .env
   ```

2. **Configure Environment**
   ```bash
   # Edit .env file with your production values
   nano .env
   
   # Generate secure secret keys
   python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
   python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
   ```

3. **Deploy**
   ```bash
   # Build and start all services
   docker-compose up -d
   
   # Check service status
   docker-compose ps
   
   # View logs
   docker-compose logs -f app
   ```

4. **Setup SSL Certificate**
   ```bash
   # Initial certificate generation
   docker-compose exec certbot certonly \
     --webroot -w /var/www/certbot \
     --email admin@yourdomain.com \
     -d yourdomain.com \
     -d www.yourdomain.com \
     --agree-tos
   
   # Reload Nginx with SSL
   docker-compose restart nginx
   ```

## Environment Configuration

### Required Environment Variables

```bash
# Application
APP_ENV=production
SECRET_KEY=your-super-secret-key-min-32-characters
JWT_SECRET_KEY=your-jwt-secret-key-different-from-above
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# Database
POSTGRES_PASSWORD=your-super-secure-database-password
REDIS_PASSWORD=your-redis-password

# Monitoring
GRAFANA_PASSWORD=your-grafana-admin-password
```

### Optional Configuration

```bash
# OAuth Providers (if using social login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
```

## Docker Services

The deployment includes the following services:

### Core Application Services

- **app**: FastAPI application server
- **postgres**: PostgreSQL 16 database
- **redis**: Redis cache and session store
- **nginx**: Reverse proxy with SSL termination

### Monitoring Services

- **prometheus**: Metrics collection and monitoring
- **grafana**: Visualization dashboards and alerts
- **certbot**: SSL certificate management

## Service Configuration

### Application Service (app)

```yaml
# Resource limits
memory: 1GB
cpus: 0.5

# Health check
/health endpoint every 30s

# Volumes
- app_uploads:/app/uploads (file storage)
- app_logs:/app/logs (application logs)
```

### Database Service (postgres)

```yaml
# Resource limits
memory: 1GB  
cpus: 0.5

# Backup strategy
- Persistent volume: postgres_data
- Initialization script: database/init.sql
- Optimized for production workloads
```

### Cache Service (redis)

```yaml
# Configuration
- Memory limit: 512MB
- Persistence: RDB + AOF
- LRU eviction policy
- Password protected
```

### Reverse Proxy (nginx)

```yaml
# Features
- SSL termination with Let's Encrypt
- Rate limiting (10 req/s for API, 5 req/s for auth)
- Gzip compression
- Security headers
- WebSocket support
```

## SSL Certificate Management

### Initial Setup

```bash
# Generate initial certificates
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email $SSL_EMAIL \
  -d $DOMAIN \
  -d www.$DOMAIN \
  --agree-tos \
  --no-eff-email

# Restart nginx to load certificates
docker-compose restart nginx
```

### Automatic Renewal

Add to crontab for automatic renewal:

```bash
# Renew certificates twice daily
0 12,0 * * * cd /path/to/dreflowpro && docker-compose run --rm certbot renew && docker-compose restart nginx
```

## Database Management

### Initial Setup

The database is automatically initialized with:
- Required extensions (uuid-ossp, pg_trgm, etc.)
- Custom functions for audit logging and tenant isolation
- Performance optimizations
- Initial system settings

### Migrations

```bash
# Run database migrations
docker-compose exec app alembic upgrade head

# Create new migration
docker-compose exec app alembic revision --autogenerate -m "description"
```

### Backups

```bash
# Create backup
docker-compose exec postgres pg_dump -U dreflowpro dreflowpro > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U dreflowpro dreflowpro < backup.sql
```

## Monitoring and Alerting

### Prometheus Metrics

Access Prometheus at: `https://yourdomain.com/prometheus`

Key metrics monitored:
- Application performance (response times, error rates)
- Database performance (connections, query duration)
- System resources (CPU, memory, disk)
- Pipeline execution metrics
- Multi-tenant usage metrics

### Grafana Dashboards

Access Grafana at: `https://yourdomain.com/grafana`

Default login: admin / (GRAFANA_PASSWORD from .env)

Pre-configured dashboards:
- Platform Overview: High-level system health
- System Monitoring: Infrastructure metrics
- Business Intelligence: Usage and performance analytics

### Health Checks

```bash
# Check application health
curl https://yourdomain.com/health

# Check all services
docker-compose ps

# View service logs
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Security Hardening

### Application Security

- HTTPS enforced with HSTS headers
- CSRF protection enabled
- JWT tokens with secure defaults
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection protection via ORM

### Infrastructure Security

- Non-root containers
- Read-only file systems where possible
- Security headers (CSP, XSS protection)
- Database connections encrypted
- Redis password protected
- Nginx security configuration

### Network Security

```bash
# Firewall rules (adjust for your setup)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirects to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

## Performance Optimization

### Database Optimization

- Connection pooling (10 connections, 20 overflow)
- Query optimization with proper indexes
- Regular maintenance tasks
- Performance monitoring

### Caching Strategy

- Redis for session storage and API caching
- Nginx response caching for static content
- Application-level caching for expensive operations

### Resource Limits

```yaml
# Recommended server specifications
Minimum: 4GB RAM, 2 CPU cores, 50GB storage
Recommended: 8GB RAM, 4 CPU cores, 100GB storage
Production: 16GB+ RAM, 8+ CPU cores, 200GB+ SSD
```

## Scaling Considerations

### Horizontal Scaling

- Multiple application containers behind load balancer
- Database read replicas for read scaling
- Redis Cluster for cache scaling
- CDN for static asset delivery

### Vertical Scaling

Increase resource limits in docker-compose.yml:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   docker-compose logs certbot
   
   # Manual certificate renewal
   docker-compose run --rm certbot renew --dry-run
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test database connection
   docker-compose exec postgres psql -U dreflowpro -d dreflowpro -c "SELECT 1;"
   ```

3. **Memory Issues**
   ```bash
   # Check container resource usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

### Log Analysis

```bash
# Application logs
docker-compose logs -f --tail=100 app

# Database logs
docker-compose logs -f --tail=100 postgres

# Nginx access logs
docker-compose logs -f --tail=100 nginx

# All services
docker-compose logs -f
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review application logs
   - Check disk space usage
   - Monitor performance metrics
   - Review security alerts

2. **Monthly**
   - Update Docker images
   - Database maintenance (analyze, vacuum)
   - Review and rotate logs
   - Security updates

3. **Quarterly**
   - Full system backup
   - Performance review and optimization
   - Security audit
   - Capacity planning review

### Updates

```bash
# Update application
git pull origin main
docker-compose build app
docker-compose up -d app

# Update all services
docker-compose pull
docker-compose up -d
```

## Support and Monitoring

### Health Check Endpoints

- `/health` - Application health status
- `/health/detailed` - Detailed component health
- `/metrics` - Prometheus metrics

### Log Locations

- Application logs: `docker-compose logs app`
- Database logs: `docker-compose logs postgres`
- Nginx logs: `docker-compose logs nginx`
- System logs: `/var/log/syslog`

### Performance Monitoring

- Grafana dashboards for real-time metrics
- Prometheus alerts for critical issues
- Application performance monitoring via built-in metrics
- Database performance via pg_stat_statements

For additional support, refer to the application logs and monitoring dashboards.