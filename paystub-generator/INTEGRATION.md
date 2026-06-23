# Paystub Generator - Integration Guide

This guide explains how to integrate the Paystub Generator into your existing work-universe repo and deploy to production.

## Repository Integration

### Step 1: Add to Git
```bash
cd work-universe
git add paystub-generator/
git commit -m "Add paystub generator system"
git push origin main
```

### Step 2: Update work-universe README
Add to main README.md:
```markdown
## Paystub Generator

Tax-compliant payroll system with PDF generation.
- Location: `/paystub-generator`
- Docs: `paystub-generator/README.md`
- Quick Start: `paystub-generator/QUICKSTART.md`
```

### Step 3: Create work-universe/.gitignore entry
If not already present:
```
paystub-generator/node_modules/
paystub-generator/.env.local
paystub-generator/dist/
paystub-generator/.next/
```

## Deployment Strategy

### Option A: Separate Vercel Project (Recommended)

**Benefits:**
- Independent scaling
- Isolated environment
- Separate CI/CD
- Easier debugging
- Better performance

**Setup:**

1. **GitHub Setup**
   ```bash
   git push origin main
   ```

2. **Vercel Deployment**
   - Go to https://vercel.com/new
   - Import GitHub repository
   - Select "monorepo" setup
   - Root directory: `paystub-generator`
   - Build command: `npm run build`
   - Install command: `npm install`

3. **Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. **Domain (Optional)**
   - Connect custom domain in Vercel dashboard
   - Example: `paystub.yourdomain.com`

### Option B: Unified Monorepo Deployment

**Benefits:**
- Single deploy pipeline
- Shared dependencies
- Unified monitoring
- Simpler management

**Setup:**

1. **Update root package.json**
   ```json
   {
     "scripts": {
       "build": "npm --prefix paystub-generator run build",
       "dev": "npm --prefix paystub-generator run dev"
     }
   }
   ```

2. **Vercel Configuration**
   - Create `vercel.json`:
   ```json
   {
     "buildCommand": "npm --prefix paystub-generator run build",
     "outputDirectory": "paystub-generator/.next"
   }
   ```

3. **Deploy as before**

## Environment Variables

### Required (Production)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### Optional
```
# Add more states (if extending)
SUPPORTED_STATES=MD,VA,DC

# API rate limiting
API_RATE_LIMIT=100

# PDF generation timeout
PDF_TIMEOUT=5000
```

## Database Setup (One-Time)

### Supabase Project Creation
1. Go to https://supabase.com
2. Create new project
3. Wait for initialization (~2 minutes)
4. Go to SQL Editor
5. Create new query
6. Copy SQL from `lib/supabase.js` (schemaSQL)
7. Execute

### Insert Tax Data
In SQL Editor, run tax table inserts:
```sql
-- See SKILL.md for complete SQL
```

## Monitoring & Operations

### Vercel Monitoring
- Deployment status: https://vercel.com/dashboard
- View logs: Deployments > Select > Logs
- Error tracking: Monitoring tab

### Supabase Monitoring
- Database stats: https://app.supabase.com > Project > Database
- Query performance: Database > Query Performance
- Realtime events: Realtime > Events

### Health Checks
```bash
# Test API endpoints
curl https://paystub-generator.vercel.app/api/employee

# Test Supabase connection
# (Application will fail to load if connection fails)
```

## Backup & Recovery

### Supabase Backups
1. Go to Project Settings > Database > Backups
2. Enable automated backups (default: daily)
3. Manual backup: Click "Create Backup"
4. Restore: Select backup > Restore

### Application Backup
- All code in GitHub (automatic)
- No local files to backup
- Redeploy from GitHub anytime

### Data Recovery
If database corrupted:
1. Get latest backup from Supabase
2. Restore from backup
3. Or rebuild schema from SQL

## Scaling Considerations

### For 10-100 employees
- Current setup sufficient
- No changes needed

### For 100+ employees
1. **Database**
   - Enable connection pooling in Supabase
   - Add database indexes (already included)
   - Monitor query performance

2. **Application**
   - Enable Vercel Edge Caching
   - Implement caching layer (Redis)
   - Consider background jobs for bulk operations

3. **PDF Generation**
   - Move to serverless function
   - Consider AWS Lambda + S3 storage
   - Implement async PDF generation

## Security Hardening

### API Security
1. **Add authentication**
   ```javascript
   // pages/api/middleware/auth.js
   export function withAuth(handler) {
     return (req, res) => {
       // Verify JWT or session
       // Check user permissions
       return handler(req, res);
     };
   }
   ```

2. **Rate limiting**
   ```javascript
   // pages/api/middleware/rateLimit.js
   ```

3. **Input validation**
   - Already implemented
   - Extend as needed

### Database Security
1. Enable Row Level Security (RLS) in Supabase
2. Create policies for employee access
3. Restrict admin operations

### Data Privacy
1. **Encryption at rest**: Supabase default (HTTPS)
2. **Encryption in transit**: HTTPS enforced
3. **PII Masking**: SSN masked in PDFs
4. **Audit logging**: All DB operations logged

## Troubleshooting

### Deployment Issues

**Build fails on Vercel**
- Check buildCommand matches next.js
- Verify all dependencies in package.json
- Review build logs in Vercel dashboard

**Environment variables not working**
- Verify variables set in Vercel > Settings > Environment Variables
- Restart deployment after adding variables
- Check .env.local locally (different from production)

### Runtime Issues

**API endpoints return 500**
- Check Supabase connection (env vars correct?)
- Review Supabase logs
- Verify database tables exist

**PDF generation hangs**
- Check browser console for errors
- Verify html2canvas dependency installed
- Try in different browser

**Slow performance**
- Check Vercel analytics dashboard
- Review database query times in Supabase
- Check network latency

## Updates & Maintenance

### Regular Tasks (Weekly)
- Review error logs
- Check database usage
- Monitor performance metrics

### Regular Tasks (Monthly)
- Review and optimize slow queries
- Update dependencies: `npm outdated`
- Security patches: `npm audit fix`

### Update Process
```bash
# 1. Local: Update dependencies
npm update

# 2. Test locally
npm run dev

# 3. Commit and push
git add package*.json
git commit -m "Update dependencies"
git push origin main

# 4. Vercel auto-redeploys
# (Monitor deployment in Vercel dashboard)
```

## Adding Features

### Add New Deduction Type
1. Update `lib/taxCalculator.js` deduction handling
2. Update `components/PaystubForm.jsx` form
3. Test calculation
4. Commit and deploy

### Support Additional State
1. Add state tax brackets to `lib/taxCalculator.js`
2. Insert tax table data in Supabase
3. Update state selector in form
4. Test with state data
5. Deploy

### Custom Company Branding
1. Update PDF layout in `lib/pdfGenerator.js`
2. Add company logo/info to payData
3. Test PDF generation
4. Deploy

## Support & Troubleshooting Resources

- **SKILL.md**: Complete API documentation
- **QUICKSTART.md**: Setup guide
- **README.md**: Overview and features
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs

## Migration Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and configured
- [ ] Environment variables set
- [ ] Supabase database initialized
- [ ] Tax tables inserted
- [ ] Test employee created
- [ ] Test paystub generated
- [ ] PDF download verified
- [ ] Production URL working
- [ ] Team notified of launch
- [ ] Monitoring dashboards set up
- [ ] Backup procedures documented
- [ ] Support procedures documented

## Post-Launch

### Day 1
- Monitor error logs
- Verify all endpoints working
- Test with live data

### Week 1
- Gather feedback from users
- Fix any issues
- Optimize performance

### Month 1
- Review monthly metrics
- Plan enhancements
- Document lessons learned

---

**Questions? See SKILL.md, QUICKSTART.md, or README.md**
