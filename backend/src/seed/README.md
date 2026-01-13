# Seed Manager

Unified CLI tool for database seeding operations.

## Quick Start

```bash
cd backend
node src/seed/seed.js              # Interactive menu
node src/seed/seed.js demo         # Full demo setup
```

## Commands

| Command | Description |
|---------|-------------|
| `school [CODE]` | Create school(s) with SuperAdmin |
| `users <CODE>` | Add demo users to a school |
| `demo` | Full demo setup (all schools + users) |
| `cleanup` | Remove demo institutes and users |
| `help` | Show help |

## Examples

```bash
# Create all demo schools
node src/seed/seed.js school

# Create only IITD
node src/seed/seed.js school IITD

# Add users to IITD
node src/seed/seed.js users IITD

# Full demo with all schools and users
node src/seed/seed.js demo

# Clean up demo data
node src/seed/seed.js cleanup
```

## Demo Schools

- **IITD** - Indian Institute of Technology Delhi
- **IIMA** - Indian Institute of Management Ahmedabad

## Login Credentials

After running `school` or `demo`:

| School | Email | Password |
|--------|-------|----------|
| IITD | vraj.iitd@protap.com | Admin@123 |
| IIMA | vraj.iima@protap.com | Admin@123 |

## File Structure

```
seed/
├── seed.js              # Main CLI entry point
├── operations/
│   ├── school.js        # School provisioning
│   ├── users.js         # User creation
│   └── cleanup.js       # Cleanup utilities
└── data/
    └── demo.js          # Demo data
```
