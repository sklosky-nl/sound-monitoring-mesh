# Archived Documentation

This folder contains older documentation files that have been consolidated into the main documentation set.

## Archived Files (February 7, 2026)

These files were consolidated into the main docs to reduce document sprawl:

### Consolidated into README.md
- **BUILD_COMPLETE.md** - Build completion summary
- **BUILD_SUMMARY_KIOSK_v1.4.md** - Kiosk feature summary  
- **QUICKSTART.md** - Quick start guide

### Consolidated into HARDWARE_AND_FIRMWARE.md
- **COMPONENT_PINOUT_REFERENCE.md** - ESP32-C3 and INMP441 pinouts
- **FLASHING_MULTIPLE_DEVICES.md** - Multi-device flashing guide
- **DEVICE_REGISTRATION_GUIDE.md** - Device registration process

### Consolidated into DEVELOPER_REFERENCE.md
- **SECURITY.md** - Security configuration
- **PRE_COMMIT_CHECKLIST.md** - Development checklist
- **FREQUENCY_DISPLAY_UPDATE.md** - Feature update notes
- **RESET_SUMMARY.md** - System reset documentation
- **sound level mesh architecture.md** - Detailed architecture
- **sound level mesh hardware design.md** - Hardware specifications
- **sound level mesh system PRD.md** - Product requirements

## Current Documentation Structure

The project now has a streamlined documentation set:

### Main Documentation (Only 3 files!)
1. **README.md** - Project overview, quick start, troubleshooting
2. **HARDWARE_AND_FIRMWARE.md** - Complete hardware setup, wiring, firmware building, device flashing
3. **DEVELOPER_REFERENCE.md** - Architecture, API docs, security, development workflow

**Total**: 3 active documents (down from 16!)

## Why Archive?

- **Reduce confusion**: Single source of truth for each topic
- **Easier maintenance**: Update one doc instead of many
- **Better organization**: Clear hierarchy of documentation
- **Preserve history**: Archived docs available if needed

## Restoring Archived Files

If you need to reference the original files:

```bash
# View specific archived file
cat docs-archive/COMPONENT_PINOUT_REFERENCE.md

# Restore a file
cp docs-archive/FILENAME.md .

# Restore all files
cp docs-archive/*.md .
```

---

Last archived: February 7, 2026
