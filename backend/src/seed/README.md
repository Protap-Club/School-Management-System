# Seed Manager

Unified CLI for database seeding operations.

## Structure

```
seed/
├── seed.js              # Main CLI entry point
├── runner.js            # DB connection utilities
├── utils.js             # Seed helper functions
├── README.md            # This file
├── data/
│   └── demo.js          # Demo data (IITD/IIMA)
└── operations/
    ├── school.js        # Create school with SuperAdmin
    ├── users.js         # Bulk user creation
    └── cleanup.js       # Cleanup demo data
```

## Usage

```bash
# Interactive menu
node src/seed/seed.js

# Create all demo schools
node src/seed/seed.js school

# Create specific school
node src/seed/seed.js school IITD

# Add users to a school
node src/seed/seed.js users IITD

# Full demo setup (schools + users)
node src/seed/seed.js demo

# Cleanup demo data
node src/seed/seed.js cleanup

# Show help
node src/seed/seed.js help
```

## Demo Data

- **IITD**: 50 students, 20 teachers, 2 admins
- **IIMA**: 50 students, 20 teachers, 2 admins

## Login Credentials

```
IITD SuperAdmin: vraj.iitd@protap.com / Admin@123
IIMA SuperAdmin: vraj.iima@protap.com / Admin@123
```
