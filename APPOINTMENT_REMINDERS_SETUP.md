# Appointment Reminders Setup Guide

This system automatically sends appointment reminders 24 hours before scheduled appointments via email and WhatsApp.

## Features

- ✅ Automated 24-hour reminders
- ✅ Email reminders (using existing SMTP configuration)
- ✅ WhatsApp reminders (using Twilio)
- ✅ Prevents duplicate reminders
- ✅ Only sends to scheduled appointments

## Environment Variables

Add these to your `.env` file:

### Email (Already configured)
```env
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourclinic.com
```

### WhatsApp (Twilio)
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Note:** For Twilio WhatsApp, you need to:
1. Sign up for a Twilio account
2. Get a WhatsApp-enabled phone number (Twilio provides a sandbox number for testing)
3. Add your Twilio credentials to the environment variables

### Cron Job Security (Optional but recommended)
```env
CRON_SECRET=your-random-secret-token-here
```

## Setting Up the Cron Job

The reminder system runs via an API endpoint: `/api/cron/appointment-reminders`

### Option 1: Netlify Scheduled Functions

Create `netlify/functions/appointment-reminders.ts`:

```typescript
import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  const cronSecret = process.env.CRON_SECRET;
  const url = `${process.env.URL || process.env.DEPLOY_URL}/api/cron/appointment-reminders`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  return {
    statusCode: response.status,
    body: JSON.stringify(await response.json()),
  };
};
```

Then add to `netlify.toml`:

```toml
[[functions]]
  directory = "netlify/functions"

[[schedules]]
  cron = "0 * * * *"  # Every hour
  path = "/.netlify/functions/appointment-reminders"
```

### Option 2: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Create a new cron job
2. Set schedule: `0 * * * *` (every hour)
3. URL: `https://your-domain.com/api/cron/appointment-reminders`
4. Method: GET
5. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 3: Manual Testing

You can test the endpoint manually:

```bash
curl -X GET "https://your-domain.com/api/cron/appointment-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or visit the URL in your browser (if CRON_SECRET is not set, it will work without auth).

## How It Works

1. **Cron job runs** (recommended: every hour)
2. **Finds appointments** that are approximately 24 hours away (±1 hour window)
3. **Checks if reminder sent** - skips if `reminderSent24h` is true
4. **Sends email** if patient has email address
5. **Sends WhatsApp** if patient has phone number
6. **Marks as sent** if at least one channel succeeds

## Database Changes

The `Appointment` model now includes:
- `reminderSent24h`: Boolean flag indicating if 24h reminder was sent
- `reminderSentAt24h`: Timestamp of when reminder was sent

## Testing

1. Create a test appointment scheduled for ~24 hours from now
2. Wait for the cron job to run (or trigger it manually)
3. Check:
   - Email inbox (or console logs if SMTP not configured)
   - WhatsApp messages (or console logs if Twilio not configured)
   - Database: `reminderSent24h` should be `true`

## Troubleshooting

### Reminders not sending
- Check environment variables are set correctly
- Check cron job is running (check logs)
- Verify appointments are in the correct time window
- Check patient has email or phone number

### Duplicate reminders
- The system prevents duplicates using `reminderSent24h` flag
- If you need to resend, manually set `reminderSent24h: false` in database

### WhatsApp not working
- Verify Twilio credentials are correct
- Check phone number format (should be E.164: +1234567890)
- For testing, use Twilio's sandbox WhatsApp number
- Check Twilio console for error messages

## Notes

- Reminders only send for appointments with `status: "scheduled"`
- If appointment is cancelled before reminder sends, it won't send
- The system uses a ±1 hour window to account for cron timing
- Both email and WhatsApp are attempted; if one fails, the other still sends
