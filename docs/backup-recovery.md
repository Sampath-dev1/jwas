# Backup and Recovery Procedures

## 1. Automated PostgreSQL Backups
To safeguard customer transactions and inventory history, execute scheduled pg_dump snapshots:

```bash
# Automated Daily Backup Script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/jwas"
mkdir -p $BACKUP_DIR

# Execute compressed dump
pg_dump -U postgres -d jwas_db -F c -b -v -f "$BACKUP_DIR/jwas_backup_$TIMESTAMP.dump"

# Retain 30 days of archives
find $BACKUP_DIR -type f -name "*.dump" -mtime +30 -exec rm {} +
```

## 2. Recovery Procedure
To restore from a backup snapshot without disrupting system integrity:
1. Stop the application backend:
   ```bash
   sudo systemctl stop jwas-backend
   ```
2. Restore database:
   ```bash
   pg_restore -U postgres -d jwas_db -v -c "$BACKUP_DIR/jwas_backup_<TIMESTAMP>.dump"
   ```
3. Run migrations to verify consistency:
   ```bash
   cd /opt/jwas/backend && alembic upgrade head
   ```
4. Restart application services:
   ```bash
   sudo systemctl start jwas-backend
   ```
