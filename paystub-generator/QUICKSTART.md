# Paystub Generator - Quick Start Guide

## 5-Minute Setup

### 1. Clone/Copy to work-universe
```bash
cd C:\Users\antoi\.openclaw\workspace\work-universe
# Already in: paystub-generator/
```

### 2. Install Dependencies
```bash
cd paystub-generator
npm install
```

### 3. Set Up Supabase
1. Go to https://supabase.com
2. Create new project (name: paystub-generator)
3. Wait for project to initialize
4. Copy `Project URL` and `anon key` from Settings > API
5. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<your_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
```

### 4. Initialize Database
1. Open Supabase SQL Editor
2. Copy entire SQL from `lib/supabase.js` (schemaSQL constant)
3. Paste and execute
4. Tables are now created

### 5. Insert Tax Data
In Supabase SQL Editor, run:
```sql
-- Insert Federal Tax Tables 2026
INSERT INTO federal_tax_tables (year, filing_status, income_bracket_min, income_bracket_max, tax_rate) VALUES
(2026, 'single', 0, 11000, 0.10),
(2026, 'single', 11000, 44725, 0.12),
(2026, 'single', 44725, 95375, 0.22),
(2026, 'single', 95375, 182100, 0.24),
(2026, 'single', 182100, 231250, 0.32),
(2026, 'single', 231250, 578125, 0.35),
(2026, 'single', 578125, 999999999, 0.37),
(2026, 'married', 0, 22000, 0.10),
(2026, 'married', 22000, 89075, 0.12),
(2026, 'married', 89075, 190750, 0.22),
(2026, 'married', 190750, 364200, 0.24),
(2026, 'married', 364200, 462500, 0.32),
(2026, 'married', 462500, 693750, 0.35),
(2026, 'married', 693750, 999999999, 0.37);

-- Insert Maryland Tax Tables 2026
INSERT INTO md_tax_tables (year, filing_status, income_bracket_min, income_bracket_max, tax_rate) VALUES
(2026, 'single', 0, 1000, 0.02),
(2026, 'single', 1000, 2000, 0.03),
(2026, 'single', 2000, 3000, 0.04),
(2026, 'single', 3000, 100000, 0.0475),
(2026, 'single', 100000, 125000, 0.05),
(2026, 'single', 125000, 999999999, 0.0575),
(2026, 'married', 0, 1000, 0.02),
(2026, 'married', 1000, 2000, 0.03),
(2026, 'married', 2000, 3000, 0.04),
(2026, 'married', 3000, 150000, 0.0475),
(2026, 'married', 150000, 175000, 0.05),
(2026, 'married', 175000, 999999999, 0.0575);
```

### 6. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

## First Paystub

### Step 1: Create Employee
1. Click **"Create New Employee"**
2. Fill in:
   - Name: John Doe
   - SSN: 123-45-6789
   - Address: 123 Main St, Baltimore, MD 21201
   - Hourly Rate: $30.00
   - Filing Status: Single
   - Dependents: 0
3. Click **"Create Employee"**

### Step 2: Enter Pay Period
1. Select John Doe from dropdown
2. Set dates:
   - Start Date: 2026-06-15
   - End Date: 2026-06-29
3. Enter hours:
   - Regular Hours: 40
   - Overtime Hours: 8
4. Optional: Add deductions
   - Name: Health Insurance
   - Amount: $150.00
5. Click **"Generate Paystub"**

### Step 3: Download PDF
- Preview appears on right
- Click **"📥 Download PDF"**
- File saves as: `paystub_JohnDoe_2026-06-22.pdf`

## Expected Results (Test Case)
- Gross Pay: $1,320.00 (40×$30 + 8×$30×1.5)
- Federal Tax: ~$157
- State Tax (MD): ~$63
- Social Security: ~$82
- Medicare: ~$19
- Total Taxes: ~$321
- Deductions: $150
- **Net Pay: ~$849**

## Deployment to Vercel

### 1. Push to GitHub
```bash
cd ..
git init
git add .
git commit -m "Add paystub generator"
git remote add origin https://github.com/YOUR_USERNAME/work-universe.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to https://vercel.com/new
2. Import GitHub repo
3. Select project root: `paystub-generator`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**
6. App live in ~1 minute

**Your URL:** `https://paystub-generator-yourusername.vercel.app`

## API Endpoints

### Create Employee
```bash
POST /api/employee
Content-Type: application/json

{
  "name": "Jane Smith",
  "ssn": "987-65-4321",
  "hourlyRate": 25,
  "w4FilingStatus": "married",
  "w4Dependents": 2,
  "taxState": "MD"
}
```

### Calculate Paystub
```bash
POST /api/paystub/calculate
Content-Type: application/json

{
  "employeeId": "uuid-here",
  "regularHours": 40,
  "overtimeHours": 5,
  "startDate": "2026-06-15",
  "endDate": "2026-06-29",
  "deductions": [
    { "name": "Health Insurance", "amount": 200 }
  ]
}
```

### Get Employee History
```bash
GET /api/paystub/history?employeeId=uuid-here
```

## Troubleshooting

**"Failed to fetch employees"**
- Check `.env.local` has correct Supabase URL and key
- Verify tables were created in SQL Editor
- Check browser console for CORS errors

**"Employee not found"**
- Verify employee was created successfully
- Check employee ID matches request

**"Error creating employee"**
- SSN format issue: must be XXX-XX-XXXX
- Duplicate SSN: unique constraint violation
- Missing hourly rate

**"Paystub calculation failed"**
- Ensure dates are valid (end > start)
- Hours must be positive numbers
- Check employee data is complete

**PDF download is blank**
- Ensure paystub preview loaded fully
- Try different browser
- Check browser allows downloads from localhost

## What's Included

✅ Complete Next.js application  
✅ Supabase database schema  
✅ Tax calculator (2026 federal + MD state)  
✅ PDF generator with professional layout  
✅ React UI with Tailwind CSS  
✅ 4 API endpoints  
✅ Full SKILL.md documentation  
✅ This quick start guide  

## Next Steps

1. **Add employees:** Use UI to create employee roster
2. **Generate paystubs:** Create for each pay period
3. **Track history:** All paystubs saved in Supabase
4. **Download PDFs:** Professional paystubs for records
5. **Deploy:** Push to Vercel for production use

## Production Checklist

- [ ] Move to GitHub repo
- [ ] Deploy to Vercel
- [ ] Set up production Supabase project
- [ ] Configure custom domain
- [ ] Add user authentication (optional)
- [ ] Set up automated backups
- [ ] Test with real employee data
- [ ] Verify tax calculations accuracy
- [ ] Document company deduction policies

## Support

For issues or questions:
1. Check SKILL.md for detailed API docs
2. Review tax calculator in `lib/taxCalculator.js`
3. Check Supabase error logs
4. Verify environment variables

---

**Ready to generate paystubs? Start with Step 1 above!**
