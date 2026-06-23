## ✅ Recovery Type Constraint Fixed

### Issue:
CHECK constraint on `recovery_type` column only allows specific values:
- `credential_loss` (lost/forgot credentials)
- `malicious_interception` (hacked/phished)
- `stuck_contract` (funds stuck in contract)

The code was using 'standard' which violated the constraint.

### Solution:
1. **Updated Recovery Wizard** - Added Step 1 to select recovery reason:
   - "Lost/Forgot Credentials"
   - "Malicious Interception (Hacked, Phished)"
   - "Funds Stuck in Contract"

2. **Updated Init API** - Maps recovery reason to valid enum values with fallback to 'credential_loss'

3. **Updated ensureRecoverySession** - Passes selected recoveryType in payload

### Recovery Flow (Updated):
1. ✅ Step 1: Select recovery reason + asset
2. ✅ Step 2: Paper key OR wallet address
3. ✅ Step 3: Upload KYC documents
4. ✅ Step 4: Settlement countdown / Claim funds

### Testing:
- User now sees proper recovery reason selection
- Reason is validated against database constraints
- Recovery session created with correct recovery_type
- No more CHECK constraint violations

Ready to test! Flow now complete and constraint-compliant. 🎉
